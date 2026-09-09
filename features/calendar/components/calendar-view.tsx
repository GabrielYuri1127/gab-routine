"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarDays, ChevronLeft, ChevronRight, ListTodo, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/features/calendar/components/event-form";
import { formatShortDate, getMonthGrid, getTodayInAppTimeZone, getWeekdayFromDate, parseDateKey, toDateKey } from "@/lib/date";
import { getReminderDateKey, getReminderTime } from "@/lib/reminders/schedule";
import { getTaskDate } from "@/lib/tasks/prioritization";
import { cn } from "@/lib/utils";
import { useRoutineData } from "@/features/data/routine-store";
import type { Subject } from "@/types/academic";
import type { Event, Reminder, Task } from "@/types/domain";

type CalendarItemType = "class" | "activity" | "task" | "reminder" | "event";

interface CalendarItem {
  id: string;
  title: string;
  time?: string;
  type: CalendarItemType;
  href: string;
  event?: Event;
}

const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const itemTone: Record<CalendarItemType, "mint" | "gold" | "coral" | "sky"> = {
  class: "mint",
  activity: "gold",
  task: "coral",
  reminder: "sky",
  event: "gold"
};

const itemLabel: Record<CalendarItemType, string> = {
  class: "aula",
  activity: "prazo",
  task: "tarefa",
  reminder: "lembrete",
  event: "compromisso"
};

const eventCategories: { value: Event["category"]; label: string }[] = [
  { value: "appointment", label: "Compromisso" },
  { value: "study", label: "Estudo" },
  { value: "work", label: "Trabalho" },
  { value: "deadline", label: "Prazo" },
  { value: "personal", label: "Pessoal" }
];

