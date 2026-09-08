"use client";

import { CalendarClock, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { getRecentClassDates, isClassDate } from "@/lib/academic-rules/schedule";
import { formatShortDate, getTodayInAppTimeZone } from "@/lib/date";
import { cn } from "@/lib/utils";
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
  const today = getTodayInAppTimeZone();
  const [mode, setMode] = useState<"simple" | "complete">("simple");
  const [date, setDate] = useState(today);
  const [quantity, setQuantity] = useState(String(subject.rules.classesPerMeeting));
  const [status, setStatus] = useState<AttendanceRecord["status"]>("absence");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<{ message: string; recordId: string } | null>(null);

  useEffect(() => {
    setQuantity(String(subject.rules.classesPerMeeting));
  }, [subject.id, subject.rules.classesPerMeeting]);

  const summary = useMemo(
    () => calculateAttendanceSummary(records, subject.rules, subject.name),
    [records, subject.name, subject.rules]
  );
  const recentClassDates = useMemo(() => getRecentClassDates(subject, today, 50).slice(0, 8), [subject, today]);
  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records]);
  const selectedIsClassDate = isClassDate(subject, date);

  function addRecord(recordQuantity: number, recordStatus: AttendanceRecord["status"], recordDate = today, recordNotes = "") {
    const cleanQuantity = Math.max(0, Math.floor(recordQuantity));
    if (!recordDate || cleanQuantity <= 0) {
      return;
    }

    const record: AttendanceRecord = {
      id: `${subject.id}-${recordStatus}-${recordDate}-${Date.now()}`,
      subjectId: subject.id,
      date: recordDate,
      quantity: cleanQuantity,
      status: recordStatus,
      notes: recordNotes.trim() || undefined
    };

    addAttendanceRecord(subject.id, record);
    setToast({
      recordId: record.id,
      message:
        recordStatus === "absence"
          ? `${cleanQuantity} ${cleanQuantity === 1 ? "falta registrada" : "faltas registradas"} em ${formatShortDate(recordDate)}.`
          : `${statusLabels[recordStatus]} registrado em ${formatShortDate(recordDate)}.`
    });
  }

  function handleCustomSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addRecord(Number(quantity), status, date, notes);
    setNotes("");
  }

  function undo(recordId: string) {
    removeAttendanceRecord(subject.id, recordId);
    setToast(null);
  }

  return (
    <section className="space-y-4" id="faltas">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Faltas</h2>
          <p className="mt-1 text-sm text-slate-500">Registre hoje, uma data antiga, presenca, justificativa ou aula cancelada.</p>
        </div>
        <div className="flex w-full rounded-lg border border-line bg-white p-1 sm:w-auto">
          <button
            className={`h-9 flex-1 rounded-md px-3 text-sm sm:flex-none ${mode === "simple" ? "bg-ink text-white" : "text-slate-500"}`}
            onClick={() => setMode("simple")}
            type="button"
          >
            Rapido
          </button>
          <button
            className={`h-9 flex-1 rounded-md px-3 text-sm sm:flex-none ${mode === "complete" ? "bg-ink text-white" : "text-slate-500"}`}
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Registrar hoje</p>
          <Badge tone="neutral">{formatShortDate(today)}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3].map((item) => (
            <Button key={item} onClick={() => addRecord(item, "absence")} variant={item === 2 ? "primary" : "secondary"}>
              +{item}
            </Button>
          ))}
          <Button onClick={() => addRecord(subject.rules.classesPerMeeting, "absence")} variant="secondary">
            Padrao
          </Button>
        </div>
      </div>

      <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleCustomSubmit}>
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock aria-hidden className="h-5 w-5 text-mint" />
          <h3 className="text-sm font-semibold text-ink">Registrar data passada</h3>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {recentClassDates.map((option) => (
            <button
              className={cn(
                "shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-left text-xs text-slate-600",
                date === option.date && "border-ink bg-ink text-white"
              )}
              key={option.date}
              onClick={() => {
                setDate(option.date);
                setQuantity(String(option.classesQuantity));
              }}
              type="button"
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block opacity-75">{option.alreadyRegistered ? "ja tem registro" : `${option.classesQuantity} aulas`}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[150px_100px_180px_1fr]">
          <label>
            <span className="text-sm font-medium text-slate-700">Data</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              max={today}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Aulas</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              min={1}
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              value={quantity}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Tipo</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setStatus(event.target.value as AttendanceRecord["status"])}
              value={status}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Observacao</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: esqueci de registrar"
              value={notes}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {selectedIsClassDate ? "Essa data bate com seu horario cadastrado." : "Data livre: use para ajustes, reposicoes ou registros manuais."}
          </p>
          <Button type="submit">Salvar registro</Button>
        </div>

        {mode === "complete" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => addRecord(Number(quantity), "present", date, notes)} variant="secondary">
              Marcar presenca
            </Button>
            <Button onClick={() => addRecord(Number(quantity), "cancelled", date, notes)} variant="secondary">
              Aula cancelada
            </Button>
          </div>
        ) : null}
      </form>

      <div className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Historico editavel</h3>
        </div>
        <div className="divide-y divide-line">
          {sortedRecords.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">Nenhum registro ainda.</p>
          ) : (
            sortedRecords.map((record) => (
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-[130px_90px_160px_1fr_44px]" key={record.id}>
                <label className="text-xs text-slate-500">
                  Data
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
                    onChange={(event) => updateAttendanceRecord(subject.id, record.id, { date: event.target.value })}
                    type="date"
                    value={record.date}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Qtd.
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
                    min={0}
                    onChange={(event) => updateAttendanceRecord(subject.id, record.id, { quantity: Number(event.target.value) })}
                    type="number"
                    value={record.quantity}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Status
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink"
                    onChange={(event) => updateAttendanceRecord(subject.id, record.id, { status: event.target.value as AttendanceRecord["status"] })}
                    value={record.status}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Observacao
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
                    onChange={(event) => updateAttendanceRecord(subject.id, record.id, { notes: event.target.value || undefined })}
                    placeholder={statusLabels[record.status]}
                    value={record.notes ?? ""}
                  />
                </label>
                <Button aria-label="Excluir registro" onClick={() => removeAttendanceRecord(subject.id, record.id)} size="icon" variant="ghost">
                  <Trash2 aria-hidden className="h-4 w-4" />
                </Button>
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
