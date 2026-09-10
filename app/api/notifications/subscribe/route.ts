import { NextResponse } from "next/server";

import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PushSubscriptionRequest {
  auth?: unknown;
  endpoint?: unknown;
  p256dh?: unknown;
}

export async function POST(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario para ativar notificacoes." }, { status: 401 });
  }

  let payload: PushSubscriptionRequest;
  try {
    payload = (await request.json()) as PushSubscriptionRequest;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!isValidSubscription(payload)) {
    return NextResponse.json({ error: "Inscricao push incompleta." }, { status: 400 });
  }

  try {
    const client = createSupabaseServiceClient();
    const { error } = await client.from("push_subscriptions").upsert(
      {
        auth: payload.auth,
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        updated_at: new Date().toISOString(),
        user_agent: request.headers.get("user-agent"),
        user_id: user.id
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao consegui salvar a inscricao push."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario para remover notificacoes." }, { status: 401 });
  }

  let payload: { endpoint?: unknown };
  try {
    payload = (await request.json()) as { endpoint?: unknown };
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (typeof payload.endpoint !== "string" || !payload.endpoint) {
    return NextResponse.json({ error: "Endpoint push ausente." }, { status: 400 });
  }

  try {
    const client = createSupabaseServiceClient();
    const { error } = await client
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", payload.endpoint);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao consegui remover a inscricao push."
      },
      { status: 500 }
    );
  }
}

function isValidSubscription(payload: PushSubscriptionRequest): payload is Required<PushSubscriptionRequest> {
  return (
    typeof payload.endpoint === "string" &&
    payload.endpoint.length > 0 &&
    typeof payload.p256dh === "string" &&
    payload.p256dh.length > 0 &&
    typeof payload.auth === "string" &&
    payload.auth.length > 0
  );
}
