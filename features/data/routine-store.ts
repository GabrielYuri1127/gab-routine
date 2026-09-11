"use client";

import { createContext, useContext } from "react";

import type { AcademicActivity, AttendanceRecord, Grade, Subject } from "@/types/academic";
import type { AppPreference, EnabledModules, Event, NotificationPreference, Reminder, Task } from "@/types/domain";
import { buildSeedData, DEFAULT_APP_PREFERENCE, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";

export const STORAGE_KEY = "gab-routine:data:v4";
const LEGACY_STORAGE_KEYS = ["gab-routine:data:v3", "gab-routine:data:v2"];

export type CloudSyncStatus = "local" | "loading" | "synced" | "saving" | "error";

export type AppPreferencePatch = Partial<Omit<AppPreference, "enabledModules">> & {
  enabledModules?: Partial<EnabledModules>;
};

export interface CloudSyncState {
  configured: boolean;
  email: string | null;
  error?: string;
  lastSyncedAt?: string;
  status: CloudSyncStatus;
  userId: string | null;
}

export interface RoutineDataContextValue {
  cloud: CloudSyncState;
  data: RoutineData;
  hydrated: boolean;
  replaceData: (data: RoutineData) => void;
  resetData: () => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (subjectId: string, patch: Partial<Subject>) => void;
  removeSubject: (subjectId: string) => void;
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
  updateAppPreference: (patch: AppPreferencePatch) => void;
  updateNotificationPreference: (patch: Partial<NotificationPreference>) => void;
  addAttendanceRecord: (subjectId: string, record: AttendanceRecord) => void;
  updateAttendanceRecord: (subjectId: string, recordId: string, patch: Partial<AttendanceRecord>) => void;
  removeAttendanceRecord: (subjectId: string, recordId: string) => void;
  addGrade: (subjectId: string, grade: Grade) => void;
  updateGrade: (subjectId: string, gradeId: string, patch: Partial<Grade>) => void;
  removeGrade: (subjectId: string, gradeId: string) => void;
  addActivity: (subjectId: string, activity: AcademicActivity) => void;
  updateActivity: (subjectId: string, activityId: string, patch: Partial<AcademicActivity>) => void;
  removeActivity: (subjectId: string, activityId: string) => void;
}

export const RoutineDataContext = createContext<RoutineDataContextValue | null>(null);

export const LOCAL_CLOUD_STATE: CloudSyncState = {
  configured: false,
  email: null,
  status: "local",
  userId: null
};

export function loadRoutineData(storageUserId?: string | null) {
  if (typeof window === "undefined") {
    return buildSeedData();
  }

  let stored = window.localStorage.getItem(getRoutineStorageKey(storageUserId));
  let migrated = false;

  if (!stored && !storageUserId) {
    for (const key of LEGACY_STORAGE_KEYS) {
      stored = window.localStorage.getItem(key);
      if (stored) {
        migrated = true;
        break;
      }
    }
  }

  if (!stored) {
    const seed = storageUserId ? createEmptyRoutineData(storageUserId) : buildSeedData();
    saveRoutineData(seed, storageUserId);
    return seed;
  }

  try {
    const parsed = normalizeRoutineData(JSON.parse(stored), storageUserId ?? LOCAL_USER_ID);
    if (migrated || JSON.stringify(parsed) !== stored) {
      saveRoutineData(parsed, storageUserId);
    }

    return parsed;
  } catch {
    return storageUserId ? createEmptyRoutineData(storageUserId) : buildSeedData();
  }
}

export function createEmptyRoutineData(userId = LOCAL_USER_ID, email?: string | null, metadata?: unknown): RoutineData {
  const seed = buildSeedData();
  const profilePreference = buildProfilePreferenceFromMetadata(metadata, email, userId);

  return assignRoutineDataUser(
    {
      ...seed,
      events: [],
      reminders: [],
      subjects: [],
      tasks: [],
      appPreference: {
        ...DEFAULT_APP_PREFERENCE,
        ...profilePreference,
        userId
      },
      notificationPreference: {
        ...seed.notificationPreference,
        userId
      },
      userId
    },
    userId
  );
}

export function normalizeRoutineData(value: unknown, userId = LOCAL_USER_ID): RoutineData {
  const seed = buildSeedData();
  if (!value || typeof value !== "object") {
    return assignRoutineDataUser(seed, userId);
  }

  const parsed = value as Partial<RoutineData>;
  const normalized: RoutineData = {
    ...seed,
    ...parsed,
    version: 4,
    userId: parsed.userId ?? userId,
    appPreference: normalizeAppPreference(parsed.appPreference, userId),
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : seed.subjects,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : seed.tasks,
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders : seed.reminders,
    events: Array.isArray(parsed.events) ? parsed.events : seed.events,
    notificationPreference: {
      ...seed.notificationPreference,
      ...(parsed.notificationPreference ?? {}),
      userId
    }
  };

  return assignRoutineDataUser(normalized, userId);
}

export function normalizeAppPreference(value: unknown, userId = LOCAL_USER_ID): AppPreference {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_APP_PREFERENCE,
      userId
    };
  }

  const parsed = value as Partial<AppPreference>;
  const appName = normalizeAppName(parsed.appName);
  return {
    ...DEFAULT_APP_PREFERENCE,
    ...parsed,
    appName,
    assistantAnswerStyle: normalizeAssistantStyle(parsed.assistantAnswerStyle),
    birthDate: normalizeText(parsed.birthDate),
    contextDetails: normalizeText(parsed.contextDetails),
    contexts: normalizeStringArray(parsed.contexts, DEFAULT_APP_PREFERENCE.contexts),
    courseOrArea: normalizeText(parsed.courseOrArea),
    discoverySource: normalizeText(parsed.discoverySource),
    gender: normalizeText(parsed.gender),
    primaryContext: normalizeText(parsed.primaryContext) || DEFAULT_APP_PREFERENCE.primaryContext,
    productivityGoal: normalizeText(parsed.productivityGoal),
    enabledModules: {
      ...DEFAULT_APP_PREFERENCE.enabledModules,
      ...(parsed.enabledModules ?? {})
    },
    userId
  };
}

