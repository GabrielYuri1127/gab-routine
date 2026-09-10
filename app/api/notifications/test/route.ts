import { NextResponse } from "next/server";

import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";
import {
  isExpiredPushSubscriptionError,
  sendPushNotification,
  type StoredPushSubscription
} from "@/services/notifications/push-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario para testar notificacoes." }, { status: 401 });
  }

  try {
    const client = createSupabaseServiceClient();
    const { data, error } = await client
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    const subscriptions = (data ?? []) as StoredPushSubscription[];
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "Nenhum aparelho inscrito para esta conta." }, { status: 404 });
    }

    let sent = 0;
    let expired = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(subscription, {
          body: "Notificacoes do Gavium estao ativas neste aparelho.",
          tag: "gavium-test",
          title: "Teste de notificacao",
          url: "/lembretes"
        });
        sent += 1;
      } catch (sendError) {
        if (isExpiredPushSubscriptionError(sendError)) {
          expired += 1;
          if (subscription.id) {
            await client.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        } else {
          failed += 1;
        }
      }
    }

    return NextResponse.json({ expired, failed, sent });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao consegui enviar a notificacao de teste."
      },
      { status: 500 }
    );
  }
}
