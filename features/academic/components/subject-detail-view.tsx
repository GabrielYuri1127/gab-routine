"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  MapPin,
  NotebookTabs,
  Settings2,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ActivityPanel } from "@/features/academic/components/activity-panel";
import { AttendanceQuickActions } from "@/features/academic/components/attendance-quick-actions";
import { GradePanel } from "@/features/academic/components/grade-panel";
import { ResourcePanel } from "@/features/academic/components/resource-panel";
import { SubjectSettingsPanel } from "@/features/academic/components/subject-settings-panel";
import { getSubjectScheduleLabel } from "@/features/academic/data/mock";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ActivityType, Subject, SubjectStatus } from "@/types/academic";

type SubjectTab = "overview" | "attendance" | "grades" | "activities" | "resources" | "settings";

const statusLabels: Record<SubjectStatus, string> = {
  active: "Em andamento",
  archived: "Arquivada",
  completed: "Concluída",
  failed: "Reprovada",
  paused: "Trancada",
  planned: "Planejada"
};

const tabs: Array<{ id: SubjectTab; label: string; icon: typeof BookOpen }> = [
  { id: "overview", label: "Visão geral", icon: BookOpen },
  { id: "attendance", label: "Faltas", icon: ClipboardList },
  { id: "grades", label: "Notas", icon: NotebookTabs },
  { id: "activities", label: "Atividades", icon: CalendarClock },
  { id: "resources", label: "Materiais", icon: FolderOpen },
  { id: "settings", label: "Configurações", icon: Settings2 }
];

const hashTabs: Record<string, SubjectTab> = {
  "#atividades": "activities",
  "#editar": "settings",
  "#faltas": "attendance",
  "#materiais": "resources",
  "#notas": "grades"
};

const activityTypeLabels: Record<ActivityType, string> = {
  activity: "Atividade",
  exam: "Prova",
  exercise: "Exercício",
  lab: "Laboratório",
  list: "Lista",
  other: "Outro",
  presentation: "Apresentação",
  project: "Projeto",
  report: "Relatório",
  seminar: "Seminário",
  work: "Trabalho"
};

export function SubjectDetailView({ subjectId }: { subjectId: string }) {
  const { data } = useRoutineData();
  const subject = data.subjects.find((item) => item.id === subjectId);
  const [tab, setTab] = useState<SubjectTab>("overview");

  useEffect(() => {
    function syncTabWithHash() {
      setTab(hashTabs[window.location.hash] ?? "overview");
    }

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);
    return () => window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  if (!subject) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-foreground" href="/faculdade">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Faculdade
        </Link>
        <div className="border-y border-line py-8">
          <h1 className="text-xl font-semibold text-foreground">Disciplina não encontrada</h1>
          <p className="mt-2 text-sm text-slate-600">Ela pode ter sido removida ou ainda não foi sincronizada neste dispositivo.</p>
        </div>
      </div>
    );
  }

  const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
  const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);

  function changeTab(nextTab: SubjectTab) {
    const hash = Object.entries(hashTabs).find(([, value]) => value === nextTab)?.[0] ?? "";
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    setTab(nextTab);
  }

  return (
    <div className="space-y-6">
      <header>
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-foreground" href="/faculdade">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Faculdade
        </Link>

        <div className="mt-4 grid gap-5 border-y border-line bg-white py-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
              <span className="text-xs font-medium text-slate-500">{subject.code ?? subject.semester}</span>
              <Badge tone={getStatusTone(subject.status)}>{statusLabels[subject.status]}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">{subject.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <UserRound aria-hidden className="h-4 w-4" />
                {subject.professor ?? "Professor não informado"}
              </span>
              <span className="flex items-center gap-2">
                <MapPin aria-hidden className="h-4 w-4" />
                {subject.room ?? "Local não informado"}
              </span>
              <span className="flex items-center gap-2">
                <CalendarClock aria-hidden className="h-4 w-4" />
                {getSubjectScheduleLabel(subject.schedules)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
            <HeroMetric label="Média" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
            <HeroMetric alert={attendance.alertLevel !== "normal"} label="Frequência" value={`${Math.round(attendance.frequency)}%`} />
            <HeroMetric label="Faltas" value={`${attendance.usedAbsences}/${attendance.absenceLimit}`} />
          </div>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da disciplina">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition",
                active ? "border-strong text-foreground" : "border-transparent text-slate-500 hover:text-foreground"
              )}
              key={item.id}
              onClick={() => changeTab(item.id)}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <SubjectOverview
          attendance={attendance}
          average={average}
          onTabChange={changeTab}
          subject={subject}
        />
      ) : null}
      {tab === "attendance" ? <AttendanceQuickActions subject={subject} /> : null}
      {tab === "grades" ? <GradePanel subject={subject} /> : null}
      {tab === "activities" ? <ActivityPanel subject={subject} /> : null}
      {tab === "resources" ? <ResourcePanel subject={subject} /> : null}
      {tab === "settings" ? <SubjectSettingsPanel defaultOpen subject={subject} /> : null}
    </div>
  );
}

