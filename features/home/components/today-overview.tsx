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
import { cn } from "@/lib/utils";
import type { Task } from "@/types/domain";

type TodayBlock =
  | DayBlock
  | { displayTime?: string; id: string; title: string; time: string; type: "event" | "task" | "reminder"; subjectId?: string };

export function TodayOverview() {
  const { completeTask, data } = useRoutineData();
  const [now, setNow] = useState<Date | null>(null);
  const firstName = data.appPreference.displayName.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const timer = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = now ? getTodayInAppTimeZone(now) : getTodayInAppTimeZone();
  const currentTime = now ? getTimeInAppTimeZone(now) : "";
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
    if (!currentTime) {
      return todayBlocks[0];
    }

    return todayBlocks.find((block) => block.time >= currentTime) ?? null;
  }, [currentTime, todayBlocks]);
  const nextBlockKey = nextBlock ? `${nextBlock.type}-${nextBlock.id}` : "";
  const minutesUntilNext = nextBlock && currentTime ? getMinutesBetween(currentTime, nextBlock.time) : null;
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
                <p className="text-3xl font-semibold">{getBlockDisplayTime(nextBlock)}</p>
                <p className="mt-1 truncate text-base text-white/85">{nextBlock.title}</p>
                {minutesUntilNext !== null ? (
                  <p className="mt-2 text-xs font-medium text-white/60">{formatMinutesUntil(minutesUntilNext)}</p>
                ) : null}
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
            <div className="flex h-12 items-center justify-between gap-3 border-b border-line bg-slate-50 px-4">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Clock3 aria-hidden className="h-4 w-4" />
                Agora <strong className="text-foreground">{currentTime || "--:--"}</strong>
              </span>
              <span className="text-xs text-slate-500">
                {todayBlocks.length} {todayBlocks.length === 1 ? "item" : "itens"}
              </span>
            </div>
            {todayBlocks.length ? (
              todayBlocks.map((block, index) => {
                const key = `${block.type}-${block.id}`;
                const isNext = key === nextBlockKey;
                const isPast = Boolean(currentTime && block.time < currentTime && !isNext);

                return (
                  <Link
                    aria-current={isNext ? "step" : undefined}
                    className={cn(
                      "group grid min-h-[72px] grid-cols-[54px_18px_minmax(0,1fr)] gap-3 border-b border-line px-4 transition last:border-b-0 hover:bg-slate-50",
                      isPast && "text-slate-400",
                      isNext && "bg-emerald-50/30"
                    )}
                    href={getBlockHref(block)}
                    key={key}
                    style={isNext ? { boxShadow: `inset 3px 0 0 ${data.appPreference.accentColor}` } : undefined}
                  >
                    <span className="flex flex-col justify-center py-3">
                      <span className={cn("text-sm font-semibold", isPast ? "text-slate-400" : "text-foreground")}>
                        {getBlockDisplayTime(block)}
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-400">
                        {isNext ? "a seguir" : isPast ? "passou" : "depois"}
                      </span>
                    </span>
                    <span className="relative flex min-h-full justify-center">
                      {index > 0 ? <span aria-hidden className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-line" /> : null}
                      {index < todayBlocks.length - 1 ? (
                        <span aria-hidden className="absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-line" />
                      ) : null}
                      <span
                        aria-hidden
                        className={cn(
                          "relative z-10 my-auto h-3 w-3 rounded-full border-2 border-white",
                          isPast && "opacity-40",
                          isNext && "ring-4 ring-emerald-50"
                        )}
                        style={{ backgroundColor: getBlockColor(block.type) }}
                      />
                    </span>
                    <span className="flex min-w-0 items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm font-medium", isPast ? "text-slate-400" : "text-slate-700")}>
                          {block.title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {isNext && minutesUntilNext !== null ? formatMinutesUntil(minutesUntilNext) : getBlockLabel(block.type)}
                        </span>
                      </span>
                      <Badge tone={getBlockTone(block.type)}>{getBlockLabel(block.type)}</Badge>
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <CalendarDays aria-hidden className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-foreground">Nenhum horário marcado</p>
                <p className="mt-1 text-xs text-slate-500">Seu dia ainda está livre na agenda.</p>
                <Link className="mt-3 inline-flex h-10 items-center text-sm font-medium text-mint" href="/quick/event">
                  Adicionar compromisso
                </Link>
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

function getTimeInAppTimeZone(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getMinutesBetween(from: string, to: string) {
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  return toHour * 60 + toMinute - (fromHour * 60 + fromMinute);
}

function formatMinutesUntil(minutes: number) {
  if (minutes <= 0) {
    return "Comeca agora";
  }

  if (minutes < 60) {
    return `Em ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `Em ${hours}h ${remainingMinutes}min` : `Em ${hours}h`;
}

function getBlockDisplayTime(block: TodayBlock) {
  return "displayTime" in block ? block.displayTime ?? block.time : block.time;
}

function getBlockHref(block: TodayBlock) {
  if (block.type === "class" && block.subjectId) return `/faculdade/${block.subjectId}`;
  if (block.type === "task") return "/tarefas";
  if (block.type === "reminder") return "/lembretes";
  if (block.type === "work") return "/trabalho";
  if (block.type === "study") return "/semana";
  return "/calendario";
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
  if (type === "work") return "trabalho";
  if (type === "task") return "tarefa";
  if (type === "reminder") return "lembrete";
  return "compromisso";
}
