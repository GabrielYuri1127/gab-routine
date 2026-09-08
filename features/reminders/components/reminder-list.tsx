"use client";

import { Bell, Check, Clock, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/date";
import { getReminderDateKey, getReminderState, getReminderTime, sortReminders } from "@/lib/reminders/schedule";
import { useRoutineData } from "@/features/data/routine-store";
import type { Reminder } from "@/types/domain";

interface ReminderListProps {
  reminders?: Reminder[];
  limit?: number;
  emptyLabel?: string;
}

const stateLabel = {
  dismissed: "dispensado",
  due: "agora",
  today: "hoje",
  upcoming: "agendado"
} as const;

const stateTone = {
  dismissed: "neutral",
  due: "coral",
  today: "gold",
  upcoming: "sky"
} as const;

const reminderStatusLabels: Record<Reminder["status"], string> = {
  scheduled: "Agendado",
  sent: "Enviado",
  dismissed: "Dispensado"
};

const sourceTypeLabels: Record<NonNullable<Reminder["sourceType"]>, string> = {
  custom: "Livre",
  task: "Tarefa",
  activity: "Atividade",
  event: "Compromisso",
  study: "Estudo"
};

export function ReminderList({ reminders, limit, emptyLabel = "Nenhum lembrete nesse filtro." }: ReminderListProps) {
  const { data, dismissReminder, removeReminder, updateReminder } = useRoutineData();
  const source = reminders ?? data.reminders;
  const items = sortReminders(source).slice(0, limit ?? source.length);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white shadow-sm">
      {items.map((reminder) => {
        const state = getReminderState(reminder);
        const dismissed = reminder.status === "dismissed";

        return (
          <article className="border-b border-line px-3 py-3 last:border-b-0 sm:px-4" key={reminder.id}>
            <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky">
                {dismissed ? <Check aria-hidden className="h-5 w-5" /> : <Bell aria-hidden className="h-5 w-5" />}
              </div>

              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${dismissed ? "text-slate-400 line-through" : "text-ink"}`}>
                  {reminder.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatShortDate(getReminderDateKey(reminder))}</span>
                  <span>{getReminderTime(reminder)}</span>
                  {reminder.sourceType ? <span>{sourceTypeLabels[reminder.sourceType]}</span> : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={stateTone[state]}>{stateLabel[state]}</Badge>
                {!dismissed ? (
                  <Button aria-label="Dispensar lembrete" onClick={() => dismissReminder(reminder.id)} size="icon" variant="ghost">
                    <Clock aria-hidden className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <details className="mt-3 rounded-lg border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar lembrete</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_120px]">
                <label className="text-xs text-slate-500">
                  Titulo
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateReminder(reminder.id, { title: event.target.value })}
                    value={reminder.title}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Data
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) =>
                      updateReminder(reminder.id, {
                        remindAt: `${event.target.value || getReminderDateKey(reminder)}T${getReminderTime(reminder)}:00`
                      })
                    }
                    type="date"
                    value={getReminderDateKey(reminder)}
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Hora
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) =>
                      updateReminder(reminder.id, {
                        remindAt: `${getReminderDateKey(reminder)}T${event.target.value || "09:00"}:00`
                      })
                    }
                    type="time"
                    value={getReminderTime(reminder)}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Tipo
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateReminder(reminder.id, { sourceType: event.target.value as Reminder["sourceType"] })}
                    value={reminder.sourceType ?? "custom"}
                  >
                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
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
                    onChange={(event) => updateReminder(reminder.id, { status: event.target.value as Reminder["status"] })}
                    value={reminder.status}
                  >
                    {Object.entries(reminderStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Button className="mt-3" onClick={() => removeReminder(reminder.id)} size="sm" variant="danger">
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
