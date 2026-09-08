export type DeadlineUrgency = "normal" | "attention" | "urgent" | "overdue";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDeadlineUrgency(dueDate: string, today = new Date()): DeadlineUrgency {
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.ceil((due.getTime() - startOfToday.getTime()) / MS_PER_DAY);

  if (days < 0) {
    return "overdue";
  }

  if (days < 3) {
    return "urgent";
  }

  if (days <= 7) {
    return "attention";
  }

  return "normal";
}
