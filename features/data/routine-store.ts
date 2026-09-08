import { createContext, useContext } from "react";

import type { AcademicActivity, AttendanceRecord, Grade, Subject } from "@/types/academic";
import type { Event, NotificationPreference, Reminder, Task } from "@/types/domain";
import { buildSeedData, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";

export const STORAGE_KEY = "gab-routine:data:v3";
const LEGACY_STORAGE_KEYS = ["gab-routine:data:v2"];

export interface RoutineDataContextValue {
  data: RoutineData;
  hydrated: boolean;
  replaceData: (data: RoutineData) => void;
  resetData: () => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (subjectId: string, patch: Partial<Subject>) => void;
  addTask: (task: Omit<Task, "id" | "userId" | "status"> & Partial<Pick<Task, "status">>) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  completeTask: (taskId: string) => void;
  snoozeTask: (taskId: string, date: string) => void;
  removeTask: (taskId: string) => void;
  addReminder: (reminder: Omit<Reminder, "id" | "userId" | "status"> & Partial<Pick<Reminder, "status">>) => void;
  updateReminder: (reminderId: string, patch: Partial<Reminder>) => void;
  dismissReminder: (reminderId: string) => void;
  removeReminder: (reminderId: string) => void;
  addEvent: (event: Omit<Event, "id" | "userId">) => void;
  updateEvent: (eventId: string, patch: Partial<Event>) => void;
  removeEvent: (eventId: string) => void;
  updateNotificationPreference: (patch: Partial<NotificationPreference>) => void;
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

  let stored = window.localStorage.getItem(STORAGE_KEY);
  let migrated = false;

  if (!stored) {
    for (const key of LEGACY_STORAGE_KEYS) {
      stored = window.localStorage.getItem(key);
      if (stored) {
        migrated = true;
        break;
      }
    }
  }

  if (!stored) {
    const seed = buildSeedData();
    saveRoutineData(seed);
    return seed;
  }

  try {
    const parsed = normalizeRoutineData(JSON.parse(stored));
    if (migrated) {
      saveRoutineData(parsed);
    }

    return parsed;
  } catch {
    return buildSeedData();
  }
}

export function normalizeRoutineData(value: unknown): RoutineData {
  const seed = buildSeedData();
  if (!value || typeof value !== "object") {
    return seed;
  }

  const parsed = value as Partial<RoutineData>;
  return {
    ...seed,
    ...parsed,
    version: 3,
    userId: parsed.userId ?? LOCAL_USER_ID,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : seed.subjects,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders : seed.reminders,
    events: Array.isArray(parsed.events) ? parsed.events : seed.events,
    notificationPreference: parsed.notificationPreference ?? seed.notificationPreference
  };
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
