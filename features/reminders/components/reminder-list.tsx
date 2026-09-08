"use client";

import { Bell, Check, Clock } from "lucide-react";

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

export function ReminderList({ reminders, limit, emptyLabel = "Nenhum lembrete nesse filtro." }: ReminderListProps) {
  const { data, dismissReminder } = useRoutineData();
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
          <article
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 sm:px-4"
            key={reminder.id}
          >
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
                {reminder.sourceType ? <span>{reminder.sourceType}</span> : null}
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
          </article>
        );
      })}
    </div>
  );
}
