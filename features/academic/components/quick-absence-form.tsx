"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { getRecentClassDates, isClassDate } from "@/lib/academic-rules/schedule";
import { formatShortDate, getTodayInAppTimeZone } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/academic";

export function QuickAbsenceForm() {
  const { data, addAttendanceRecord, removeAttendanceRecord } = useRoutineData();
  const subjects = data.subjects.filter((subject) => subject.status === "active");
  const today = getTodayInAppTimeZone();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<{ subjectName: string; quantity: number; recordId: string; date: string } | null>(null);
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects[0];
  const summary = useMemo(
    () => selectedSubject ? calculateAttendanceSummary(selectedSubject.attendance, selectedSubject.rules, selectedSubject.name) : null,
    [selectedSubject]
  );
  const recentClassDates = useMemo(
    () => selectedSubject ? getRecentClassDates(selectedSubject, today, 50).slice(0, 8) : [],
    [selectedSubject, today]
  );

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(subjects[0].id);
    }
  }, [subjectId, subjects]);

  function registerAbsence(quantity: number) {
    if (!selectedSubject || !date) {
      return;
    }

    const record: AttendanceRecord = {
      id: `${selectedSubject.id}-quick-${date}-${Date.now()}`,
      subjectId: selectedSubject.id,
      date,
      quantity,
      status: "absence",
      notes: notes.trim() || undefined
    };

    addAttendanceRecord(selectedSubject.id, record);
    setToast({ subjectName: selectedSubject.name, quantity, recordId: record.id, date });
    setNotes("");
  }

  function undo() {
    if (!toast) {
      return;
    }

    const subject = subjects.find((item) => item.name === toast.subjectName);
    if (subject) {
      removeAttendanceRecord(subject.id, toast.recordId);
    }
    setToast(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Acao rapida</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Registrar falta</h1>
        <p className="mt-2 text-sm text-slate-600">Escolha a area, ajuste a data e toque na quantidade.</p>
      </header>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-slate-700">Area</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setSubjectId(event.target.value)}
              value={subjectId}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Data da aula</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              max={today}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
        </div>

        {selectedSubject && summary ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini label="Frequencia" value={`${Math.round(summary.frequency)}%`} />
            <Mini label="Faltas" value={`${summary.usedAbsences}/${summary.absenceLimit}`} />
            <Mini label="Restam" value={`${summary.remainingAbsences}`} />
          </div>
        ) : null}

        {recentClassDates.length ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {recentClassDates.map((option) => (
              <button
                className={cn(
                  "shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-left text-xs text-slate-600",
                  option.date === date && "border-ink bg-ink text-white"
                )}
                key={option.date}
                onClick={() => setDate(option.date)}
                type="button"
              >
                <span className="block font-semibold">{option.label}</span>
                <span className="block opacity-75">{option.alreadyRegistered ? "ja tem" : `${option.classesQuantity} registros`}</span>
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Observacao</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: aula de semana passada"
            value={notes}
          />
        </label>

        <p className="mt-3 text-xs text-slate-500">
          {selectedSubject && isClassDate(selectedSubject, date)
            ? "Essa data bate com seu horario fixo cadastrado."
            : "Voce tambem pode registrar uma data manual para ajustes."}
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {[1, 2, 3].map((quantity) => (
            <Button key={quantity} onClick={() => registerAbsence(quantity)} variant={quantity === 2 ? "primary" : "secondary"}>
              +{quantity}
            </Button>
          ))}
          <Button onClick={() => registerAbsence(selectedSubject?.rules.classesPerMeeting ?? 1)} variant="secondary">
            Padrao
          </Button>
        </div>

        {selectedSubject ? (
          <Link className="mt-4 flex items-center justify-between rounded-lg border border-line px-3 py-3 text-sm font-medium text-ink" href={`/faculdade/${selectedSubject.id}`}>
            Abrir area
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </section>

      {toast ? (
        <div className="rounded-lg bg-ink px-4 py-3 text-white shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {toast.quantity} {toast.quantity === 1 ? "falta registrada" : "faltas registradas"} em {toast.subjectName} no dia{" "}
              {formatShortDate(toast.date)}.
            </p>
            <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-white/10" onClick={undo} type="button">
              <RotateCcw aria-hidden className="h-4 w-4" />
              Desfazer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
