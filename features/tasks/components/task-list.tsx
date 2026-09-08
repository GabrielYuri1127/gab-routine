"use client";

import { Check, Clock3, ListTodo, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShortDate, getTodayInAppTimeZone } from "@/lib/date";
import { getSnoozeTarget, getTaskDate, getTaskUrgency, prioritizeTasks } from "@/lib/tasks/prioritization";
import { useRoutineData } from "@/features/data/routine-store";
import type { Priority, Task, TaskStatus } from "@/types/domain";

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

const priorityLabels: Record<Priority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente"
};

const statusLabels: Record<TaskStatus, string> = {
  open: "Aberta",
  done: "Feita",
  snoozed: "Adiada",
  cancelled: "Cancelada"
};

export function TaskList({ tasks, limit, emptyLabel = "Nenhuma tarefa nesse filtro." }: TaskListProps) {
  const { data, completeTask, removeTask, snoozeTask, updateTask } = useRoutineData();
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
          <article className="border-b border-line px-3 py-3 last:border-b-0 sm:px-4" key={task.id}>
            <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
              <Button
                aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
                onClick={() => completeTask(task.id)}
                size="icon"
                variant={done ? "secondary" : "ghost"}
              >
                {done ? <Check aria-hidden className="h-5 w-5 text-mint" /> : <ListTodo aria-hidden className="h-5 w-5" />}
              </Button>

              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${done ? "text-slate-400 line-through" : "text-ink"}`}>
                  {task.title}
                </p>
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
            </div>

            <details className="mt-3 rounded-lg border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar tarefa</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_120px]">
                <label className="text-xs text-slate-500">
                  Titulo
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { title: event.target.value })}
                    value={task.title}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Data
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { date: event.target.value || undefined, dueDate: event.target.value || undefined })}
                    type="date"
                    value={taskDate ?? ""}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Hora
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { time: event.target.value || undefined })}
                    type="time"
                    value={task.time ?? ""}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <label className="text-xs text-slate-500">
                  Prioridade
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}
                    value={task.priority}
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Status
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
                    value={task.status}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Categoria
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateTask(task.id, { category: event.target.value || undefined })}
                    value={task.category ?? ""}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Minutos
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    min={0}
                    onChange={(event) =>
                      updateTask(task.id, { estimatedMinutes: event.target.value ? Number(event.target.value) : undefined })
                    }
                    step={5}
                    type="number"
                    value={task.estimatedMinutes ?? ""}
                  />
                </label>
              </div>

              <label className="mt-3 block text-xs text-slate-500">
                Descricao
                <textarea
                  className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-2 py-2 text-sm text-ink outline-none focus:border-ink"
                  onChange={(event) => updateTask(task.id, { description: event.target.value || undefined })}
                  value={task.description ?? ""}
                />
              </label>

              <Button className="mt-3" onClick={() => removeTask(task.id)} size="sm" variant="danger">
                <Trash2 aria-hidden className="h-4 w-4" />
                Excluir
              </Button>
            </details>
          </article>
        );
      })}
    </div>
  );
}
