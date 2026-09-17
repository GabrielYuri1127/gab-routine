"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoutineData } from "@/features/data/seed";
import { useRoutineData } from "@/features/data/routine-store";
import {
  countConflictGroups,
  getTimelineBounds,
  layoutTimedItems,
  parseTimeInMinutes,
  type TimedItemLayout
} from "@/lib/calendar/week-layout";
import {
  addDays,
  formatShortDate,
  getTodayInAppTimeZone,
  getWeekDates,
  getWeekdayFromDate,
  parseDateKey,
  toDateKey,
  weekdayLabels
} from "@/lib/date";
import { getReminderDateKey, getReminderTime } from "@/lib/reminders/schedule";
import { getTaskDate } from "@/lib/tasks/prioritization";
import { cn } from "@/lib/utils";

type WeekItemKind = "class" | "activity" | "event" | "task" | "reminder";

interface WeekItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  kind: WeekItemKind;
  href: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  accentColor?: string;
}

interface DayPlan {
  date: Date;
  dateKey: string;
  items: WeekItem[];
  timed: TimedItemLayout<WeekItem>[];
  unscheduled: WeekItem[];
}

const HOUR_HEIGHT = 72;

const kindOptions: Array<{
  kind: WeekItemKind;
  label: string;
  singular: string;
  icon: LucideIcon;
}> = [
  { kind: "class", label: "Horarios fixos", singular: "horario", icon: BookOpen },
  { kind: "activity", label: "Prazos", singular: "prazo", icon: CalendarDays },
  { kind: "event", label: "Compromissos", singular: "compromisso", icon: CalendarClock },
  { kind: "task", label: "Tarefas", singular: "tarefa", icon: CheckSquare },
  { kind: "reminder", label: "Lembretes", singular: "lembrete", icon: Bell }
];

const kindCardClasses: Record<WeekItemKind, string> = {
  class: "border-emerald-300 bg-emerald-50 text-emerald-950",
  activity: "border-amber-300 bg-amber-50 text-amber-950",
  event: "border-violet-300 bg-violet-50 text-violet-950",
  task: "border-red-300 bg-red-50 text-red-950",
  reminder: "border-sky-300 bg-sky-50 text-sky-950"
};

const kindDotClasses: Record<WeekItemKind, string> = {
  class: "bg-emerald-500",
  activity: "bg-amber-500",
  event: "bg-violet-500",
  task: "bg-red-500",
  reminder: "bg-sky-500"
};

const initialKinds: Record<WeekItemKind, boolean> = {
  class: true,
  activity: true,
  event: true,
  task: true,
  reminder: true
};

