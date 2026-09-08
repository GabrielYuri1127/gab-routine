"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/features/tasks/components/task-form";
import { TaskList } from "@/features/tasks/components/task-list";
import { getTodayInAppTimeZone } from "@/lib/date";
import { getTaskDate } from "@/lib/tasks/prioritization";
import { cn } from "@/lib/utils";
import { useRoutineData } from "@/features/data/routine-store";

type Filter = "today" | "open" | "done";

const filters: { id: Filter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "open", label: "Abertas" },
  { id: "done", label: "Feitas" }
];

export function TaskBoard() {
  const { data } = useRoutineData();
  const [filter, setFilter] = useState<Filter>("today");
  const today = getTodayInAppTimeZone();

  const openTasks = data.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const todayTasks = openTasks.filter((task) => getTaskDate(task) === today || task.priority === "urgent");
  const doneTasks = data.tasks.filter((task) => task.status === "done");

  const filteredTasks = useMemo(() => {
    if (filter === "done") {
      return doneTasks;
    }

    if (filter === "open") {
      return openTasks;
    }

    return todayTasks;
  }, [doneTasks, filter, openTasks, todayTasks]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-mint">Tarefas</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Fila do dia</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Prioridade, prazo, tempo estimado e adiamento ficam salvos no aparelho.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink shadow-sm"
          href="/calendario"
        >
          <CalendarDays aria-hidden className="h-4 w-4" />
          Calendario
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo das tarefas">
        <Metric icon={ListChecks} label="Abertas" value={openTasks.length.toString()} />
        <Metric icon={CalendarDays} label="Hoje" value={todayTasks.length.toString()} />
        <Metric icon={CheckCircle2} label="Feitas" value={doneTasks.length.toString()} />
      </section>

      <TaskForm />

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro de tarefas">
          {filters.map((item) => (
            <button
              className={cn(
                "h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition",
                filter === item.id && "border-ink bg-ink text-white"
              )}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <TaskList tasks={filteredTasks} />
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <Icon aria-hidden className="h-5 w-5 text-slate-500" />
        <Badge tone="neutral">{label}</Badge>
      </div>
      <p className="text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
