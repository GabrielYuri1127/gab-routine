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

export function getCurrentWeekday(date = new Date()): Weekday {
  const weekdayIndex = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      weekday: "short"
    })
      .formatToParts(date)
      .find((part) => part.type === "weekday")?.value
  );

  if (!Number.isNaN(weekdayIndex)) {
    return weekdayOrder[weekdayIndex] ?? "monday";
  }

  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "long"
  }).format(date);

  const byName: Record<string, Weekday> = {
    Sunday: "sunday",
    Monday: "monday",
    Tuesday: "tuesday",
    Wednesday: "wednesday",
    Thursday: "thursday",
    Friday: "friday",
    Saturday: "saturday"
  };

  return byName[name] ?? "monday";
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
