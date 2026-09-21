import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { extractAcademicDocument } from "@/lib/academic-import/extractor";
import { getAIProviderFailure, getConfiguredAIProvider } from "@/lib/ai/provider";
import { getSupabaseServerConfig, getSupabaseUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 4_000_000;
const MAX_REQUEST_BYTES = 4_350_000;
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const kindSchema = z.enum(["auto", "schedule", "transcript"]);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "O arquivo passa do limite de 4 MB." }, { status: 413 });
  }

  const supabaseConfigured = Boolean(getSupabaseServerConfig());
  const user = supabaseConfigured ? await getSupabaseUserFromRequest(request) : null;
  if (supabaseConfigured && !user) {
    return NextResponse.json({ error: "Entre na sua conta para analisar documentos." }, { status: 401 });
  }
  if (getConfiguredAIProvider().name === "none") {
    return NextResponse.json(
      { error: "A leitura automatica ainda nao esta configurada no servidor." },
      { status: 503 }
    );
  }

  const identifier = hashIdentifier(user?.id ?? getRequestAddress(request));
  if (!consumeRateLimit(identifier)) {
    return NextResponse.json(
      { error: "Muitas analises em pouco tempo. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const parsedKind = kindSchema.safeParse(formData?.get("kind"));
  if (!(file instanceof File) || !parsedKind.success) {
    return NextResponse.json({ error: "Envie um documento academico valido." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "O arquivo precisa ter ate 4 MB." }, { status: 413 });
  }

  const mimeType = normalizeMimeType(file.type, file.name);
  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    return NextResponse.json({ error: "Use um arquivo PDF, JPG, PNG ou WebP." }, { status: 415 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    const extracted = await extractAcademicDocument({
      dataUrl,
      fileName: sanitizeFileName(file.name),
      kind: parsedKind.data,
      mimeType,
      promptCacheKey: `gavium-academic-import-${identifier.slice(0, 24)}`,
      safetyIdentifier: identifier
    });

    return NextResponse.json(extracted);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error("Academic document import failed:", code);
    const failure = getAIProviderFailure(error);
    return NextResponse.json(
      {
        error:
          code === "INVALID_ACADEMIC_IMPORT"
            ? "Nao consegui organizar os dados desse documento. Tente uma imagem mais nitida ou outro PDF."
            : `${failure.detail} O documento nao foi alterado.`
      },
      { status: 502 }
    );
  }
}

function consumeRateLimit(identifier: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(identifier);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    cleanupBuckets(now);
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function cleanupBuckets(now: number) {
  if (rateLimitBuckets.size < 500) {
    return;
  }
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function normalizeMimeType(type: string, name: string) {
  if (allowedMimeTypes.has(type)) {
    return type;
  }

  const extension = name.toLocaleLowerCase("en-US").split(".").pop();
  const byExtension: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    pdf: "application/pdf",
    png: "image/png",
    webp: "image/webp"
  };
  return extension ? byExtension[extension] : undefined;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 160) || "documento";
}

function getRequestAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(`gavium-academic-import:${value}`).digest("hex");
}