function SubjectOverview({
  attendance,
  average,
  onTabChange,
  subject
}: {
  attendance: ReturnType<typeof calculateAttendanceSummary>;
  average: number | null;
  onTabChange: (tab: SubjectTab) => void;
  subject: Subject;
}) {
  const pendingActivities = useMemo(
    () =>
      subject.activities
        .filter((activity) => !["submitted", "corrected"].includes(activity.status))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [subject.activities]
  );
  const nextActivity = pendingActivities[0];
  const gradeTarget = average === null ? "Cadastre a primeira nota" : average >= subject.rules.minimumFinalGrade ? "Média acima do mínimo" : "Média abaixo do mínimo";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
      <section>
        <p className="text-xs font-semibold uppercase text-slate-400">Resumo</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Situação da disciplina</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <OverviewAction
            detail={`${attendance.remainingAbsences} faltas ainda disponíveis`}
            icon={ClipboardList}
            label="Frequência"
            onClick={() => onTabChange("attendance")}
            status={attendance.alertTitle}
            tone={attendance.alertLevel === "normal" ? "mint" : "coral"}
          />
          <OverviewAction
            detail={gradeTarget}
            icon={NotebookTabs}
            label="Notas"
            onClick={() => onTabChange("grades")}
            status={average === null ? "Sem notas" : average.toFixed(1).replace(".", ",")}
            tone={average !== null && average < subject.rules.minimumFinalGrade ? "coral" : "sky"}
          />
          <OverviewAction
            detail={nextActivity ? `Próxima em ${formatShortDate(nextActivity.dueDate)}` : "Nenhum prazo pendente"}
            icon={CalendarClock}
            label="Atividades"
            onClick={() => onTabChange("activities")}
            status={`${pendingActivities.length} abertas`}
            tone={pendingActivities.length ? "gold" : "mint"}
          />
        </div>

        {subject.observations ? (
          <div className="mt-6 border-y border-line py-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Observações</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subject.observations}</p>
          </div>
        ) : null}
      </section>

      <aside className="rounded-md border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Próximas entregas</p>
        </div>
        {pendingActivities.length ? (
          pendingActivities.slice(0, 5).map((activity) => (
            <button
              className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
              key={activity.id}
              onClick={() => onTabChange("activities")}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{activity.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{activityTypeLabels[activity.type]}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-slate-600">{formatShortDate(activity.dueDate)}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 aria-hidden className="mx-auto h-6 w-6 text-mint" />
            <p className="mt-2 text-sm font-medium text-foreground">Tudo entregue</p>
            <p className="mt-1 text-xs text-slate-500">Nenhuma atividade pendente.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function OverviewAction({
  detail,
  icon: Icon,
  label,
  onClick,
  status,
  tone
}: {
  detail: string;
  icon: typeof BookOpen;
  label: string;
  onClick: () => void;
  status: string;
  tone: "mint" | "sky" | "gold" | "coral";
}) {
  const toneClasses = {
    coral: "bg-red-50 text-coral",
    gold: "bg-amber-50 text-gold",
    mint: "bg-emerald-50 text-mint",
    sky: "bg-sky-50 text-sky"
  };

  return (
    <button
      className="min-h-36 rounded-md border border-line bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-sm"
      onClick={onClick}
      type="button"
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClasses[tone])}>
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="mt-4 block text-xs text-slate-500">{label}</span>
      <span className="mt-1 block text-lg font-semibold text-foreground">{status}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
    </button>
  );
}

function HeroMetric({ alert = false, label, value }: { alert?: boolean; label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold text-foreground", alert && "text-coral")}>{value}</p>
    </div>
  );
}

function getStatusTone(status: SubjectStatus): "neutral" | "mint" | "gold" | "coral" {
  if (status === "active") return "mint";
  if (status === "paused" || status === "planned") return "gold";
  if (status === "archived" || status === "failed") return "coral";
  return "neutral";
}
