import { NextResponse } from "next/server";
import { z } from "zod";

import { askAssistant } from "@/services/ai/assistant-service";
import type { RoutineAssistantInput } from "@/lib/ai/routine-assistant";
import { buildIntegrationStatus } from "@/lib/integrations/status";

const assistantRequestSchema = z.object({
  events: z.array(z.unknown()).default([]),
  appPreference: z.unknown().optional(),
  question: z.string().min(1).max(800),
  reminders: z.array(z.unknown()).default([]),
  subjects: z.array(z.unknown()).default([]),
  tasks: z.array(z.unknown()).default([]),
  today: z.string().min(8).max(10)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = assistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta invalida." }, { status: 400 });
  }

  const result = await askAssistant(parsed.data.question, {
    events: parsed.data.events,
    appPreference: parsed.data.appPreference,
    integrationStatus: buildIntegrationStatus(process.env, request.url),
    reminders: parsed.data.reminders,
    subjects: parsed.data.subjects,
    tasks: parsed.data.tasks,
    today: parsed.data.today
  } as Omit<RoutineAssistantInput, "question">);

  return NextResponse.json(result);
}
