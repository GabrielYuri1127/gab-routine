"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardList, Edit3, MapPin, NotebookTabs, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ActivityPanel } from "@/features/academic/components/activity-panel";
import { AttendanceQuickActions } from "@/features/academic/components/attendance-quick-actions";
import { GradePanel } from "@/features/academic/components/grade-panel";
import { SubjectSettingsPanel } from "@/features/academic/components/subject-settings-panel";
import { getSubjectScheduleLabel } from "@/features/academic/data/mock";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import type { SubjectStatus } from "@/types/academic";

const statusLabels: Record<SubjectStatus, string> = {
  active: "Ativa",
  archived: "Arquivada",
  completed: "Concluida",
  paused: "Pausada"
};

export function SubjectDetailView({ subjectId }: { subjectId: string }) {
  const { data } = useRoutineData();
  const subject = data.subjects.find((item) => item.id === subjectId);

  if (!subject) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-ink" href="/faculdade">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Faculdade
        </Link>
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-ink">Disciplina nao encontrada</h1>
          <p className="mt-2 text-sm text-slate-600">Ela pode ter sido removida ou ainda nao foi sincronizada neste dispositivo.</p>
        </div>
      </div>
    );
  }

  const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
  const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-ink" href="/faculdade">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Faculdade
        </Link>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="text-xs font-medium uppercase text-slate-400">{subject.code ?? subject.semester}</span>
                <Badge tone={getStatusTone(subject.status)}>{statusLabels[subject.status]}</Badge>
              </div>
              <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{subject.name}</h1>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <UserRound aria-hidden className="h-4 w-4" />
                  {subject.professor ?? "Professor nao informado"}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin aria-hidden className="h-4 w-4" />
                  {subject.room ?? "Sala nao informada"}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{getSubjectScheduleLabel(subject.schedules)}</p>
              {subject.observations ? <p className="mt-2 text-sm leading-6 text-slate-600">{subject.observations}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TopMetric label="Media" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
            <TopMetric label="Frequencia" value={`${Math.round(attendance.frequency)}%`} />
            <TopMetric label="Faltas" value={`${attendance.usedAbsences}/${attendance.absenceLimit}`} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickLink href="#editar" icon={Edit3} label="Editar" />
            <QuickLink href="#faltas" icon={ClipboardList} label="Faltas" />
            <QuickLink href="#notas" icon={NotebookTabs} label="Notas" />
            <QuickLink href="#atividades" icon={CalendarClock} label="Atividades" />
          </div>
        </div>
      </header>

      <SubjectSettingsPanel subject={subject} />
      <AttendanceQuickActions subject={subject} />
      <GradePanel subject={subject} />
      <ActivityPanel subject={subject} />
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Edit3; label: string }) {
  return (
    <a
      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
      href={href}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function TopMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function getStatusTone(status: SubjectStatus): "neutral" | "mint" | "gold" | "coral" {
  if (status === "active") {
    return "mint";
  }

  if (status === "paused") {
    return "gold";
  }

  if (status === "archived") {
    return "coral";
  }

  return "neutral";
}
