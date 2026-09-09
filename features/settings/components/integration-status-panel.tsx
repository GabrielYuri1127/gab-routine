"use client";

import { AlertCircle, CheckCircle2, Clock3, Rocket, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { IntegrationStatusItem, IntegrationStatusReport, IntegrationState } from "@/lib/integrations/status";

const stateLabels: Record<IntegrationState, string> = {
  future: "futuro",
  needs_setup: "falta configurar",
  optional: "opcional",
  ready: "pronto"
};

const stateTones: Record<IntegrationState, "coral" | "gold" | "mint" | "neutral" | "sky"> = {
  future: "neutral",
  needs_setup: "gold",
  optional: "sky",
  ready: "mint"
};

export function IntegrationStatusPanel() {
  const [report, setReport] = useState<IntegrationStatusReport | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/integrations/status")
      .then((response) => response.json())
      .then((payload: IntegrationStatusReport) => {
        if (active) {
          setReport(payload);
        }
      })
      .catch(() => {
        if (active) {
          setReport(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const nowItems = useMemo(() => report?.items.filter((item) => item.category === "agora") ?? [], [report]);
  const futureItems = useMemo(() => report?.items.filter((item) => item.category === "futuro") ?? [], [report]);
  const missingCount = nowItems.filter((item) => item.state === "needs_setup").length;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Rocket aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-ink">Status de publicacao</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Veja o que precisa ser resolvido agora e o que fica como melhoria futura.
          </p>
        </div>
        <Badge tone={missingCount ? "gold" : "mint"}>{missingCount ? `${missingCount} pendente(s)` : "base pronta"}</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {report ? nowItems.map((item) => <StatusCard item={item} key={item.id} />) : <LoadingCard />}
      </div>

      <div className="pt-2">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 aria-hidden className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-ink">Melhorias futuras</h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {report ? futureItems.map((item) => <StatusCard item={item} key={item.id} />) : <LoadingCard />}
        </div>
      </div>
    </section>
  );
}

function StatusCard({ item }: { item: IntegrationStatusItem }) {
  const Icon = item.state === "ready" ? CheckCircle2 : item.state === "future" ? Clock3 : item.state === "optional" ? Settings2 : AlertCircle;

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-slate-500" />
          <h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3>
        </div>
        <Badge tone={stateTones[item.state]}>{stateLabels[item.state]}</Badge>
      </div>

      <p className="text-sm leading-6 text-slate-600">{item.detail}</p>
      <p className="mt-3 text-sm font-medium text-ink">{item.nextStep}</p>

      {item.missing.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.missing.map((missing) => (
            <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700" key={missing}>
              {missing}
            </code>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="h-5 w-36 rounded bg-slate-100" />
      <div className="mt-4 h-4 w-full rounded bg-slate-100" />
      <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
    </div>
  );
}
