import type { Weekday } from "@/types/academic";

export const APP_TIME_ZONE = "America/Manaus";

export const weekdayLabels: Record<Weekday, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo"
};

const weekdayOrder: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export function getTodayInAppTimeZone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function toDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

export function isSameDateKey(a?: string, b?: string) {
  return Boolean(a && b && a === b);
}

export function getWeekDates(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(current, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthGrid(date = new Date()) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekday = first.getDay();
  const mondayOffset = firstWeekday === 0 ? -6 : 1 - firstWeekday;
  const start = addDays(first, mondayOffset);

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(parseDateKey(dateKey));
}

export function getWeekdayFromDate(date: Date): Weekday {
  return weekdayOrder[date.getDay()] ?? "monday";
}

export function getCurrentWeekday(date = new Date()): Weekday {
  return getWeekdayFromDate(parseDateKey(getTodayInAppTimeZone(date)));
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
}

export function sortByDateAndTime<T extends { dueDate?: string; date?: string; time?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aValue = `${a.dueDate ?? a.date ?? "9999-12-31"}T${a.time ?? "23:59"}`;
    const bValue = `${b.dueDate ?? b.date ?? "9999-12-31"}T${b.time ?? "23:59"}`;
    return aValue.localeCompare(bValue);
  });
}
