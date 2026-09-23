"use client";

import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import {
  getCurrentPushSubscription,
  getPushPermissionState,
  getVapidPublicKey,
  isPushSupported,
  pushSubscriptionToPayload,
  subscribeCurrentDevice,
  type PushPermissionState
} from "@/lib/notifications/browser-push";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type PanelStatus = "checking" | "idle" | "saving" | "testing" | "error";

const permissionLabels: Record<PushPermissionState, string> = {
  default: "nao solicitado",
  denied: "bloqueado",
  granted: "permitido",
  unsupported: "sem suporte"
};

export function PushNotificationsPanel() {
  const { cloud } = useRoutineData();
  const [status, setStatus] = useState<PanelStatus>("checking");
  const [permission, setPermission] = useState<PushPermissionState>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const [hasVapidKey, setHasVapidKey] = useState(false);
  const canUseCloud = cloud.configured && Boolean(cloud.userId);

  useEffect(() => {
    let active = true;

    async function loadState() {
      setStatus("checking");
      setError("");
      setServerSynced(false);
      const browserSupported = isPushSupported();
      setSupported(browserSupported);
      setHasVapidKey(Boolean(getVapidPublicKey()));

      if (!browserSupported) {
        setPermission("unsupported");
        setStatus("idle");
        return;
      }

      setPermission(getPushPermissionState());

      try {
        let subscription = await getCurrentPushSubscription();
        if (subscription && canUseCloud && getVapidPublicKey() && getPushPermissionState() === "granted") {
          subscription = await subscribeCurrentDevice();
          await saveSubscription(subscription);
          if (active) {
            setServerSynced(true);
          }
        }
        if (!active) {
          return;
        }

        setSubscribed(Boolean(subscription));
      } catch (caughtError) {
        if (active) {
          setSubscribed(false);
          setServerSynced(false);
          setError(caughtError instanceof Error ? caughtError.message : "Nao consegui sincronizar este aparelho.");
        }
      } finally {
        if (active) {
          setStatus("idle");
        }
      }
    }

    void loadState();

    return () => {
      active = false;
    };
  }, [canUseCloud, cloud.userId]);

  async function handleEnable() {
    setStatus("saving");
    setError("");
    setMessage("");

    try {
      ensureReady();
      const subscription = await subscribeCurrentDevice();
      await saveSubscription(subscription);
      setPermission(getPushPermissionState());
      setSubscribed(true);
      setServerSynced(true);
      setMessage("Notificacoes ativadas neste aparelho.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao consegui ativar notificacoes.");
      setStatus("error");
      return;
    }

    setStatus("idle");
  }

  async function handleDisable() {
    setStatus("saving");
    setError("");
    setMessage("");

    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        await removeSubscription(subscription);
        await subscription.unsubscribe();
      }

      setSubscribed(false);
      setServerSynced(false);
      setMessage("Notificacoes removidas deste aparelho.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao consegui remover notificacoes.");
      setStatus("error");
      return;
    }

    setStatus("idle");
  }

  async function handleTest() {
    setStatus("testing");
    setError("");
    setMessage("");

    try {
      ensureReady();
      const subscription = await subscribeCurrentDevice();
      await saveSubscription(subscription);
      setSubscribed(true);
      setServerSynced(true);
      const token = await getAccessToken();
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const body = (await response.json()) as {
        error?: string;
        expired?: number;
        failed?: number;
        sent?: number;
      };

      if (!response.ok || !body.sent) {
        throw new Error(body.error ?? "Falha no teste de notificacao.");
      }

      const cleaned = (body.expired ?? 0) + (body.failed ?? 0);
      setMessage(
        cleaned > 0
          ? `Teste recebido por ${body.sent} aparelho(s); ${cleaned} inscricao(oes) antiga(s) foram identificadas.`
          : `Teste enviado para ${body.sent} aparelho(s). Confira a central de notificacoes do Android.`
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao consegui enviar o teste.");
      setStatus("error");
      return;
    }

    setStatus("idle");
  }

  const busy = status === "saving" || status === "testing" || status === "checking";
  const blockedReason =
    status === "checking" ? "Verificando suporte a notificacoes..." : getBlockedReason({ canUseCloud, hasVapidKey, supported });

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Smartphone aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-foreground">Notificacoes no Android</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={subscribed ? "mint" : "gold"}>{subscribed ? "ativo" : "inativo"}</Badge>
            <Badge tone={permission === "granted" ? "sky" : "gold"}>{permissionLabels[permission]}</Badge>
            <Badge tone={canUseCloud ? "mint" : "coral"}>{canUseCloud ? "conta conectada" : "sem login"}</Badge>
            {subscribed && (
              <Badge tone={serverSynced ? "mint" : "gold"}>{serverSynced ? "servidor sincronizado" : "sincronizacao pendente"}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {subscribed ? (
            <Button disabled={busy} onClick={handleDisable} variant="secondary">
              {busy && status === "saving" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <BellOff aria-hidden className="h-4 w-4" />}
              Desativar
            </Button>
          ) : (
            <Button disabled={busy || Boolean(blockedReason)} onClick={handleEnable}>
              {busy && status === "saving" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Bell aria-hidden className="h-4 w-4" />}
              Ativar
            </Button>
          )}
          <Button disabled={busy || !subscribed || Boolean(blockedReason)} onClick={handleTest} variant="secondary">
            {busy && status === "testing" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
            Testar
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-line bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BellRing aria-hidden className="h-4 w-4 text-mint" />
          {blockedReason ?? "Aparelho pronto para receber lembretes push."}
        </p>
        {message && <p className="mt-2 text-sm text-mint">{message}</p>}
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      </div>
    </section>
  );
}

async function saveSubscription(subscription: PushSubscription) {
  const token = await getAccessToken();
  const response = await fetch("/api/notifications/subscribe", {
    body: JSON.stringify(pushSubscriptionToPayload(subscription)),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "Nao consegui salvar este aparelho.");
  }
}

async function removeSubscription(subscription: PushSubscription) {
  const token = await getAccessToken();
  const response = await fetch("/api/notifications/subscribe", {
    body: JSON.stringify({
      endpoint: subscription.endpoint
    }),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    method: "DELETE"
  });
  const body = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "Nao consegui remover este aparelho.");
  }
}

async function getAccessToken() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ainda nao foi configurado.");
  }

  const client = createSupabaseBrowserClient();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Entre na sua conta antes de ativar notificacoes.");
  }

  return token;
}

function ensureReady() {
  if (!isPushSupported()) {
    throw new Error("Este navegador nao tem suporte a notificacoes push.");
  }

  if (!getVapidPublicKey()) {
    throw new Error("Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY na Vercel.");
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Configure Supabase antes das notificacoes.");
  }
}

function getBlockedReason({
  canUseCloud,
  hasVapidKey,
  supported
}: {
  canUseCloud: boolean;
  hasVapidKey: boolean;
  supported: boolean;
}) {
  if (!supported) {
    return "Este navegador nao suporta push PWA.";
  }

  if (!hasVapidKey) {
    return "A chave publica VAPID ainda nao esta configurada.";
  }

  if (!canUseCloud) {
    return "Entre com sua conta para salvar o aparelho.";
  }

  return null;
}
