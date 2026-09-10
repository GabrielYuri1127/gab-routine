import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { dispatchDueReminderNotifications } from "@/services/notifications/dispatch-service";
import { getPushMissingConfig } from "@/services/notifications/push-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleDispatch(request);
}

export async function POST(request: Request) {
  return handleDispatch(request);
}

async function handleDispatch(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const receivedSecret = getReceivedSecret(request);

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Dispatch nao autorizado." }, { status: 401 });
  }

  const missing = getPushMissingConfig();
  if (missing.length > 0) {
    return NextResponse.json({ error: "Configuracao de push incompleta.", missing }, { status: 503 });
  }

  try {
    const result = await dispatchDueReminderNotifications(createSupabaseServiceClient());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao consegui disparar notificacoes."
      },
      { status: 500 }
    );
  }
}

function getReceivedSecret(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }

  return request.headers.get("x-cron-secret")?.trim() ?? null;
}
