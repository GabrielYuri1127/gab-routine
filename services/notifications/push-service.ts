import webPush, { type PushSubscription as WebPushSubscription } from "web-push";

export interface StoredPushSubscription {
  auth: string;
  endpoint: string;
  id?: string;
  p256dh: string;
  user_id: string;
}

export interface PushPayload {
  body: string;
  tag?: string;
  title: string;
  url?: string;
}

export type PushDeliveryFailureCode =
  | "expired_subscription"
  | "invalid_subscription"
  | "vapid_rejected"
  | "vapid_config_invalid"
  | "payload_too_large"
  | "rate_limited"
  | "push_service_unavailable"
  | "delivery_failed";

export interface PushDeliveryFailure {
  code: PushDeliveryFailureCode;
  detail: string;
  expired: boolean;
  statusCode?: number;
}

type PushEnv = Record<string, string | undefined>;

export function getPushConfig(env: PushEnv = process.env) {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim() || "mailto:suporte@gavium.app";

  if (!publicKey || !privateKey) {
    return null;
  }

  return {
    privateKey,
    publicKey,
    subject
  };
}

export function getPushMissingConfig(env: PushEnv = process.env) {
  const missing: string[] = [];

  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  }

  if (!env.VAPID_PRIVATE_KEY) {
    missing.push("VAPID_PRIVATE_KEY");
  }

  if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SECRET_KEY");
  }

  if (!env.CRON_SECRET) {
    missing.push("CRON_SECRET");
  }

  return missing;
}

export function isPushConfigured(env: PushEnv = process.env) {
  return getPushMissingConfig(env).length === 0;
}

export async function sendPushNotification(subscription: StoredPushSubscription, payload: PushPayload) {
  const config = getPushConfig();
  if (!config) {
    throw new Error("VAPID keys are not configured.");
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  return webPush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload), {
    TTL: 60 * 60
  });
}

export function isExpiredPushSubscriptionError(error: unknown) {
  return getPushDeliveryFailure(error).expired;
}

export function getPushDeliveryFailure(error: unknown): PushDeliveryFailure {
  const statusCode = getPushErrorStatusCode(error);
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

  if (statusCode === 404 || statusCode === 410) {
    return {
      code: "expired_subscription",
      detail: "A inscricao deste aparelho expirou. Abra o Gavium no Android e ative as notificacoes novamente.",
      expired: true,
      statusCode
    };
  }
  if (errorMessage.includes("vapid") || errorMessage.includes("public key") || errorMessage.includes("private key")) {
    return {
      code: "vapid_config_invalid",
      detail: "As chaves VAPID do servidor sao invalidas. Gere um novo par, atualize as duas variaveis e faca redeploy.",
      expired: false,
      statusCode
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      code: "vapid_rejected",
      detail: "O servico de push recusou as chaves VAPID. Atualize o par de chaves e reative o aparelho.",
      expired: false,
      statusCode
    };
  }
  if (statusCode === 400) {
    return {
      code: "invalid_subscription",
      detail: "A inscricao salva pelo navegador e invalida. Desative e ative as notificacoes novamente.",
      expired: false,
      statusCode
    };
  }
  if (statusCode === 413) {
    return {
      code: "payload_too_large",
      detail: "A notificacao ficou grande demais para o servico de push.",
      expired: false,
      statusCode
    };
  }
  if (statusCode === 429) {
    return {
      code: "rate_limited",
      detail: "O servico de push limitou os envios temporariamente. Tente novamente em alguns minutos.",
      expired: false,
      statusCode
    };
  }
  if (statusCode && statusCode >= 500) {
    return {
      code: "push_service_unavailable",
      detail: "O servico de notificacoes do navegador esta indisponivel agora. Tente novamente em alguns minutos.",
      expired: false,
      statusCode
    };
  }

  return {
    code: "delivery_failed",
    detail: "O servidor nao conseguiu entregar a notificacao. Reative as notificacoes neste aparelho e teste novamente.",
    expired: false,
    statusCode
  };
}

function toWebPushSubscription(subscription: StoredPushSubscription): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh
    }
  };
}

function getPushErrorStatusCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return undefined;
  }

  const statusCode = Number((error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(statusCode) ? statusCode : undefined;
}
