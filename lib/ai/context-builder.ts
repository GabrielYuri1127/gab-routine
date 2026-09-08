import type { Subject } from "@/types/academic";

export interface AssistantContext {
  today: string;
  subjects: Pick<Subject, "id" | "name" | "schedules" | "activities" | "grades" | "attendance">[];
}

export function buildAssistantContext(subjects: Subject[], today: string): AssistantContext {
  return {
    today,
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      schedules: subject.schedules,
      activities: subject.activities,
      grades: subject.grades,
      attendance: subject.attendance
    }))
  };
}
