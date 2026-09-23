"use client";

export type PushPermissionState = NotificationPermission | "unsupported";

export interface BrowserPushSubscriptionPayload {
  auth: string;
  endpoint: string;
  p256dh: string;
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getPushRegistration() {
  if (!isPushSupported()) {
    throw new Error("Este navegador nao tem suporte a notificacoes push.");
  }

  const existing = await navigator.serviceWorker.getRegistration("/");
  const registration = existing ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));

  try {
    await registration.update();
  } catch {
    // A temporary update failure must not discard an already active worker.
  }

  return navigator.serviceWorker.ready;
}

export async function getCurrentPushSubscription() {
  const registration = await getPushRegistration();
  return registration.pushManager.getSubscription();
}

export async function subscribeCurrentDevice() {
  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    throw new Error("A chave publica VAPID ainda nao foi configurada.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissao de notificacao negada no navegador.");
  }

  const registration = await getPushRegistration();
  let current = await registration.pushManager.getSubscription();
  if (current && pushSubscriptionUsesVapidKey(current, vapidPublicKey)) {
    return current;
  }

  if (current) {
    await current.unsubscribe();
    current = null;
  }

  return registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    userVisibleOnly: true
  });
}

export function pushSubscriptionToPayload(subscription: PushSubscription): BrowserPushSubscriptionPayload {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    throw new Error("Inscricao push incompleta.");
  }

  return {
    auth: json.keys.auth,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh
  };
}

export function pushSubscriptionUsesVapidKey(subscription: PushSubscription, vapidPublicKey = getVapidPublicKey()) {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey || !vapidPublicKey) {
    return false;
  }

  const expectedKey = urlBase64ToUint8Array(vapidPublicKey);
  const actualKey = new Uint8Array(currentKey);
  return expectedKey.length === actualKey.length && expectedKey.every((value, index) => value === actualKey[index]);
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