export function WeekView() {
  const { data } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [anchorDate, setAnchorDate] = useState(today);
  const [visibleKinds, setVisibleKinds] = useState(initialKinds);
  const weekDates = useMemo(() => getWeekDates(parseDateKey(anchorDate)), [anchorDate]);

  const days = useMemo(
    () =>
      weekDates.map((date) => {
        const dateKey = toDateKey(date);
        const items = buildDayItems(date, dateKey, data).filter((item) => visibleKinds[item.kind]);
        return {
          date,
          dateKey,
          items,
          timed: layoutTimedItems(items),
          unscheduled: items.filter((item) => parseTimeInMinutes(item.startTime) === null)
        } satisfies DayPlan;
      }),
    [data, visibleKinds, weekDates]
  );

  const allTimed = days.flatMap((day) => day.timed);
  const allItems = days.flatMap((day) => day.items);
  const unscheduledCount = days.reduce((total, day) => total + day.unscheduled.length, 0);
  const conflictCount = days.reduce((total, day) => total + countConflictGroups(day.timed), 0);
  const timeline = getTimelineBounds(allTimed);
  const timelineHours = Array.from(
    { length: timeline.endHour - timeline.startHour + 1 },
    (_, index) => timeline.startHour + index
  );
  const timelineHeight = (timeline.endHour - timeline.startHour) * HOUR_HEIGHT;
  const hasUnscheduled = unscheduledCount > 0;

  function moveWeek(daysToMove: number) {
    setAnchorDate(toDateKey(addDays(parseDateKey(anchorDate), daysToMove)));
  }

  function toggleKind(kind: WeekItemKind) {
    setVisibleKinds((current) => ({ ...current, [kind]: !current[kind] }));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-mint">Semana</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Planejamento semanal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Horarios, prazos e tarefas em uma linha do tempo unica. Conflitos aparecem automaticamente.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-black"
          href="/quick/event"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Novo compromisso
        </Link>
      </header>

      <section className="rounded-lg border border-line bg-white p-3 shadow-sm sm:p-4" aria-label="Controles da semana">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <Button aria-label="Semana anterior" onClick={() => moveWeek(-7)} size="icon" title="Semana anterior" variant="secondary">
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </Button>
            <div className="min-w-44 text-center">
              <p className="text-sm font-semibold text-ink">{formatWeekRange(weekDates)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{allItems.length} itens visiveis</p>
            </div>
            <Button aria-label="Proxima semana" onClick={() => moveWeek(7)} size="icon" title="Proxima semana" variant="secondary">
              <ChevronRight aria-hidden className="h-5 w-5" />
            </Button>
          </div>
          <Button className="w-full md:w-auto" disabled={anchorDate === today} onClick={() => setAnchorDate(today)} variant="secondary">
            Voltar para hoje
          </Button>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2" aria-label="Filtrar agenda">
            {kindOptions.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                    visibleKinds[option.kind] ? "border-slate-300 bg-slate-50 text-ink" : "border-line bg-white text-slate-400"
                  )}
                  key={option.kind}
                >
                  <input
                    checked={visibleKinds[option.kind]}
                    className="sr-only"
                    onChange={() => toggleKind(option.kind)}
                    type="checkbox"
                  />
                  <span className={cn("h-2.5 w-2.5 rounded-full", visibleKinds[option.kind] ? kindDotClasses[option.kind] : "bg-slate-300")} />
                  <Icon aria-hidden className="h-4 w-4" />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo da semana">
        <WeekMetric icon={CalendarClock} label="Agendados" value={allTimed.length} />
        <WeekMetric icon={Clock3} label="Sem horario" value={unscheduledCount} />
        <WeekMetric icon={AlertTriangle} label="Conflitos" tone={conflictCount ? "warning" : "neutral"} value={conflictCount} />
        <WeekMetric icon={CalendarDays} label="Dias ocupados" value={days.filter((day) => day.items.length > 0).length} />
      </section>

      {allItems.length === 0 ? (
        <section className="rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
          <CalendarDays aria-hidden className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-ink">Nenhum item nessa semana</h2>
          <p className="mt-1 text-sm text-slate-500">Mude os filtros, navegue para outra semana ou adicione um compromisso.</p>
          <Link className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink" href="/quick/event">
            <Plus aria-hidden className="h-4 w-4" />
            Adicionar
          </Link>
        </section>
      ) : null}

      {allItems.length > 0 ? (
        <>
          <div className="space-y-3 lg:hidden" aria-label="Agenda semanal em lista">
            {days.map((day) => (
              <MobileDay key={day.dateKey} plan={day} today={today} />
            ))}
          </div>

          <section className="hidden overflow-hidden rounded-lg border border-line bg-white shadow-sm lg:block" aria-label="Agenda semanal em grade">
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line bg-slate-50">
                  <div className="flex items-center justify-center border-r border-line text-slate-400">
                    <Clock3 aria-hidden className="h-4 w-4" />
                  </div>
                  {days.map((day) => (
                    <div
                      className={cn("border-r border-line px-2 py-3 text-center last:border-r-0", day.dateKey === today && "bg-emerald-50")}
                      key={day.dateKey}
                    >
                      <p className="text-[11px] font-semibold uppercase text-slate-500">{weekdayLabels[getWeekdayFromDate(day.date)]}</p>
                      <p className={cn("mt-1 text-sm font-semibold text-ink", day.dateKey === today && "text-emerald-700")}>
                        {formatShortDate(day.dateKey)}
                      </p>
                    </div>
                  ))}
                </div>

                {hasUnscheduled ? (
                  <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line">
                    <div className="border-r border-line px-2 py-3 text-center text-[10px] font-semibold uppercase text-slate-400">Sem hora</div>
                    {days.map((day) => (
                      <div className="min-h-16 space-y-1 border-r border-line p-2 last:border-r-0" key={day.dateKey}>
                        {day.unscheduled.map((item) => (
                          <CompactItem item={item} key={item.id} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                  <div className="relative border-r border-line bg-slate-50" style={{ height: timelineHeight }}>
                    {timelineHours.map((hour) => (
                      <span
                        className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-slate-400"
                        key={hour}
                        style={{ top: (hour - timeline.startHour) * HOUR_HEIGHT }}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {days.map((day) => (
                    <TimelineDay
                      key={day.dateKey}
                      layouts={day.timed}
                      startHour={timeline.startHour}
                      height={timelineHeight}
                      isToday={day.dateKey === today}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function TimelineDay({ layouts, startHour, height, isToday }: {
  layouts: TimedItemLayout<WeekItem>[];
  startHour: number;
  height: number;
  isToday: boolean;
}) {
  const pixelsPerMinute = HOUR_HEIGHT / 60;

  return (
    <div
      className={cn("relative border-r border-line last:border-r-0", isToday && "bg-emerald-50/30")}
      style={{
        height,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 71px, #e5e7eb 72px)"
      }}
    >
      {layouts.map((layout) => {
        const top = (layout.startMinutes - startHour * 60) * pixelsPerMinute + 2;
        const cardHeight = Math.max(20, (layout.endMinutes - layout.startMinutes) * pixelsPerMinute - 4);
        const laneWidth = 100 / layout.laneCount;
        const option = kindOptions.find((item) => item.kind === layout.item.kind)!;
        const Icon = option.icon;

        return (
          <Link
            aria-label={`${layout.item.title}, ${layout.item.startTime}`}
            className={cn(
              "absolute z-10 overflow-hidden rounded-md border border-l-[3px] px-1.5 py-1 shadow-sm transition hover:z-20 hover:shadow-md focus:z-20",
              kindCardClasses[layout.item.kind]
            )}
            href={layout.item.href}
            key={layout.item.id}
            style={{
              borderLeftColor: layout.item.accentColor,
              height: cardHeight,
              left: `calc(${layout.lane * laneWidth}% + 3px)`,
              top,
              width: `calc(${laneWidth}% - 6px)`
            }}
            title={`${layout.item.title} - ${layout.item.startTime}${layout.item.endTime ? ` ate ${layout.item.endTime}` : ""}`}
          >
            <div className="flex min-w-0 items-center gap-1">
              <Icon aria-hidden className="h-3 w-3 shrink-0" />
              <span className="truncate text-[10px] font-semibold">{layout.item.startTime}</span>
              {cardHeight < 36 ? <span className="truncate text-[10px] font-semibold">{layout.item.title}</span> : null}
              {layout.conflicting ? <AlertTriangle aria-hidden className="ml-auto h-3 w-3 shrink-0 text-red-600" /> : null}
            </div>
            {cardHeight >= 36 ? <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight">{layout.item.title}</p> : null}
            {cardHeight >= 70 ? <p className="mt-1 truncate text-[10px] opacity-70">{layout.item.subtitle}</p> : null}
          </Link>
        );
      })}
    </div>
  );
}

function MobileDay({ plan, today }: { plan: DayPlan; today: string }) {
  const conflictIds = new Set(plan.timed.filter((layout) => layout.conflicting).map((layout) => layout.item.id));
  const sortedItems = [...plan.items].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));

  return (
    <section className={cn("rounded-lg border border-line bg-white shadow-sm", plan.dateKey === today && "border-emerald-300")}>
      <div className={cn("flex items-center justify-between border-b border-line px-4 py-3", plan.dateKey === today && "bg-emerald-50")}>
        <div>
          <h2 className="text-sm font-semibold text-ink">{weekdayLabels[getWeekdayFromDate(plan.date)]}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{formatShortDate(plan.dateKey)}</p>
        </div>
        {plan.dateKey === today ? <Badge tone="mint">hoje</Badge> : <Badge>{plan.items.length} itens</Badge>}
      </div>
      {sortedItems.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">Dia livre.</p>
      ) : (
        <div>
          {sortedItems.map((item) => {
            const option = kindOptions.find((entry) => entry.kind === item.kind)!;
            const Icon = option.icon;
            return (
              <Link
                className="grid grid-cols-[50px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                href={item.href}
                key={item.id}
              >
                <span className="text-xs font-semibold text-ink">{item.startTime ?? "--:--"}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-700">
                    <Icon aria-hidden className="h-4 w-4 shrink-0" />
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{item.subtitle}</span>
                </span>
                {conflictIds.has(item.id) ? (
                  <span title="Conflito de horario">
                    <AlertTriangle aria-label="Conflito de horario" className="h-4 w-4 text-red-600" />
                  </span>
                ) : (
                  <span className={cn("h-2.5 w-2.5 rounded-full", kindDotClasses[item.kind])} title={option.singular} />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompactItem({ item }: { item: WeekItem }) {
  const option = kindOptions.find((entry) => entry.kind === item.kind)!;
  const Icon = option.icon;
  return (
    <Link
      className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium", kindCardClasses[item.kind])}
      href={item.href}
      title={item.title}
    >
      <Icon aria-hidden className="h-3 w-3 shrink-0" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}

function WeekMetric({ icon: Icon, label, value, tone = "neutral" }: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className={cn("rounded-lg border bg-white p-3 shadow-sm", tone === "warning" ? "border-amber-300" : "border-line")}>
      <div className="flex items-center gap-2 text-slate-500">
        <Icon aria-hidden className={cn("h-4 w-4", tone === "warning" && "text-amber-600")} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function buildDayItems(date: Date, dateKey: string, data: RoutineData): WeekItem[] {
  const weekday = getWeekdayFromDate(date);
  const visibleSubjects = data.subjects.filter((subject) => subject.status !== "archived");
  const activeSubjects = visibleSubjects.filter((subject) => subject.status === "active");

  const classes: WeekItem[] = activeSubjects.flatMap((subject) =>
    subject.schedules
      .filter((schedule) => schedule.weekday === weekday)
      .map((schedule) => ({
        id: `class-${dateKey}-${schedule.id}`,
        title: subject.name,
        subtitle: subject.room ? `${subject.room} - ${schedule.classesQuantity} registros` : `${schedule.classesQuantity} registros`,
        date: dateKey,
        kind: "class" as const,
        href: `/faculdade/${subject.id}`,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        accentColor: subject.color
      }))
  );

  const activities: WeekItem[] = visibleSubjects.flatMap((subject) =>
    subject.activities
      .filter((activity) => activity.dueDate === dateKey && activity.status !== "submitted" && activity.status !== "corrected")
      .map((activity) => ({
        id: `activity-${activity.id}`,
        title: activity.title,
        subtitle: `${subject.name} - prazo`,
        date: dateKey,
        kind: "activity" as const,
        href: `/faculdade/${subject.id}`,
        startTime: activity.time,
        durationMinutes: 45,
        accentColor: subject.color
      }))
  );

  const events: WeekItem[] = data.events
    .filter((event) => event.date === dateKey)
    .map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      subtitle: getEventCategoryLabel(event.category),
      date: dateKey,
      kind: "event" as const,
      href: "/calendario",
      startTime: event.startsAt,
      endTime: event.endsAt,
      durationMinutes: 60
    }));

  const tasks: WeekItem[] = data.tasks
    .filter((task) => !["done", "cancelled"].includes(task.status) && getTaskDate(task) === dateKey)
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: task.status === "blocked" ? task.blockedReason || "Tarefa bloqueada" : task.category || "Tarefa",
      date: dateKey,
      kind: "task" as const,
      href: "/tarefas",
      startTime: task.time,
      durationMinutes: task.estimatedMinutes ?? 45
    }));

  const reminders: WeekItem[] = data.reminders
    .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === dateKey)
    .map((reminder) => ({
      id: `reminder-${reminder.id}`,
      title: reminder.title,
      subtitle: "Lembrete",
      date: dateKey,
      kind: "reminder" as const,
      href: "/lembretes",
      startTime: getReminderTime(reminder),
      durationMinutes: 20
    }));

  return [...classes, ...activities, ...events, ...tasks, ...reminders];
}

function formatWeekRange(dates: Date[]) {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const firstMonth = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(first);
  const lastMonth = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(last);

  if (first.getFullYear() !== last.getFullYear()) {
    return `${firstDay} de ${firstMonth} de ${first.getFullYear()} a ${lastDay} de ${lastMonth} de ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${firstDay} de ${firstMonth} a ${lastDay} de ${lastMonth} de ${last.getFullYear()}`;
  }

  return `${firstDay} a ${lastDay} de ${lastMonth} de ${last.getFullYear()}`;
}

function getEventCategoryLabel(category: RoutineData["events"][number]["category"]) {
  const labels: Record<RoutineData["events"][number]["category"], string> = {
    appointment: "Compromisso",
    class: "Aula",
    deadline: "Prazo",
    personal: "Pessoal",
    study: "Estudo",
    task: "Tarefa",
    work: "Trabalho"
  };
  return labels[category];
}
