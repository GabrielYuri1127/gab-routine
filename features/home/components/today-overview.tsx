"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarDays, CheckCircle2, Clock, NotebookTabs } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import { formatLongDate, formatShortDate, getCurrentWeekday, getTodayInAppTimeZone } from "@/lib/date";
import { extraTodayBlocks, getClassBlocksForWeekday, getPendingActivities, type DayBlock } from "@/features/academic/data/mock";
import { getReminderDateKey, getReminderTime } from "@/lib/reminders/schedule";
import { getTaskDate, prioritizeTasks } from "@/lib/tasks/prioritization";
import { useRoutineData } from "@/features/data/routine-store";

type TodayBlock =
  | DayBlock
  | { displayTime?: string; id: string; title: string; time: string; type: "event" | "task" | "reminder"; subjectId?: string };

export function TodayOverview() {
  const { data, completeTask } = useRoutineData();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const today = now ? getTodayInAppTimeZone(now) : getTodayInAppTimeZone();
  const todayBlocks = useMemo<TodayBlock[]>(() => {
    const weekday = now ? getCurrentWeekday(now) : "monday";
    const classBlocks = getClassBlocksForWeekday(weekday, data.subjects);
    const taskBlocks: TodayBlock[] = data.tasks
      .filter((task) => task.status !== "done" && getTaskDate(task) === today && task.time)
      .map((task) => ({
        id: task.id,
        title: task.title,
        time: task.time ?? "23:59",
        type: "task"
      }));
    const reminderBlocks: TodayBlock[] = data.reminders
      .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === today)
      .map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        time: getReminderTime(reminder),
        type: "reminder"
      }));
    const eventBlocks: TodayBlock[] = data.events
      .filter((event) => event.date === today)
      .map((event) => ({
        displayTime: event.startsAt ?? "Dia todo",
        id: event.id,
        title: event.title,
        time: event.startsAt ?? "23:59",
        type: "event"
      }));

    return [...classBlocks, ...extraTodayBlocks, ...taskBlocks, ...reminderBlocks, ...eventBlocks].sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [data.events, data.reminders, data.subjects, data.tasks, now, today]);

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

  const sortedTasks = prioritizeTasks(
    data.tasks.filter((task) => task.status !== "cancelled" && (getTaskDate(task) === today || task.priority === "urgent")),
    today
  ).slice(0, 5);
  const pendingActivities = getPendingActivities(data.subjects).slice(0, 3);
  const todayReminders = data.reminders.filter(
    (reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === today
  );

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-mint">Bom dia</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Gab routine</h1>
          <p className="mt-1 text-sm text-slate-500">{now ? formatLongDate(now) : "Carregando data..."}</p>
        </div>
        <Link
          aria-label="Abrir lembretes"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-slate-600 shadow-sm"
          href="/lembretes"
        >
          <Bell aria-hidden className="h-5 w-5" />
        </Link>
      </header>

      <section className="rounded-lg bg-ink p-4 text-white shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Proximo</p>
          <Clock aria-hidden className="h-4 w-4 text-white/70" />
        </div>
        {nextBlock ? (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{nextBlock.time}</p>
              <p className="mt-1 text-base text-white/85">{nextBlock.title}</p>
            </div>
            <Badge tone={getBlockTone(nextBlock.type)}>{getBlockLabel(nextBlock.type)}</Badge>
          </div>
        ) : (
          <p className="text-sm text-white/80">Nada restante hoje. Bom momento para planejar amanha.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Hoje</h2>
          <Link className="text-sm font-medium text-mint" href="/semana">
            Ver semana
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-white shadow-sm">
          {todayBlocks.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Dia livre na agenda.</div> : null}
          {todayBlocks.map((block) => (
            <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" key={block.id}>
              <span className="text-sm font-semibold text-ink">{"displayTime" in block ? block.displayTime ?? block.time : block.time}</span>
              <span className="min-w-0 truncate text-sm text-slate-700">{block.title}</span>
              <Badge tone={getBlockTone(block.type)}>{getBlockLabel(block.type)}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Pendentes</h2>
          <Link className="text-sm font-medium text-mint" href="/tarefas">
            Ver tarefas
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-white shadow-sm">
          {sortedTasks.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">Sem tarefas urgentes ou de hoje.</div> : null}
          {sortedTasks.map((task) => (
            <label className="flex min-h-12 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" key={task.id}>
              <input
                checked={task.status === "done"}
                className="h-5 w-5 rounded border-line text-ink"
                onChange={() => completeTask(task.id)}
                type="checkbox"
              />
              <span className={`min-w-0 flex-1 text-sm ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {task.title}
              </span>
              {task.priority === "urgent" ? <Badge tone="coral">urgente</Badge> : null}
            </label>
          ))}
        </div>

        {todayReminders.length ? (
          <div className="rounded-lg border border-line bg-white shadow-sm">
            {todayReminders.map((reminder) => (
              <Link
                className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0"
                href="/lembretes"
                key={reminder.id}
              >
                <span className="min-w-0 truncate text-slate-700">{reminder.title}</span>
                <span className="shrink-0 text-xs font-medium text-sky">{getReminderTime(reminder)}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {data.events.some((event) => event.date === today) ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden className="h-4 w-4 text-gold" />
              <h2 className="text-lg font-semibold text-ink">Compromissos</h2>
            </div>
            <Link className="text-sm font-medium text-mint" href="/calendario">
              Editar
            </Link>
          </div>
          <div className="space-y-2">
            {data.events
              .filter((event) => event.date === today)
              .map((event) => (
                <div className="flex items-center justify-between gap-3" key={event.id}>
                  <p className="min-w-0 truncate text-sm text-slate-700">{event.title}</p>
                  <span className="shrink-0 text-xs font-medium text-gold">{event.startsAt ?? "Dia todo"}</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Faculdade</h2>
          <Link className="text-sm font-medium text-mint" href="/faculdade">
            Abrir
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.subjects.slice(0, 2).map((subject) => {
            const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
            const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
            const pendingCount = subject.activities.filter(
              (activity) => activity.status !== "submitted" && activity.status !== "corrected"
            ).length;

            return (
              <Link className="rounded-lg border border-line bg-white p-4 shadow-sm" href={`/faculdade/${subject.id}`} key={subject.id}>
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen aria-hidden className="h-4 w-4" style={{ color: subject.color }} />
                  <h3 className="truncate text-sm font-semibold uppercase text-ink">{subject.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric label="Media" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
                  <MiniMetric label="Frequencia" value={`${Math.round(attendance.frequency)}%`} />
                  <MiniMetric label="Atividades" value={`${pendingCount}`} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <NotebookTabs aria-hidden className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold text-ink">Prazos proximos</h2>
        </div>
        <div className="space-y-2">
          {pendingActivities.length === 0 ? <p className="text-sm text-slate-500">Sem prazos pendentes.</p> : null}
          {pendingActivities.map((activity) => (
            <div className="flex items-center justify-between gap-3" key={activity.id}>
              <p className="min-w-0 truncate text-sm text-slate-700">{activity.title}</p>
              <span className="shrink-0 text-xs text-slate-500">{formatShortDate(activity.dueDate)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-slate-600">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          Modo rapido ativo
        </div>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function getBlockTone(type: TodayBlock["type"]): "mint" | "sky" | "gold" | "coral" {
  if (type === "class") {
    return "mint";
  }

  if (type === "study" || type === "reminder") {
    return "sky";
  }

  if (type === "task") {
    return "coral";
  }

  if (type === "event") {
    return "gold";
  }

  return "gold";
}

function getBlockLabel(type: TodayBlock["type"]) {
  if (type === "class") {
    return "aula";
  }

  if (type === "study") {
    return "estudo";
  }

  if (type === "task") {
    return "tarefa";
  }

  if (type === "reminder") {
    return "lembrete";
  }

  if (type === "event") {
    return "compromisso";
  }

  return "fixo";
}