function normalizeAppName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_APP_PREFERENCE.appName;
  }

  return value.trim().toLowerCase() === "gab routine" ? DEFAULT_APP_PREFERENCE.appName : value;
}

function buildProfilePreferenceFromMetadata(metadata: unknown, email?: string | null, userId = LOCAL_USER_ID): AppPreference {
  const displayName =
    readMetadataString(metadata, "full_name") || readMetadataString(metadata, "name") || getDisplayNameFromEmail(email) || "Usuario";
  const primaryContext = readMetadataString(metadata, "primary_context") || DEFAULT_APP_PREFERENCE.primaryContext;
  const contexts = readMetadataStringArray(metadata, "contexts", [primaryContext]);
  const assistantAnswerStyle = normalizeAssistantStyle(readMetadataString(metadata, "assistant_style"));

  return {
    ...DEFAULT_APP_PREFERENCE,
    assistantAnswerStyle,
    birthDate: readMetadataString(metadata, "birth_date"),
    contextDetails: readMetadataString(metadata, "context_details"),
    contexts,
    courseOrArea: readMetadataString(metadata, "course_or_area"),
    discoverySource: readMetadataString(metadata, "discovery_source"),
    displayName,
    gender: readMetadataString(metadata, "gender"),
    id: DEFAULT_APP_PREFERENCE.id,
    primaryContext,
    profileLabel: getContextLabel(primaryContext),
    productivityGoal: readMetadataString(metadata, "productivity_goal"),
    userId
  };
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const value = (metadata as Record<string, unknown>)[key];
  return normalizeText(value);
}

function readMetadataStringArray(metadata: unknown, key: string, fallback: string[]) {
  if (!metadata || typeof metadata !== "object") {
    return fallback;
  }

  return normalizeStringArray((metadata as Record<string, unknown>)[key], fallback);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return values.length ? values : fallback;
}

function normalizeAssistantStyle(value: unknown): AppPreference["assistantAnswerStyle"] {
  if (value === "direct" || value === "balanced" || value === "coach") {
    return value;
  }

  if (value === "mentor") {
    return "coach";
  }

  if (value === "strict") {
    return "direct";
  }

  return DEFAULT_APP_PREFERENCE.assistantAnswerStyle;
}

function getContextLabel(value: string) {
  const labels: Record<string, string> = {
    escola: "rotina escolar",
    faculdade: "rotina academica",
    produtividade: "rotina produtiva",
    projetos: "projetos e rotina",
    rotina_pessoal: "rotina pessoal",
    trabalho: "rotina de trabalho"
  };

  return labels[value] ?? DEFAULT_APP_PREFERENCE.profileLabel;
}

export function assignRoutineDataUser(data: RoutineData, userId: string): RoutineData {
  return {
    ...data,
    userId,
    appPreference: {
      ...data.appPreference,
      userId
    },
    tasks: data.tasks.map((task) => ({ ...task, userId })),
    reminders: data.reminders.map((reminder) => ({ ...reminder, userId })),
    events: data.events.map((event) => ({ ...event, userId })),
    notificationPreference: {
      ...data.notificationPreference,
      userId
    }
  };
}

export function saveRoutineData(data: RoutineData, storageUserId?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getRoutineStorageKey(storageUserId), JSON.stringify(data));
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

function getRoutineStorageKey(storageUserId?: string | null) {
  return storageUserId ? `${STORAGE_KEY}:${storageUserId}` : STORAGE_KEY;
}

function getDisplayNameFromEmail(email?: string | null) {
  if (!email) {
    return "";
  }

  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : "";
}
