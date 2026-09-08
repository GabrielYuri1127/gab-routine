"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { getTodayInAppTimeZone } from "@/lib/date";
import { mockSubjects } from "@/features/academic/data/mock";
import type { AttendanceRecord, Subject } from "@/types/academic";

export function QuickAbsenceForm() {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [subjectId, setSubjectId] = useState(mockSubjects[0]?.id ?? "");
  const [toast, setToast] = useState<{ subjectName: string; quantity: number; recordId: string } | null>(null);
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects[0];
  const summary = useMemo(
    () => selectedSubject ? calculateAttendanceSummary(selectedSubject.attendance, selectedSubject.rules, selectedSubject.name) : null,
    [selectedSubject]
  );

  function registerAbsence(quantity: number) {
    if (!selectedSubject) {
      return;
    }

    const record: AttendanceRecord = {
      id: `${selectedSubject.id}-quick-${Date.now()}`,
      subjectId: selectedSubject.id,
      date: getTodayInAppTimeZone(),
      quantity,
      status: "absence"
    };

    setSubjects((current) =>
      current.map((subject) =>
        subject.id === selectedSubject.id ? { ...subject, attendance: [record, ...subject.attendance] } : subject
      )
    );
    setToast({ subjectName: selectedSubject.name, quantity, recordId: record.id });
  }

  function undo() {
    if (!toast) {
      return;
    }

    setSubjects((current) =>
      current.map((subject) => ({
        ...subject,
        attendance: subject.attendance.filter((record) => record.id !== toast.recordId)
      }))
    );
    setToast(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Acao rapida</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Registrar falta</h1>
        <p className="mt-2 text-sm text-slate-600">Escolha a disciplina e toque na quantidade. Sem formulario comprido.</p>
      </header>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <label>
          <span className="text-sm font-medium text-slate-700">Disciplina</span>
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

        {selectedSubject && summary ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini label="Frequencia" value={`${Math.round(summary.frequency)}%`} />
            <Mini label="Faltas" value={`${summary.usedAbsences}/${summary.absenceLimit}`} />
            <Mini label="Restam" value={`${summary.remainingAbsences}`} />
          </div>
        ) : null}

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
            Abrir disciplina
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </section>

      {toast ? (
        <div className="rounded-lg bg-ink px-4 py-3 text-white shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {toast.quantity} {toast.quantity === 1 ? "falta registrada" : "faltas registradas"} em {toast.subjectName}.
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
