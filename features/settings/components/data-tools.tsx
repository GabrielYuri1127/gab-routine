"use client";

import { BellRing, Download, RotateCcw, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import type { RoutineData } from "@/features/data/seed";

const inputClass = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink";

export function DataTools() {
  const { data, replaceData, resetData, updateNotificationPreference } = useRoutineData();
  const [message, setMessage] = useState("");
  const preferences = data.notificationPreference;

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gab-routine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage("Backup baixado.");
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as RoutineData;
      replaceData(parsed);
      setMessage("Backup importado.");
    } catch {
      setMessage("Nao consegui ler esse arquivo.");
    } finally {
      event.target.value = "";
    }
  }

  function restoreExamples() {
    if (!window.confirm("Restaurar os dados de exemplo do Gab routine neste navegador?")) {
      return;
    }

    resetData();
    setMessage("Dados de exemplo restaurados.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BellRing aria-hidden className="h-5 w-5 text-mint" />
          <h2 className="text-lg font-semibold text-ink">Lembretes do dia</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-700">Resumo diario</span>
            <input
              className={inputClass}
              onChange={(event) => updateNotificationPreference({ dailySummaryTime: event.target.value })}
              type="time"
              value={preferences.dailySummaryTime}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Planejar amanha</span>
            <input
              className={inputClass}
              onChange={(event) => updateNotificationPreference({ tomorrowPlanningTime: event.target.value })}
              type="time"
              value={preferences.tomorrowPlanningTime}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Silencio comeca</span>
            <input
              className={inputClass}
              onChange={(event) => updateNotificationPreference({ quietHoursStart: event.target.value })}
              type="time"
              value={preferences.quietHoursStart}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Silencio termina</span>
            <input
              className={inputClass}
              onChange={(event) => updateNotificationPreference({ quietHoursEnd: event.target.value })}
              type="time"
              value={preferences.quietHoursEnd}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Backup local</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Os dados ficam salvos neste navegador enquanto o Supabase nao estiver conectado.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button onClick={exportData} variant="secondary">
            <Download aria-hidden className="h-4 w-4" />
            Exportar
          </Button>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-slate-50">
            <Upload aria-hidden className="h-4 w-4" />
            Importar
            <input accept="application/json,.json" className="sr-only" onChange={importData} type="file" />
          </label>
          <Button onClick={restoreExamples} variant="danger">
            <RotateCcw aria-hidden className="h-4 w-4" />
            Restaurar
          </Button>
        </div>

        {message ? <p className="mt-3 text-sm font-medium text-mint">{message}</p> : null}
      </section>
    </div>
  );
}
