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
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (Number((error as { statusCode?: number }).statusCode) === 404 ||
      Number((error as { statusCode?: number }).statusCode) === 410)
  );
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
