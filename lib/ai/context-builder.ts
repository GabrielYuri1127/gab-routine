import type { Subject } from "@/types/academic";
import type { Event, Reminder, Task } from "@/types/domain";

export interface AssistantContext {
  events: Event[];
  reminders: Reminder[];
  today: string;
  subjects: Pick<Subject, "id" | "name" | "schedules" | "activities" | "grades" | "attendance">[];
  tasks: Task[];
}

export function buildAssistantContext(
  subjects: Subject[],
  today: string,
  tasks: Task[] = [],
  reminders: Reminder[] = [],
  events: Event[] = []
): AssistantContext {
  return {
    events,
    reminders,
    today,
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      schedules: subject.schedules,
      activities: subject.activities,
      grades: subject.grades,
      attendance: subject.attendance
    })),
    tasks
  };
}
