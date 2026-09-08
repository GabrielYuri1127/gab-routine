import { addDays, getTodayInAppTimeZone, parseDateKey, toDateKey } from "../date";
import type { Priority, Task } from "@/types/domain";

export type TaskUrgency = "done" | "overdue" | "today" | "snoozed" | "upcoming" | "later";

const priorityWeight: Record<Priority, number> = {
  urgent: 40,
  high: 30,
  medium: 20,
  low: 10
};

const urgencyWeight: Record<TaskUrgency, number> = {
  overdue: 600,
  today: 500,
  snoozed: 350,
  upcoming: 250,
  later: 100,
  done: 0
};

export function getPriorityWeight(priority: Priority) {
  return priorityWeight[priority];
}

export function getTaskDate(task: Task) {
  return task.dueDate ?? task.date;
}

export function getTaskUrgency(task: Task, today = getTodayInAppTimeZone()): TaskUrgency {
  if (task.status === "done") {
    return "done";
  }

  const taskDate = getTaskDate(task);
  if (!taskDate) {
    return "later";
  }

  if (task.status === "snoozed" && taskDate > today) {
    return "snoozed";
  }

  if (taskDate < today) {
    return "overdue";
  }

  if (taskDate === today) {
    return "today";
  }

  return "upcoming";
}

export function getTaskScore(task: Task, today = getTodayInAppTimeZone()) {
  return urgencyWeight[getTaskUrgency(task, today)] + getPriorityWeight(task.priority);
}

export function prioritizeTasks(tasks: Task[], today = getTodayInAppTimeZone()) {
  return [...tasks].sort((a, b) => {
    const statusDelta = Number(a.status === "done") - Number(b.status === "done");
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const scoreDelta = getTaskScore(b, today) - getTaskScore(a, today);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const aDate = getTaskDate(a) ?? "9999-12-31";
    const bDate = getTaskDate(b) ?? "9999-12-31";
    const dateDelta = aDate.localeCompare(bDate);
    if (dateDelta !== 0) {
      return dateDelta;
    }

    return (a.time ?? "23:59").localeCompare(b.time ?? "23:59");
  });
}

export function getSnoozeTarget(from = getTodayInAppTimeZone(), days = 1) {
  return toDateKey(addDays(parseDateKey(from), days));
}
