"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getClassBlocksForWeekday, type DayBlock } from "@/features/academic/data/mock";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateCourseProgress } from "@/lib/academic-rules/course-progress";
import { formatLongDate, formatShortDate, getCurrentWeekday, getTodayInAppTimeZone } from "@/lib/date";
import { getReminderDateKey, getReminderTime } from "@/lib/reminders/schedule";
import { getTaskDate, prioritizeTasks } from "@/lib/tasks/prioritization";
import type { Task } from "@/types/domain";

type TodayBlock =
  | DayBlock
  | { displayTime?: string; id: string; title: string; time: string; type: "event" | "task" | "reminder"; subjectId?: string };

export function TodayOverview() {
  const { completeTask, data } = useRoutineData();
  const [now, setNow] = useState<Date | null>(null);
  const firstName = data.appPreference.displayName.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    setNow(new Date());
  }, []);

  const today = now ? getTodayInAppTimeZone(now) : getTodayInAppTimeZone();
  const visibleSubjects = useMemo(() => data.subjects.filter((subject) => subject.status !== "archived"), [data.subjects]);
  const activeSubjects = useMemo(() => visibleSubjects.filter((subject) => subject.status === "active"), [visibleSubjects]);
  const courseProgress = useMemo(
    () => calculateCourseProgress(visibleSubjects, data.appPreference.courseTotalWorkloadHours),
    [data.appPreference.courseTotalWorkloadHours, visibleSubjects]
  );
  const todayBlocks = useMemo<TodayBlock[]>(() => {
    const weekday = now ? getCurrentWeekday(now) : "monday";
    const classBlocks = getClassBlocksForWeekday(weekday, activeSubjects);
    const taskBlocks: TodayBlock[] = data.tasks
      .filter((task) => task.status !== "done" && getTaskDate(task) === today && task.time)
      .map((task) => ({ id: task.id, title: task.title, time: task.time ?? "23:59", type: "task" }));
    const reminderBlocks: TodayBlock[] = data.reminders
      .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === today)
      .map((reminder) => ({ id: reminder.id, title: reminder.title, time: getReminderTime(reminder), type: "reminder" }));
    const eventBlocks: TodayBlock[] = data.events
      .filter((event) => event.date === today)
      .map((event) => ({
        displayTime: event.startsAt ?? "Dia todo",
        id: event.id,
        title: event.title,
        time: event.startsAt ?? "23:59",
        type: "event"
      }));

    return [...classBlocks, ...taskBlocks, ...reminderBlocks, ...eventBlocks].sort((a, b) => a.time.localeCompare(b.time));
  }, [activeSubjects, data.events, data.reminders, data.tasks, now, today]);
  const nextBlock = useMemo(() => {
    if (!now) {
      return todayBlocks[0];
    }

    const currentTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Manaus",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);
    return todayBlocks.find((block) => block.time >= currentTime) ?? null;
  }, [now, todayBlocks]);
  const todayTasks = useMemo(
    () =>
      prioritizeTasks(
        data.tasks.filter((task) => task.status !== "cancelled" && (getTaskDate(task) === today || task.priority === "urgent")),
        today
      ),
    [data.tasks, today]
  );
  const academicTasks = todayTasks.filter((task) => !isWorkTask(task)).slice(0, 4);
  const workTasks = todayTasks.filter(isWorkTask).slice(0, 4);
  const pendingActivities = useMemo(
    () =>
      visibleSubjects
        .flatMap((subject) =>
          subject.activities
            .filter((activity) => !["submitted", "corrected"].includes(activity.status))
            .map((activity) => ({ ...activity, subjectName: subject.name }))
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 3),
    [visibleSubjects]
  );
  const riskySubjects = activeSubjects.filter(
    (subject) => calculateAttendanceSummary(subject.attendance, subject.rules, subject.name).alertLevel !== "normal"
  );
  const scheduledTodayTasks = data.tasks.filter((task) => getTaskDate(task) === today && task.status !== "cancelled");
  const completedTodayTasks = scheduledTodayTasks.filter((task) => task.status === "done");
  const dayProgress = scheduledTodayTasks.length ? Math.round((completedTodayTasks.length / scheduledTodayTasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-mint">{firstName ? `Olá, ${firstName}` : "Olá"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Seu dia</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{now ? formatLongDate(now) : "Carregando data..."}</p>
        </div>
        <div className="flex gap-1">
          <Link
            aria-label="Abrir assistente"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 hover:text-foreground"
            href="/assistente"
          >
            <Sparkles aria-hidden className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Abrir lembretes"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 hover:text-foreground"
            href="/lembretes"
          >
            <Bell aria-hidden className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="-mx-4 grid overflow-hidden border-y border-line bg-white sm:-mx-6 lg:-mx-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <div className="bg-contrast px-5 py-5 text-white sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock3 aria-hidden className="h-4 w-4" />
            Próximo compromisso
          </div>
          {nextBlock ? (
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-semibold">{nextBlock.time}</p>
                <p className="mt-1 truncate text-base text-white/85">{nextBlock.title}</p>
              </div>
              <Badge tone={getBlockTone(nextBlock.type)}>{getBlockLabel(nextBlock.type)}</Badge>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-xl font-semibold">Agenda livre</p>
              <p className="mt-1 text-sm text-white/70">Bom momento para adiantar uma prioridade.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Progresso de hoje</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{dayProgress}%</p>
            </div>
            <p className="text-right text-xs text-slate-500">
              {completedTodayTasks.length} de {scheduledTodayTasks.length}
              <br />
              tarefas concluídas
            </p>
          </div>
          <Progress className="mt-3" value={dayProgress} tone="sky" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Linha do tempo</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Hoje</h2>
            </div>
            <Link className="text-sm font-medium text-mint" href="/semana">
              Ver semana
            </Link>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {todayBlocks.length ? (
              todayBlocks.map((block) => (
                <div className="grid min-h-14 grid-cols-[64px_10px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" key={`${block.type}-${block.id}`}>
                  <span className="text-sm font-semibold text-foreground">
                    {"displayTime" in block ? block.displayTime ?? block.time : block.time}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getBlockColor(block.type) }} />
                  <span className="min-w-0 truncate text-sm text-slate-700">{block.title}</span>
                  <Badge tone={getBlockTone(block.type)}>{getBlockLabel(block.type)}</Badge>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <CalendarDays aria-hidden className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-foreground">Nenhum horário marcado</p>
                <p className="mt-1 text-xs text-slate-500">Seu dia ainda está livre na agenda.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Prioridades</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Para avançar</h2>
            </div>
            <Link className="text-sm font-medium text-mint" href="/tarefas">
              Todas
            </Link>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {[...academicTasks, ...workTasks].length ? (
              [...academicTasks, ...workTasks].slice(0, 6).map((task) => (
                <TaskRow key={task.id} onComplete={() => completeTask(task.id)} task={task} />
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <CheckCircle2 aria-hidden className="mx-auto h-7 w-7 text-mint" />
                <p className="mt-3 text-sm font-medium text-foreground">Sem urgências</p>
                <p className="mt-1 text-xs text-slate-500">A fila de hoje está limpa.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-t-2 border-mint pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-mint">
                <GraduationCap aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Faculdade</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {data.appPreference.courseOrArea || "Seu curso"}
                </h2>
              </div>
            </div>
            <Link aria-label="Abrir faculdade" className="text-slate-400 hover:text-foreground" href="/faculdade">
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Curso concluído</span>
                <span>{courseProgress.progressPercent}%</span>
              </div>
              <Progress className="mt-2" value={courseProgress.progressPercent} />
            </div>
            <Badge tone={riskySubjects.length ? "coral" : "mint"}>
              {riskySubjects.length ? `${riskySubjects.length} com risco` : "frequência em dia"}
            </Badge>
          </div>

          <div className="mt-4 divide-y divide-line border-y border-line">
            {pendingActivities.length ? (
              pendingActivities.map((activity) => (
                <Link
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:text-mint"
                  href={`/faculdade/${activity.subjectId}#atividades`}
                  key={activity.id}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{activity.title}</span>
                    <span className="block truncate text-xs text-slate-500">{activity.subjectName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{formatShortDate(activity.dueDate)}</span>
                </Link>
              ))
            ) : (
              <p className="py-4 text-sm text-slate-500">Nenhuma entrega acadêmica pendente.</p>
            )}
          </div>
        </section>

        <section className="border-t-2 border-sky pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky">
                <BriefcaseBusiness aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Trabalho</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Fila profissional</h2>
              </div>
            </div>
            <Link aria-label="Abrir trabalho" className="text-slate-400 hover:text-foreground" href="/trabalho">
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-line border-y border-line">
            {workTasks.length ? (
              workTasks.map((task) => (
                <TaskRow compact key={task.id} onComplete={() => completeTask(task.id)} task={task} />
              ))
            ) : (
              <div className="py-5">
                <p className="text-sm font-medium text-foreground">Nenhuma prioridade de trabalho hoje.</p>
                <Link className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky" href="/trabalho">
                  Planejar trabalho
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TaskRow({ compact = false, onComplete, task }: { compact?: boolean; onComplete: () => void; task: Task }) {
  return (
    <label
      className={
        compact
          ? "flex min-h-14 cursor-pointer items-center gap-3 py-3"
          : "flex min-h-14 cursor-pointer items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50"
      }
    >
      <input
        aria-label={`Concluir ${task.title}`}
        className="h-5 w-5 rounded border-line text-foreground"
        onChange={onComplete}
        type="checkbox"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {isWorkTask(task) ? "Trabalho" : task.category ?? "Faculdade"}
          {task.estimatedMinutes ? ` · ${task.estimatedMinutes} min` : ""}
        </span>
      </span>
      {task.priority === "urgent" ? <Badge tone="coral">urgente</Badge> : null}
    </label>
  );
}

function isWorkTask(task: Task) {
  return task.category?.toLocaleLowerCase("pt-BR").includes("trabalho") ?? false;
}

function getBlockTone(type: TodayBlock["type"]): "mint" | "sky" | "gold" | "coral" {
  if (type === "class") return "mint";
  if (type === "study" || type === "reminder") return "sky";
  if (type === "task") return "coral";
  return "gold";
}

function getBlockColor(type: TodayBlock["type"]) {
  if (type === "class") return "#0f9f7a";
  if (type === "study" || type === "reminder") return "#2b7fff";
  if (type === "task") return "#e35d45";
  return "#b7791f";
}

function getBlockLabel(type: TodayBlock["type"]) {
  if (type === "class") return "aula";
  if (type === "study") return "estudo";
  if (type === "task") return "tarefa";
  if (type === "reminder") return "lembrete";
  return "compromisso";
}
