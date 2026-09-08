"use client";

import Link from "next/link";
import { Check, Clock3, ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShortDate, getTodayInAppTimeZone } from "@/lib/date";
import { getSnoozeTarget, getTaskDate, getTaskUrgency, prioritizeTasks } from "@/lib/tasks/prioritization";
import { useRoutineData } from "@/features/data/routine-store";
import type { Task } from "@/types/domain";

interface TaskListProps {
  tasks?: Task[];
  limit?: number;
  emptyLabel?: string;
}

const urgencyLabel = {
  done: "feito",
  overdue: "atrasada",
  today: "hoje",
  snoozed: "adiada",
  upcoming: "proxima",
  later: "sem data"
} as const;

const urgencyTone = {
  done: "neutral",
  overdue: "coral",
  today: "gold",
  snoozed: "sky",
  upcoming: "mint",
  later: "neutral"
} as const;

export function TaskList({ tasks, limit, emptyLabel = "Nenhuma tarefa nesse filtro." }: TaskListProps) {
  const { data, completeTask, snoozeTask } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const source = tasks ?? data.tasks;
  const items = prioritizeTasks(source, today).slice(0, limit ?? source.length);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white shadow-sm">
      {items.map((task) => {
        const urgency = getTaskUrgency(task, today);
        const taskDate = getTaskDate(task);
        const done = task.status === "done";

        return (
          <article
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 sm:px-4"
            key={task.id}
          >
            <Button
              aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
              onClick={() => completeTask(task.id)}
              size="icon"
              variant={done ? "secondary" : "ghost"}
            >
              {done ? <Check aria-hidden className="h-5 w-5 text-mint" /> : <ListTodo aria-hidden className="h-5 w-5" />}
            </Button>

            <div className="min-w-0">
              <Link
                className={`block truncate text-sm font-semibold ${done ? "text-slate-400 line-through" : "text-ink"}`}
                href="/tarefas"
              >
                {task.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {task.category ? <span>{task.category}</span> : null}
                {taskDate ? <span>{formatShortDate(taskDate)}</span> : null}
                {task.time ? <span>{task.time}</span> : null}
                {task.estimatedMinutes ? <span>{task.estimatedMinutes} min</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={urgencyTone[urgency]}>{urgencyLabel[urgency]}</Badge>
              {!done ? (
                <Button
                  aria-label="Adiar tarefa para amanha"
                  onClick={() => snoozeTask(task.id, getSnoozeTarget(today))}
                  size="icon"
                  variant="ghost"
                >
                  <Clock3 aria-hidden className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
