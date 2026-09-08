import { createContext, useContext } from "react";

import type { AcademicActivity, AttendanceRecord, Grade, Subject } from "@/types/academic";
import type { Reminder, Task } from "@/types/domain";
import { buildSeedData, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";

export const STORAGE_KEY = "gab-routine:data:v2";

export interface RoutineDataContextValue {
  data: RoutineData;
  hydrated: boolean;
  addSubject: (subject: Subject) => void;
  updateSubject: (subjectId: string, patch: Partial<Subject>) => void;
  addTask: (task: Omit<Task, "id" | "userId" | "status"> & Partial<Pick<Task, "status">>) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  completeTask: (taskId: string) => void;
  snoozeTask: (taskId: string, date: string) => void;
  addReminder: (reminder: Omit<Reminder, "id" | "userId" | "status"> & Partial<Pick<Reminder, "status">>) => void;
  updateReminder: (reminderId: string, patch: Partial<Reminder>) => void;
  dismissReminder: (reminderId: string) => void;
  addAttendanceRecord: (subjectId: string, record: AttendanceRecord) => void;
  updateAttendanceRecord: (subjectId: string, recordId: string, patch: Partial<AttendanceRecord>) => void;
  removeAttendanceRecord: (subjectId: string, recordId: string) => void;
  addGrade: (subjectId: string, grade: Grade) => void;
  addActivity: (subjectId: string, activity: AcademicActivity) => void;
  updateActivity: (subjectId: string, activityId: string, patch: Partial<AcademicActivity>) => void;
  removeActivity: (subjectId: string, activityId: string) => void;
}

export const RoutineDataContext = createContext<RoutineDataContextValue | null>(null);

export function loadRoutineData() {
  if (typeof window === "undefined") {
    return buildSeedData();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return buildSeedData();
  }

  try {
    const parsed = JSON.parse(stored) as RoutineData;
    if (parsed.version !== 2 || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks)) {
      return buildSeedData();
    }

    return parsed;
  } catch {
    return buildSeedData();
  }
}

export function saveRoutineData(data: RoutineData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useRoutineData() {
  const context = useContext(RoutineDataContext);
  if (!context) {
    throw new Error("useRoutineData must be used within RoutineDataProvider");
  }

  return context;
}

export function withLocalUser<T extends object>(value: T) {
  return {
    ...value,
    userId: LOCAL_USER_ID
  };
}
