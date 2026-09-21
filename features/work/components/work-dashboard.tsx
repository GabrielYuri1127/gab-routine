"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { addDays, formatShortDate, getTodayInAppTimeZone, toDateKey } from "@/lib/date";
import { getTaskDate, prioritizeTasks } from "@/lib/tasks/prioritization";
import type { Priority, Task } from "@/types/domain";

const priorityLabels: Record<Priority, string> = {
  high: "alta",
  low: "baixa",
  medium: "média",
  urgent: "urgente"
};

export function WorkDashboard() {
  const { addTask, completeTask, data } = useRoutineData();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(getTodayInAppTimeZone());
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [priority, setPriority] = useState<Priority>("medium");
  const today = getTodayInAppTimeZone();
  const weekEnd = toDateKey(addDays(new Date(`${today}T12:00:00`), 7));
  const workTasks = useMemo(
    () => data.tasks.filter((task) => isWorkTask(task) && task.status !== "cancelled"),
    [data.tasks]
  );
  const openTasks = useMemo(
    () => prioritizeTasks(workTasks.filter((task) => task.status !== "done"), today),
    [today, workTasks]
  );
  const workEvents = useMemo(
    () =>
      data.events
        .filter((event) => event.category === "work" && event.date >= today && event.date <= weekEnd)
        .sort((a, b) => `${a.date}${a.startsAt ?? ""}`.localeCompare(`${b.date}${b.startsAt ?? ""}`)),
    [data.events, today, weekEnd]
  );
  const plannedMinutes = openTasks.reduce((total, task) => total + (task.estimatedMinutes ?? 0), 0);
  const dueToday = openTasks.filter((task) => getTaskDate(task) === today).length;
  const completed = workTasks.filter((task) => task.status === "done").length;
  const completionRate = workTasks.length ? Math.round((completed / workTasks.length) * 100) : 0;
  const dailyLoad = getDailyLoad(openTasks, today);
  const maxDailyLoad = Math.max(...dailyLoad.map((day) => day.minutes), 60);

  function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    addTask({
      category: "Trabalho",
      date: dueDate,
      dueDate,
      estimatedMinutes: Math.max(5, Number(estimatedMinutes) || 30),
      priority,
      title: title.trim()
    });
    setTitle("");
    setEstimatedMinutes("30");
    setPriority("medium");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky">Trabalho</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Painel de foco</h1>
          <p className="mt-1 text-sm text-slate-500">Prioridades, carga planejada e compromissos profissionais.</p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-foreground hover:bg-slate-50"
          href="/tarefas"
        >
          <ListTodo aria-hidden className="h-4 w-4" />
          Todas as tarefas
        </Link>
      </header>

      <section className="-mx-4 border-y border-line bg-white px-4 py-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
          <WorkMetric label="Em aberto" value={String(openTasks.length)} />
          <WorkMetric label="Para hoje" value={String(dueToday)} />
          <WorkMetric label="Carga restante" value={formatDuration(plannedMinutes)} />
          <WorkMetric label="Concluído" value={`${completionRate}%`} />
        </div>
      </section>

      <form className="grid gap-3 rounded-md border border-line bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_150px_120px_130px_auto]" onSubmit={submitTask}>
        <label>
          <span className="text-xs font-medium text-slate-500">Captura rápida</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-strong focus:ring-2 focus:ring-slate-200"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="O que precisa avançar?"
            value={title}
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-500">Prazo</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-strong"
            onChange={(event) => setDueDate(event.target.value)}
            type="date"
            value={dueDate}
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-500">Minutos</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-strong"
            min={5}
            onChange={(event) => setEstimatedMinutes(event.target.value)}
            step={5}
            type="number"
            value={estimatedMinutes}
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-500">Prioridade</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-strong"
            onChange={(event) => setPriority(event.target.value as Priority)}
            value={priority}
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </label>
        <Button className="self-end" size="sm" type="submit">
          <Plus aria-hidden className="h-4 w-4" />
          Adicionar
        </Button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Execução</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Fila de trabalho</h2>
            </div>
            <Badge tone={dueToday > 0 ? "coral" : "neutral"}>{dueToday} hoje</Badge>
          </div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {openTasks.length ? (
              openTasks.slice(0, 12).map((task) => (
                <label className="grid min-h-16 cursor-pointer grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50" key={task.id}>
                  <input
                    aria-label={`Concluir ${task.title}`}
                    className="h-5 w-5 rounded border-line text-foreground"
                    onChange={() => completeTask(task.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{task.estimatedMinutes ? formatDuration(task.estimatedMinutes) : "Sem estimativa"}</span>
                      <span aria-hidden>·</span>
                      <span>{getTaskDate(task) ? formatShortDate(getTaskDate(task) ?? today) : "Sem prazo"}</span>
                    </span>
                  </span>
                  <Badge tone={getPriorityTone(task.priority)}>{priorityLabels[task.priority]}</Badge>
                </label>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <CheckCircle2 aria-hidden className="mx-auto h-7 w-7 text-mint" />
                <p className="mt-3 text-sm font-medium text-foreground">Fila limpa</p>
                <p className="mt-1 text-xs text-slate-500">Use a captura rápida para definir o próximo avanço.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden className="h-4 w-4 text-sky" />
              <h2 className="text-sm font-semibold text-foreground">Carga dos próximos 7 dias</h2>
            </div>
            <div className="mt-4 space-y-3">
              {dailyLoad.map((day) => (
                <div className="grid grid-cols-[42px_1fr_54px] items-center gap-3" key={day.date}>
                  <span className="text-xs font-medium text-slate-500">{day.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-sky transition-all"
                      style={{ width: `${Math.round((day.minutes / maxDailyLoad) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right text-xs text-slate-500">{formatDuration(day.minutes)}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-semibold text-foreground">Compromissos</h2>
              </div>
              <Link className="text-xs font-medium text-mint" href="/calendario">
                Agenda
              </Link>
            </div>
            <div className="overflow-hidden rounded-md border border-line bg-white">
              {workEvents.length ? (
                workEvents.map((event) => (
                  <Link
                    className="grid grid-cols-[52px_1fr_18px] items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 hover:bg-slate-50"
                    href="/calendario"
                    key={event.id}
                  >
                    <span className="text-xs font-semibold text-slate-600">{formatShortDate(event.date)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{event.title}</span>
                      <span className="block text-xs text-slate-500">{event.startsAt ?? "Dia todo"}</span>
                    </span>
                    <ArrowRight aria-hidden className="h-4 w-4 text-slate-400" />
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs leading-5 text-slate-500">
                  Nenhum compromisso de trabalho nos próximos dias.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function WorkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function isWorkTask(task: Task) {
  return task.category?.toLocaleLowerCase("pt-BR").includes("trabalho") ?? false;
}

function getPriorityTone(priority: Priority): "neutral" | "gold" | "coral" {
  if (priority === "urgent") {
    return "coral";
  }

  if (priority === "high") {
    return "gold";
  }

  return "neutral";
}

function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return "0 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

function getDailyLoad(tasks: Task[], today: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(new Date(`${today}T12:00:00`), index);
    const dateKey = toDateKey(date);
    return {
      date: dateKey,
      label: formatter.format(date).replace(".", ""),
      minutes: tasks
        .filter((task) => getTaskDate(task) === dateKey)
        .reduce((total, task) => total + (task.estimatedMinutes ?? 0), 0)
    };
  });
}
