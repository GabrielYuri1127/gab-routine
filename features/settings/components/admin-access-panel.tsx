"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Eye, History, Pencil, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAdminApi } from "@/lib/admin/browser-api";
import type { AdminAccessGrant, AdminAuditEntry } from "@/types/admin";

interface AccessPayload {
  audit?: AdminAuditEntry[];
  authenticated?: boolean;
  grant?: AdminAccessGrant | null;
  isAdmin?: boolean;
  schemaReady?: boolean;
}

const durations = [
  { label: "1 dia", value: 1 },
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 }
];

export function AdminAccessPanel() {
  const [payload, setPayload] = useState<AccessPayload | null>(null);
  const [durationDays, setDurationDays] = useState(7);
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchAdminApi("/api/admin/access")
      .then(async (response) => {
        if (!active || !response?.ok) return;
        const nextPayload = (await response.json()) as AccessPayload;
        setPayload(nextPayload);
        setCanEdit(Boolean(nextPayload.grant?.canEdit));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const activeGrant = useMemo(() => {
    const grant = payload?.grant;
    return Boolean(
      grant &&
        !grant.revokedAt &&
        Number.isFinite(new Date(grant.expiresAt).getTime()) &&
        new Date(grant.expiresAt).getTime() > Date.now()
    );
  }, [payload?.grant]);

  if (!payload?.authenticated || payload.schemaReady !== true) {
    return null;
  }

  async function saveAccess(enabled: boolean) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetchAdminApi("/api/admin/access", {
        body: JSON.stringify({ canEdit, durationDays, enabled }),
        headers: { "Content-Type": "application/json" },
        method: "PUT"
      });
      const next = response ? ((await response.json().catch(() => null)) as { grant?: AdminAccessGrant } | null) : null;
      if (!response?.ok || !next?.grant) {
        throw new Error("Nao foi possivel atualizar a autorizacao.");
      }

      setPayload((current) => (current ? { ...current, grant: next.grant } : current));
      setMessage(enabled ? "Acesso autorizado com sucesso." : "Acesso revogado. O administrador nao pode mais consultar seus dados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a autorizacao.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-mint">
            <ShieldCheck aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Acesso de suporte</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Autorize ajuda na sua rotina por tempo limitado. Senha, login e credenciais do Classroom nunca ficam disponiveis ao administrador.
            </p>
          </div>
        </div>
        <Badge tone={activeGrant ? "mint" : "neutral"}>{activeGrant ? "Autorizado" : "Desativado"}</Badge>
      </div>

      {activeGrant && payload.grant ? (
        <div className="mt-4 grid gap-3 border-y border-line py-4 sm:grid-cols-2">
          <StatusLine icon={Clock3} label="Valido ate" value={formatDateTime(payload.grant.expiresAt)} />
          <StatusLine
            icon={payload.grant.canEdit ? Pencil : Eye}
            label="Permissao"
            value={payload.grant.canEdit ? "Consultar e editar" : "Somente consultar"}
          />
        </div>
      ) : (
        <div className="mt-4 border-y border-line py-4 text-sm leading-6 text-slate-600">
          Nenhum administrador consegue ver sua conta sem esta autorizacao. Voce pode revogar o acesso a qualquer momento.
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.7fr)]">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Duracao do acesso</legend>
          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-lg border border-line">
            {durations.map((duration) => (
              <button
                className={`h-10 border-r border-line text-sm font-medium last:border-r-0 ${
                  durationDays === duration.value ? "bg-contrast text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                key={duration.value}
                onClick={() => setDurationDays(duration.value)}
                type="button"
              >
                {duration.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-14 items-center gap-3 rounded-lg border border-line px-3 py-2">
          <input
            checked={canEdit}
            className="h-4 w-4 rounded border-line"
            onChange={(event) => setCanEdit(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Permitir correcoes</span>
            <span className="block text-xs leading-5 text-slate-500">Editar perfil, disciplinas, tarefas e lembretes.</span>
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button disabled={working} onClick={() => void saveAccess(true)}>
          <ShieldCheck aria-hidden className="h-4 w-4" />
          {working ? "Salvando..." : activeGrant ? "Renovar autorizacao" : "Autorizar suporte"}
        </Button>
        {activeGrant ? (
          <Button disabled={working} onClick={() => void saveAccess(false)} variant="secondary">
            <ShieldX aria-hidden className="h-4 w-4" />
            Revogar agora
          </Button>
        ) : null}
        {payload.isAdmin ? (
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-foreground hover:bg-slate-50 sm:ml-auto"
            href="/admin"
          >
            Painel administrativo
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm font-medium text-slate-600">{message}</p> : null}

      {payload.audit?.length ? (
        <details className="mt-4 border-t border-line pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700">
            <History aria-hidden className="h-4 w-4" />
            Historico de acesso
          </summary>
          <div className="mt-3 divide-y divide-line">
            {payload.audit.slice(0, 5).map((entry) => (
              <div className="py-2 text-xs leading-5 text-slate-500" key={entry.id}>
                <p className="font-medium text-slate-700">{entry.summary}</p>
                <p>{formatDateTime(entry.createdAt)} - {entry.actorLabel}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function StatusLine({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon aria-hidden className="h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
