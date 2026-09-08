import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import { getCurrentWeekday } from "@/lib/date";
import type { Subject } from "@/types/academic";

export function SubjectCard({ subject }: { subject: Subject }) {
  const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
  const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
  const todaySchedule = subject.schedules.find((schedule) => schedule.weekday === getCurrentWeekday());
  const pendingActivities = subject.activities.filter(
    (activity) => activity.status !== "submitted" && activity.status !== "corrected"
  ).length;

  return (
    <Link
      className="block rounded-lg border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
      href={`/faculdade/${subject.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
            <Badge tone="neutral">{subject.code ?? subject.semester}</Badge>
          </div>
          <h2 className="truncate text-sm font-semibold uppercase text-ink">{subject.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock aria-hidden className="h-3.5 w-3.5" />
            {todaySchedule ? `Hoje • ${todaySchedule.startTime}` : subject.professor ?? "Sem aula hoje"}
          </p>
        </div>
        <ArrowRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Media" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
        <Metric label="Frequencia" value={`${Math.round(attendance.frequency)}%`} />
        <Metric label="Faltas" value={`${attendance.usedAbsences} / ${attendance.absenceLimit}`} />
      </div>

      <div className="mt-4">
        <Progress
          tone={attendance.alertLevel === "normal" ? "mint" : attendance.alertLevel === "attention" ? "gold" : "coral"}
          value={attendance.limitUsagePercent}
        />
        <p className="mt-2 text-xs text-slate-500">
          {pendingActivities} {pendingActivities === 1 ? "atividade pendente" : "atividades pendentes"}
        </p>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
