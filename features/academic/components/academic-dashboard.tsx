"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  CircleDashed,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Search,
  Settings2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AcademicImportDialog } from "@/features/academic/components/academic-import-dialog";
import { SubjectCard } from "@/features/academic/components/subject-card";
import { SubjectCreateForm, type SubjectCreateDraft } from "@/features/academic/components/subject-create-form";
import { createId, useRoutineData, type AppPreferencePatch } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import { calculateCourseProgress, groupSubjectsByCurriculumPeriod } from "@/lib/academic-rules/course-progress";
import { createUfamRules } from "@/lib/academic-rules/ufam";
import { formatShortDate, getTodayInAppTimeZone } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { AcademicActivity, Subject, SubjectStatus } from "@/types/academic";
import type { AppPreference } from "@/types/domain";

type AcademicView = "overview" | "subjects" | "curriculum";
type SubjectFilter = SubjectStatus | "all";

interface AcademicAlert {
  detail: string;
  href: string;
  id: string;
  level: "attention" | "danger" | "info";
  title: string;
}

const views: Array<{ id: AcademicView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "subjects", label: "Disciplinas", icon: BookMarked },
  { id: "curriculum", label: "Matriz do curso", icon: GraduationCap }
];

const filters: Array<{ id: SubjectFilter; label: string }> = [
  { id: "active", label: "Em andamento" },
  { id: "planned", label: "Planejadas" },
  { id: "completed", label: "Concluídas" },
  { id: "failed", label: "Reprovadas" },
  { id: "all", label: "Todas" }
];

const fieldClass =
  "mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none transition focus:border-strong focus:ring-2 focus:ring-slate-200";