export function CalendarView() {
  const { data, removeEvent, updateEvent } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(today));

  const monthDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const selectedItems = useMemo(
    () => buildCalendarItems(selectedDate, data.subjects, data.tasks, data.reminders, data.events),
    [data.events, data.reminders, data.subjects, data.tasks, selectedDate]
  );

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(visibleMonth);

  function moveMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-mint">Calendario</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Agenda mensal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Aulas, prazos academicos, tarefas e lembretes ficam juntos na mesma leitura.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink shadow-sm"
          href="/semana"
        >
          <CalendarDays aria-hidden className="h-4 w-4" />
          Ver semana
        </Link>
      </header>

      <section className="rounded-lg border border-line bg-white p-3 shadow-sm sm:p-4" aria-label="Calendario mensal">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button aria-label="Mes anterior" onClick={() => moveMonth(-1)} size="icon" variant="ghost">
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Button>
          <h2 className="text-center text-base font-semibold capitalize text-ink">{monthLabel}</h2>
          <Button aria-label="Proximo mes" onClick={() => moveMonth(1)} size="icon" variant="ghost">
            <ChevronRight aria-hidden className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400 sm:gap-2">
          {dayLabels.map((day) => (
            <div className="py-1" key={day}>
              {day}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
          {monthDays.map((date) => {
            const dateKey = toDateKey(date);
            const dayItems = buildCalendarItems(dateKey, data.subjects, data.tasks, data.reminders, data.events);
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const selected = dateKey === selectedDate;

            return (
              <button
                className={cn(
                  "flex aspect-square min-h-14 flex-col items-start justify-between rounded-lg border border-line bg-white p-2 text-left transition hover:border-ink",
                  !inMonth && "bg-slate-50 text-slate-300",
                  selected && "border-ink bg-ink text-white",
                  dateKey === today && !selected && "border-mint"
                )}
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                type="button"
              >
                <span className="text-sm font-semibold">{date.getDate()}</span>
                <span className="flex max-w-full gap-1 overflow-hidden">
                  {dayItems.slice(0, 4).map((item) => (
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        item.type === "class" && "bg-mint",
                        item.type === "activity" && "bg-gold",
                        item.type === "event" && "bg-gold",
                        item.type === "task" && "bg-coral",
                        item.type === "reminder" && "bg-sky",
                        selected && "bg-white"
                      )}
                      key={item.id}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <EventForm defaultDate={selectedDate} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{formatShortDate(selectedDate)}</h2>
          <Badge tone="neutral">{selectedItems.length} itens</Badge>
        </div>

        {selectedItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm text-slate-500">
            Nenhum item nesse dia.
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-white shadow-sm">
            {selectedItems.map((item) =>
              item.event ? (
                <article className="border-b border-line px-4 py-3 last:border-b-0" key={item.id}>
                  <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3">
                    <ItemIcon type={item.type} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">{item.time ?? "Dia todo"}</span>
                    </span>
                    <Badge tone={itemTone[item.type]}>{itemLabel[item.type]}</Badge>
                  </div>
                  <details className="mt-3 rounded-lg border border-dashed border-line p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar compromisso</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_120px_120px_150px]">
                      <label className="text-xs text-slate-500">
                        Titulo
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                          onChange={(event) => updateEvent(item.event!.id, { title: event.target.value })}
                          value={item.event.title}
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Data
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                          onChange={(event) => updateEvent(item.event!.id, { date: event.target.value })}
                          type="date"
                          value={item.event.date}
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Inicio
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                          onChange={(event) => updateEvent(item.event!.id, { startsAt: event.target.value || undefined })}
                          type="time"
                          value={item.event.startsAt ?? ""}
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Fim
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                          onChange={(event) => updateEvent(item.event!.id, { endsAt: event.target.value || undefined })}
                          type="time"
                          value={item.event.endsAt ?? ""}
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Tipo
                        <select
                          className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                          onChange={(event) => updateEvent(item.event!.id, { category: event.target.value as Event["category"] })}
                          value={item.event.category}
                        >
                          {eventCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Button className="mt-3" onClick={() => removeEvent(item.event!.id)} size="sm" variant="danger">
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Excluir
                    </Button>
                  </details>
                </article>
              ) : (
                <Link
                  className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                  href={item.href}
                  key={item.id}
                >
                  <ItemIcon type={item.type} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                    <span className="block truncate text-xs text-slate-500">{item.time ?? "Dia todo"}</span>
                  </span>
                  <Badge tone={itemTone[item.type]}>{itemLabel[item.type]}</Badge>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function buildCalendarItems(dateKey: string, subjects: Subject[], tasks: Task[], reminders: Reminder[], events: Event[]): CalendarItem[] {
  const weekday = getWeekdayFromDate(parseDateKey(dateKey));
  const visibleSubjects = subjects.filter((subject) => subject.status !== "archived");
  const activeSubjects = visibleSubjects.filter((subject) => subject.status === "active");
  const classes = activeSubjects.flatMap((subject) =>
    subject.schedules
      .filter((schedule) => schedule.weekday === weekday)
      .map((schedule) => ({
        id: schedule.id,
        title: subject.name,
        time: schedule.startTime,
        type: "class" as const,
        href: `/faculdade/${subject.id}`
      }))
  );

  const activities = visibleSubjects.flatMap((subject) =>
    subject.activities
      .filter((activity) => activity.dueDate === dateKey)
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        time: activity.time,
        type: "activity" as const,
        href: `/faculdade/${subject.id}`
      }))
  );

  const visibleTasks = tasks
    .filter((task) => task.status !== "done" && getTaskDate(task) === dateKey)
    .map((task) => ({
      id: task.id,
      title: task.title,
      time: task.time,
      type: "task" as const,
      href: "/tarefas"
    }));

  const visibleReminders = reminders
    .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === dateKey)
    .map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      time: getReminderTime(reminder),
      type: "reminder" as const,
      href: "/lembretes"
    }));

  const visibleEvents = events
    .filter((event) => event.date === dateKey)
    .map((event) => ({
      id: event.id,
      title: event.title,
      time: event.startsAt,
      type: "event" as const,
      href: "/calendario",
      event
    }));

  return [...classes, ...activities, ...visibleTasks, ...visibleReminders, ...visibleEvents].sort((a, b) =>
    (a.time ?? "23:59").localeCompare(b.time ?? "23:59")
  );
}

function ItemIcon({ type }: { type: CalendarItemType }) {
  const className = "h-5 w-5";
  const iconClass = "flex h-11 w-11 items-center justify-center rounded-lg";

  if (type === "class") {
    return (
      <span className={`${iconClass} bg-emerald-50 text-mint`}>
        <BookOpen aria-hidden className={className} />
      </span>
    );
  }

  if (type === "task") {
    return (
      <span className={`${iconClass} bg-red-50 text-coral`}>
        <ListTodo aria-hidden className={className} />
      </span>
    );
  }

  if (type === "reminder") {
    return (
      <span className={`${iconClass} bg-sky-50 text-sky`}>
        <Bell aria-hidden className={className} />
      </span>
    );
  }

  return (
    <span className={`${iconClass} bg-amber-50 text-gold`}>
      <CalendarDays aria-hidden className={className} />
    </span>
  );
}
