import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, UserRound } from "lucide-react";

import { ActivityPanel } from "@/features/academic/components/activity-panel";
import { AttendanceQuickActions } from "@/features/academic/components/attendance-quick-actions";
import { GradePanel } from "@/features/academic/components/grade-panel";
import { getSubjectById, getSubjectScheduleLabel, mockSubjects } from "@/features/academic/data/mock";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";

export function generateStaticParams() {
  return mockSubjects.map((subject) => ({ id: subject.id }));
}

export default function SubjectPage({ params }: { params: { id: string } }) {
  const subject = getSubjectById(params.id);

  if (!subject) {
    notFound();
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
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TopMetric label="Media" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
            <TopMetric label="Frequencia" value={`${Math.round(attendance.frequency)}%`} />
            <TopMetric label="Faltas" value={`${attendance.usedAbsences}/${attendance.absenceLimit}`} />
          </div>
        </div>
      </header>

      <AttendanceQuickActions subject={subject} />
      <GradePanel subject={subject} />
      <ActivityPanel subject={subject} />
    </div>
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
