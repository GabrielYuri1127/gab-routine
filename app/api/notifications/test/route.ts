import { NextResponse } from "next/server";

import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";
import {
  getPushDeliveryFailure,
  sendPushNotification,
  type PushDeliveryFailureCode,
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
    let firstFailureDetail = "";
    const failureReasons: Partial<Record<PushDeliveryFailureCode, number>> = {};

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
        const failure = getPushDeliveryFailure(sendError);
        failureReasons[failure.code] = (failureReasons[failure.code] ?? 0) + 1;
        firstFailureDetail ||= failure.detail;
        if (failure.expired) {
          expired += 1;
          if (subscription.id) {
            await client.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        } else {
          failed += 1;
        }
      }
    }

    const result = { expired, failed, failureReasons, sent };
    if (sent === 0) {
      return NextResponse.json(
        {
          ...result,
          error: firstFailureDetail || "Nenhum aparelho recebeu o teste. Reative as notificacoes e tente novamente."
        },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao consegui enviar a notificacao de teste."
      },
      { status: 500 }
    );
  }
}
