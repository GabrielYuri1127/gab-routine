"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarClock, CalendarDays, CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatShortDate, getWeekDates, getWeekdayFromDate, toDateKey, weekdayLabels } from "@/lib/date";
import { getReminderDateKey, getReminderTime } from "@/lib/reminders/schedule";
import { getTaskDate } from "@/lib/tasks/prioritization";
import { useRoutineData } from "@/features/data/routine-store";

export function WeekView() {
  const { data } = useRoutineData();
  const weekDates = getWeekDates();
  const visibleSubjects = data.subjects.filter((subject) => subject.status !== "archived");
  const activeSubjects = visibleSubjects.filter((subject) => subject.status === "active");

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Semana</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Aulas e rotina</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Visao semanal com aulas, tarefas, lembretes e prazos academicos.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Semana">
        {weekDates.map((date) => {
          const dateKey = toDateKey(date);
          const weekday = getWeekdayFromDate(date);
          const classes = activeSubjects.flatMap((subject) =>
            subject.schedules
              .filter((schedule) => schedule.weekday === weekday)
              .map((schedule) => ({ subject, schedule }))
          );
          const tasks = data.tasks.filter((task) => task.status !== "done" && getTaskDate(task) === dateKey);
          const reminders = data.reminders.filter(
            (reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === dateKey
          );
          const events = data.events.filter((event) => event.date === dateKey);
          const activities = visibleSubjects.flatMap((subject) =>
            subject.activities
              .filter((activity) => activity.status !== "submitted" && activity.status !== "corrected" && activity.dueDate === dateKey)
              .map((activity) => ({ subject, activity }))
          );
          const total = classes.length + tasks.length + reminders.length + activities.length + events.length;

          return (
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={dateKey}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase text-ink">{weekdayLabels[weekday]}</h2>
                  <p className="text-xs text-slate-500">{formatShortDate(dateKey)}</p>
                </div>
                <Badge tone={total ? "mint" : "neutral"}>{total} itens</Badge>
              </div>

              {total === 0 ? (
                <p className="text-sm text-slate-500">Nada cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {classes.map(({ subject, schedule }) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href={`/faculdade/${subject.id}`}
                      key={schedule.id}
                    >
                      <span className="text-sm font-semibold text-ink">{schedule.startTime}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                          <BookOpen aria-hidden className="h-4 w-4 text-mint" />
                          {subject.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {subject.room ?? "Sala nao informada"} - {schedule.classesQuantity} aulas
                        </span>
                      </span>
                    </Link>
                  ))}

                  {activities.map(({ subject, activity }) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href={`/faculdade/${subject.id}`}
                      key={activity.id}
                    >
                      <span className="text-sm font-semibold text-ink">{activity.time ?? "--:--"}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                          <CalendarDays aria-hidden className="h-4 w-4 text-gold" />
                          {activity.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{subject.name}</span>
                      </span>
                    </Link>
                  ))}

                  {events.map((event) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href="/calendario"
                      key={event.id}
                    >
                      <span className="text-sm font-semibold text-ink">{event.startsAt ?? "--:--"}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                          <CalendarClock aria-hidden className="h-4 w-4 text-gold" />
                          {event.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {event.endsAt ? `Ate ${event.endsAt}` : "Compromisso"}
                        </span>
                      </span>
                    </Link>
                  ))}

                  {tasks.map((task) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href="/tarefas"
                      key={task.id}
                    >
                      <span className="text-sm font-semibold text-ink">{task.time ?? "--:--"}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                          <CheckSquare aria-hidden className="h-4 w-4 text-coral" />
                          {task.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{task.category ?? "Tarefa"}</span>
                      </span>
                    </Link>
                  ))}

                  {reminders.map((reminder) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href="/lembretes"
                      key={reminder.id}
                    >
                      <span className="text-sm font-semibold text-ink">{getReminderTime(reminder)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                          <Bell aria-hidden className="h-4 w-4 text-sky" />
                          {reminder.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">Lembrete</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