export function AcademicDashboard() {
  const { data, addSubject, updateAppPreference, updateSubject } = useRoutineData();
  const [view, setView] = useState<AcademicView>("overview");
  const [filter, setFilter] = useState<SubjectFilter>("active");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPeriod, setCreatePeriod] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const preferences = data.appPreference;
  const visibleSubjects = useMemo(() => data.subjects.filter((subject) => subject.status !== "archived"), [data.subjects]);
  const courseProgress = useMemo(
    () => calculateCourseProgress(visibleSubjects, preferences.courseTotalWorkloadHours),
    [preferences.courseTotalWorkloadHours, visibleSubjects]
  );
  const curriculum = useMemo(
    () =>
      groupSubjectsByCurriculumPeriod(
        visibleSubjects,
        preferences.courseTotalSemesters ?? 10,
        preferences.currentCurriculumPeriod ?? 1
      ),
    [preferences.courseTotalSemesters, preferences.currentCurriculumPeriod, visibleSubjects]
  );
  const alerts = useMemo(() => buildAcademicAlerts(visibleSubjects), [visibleSubjects]);
  const activeSubjects = useMemo(() => visibleSubjects.filter((subject) => subject.status === "active"), [visibleSubjects]);
  const pendingActivities = useMemo(() => getPendingActivities(visibleSubjects).slice(0, 5), [visibleSubjects]);
  const filteredSubjects = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase("pt-BR");

    return visibleSubjects.filter((subject) => {
      const matchesFilter = filter === "all" || subject.status === filter;
      const haystack = `${subject.name} ${subject.code ?? ""} ${subject.professor ?? ""} ${subject.semester}`.toLocaleLowerCase(
        "pt-BR"
      );
      return matchesFilter && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [filter, query, visibleSubjects]);
  const courseName = preferences.courseOrArea.trim() || "Seu curso";
  const institution = preferences.courseInstitution?.trim() || "Instituição não informada";

  function openCreate(period?: number) {
    setCreatePeriod(period ?? null);
    setCreateOpen(true);
  }

  function createSubject(draft: SubjectCreateDraft) {
    const id = buildSubjectId(draft.name, data.subjects);
    addSubject({
      id,
      name: draft.name,
      code: draft.code,
      professor: draft.professor,
      semester: draft.semester,
      recommendedPeriod: draft.recommendedPeriod,
      workloadHours: draft.workloadHours,
      color: draft.color,
      status: draft.status,
      room: draft.room,
      rules: createUfamRules(),
      resources: [],
      schedules: draft.firstSchedule
        ? [
            {
              ...draft.firstSchedule,
              id: createId("schedule"),
              subjectId: id
            }
          ]
        : [],
      attendance: [],
      grades: [],
      activities: []
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-mint">Faculdade</p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-foreground sm:text-3xl">{courseName}</h1>
          <p className="mt-1 text-sm text-slate-500">{institution}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button aria-label="Configurar curso" onClick={() => setProfileOpen(true)} size="icon" variant="secondary">
            <Settings2 aria-hidden className="h-4 w-4" />
          </Button>
          <Button onClick={() => setImportOpen(true)} variant="secondary">
            <FileUp aria-hidden className="h-4 w-4" />
            Importar
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus aria-hidden className="h-4 w-4" />
            Disciplina
          </Button>
        </div>
      </header>

      {importNotice ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950" role="status">
          <span className="flex items-start gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {importNotice}
          </span>
          <button aria-label="Fechar aviso" className="text-emerald-700 hover:text-foreground" onClick={() => setImportNotice("")} type="button">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="-mx-4 border-y border-line bg-white px-4 py-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Progresso do curso">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)] lg:items-end">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Integralização do curso</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">{courseProgress.progressPercent}%</p>
              </div>
              <p className="text-right text-xs leading-5 text-slate-500">
                {courseProgress.completedWorkloadHours}h concluídas
                <br />
                {courseProgress.totalWorkloadHours ? `de ${courseProgress.totalWorkloadHours}h` : "carga ainda não informada"}
              </p>
            </div>
            <Progress className="mt-3 h-3" value={courseProgress.progressPercent} />
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            <CourseMetric label="Período" value={`${preferences.currentCurriculumPeriod ?? 1}º`} />
            <CourseMetric label="Cursando" value={String(courseProgress.activeSubjects)} />
            <CourseMetric label="Concluídas" value={String(courseProgress.completedSubjects)} />
            <CourseMetric label="Planejadas" value={String(courseProgress.plannedSubjects)} />
          </div>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da faculdade">
        {views.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition",
                active ? "border-strong text-foreground" : "border-transparent text-slate-500 hover:text-foreground"
              )}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {visibleSubjects.length === 0 ? (
        <AcademicEmptyState onAdd={() => openCreate()} onConfigure={() => setProfileOpen(true)} onImport={() => setImportOpen(true)} />
      ) : null}

      {visibleSubjects.length > 0 && view === "overview" ? (
        <Overview
          activeSubjects={activeSubjects}
          alerts={alerts}
          currentPeriod={preferences.currentCurriculumPeriod ?? 1}
          onAdd={() => openCreate()}
          onOpenCurriculum={() => setView("curriculum")}
          pendingActivities={pendingActivities}
        />
      ) : null}

      {visibleSubjects.length > 0 && view === "subjects" ? (
        <section className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto]">
            <label className="relative">
              <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 translate-y-[-50%] text-slate-400" />
              <input
                className="h-11 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-strong focus:ring-2 focus:ring-slate-200"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar disciplina, código ou professor"
                value={query}
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {filters.map((item) => (
                <button
                  className={cn(
                    "h-11 shrink-0 rounded-md border px-3 text-sm font-medium transition",
                    filter === item.id
                      ? "border-strong bg-contrast text-white"
                      : "border-line bg-white text-slate-600 hover:border-slate-400"
                  )}
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSubjects.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Disciplinas">
              {filteredSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <div className="border-y border-dashed border-line py-8 text-center text-sm text-slate-500">
              Nenhuma disciplina corresponde a esse filtro.
            </div>
          )}
        </section>
      ) : null}

      {visibleSubjects.length > 0 && view === "curriculum" ? (
        <CurriculumView
          currentPeriod={preferences.currentCurriculumPeriod ?? 1}
          curriculum={curriculum}
          onAdd={openCreate}
          onStatusChange={(subjectId, status) => updateSubject(subjectId, { status })}
        />
      ) : null}

      <SubjectCreateForm
        initialPeriod={createPeriod}
        onClose={() => setCreateOpen(false)}
        onCreate={createSubject}
        open={createOpen}
      />
      <CourseProfileDialog
        onClose={() => setProfileOpen(false)}
        onSave={updateAppPreference}
        open={profileOpen}
        preferences={preferences}
      />
      <AcademicImportDialog
        onClose={() => setImportOpen(false)}
        onImported={(summary) => {
          const parts = [
            summary.created ? `${summary.created} nova(s)` : "",
            summary.updated ? `${summary.updated} atualizada(s)` : "",
            summary.schedulesAdded ? `${summary.schedulesAdded} horario(s)` : ""
          ].filter(Boolean);
          setImportNotice(
            parts.length
              ? `Importacao concluida: ${parts.join(", ")}. Seu progresso foi recalculado.`
              : "Dados do curso atualizados."
          );
          setView("curriculum");
        }}
        open={importOpen}
      />
    </div>
  );
}

function Overview({
  activeSubjects,
  alerts,
  currentPeriod,
  onAdd,
  onOpenCurriculum,
  pendingActivities
}: {
  activeSubjects: Subject[];
  alerts: AcademicAlert[];
  currentPeriod: number;
  onAdd: () => void;
  onOpenCurriculum: () => void;
  pendingActivities: Array<AcademicActivity & { subjectName: string }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Agora</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Disciplinas em andamento</h2>
            </div>
            <Button onClick={onAdd} size="sm" variant="secondary">
              <Plus aria-hidden className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {activeSubjects.length ? (
              activeSubjects.map((subject) => <ActiveSubjectRow key={subject.id} subject={subject} />)
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhuma disciplina em andamento. Altere uma planejada para começar o período.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Prazos</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Próximas entregas</h2>
            </div>
            <Link className="text-sm font-medium text-mint" href="/tarefas">
              Ver tarefas
            </Link>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {pendingActivities.length ? (
              pendingActivities.map((activity) => (
                <Link
                  className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50"
                  href={`/faculdade/${activity.subjectId}#atividades`}
                  key={activity.id}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{activity.title}</span>
                    <span className="block truncate text-xs text-slate-500">{activity.subjectName}</span>
                  </span>
                  <span className="text-right text-xs font-medium text-slate-600">
                    {formatShortDate(activity.dueDate)}
                    {activity.time ? ` · ${activity.time}` : " · sem horario"}
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma entrega pendente.</div>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-md border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase text-slate-400">Atenção</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Riscos acadêmicos</h2>
          </div>
          {alerts.length ? (
            alerts.slice(0, 5).map((alert) => (
              <Link
                className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50"
                href={alert.href}
                key={alert.id}
              >
                <AlertTriangle
                  aria-hidden
                  className={cn("mt-0.5 h-4 w-4 shrink-0", alert.level === "danger" ? "text-coral" : "text-gold")}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{alert.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{alert.detail}</span>
                </span>
              </Link>
            ))
          ) : (
            <div className="flex gap-3 px-4 py-5">
              <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-mint" />
              <div>
                <p className="text-sm font-medium text-foreground">Tudo sob controle</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Nenhum risco de falta ou prazo urgente detectado.</p>
              </div>
            </div>
          )}
        </section>

        <section className="border-y border-line py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Matriz</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Você está no {currentPeriod}º período</h2>
            </div>
            <button
              aria-label="Abrir matriz do curso"
              className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-foreground"
              onClick={onOpenCurriculum}
              type="button"
            >
              <ArrowRight aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Planeje os próximos períodos e marque o que já foi concluído para acompanhar a graduação inteira.
          </p>
        </section>
      </aside>
    </div>
  );
}

function ActiveSubjectRow({ subject }: { subject: Subject }) {
  const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
  const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
  const pending = subject.activities.filter((activity) => !["submitted", "corrected"].includes(activity.status)).length;

  return (
    <Link
      className="grid min-h-20 gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_88px_96px_86px_20px] sm:items-center"
      href={`/faculdade/${subject.id}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{subject.name}</span>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {subject.code ?? subject.semester} · {subject.professor ?? "Professor não informado"}
          </span>
        </span>
      </span>
      <RowMetric label="Média" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
      <RowMetric
        alert={attendance.alertLevel !== "normal"}
        label="Frequência"
        value={`${Math.round(attendance.frequency)}%`}
      />
      <RowMetric label="Pendentes" value={String(pending)} />
      <ArrowRight aria-hidden className="hidden h-4 w-4 text-slate-400 sm:block" />
    </Link>
  );
}

function RowMetric({ alert = false, label, value }: { alert?: boolean; label: string; value: string }) {
  return (
    <span className="flex items-center justify-between gap-2 sm:block">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn("block text-sm font-semibold text-foreground sm:mt-1", alert && "text-coral")}>{value}</span>
    </span>
  );
}

function CurriculumView({
  currentPeriod,
  curriculum,
  onAdd,
  onStatusChange
}: {
  currentPeriod: number;
  curriculum: ReturnType<typeof groupSubjectsByCurriculumPeriod>;
  onAdd: (period?: number) => void;
  onStatusChange: (subjectId: string, status: SubjectStatus) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Planejamento</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Matriz por período</h2>
          <p className="mt-1 text-sm text-slate-500">O período do curso e o semestre letivo são coisas diferentes.</p>
        </div>
        <Button onClick={() => onAdd()} size="sm">
          <Plus aria-hidden className="h-4 w-4" />
          Nova disciplina
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white">
        {curriculum.map((period) => {
          const periodProgress = period.workloadHours
            ? Math.round((period.completedWorkloadHours / period.workloadHours) * 100)
            : 0;
          const isCurrent = period.period === currentPeriod;
          return (
            <section className={cn("border-b border-line last:border-b-0", isCurrent && "bg-sky-50/35")} key={period.period}>
              <div className="grid gap-3 px-4 py-4 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{period.period}º período</h3>
                    {isCurrent ? <Badge tone="sky">atual</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{period.workloadHours}h cadastradas</p>
                </div>
                <Progress value={periodProgress} />
                <p className="text-right text-xs font-medium text-slate-500">{periodProgress}% concluído</p>
              </div>

              {period.subjects.length ? (
                <div className="border-t border-line">
                  {period.subjects.map((subject) => (
                    <div
                      className="grid gap-3 border-b border-line/80 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_150px] sm:items-center"
                      key={subject.id}
                    >
                      <Link className="group flex min-w-0 items-center gap-3" href={`/faculdade/${subject.id}`}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground group-hover:underline">{subject.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{subject.code ?? "Sem código"}</span>
                        </span>
                      </Link>
                      <span className="text-xs text-slate-500 sm:text-right">{subject.workloadHours} horas</span>
                      <select
                        aria-label={`Situação de ${subject.name}`}
                        className="h-9 rounded-md border border-line bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-strong"
                        onChange={(event) => onStatusChange(subject.id, event.target.value as SubjectStatus)}
                        value={subject.status}
                      >
                        <option value="planned">Planejada</option>
                        <option value="active">Em andamento</option>
                        <option value="completed">Concluída</option>
                        <option value="failed">Reprovada</option>
                        <option value="paused">Trancada</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  className="flex w-full items-center gap-2 border-t border-dashed border-line px-4 py-3 text-left text-sm text-slate-500 hover:bg-slate-50 hover:text-foreground"
                  onClick={() => onAdd(period.period)}
                  type="button"
                >
                  <CircleDashed aria-hidden className="h-4 w-4" />
                  Adicionar uma disciplina a este período
                </button>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function AcademicEmptyState({
  onAdd,
  onConfigure,
  onImport
}: {
  onAdd: () => void;
  onConfigure: () => void;
  onImport: () => void;
}) {
  return (
    <section className="grid min-h-[360px] place-items-center border-y border-dashed border-line py-12 text-center">
      <div className="max-w-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-mint">
          <GraduationCap aria-hidden className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-foreground">Monte a visão completa do seu curso</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Cadastre disciplinas já concluídas, as atuais e as próximas. O Gavium calcula o progresso e acompanha faltas,
          notas e prazos sem misturar tudo com a rotina de trabalho.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={onImport}>
            <FileUp aria-hidden className="h-4 w-4" />
            Importar documento
          </Button>
          <Button onClick={onAdd} variant="secondary">
            <Plus aria-hidden className="h-4 w-4" />
            Primeira disciplina
          </Button>
          <Button onClick={onConfigure} variant="ghost">
            <Settings2 aria-hidden className="h-4 w-4" />
            Configurar curso
          </Button>
        </div>
      </div>
    </section>
  );
}

function CourseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CourseProfileDialog({
  onClose,
  onSave,
  open,
  preferences
}: {
  onClose: () => void;
  onSave: (patch: AppPreferencePatch) => void;
  open: boolean;
  preferences: AppPreference;
}) {
  const [courseName, setCourseName] = useState(preferences.courseOrArea);
  const [institution, setInstitution] = useState(preferences.courseInstitution ?? "");
  const [currentPeriod, setCurrentPeriod] = useState(String(preferences.currentCurriculumPeriod ?? 1));
  const [totalPeriods, setTotalPeriods] = useState(String(preferences.courseTotalSemesters ?? 10));
  const [totalHours, setTotalHours] = useState(String(preferences.courseTotalWorkloadHours ?? 0));

  useEffect(() => {
    if (!open) {
      return;
    }

    setCourseName(preferences.courseOrArea);
    setInstitution(preferences.courseInstitution ?? "");
    setCurrentPeriod(String(preferences.currentCurriculumPeriod ?? 1));
    setTotalPeriods(String(preferences.courseTotalSemesters ?? 10));
    setTotalHours(String(preferences.courseTotalWorkloadHours ?? 0));
  }, [open, preferences]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5 dark:bg-black/70" role="presentation">
      <section
        aria-labelledby="course-profile-title"
        aria-modal="true"
        className="w-full rounded-t-lg bg-white shadow-soft sm:max-w-lg sm:rounded-lg"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-mint">Curso ativo</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground" id="course-profile-title">
              Configuração acadêmica
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <form
          className="p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              courseInstitution: institution.trim(),
              courseOrArea: courseName.trim(),
              courseTotalSemesters: Math.max(1, Number(totalPeriods) || 1),
              courseTotalWorkloadHours: Math.max(0, Number(totalHours) || 0),
              currentCurriculumPeriod: Math.max(1, Number(currentPeriod) || 1),
              contexts: Array.from(new Set([...preferences.contexts, "faculdade", "trabalho"])),
              primaryContext: "faculdade",
              profileLabel: "faculdade e trabalho"
            });
            onClose();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Curso</span>
              <input
                className={fieldClass}
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="Ex.: Engenharia da Computação"
                value={courseName}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Instituição</span>
              <input
                className={fieldClass}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Ex.: UFAM"
                value={institution}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Período atual</span>
              <input className={fieldClass} min={1} onChange={(event) => setCurrentPeriod(event.target.value)} type="number" value={currentPeriod} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Total de períodos</span>
              <input className={fieldClass} min={1} onChange={(event) => setTotalPeriods(event.target.value)} type="number" value={totalPeriods} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Carga horária total do curso</span>
              <input className={fieldClass} min={0} onChange={(event) => setTotalHours(event.target.value)} type="number" value={totalHours} />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-5">
            <Button onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button type="submit">Salvar curso</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function buildAcademicAlerts(subjects: Subject[]): AcademicAlert[] {
  const today = getTodayInAppTimeZone();
  const weekAhead = new Date(`${today}T12:00:00`);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadKey = weekAhead.toISOString().slice(0, 10);
  const alerts: AcademicAlert[] = [];

  subjects
    .filter((subject) => subject.status === "active")
    .forEach((subject) => {
      const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
      if (attendance.alertLevel !== "normal") {
        alerts.push({
          detail: `${attendance.usedAbsences} de ${attendance.absenceLimit} faltas usadas · ${Math.round(attendance.frequency)}% de frequência`,
          href: `/faculdade/${subject.id}#faltas`,
          id: `attendance-${subject.id}`,
          level: ["critical", "limit_reached"].includes(attendance.alertLevel) ? "danger" : "attention",
          title: `Faltas em ${subject.name}`
        });
      }

      subject.activities
        .filter(
          (activity) =>
            !["submitted", "corrected"].includes(activity.status) &&
            activity.dueDate <= weekAheadKey
        )
        .forEach((activity) => {
          const overdue = activity.dueDate < today;
          alerts.push({
            detail: overdue ? `Venceu em ${formatShortDate(activity.dueDate)}` : `Entrega em ${formatShortDate(activity.dueDate)}`,
            href: `/faculdade/${subject.id}#atividades`,
            id: `activity-${activity.id}`,
            level: overdue ? "danger" : "attention",
            title: activity.title
          });
        });
    });

  return alerts.sort((a, b) => (a.level === "danger" && b.level !== "danger" ? -1 : 0));
}

function getPendingActivities(subjects: Subject[]) {
  return subjects
    .flatMap((subject) =>
      subject.activities
        .filter((activity) => !["submitted", "corrected"].includes(activity.status))
        .map((activity) => ({ ...activity, subjectName: subject.name }))
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function buildSubjectId(name: string, subjects: Subject[]) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const candidate = base || `disciplina-${Date.now()}`;
  return subjects.some((subject) => subject.id === candidate) ? `${candidate}-${Date.now()}` : candidate;
}
