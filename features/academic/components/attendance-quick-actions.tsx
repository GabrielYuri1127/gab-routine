"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { getTodayInAppTimeZone } from "@/lib/date";
import type { AttendanceRecord, Subject } from "@/types/academic";

const statusLabels: Record<AttendanceRecord["status"], string> = {
  absence: "Falta",
  justified: "Falta justificada",
  present: "Presente",
  cancelled: "Aula cancelada"
};

export function AttendanceQuickActions({ subject }: { subject: Subject }) {
  const { addAttendanceRecord, removeAttendanceRecord, updateAttendanceRecord } = useRoutineData();
  const records = subject.attendance;
  const [mode, setMode] = useState<"simple" | "complete">("simple");
  const [toast, setToast] = useState<{ message: string; recordId: string } | null>(null);
  const summary = useMemo(
    () => calculateAttendanceSummary(records, subject.rules, subject.name),
    [records, subject.name, subject.rules]
  );

  function addRecord(quantity: number, status: AttendanceRecord["status"]) {
    const record: AttendanceRecord = {
      id: `${subject.id}-${status}-${Date.now()}`,
      subjectId: subject.id,
      date: getTodayInAppTimeZone(),
      quantity,
      status
    };

    addAttendanceRecord(subject.id, record);
    setToast({
      recordId: record.id,
      message:
        status === "absence"
          ? `${quantity} ${quantity === 1 ? "falta registrada" : "faltas registradas"}.`
          : `${statusLabels[status]} registrado.`
    });
  }

  function undo(recordId: string) {
    removeAttendanceRecord(subject.id, recordId);
    setToast(null);
  }

  return (
    <section className="space-y-4" id="faltas">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Faltas</h2>
          <p className="mt-1 text-sm text-slate-500">Modo rapido por padrao, com historico editavel.</p>
        </div>
        <div className="flex rounded-lg border border-line bg-white p-1">
          <button
            className={`h-9 rounded-md px-3 text-sm ${mode === "simple" ? "bg-ink text-white" : "text-slate-500"}`}
            onClick={() => setMode("simple")}
            type="button"
          >
            Simples
          </button>
          <button
            className={`h-9 rounded-md px-3 text-sm ${mode === "complete" ? "bg-ink text-white" : "text-slate-500"}`}
            onClick={() => setMode("complete")}
            type="button"
          >
            Completo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Frequencia" value={`${summary.frequency.toFixed(1).replace(".", ",")}%`} />
        <Metric label="Faltas" value={`${summary.usedAbsences} / ${summary.absenceLimit}`} />
        <Metric label="Limite usado" value={`${Math.round(summary.limitUsagePercent)}%`} />
        <Metric label="Restam" value={`${summary.remainingAbsences}`} />
      </div>

      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge
            tone={
              summary.alertLevel === "normal" ? "mint" : summary.alertLevel === "attention" ? "gold" : "coral"
            }
          >
            {summary.alertTitle}
          </Badge>
          <span className="text-xs text-slate-500">{subject.rules.minimumAttendance}% minimo</span>
        </div>
        <Progress
          tone={summary.alertLevel === "normal" ? "mint" : summary.alertLevel === "attention" ? "gold" : "coral"}
          value={summary.limitUsagePercent}
        />
        <p className="mt-3 text-sm leading-6 text-slate-600">{summary.alertMessage}</p>
      </div>

      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-700">Registrar hoje</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3].map((quantity) => (
            <Button key={quantity} onClick={() => addRecord(quantity, "absence")} variant={quantity === 2 ? "primary" : "secondary"}>
              +{quantity}
            </Button>
          ))}
          <Button onClick={() => addRecord(subject.rules.classesPerMeeting, "absence")} variant="secondary">
            Padrao
          </Button>
        </div>

        {mode === "complete" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => addRecord(subject.rules.classesPerMeeting, "present")} variant="secondary">
              Presente
            </Button>
            <Button onClick={() => addRecord(subject.rules.classesPerMeeting, "cancelled")} variant="secondary">
              Aula cancelada
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Historico</h3>
        </div>
        <div className="divide-y divide-line">
          {records.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">Nenhum registro ainda.</p>
          ) : (
            records.map((record) => (
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_130px_160px]" key={record.id}>
                <div>
                  <p className="text-sm font-medium text-ink">{formatDate(record.date)}</p>
                  <p className="text-xs text-slate-500">{record.notes ?? statusLabels[record.status]}</p>
                </div>
                <label className="text-xs text-slate-500">
                  Qtd.
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
                    min={0}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      updateAttendanceRecord(subject.id, record.id, { quantity });
                    }}
                    type="number"
                    value={record.quantity}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Status
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink"
                    onChange={(event) => {
                      const status = event.target.value as AttendanceRecord["status"];
                      updateAttendanceRecord(subject.id, record.id, { status });
                    }}
                    value={record.status}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {toast ? (
        <div className="fixed inset-x-4 bottom-24 z-50 flex items-center justify-between gap-3 rounded-lg bg-ink px-4 py-3 text-white shadow-soft lg:left-auto lg:right-8 lg:w-96">
          <span className="text-sm">{toast.message}</span>
          <button
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-white hover:bg-white/10"
            onClick={() => undo(toast.recordId)}
            type="button"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Desfazer
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}
