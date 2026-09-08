import { addDays, formatShortDate, getTodayInAppTimeZone, getWeekdayFromDate, parseDateKey, toDateKey, weekdayLabels } from "../date";
import type { Subject, SubjectSchedule, Weekday } from "../../types/academic";

export interface ClassDateOption {
  date: string;
  label: string;
  weekday: Weekday;
  schedules: SubjectSchedule[];
  classesQuantity: number;
  alreadyRegistered: boolean;
}

export function getSchedulesForDate(subject: Subject, dateKey: string) {
  const weekday = getWeekdayFromDate(parseDateKey(dateKey));
  return subject.schedules.filter((schedule) => schedule.weekday === weekday);
}

export function isClassDate(subject: Subject, dateKey: string) {
  return getSchedulesForDate(subject, dateKey).length > 0;
}

export function getRecentClassDates(subject: Subject, fromDateKey = getTodayInAppTimeZone(), daysBack = 45): ClassDateOption[] {
  const from = parseDateKey(fromDateKey);

  return Array.from({ length: daysBack + 1 }, (_, index) => {
    const date = addDays(from, -index);
    const dateKey = toDateKey(date);
    const weekday = getWeekdayFromDate(date);
    const schedules = subject.schedules.filter((schedule) => schedule.weekday === weekday);

    if (schedules.length === 0) {
      return null;
    }

    return {
      date: dateKey,
      label: `${weekdayLabels[weekday].slice(0, 3)} ${formatShortDate(dateKey)}`,
      weekday,
      schedules,
      classesQuantity: schedules.reduce((total, schedule) => total + schedule.classesQuantity, 0),
      alreadyRegistered: subject.attendance.some((record) => record.date === dateKey)
    };
  }).filter((option): option is ClassDateOption => option !== null);
}
