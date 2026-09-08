import { getTodayInAppTimeZone } from "../date";
import type { Reminder } from "@/types/domain";

export type ReminderState = "dismissed" | "due" | "today" | "upcoming";

export function getReminderDateKey(reminder: Reminder) {
  return reminder.remindAt.slice(0, 10);
}

export function getReminderTime(reminder: Reminder) {
  return reminder.remindAt.slice(11, 16);
}

export function getReminderState(reminder: Reminder, now = new Date()): ReminderState {
  if (reminder.status === "dismissed") {
    return "dismissed";
  }

  const targetTime = new Date(reminder.remindAt).getTime();
  if (!Number.isNaN(targetTime) && targetTime <= now.getTime()) {
    return "due";
  }

  return getReminderDateKey(reminder) === getTodayInAppTimeZone(now) ? "today" : "upcoming";
}

export function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort((a, b) => a.remindAt.localeCompare(b.remindAt));
}
