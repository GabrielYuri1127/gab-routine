import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getConfiguredAIProvider } from "@/lib/ai/provider";
import type { RoutineAssistantInput } from "@/lib/ai/routine-assistant";
import { buildIntegrationStatus } from "@/lib/integrations/status";
import {
  createSupabaseServiceClient,
  getSupabaseServerConfig,
  getSupabaseUserFromRequest
} from "@/lib/supabase/server";
import { askAssistant } from "@/services/ai/assistant-service";

const MAX_REQUEST_BYTES = 300_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;

const historyMessageSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
  role: z.enum(["assistant", "user"])
});

const assistantRequestSchema = z.object({
  appPreference: z.record(z.unknown()).optional(),
  events: z.array(z.record(z.unknown())).max(250).default([]),
  history: z.array(historyMessageSchema).max(8).default([]),
  question: z.string().trim().min(1).max(800),
  reminders: z.array(z.record(z.unknown())).max(250).default([]),
  subjects: z.array(z.record(z.unknown())).max(100).default([]),
  tasks: z.array(z.record(z.unknown())).max(500).default([]),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (body && JSON.stringify(body).length > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 });
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta invalida." }, { status: 400 });
  }

  const supabaseConfigured = Boolean(getSupabaseServerConfig());
  const user = supabaseConfigured ? await getSupabaseUserFromRequest(request) : null;
  const onlineConfigured = getConfiguredAIProvider().name !== "none";
  const identifier = hashIdentifier(user?.id ?? getRequestAddress(request));
  const rateLimited =
    onlineConfigured && Boolean(user || !supabaseConfigured) && !(await consumeRateLimit(identifier, user?.id));
  const allowOnline = (!supabaseConfigured || Boolean(user)) && !rateLimited;
  const fallbackModeDetail = rateLimited
    ? "Limite temporario da IA online atingido. Tente novamente em alguns minutos."
    : supabaseConfigured && !user
      ? "Entre na sua conta para usar a IA online."
      : undefined;
  const fallbackError = rateLimited ? "rate_limited" : supabaseConfigured && !user ? "auth_required" : undefined;

  const result = await askAssistant(
    parsed.data.question,
    {
      appPreference: parsed.data.appPreference,
      events: parsed.data.events,
      integrationStatus: buildIntegrationStatus(process.env, request.url),
      reminders: parsed.data.reminders,
      subjects: parsed.data.subjects,
      tasks: parsed.data.tasks,
      today: parsed.data.today
    } as unknown as Omit<RoutineAssistantInput, "question">,
    {
      allowOnline,
      fallbackError,
      fallbackModeDetail,
      history: parsed.data.history,
      promptCacheKey: `gavium-${identifier.slice(0, 32)}`,
      safetyIdentifier: identifier
    }
  );

  if (user && result.source === "ai" && result.response) {
    await recordAIUsage(user.id, result.provider ?? "unknown", result.model ?? "unknown", result.response.intent);
  }

  return NextResponse.json(result);
}

async function consumeRateLimit(identifier: string, userId?: string) {
  if (userId) {
    const persistentCapacity = await hasPersistentCapacity(userId);
    if (persistentCapacity !== null) {
      return persistentCapacity;
    }
  }

  return consumeMemoryRateLimit(identifier);
}

function consumeMemoryRateLimit(identifier: string) {
  const now = Date.now();
  const current = rateLimitBuckets.get(identifier);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    cleanupRateLimitBuckets(now);
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  return true;
}

async function hasPersistentCapacity(userId: string): Promise<boolean | null> {
  try {
    const client = createSupabaseServiceClient();
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await client
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart);

    if (error) {
      return null;
    }

    return (count ?? 0) < RATE_LIMIT_MAX;
  } catch {
    return null;
  }
}

async function recordAIUsage(userId: string, provider: string, model: string, action: string) {
  try {
    const client = createSupabaseServiceClient();
    await client.from("ai_usage").insert({
      action,
      model,
      provider,
      user_id: userId
    });
  } catch {
    // Usage logging must never prevent a valid assistant response.
  }
}

function cleanupRateLimitBuckets(now: number) {
  if (rateLimitBuckets.size < 500) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getRequestAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(`gavium:${value}`).digest("hex");
}
