import { buildSeedData, DEFAULT_APP_PREFERENCE, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";
import { normalizeProfilePhoto } from "@/lib/profile-photo";
import type { AppPreference } from "@/types/domain";

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

function normalizeAppPreference(value: unknown, userId = LOCAL_USER_ID): AppPreference {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_APP_PREFERENCE,
      userId
    };
  }

  const parsed = value as Partial<AppPreference>;
  const appName = normalizeAppName(parsed.appName);
  const primaryContext = normalizePrimaryContext(parsed.primaryContext);
  return {
    ...DEFAULT_APP_PREFERENCE,
    ...parsed,
    appName,
    assistantAnswerStyle: normalizeAssistantStyle(parsed.assistantAnswerStyle),
    birthDate: normalizeText(parsed.birthDate),
    contextDetails: normalizeText(parsed.contextDetails),
    contexts: normalizeFocusedContexts(parsed.contexts, primaryContext),
    courseOrArea: normalizeText(parsed.courseOrArea),
    courseInstitution: normalizeText(parsed.courseInstitution),
    courseTotalSemesters: normalizePositiveNumber(
      parsed.courseTotalSemesters,
      DEFAULT_APP_PREFERENCE.courseTotalSemesters ?? 10
    ),
    courseTotalWorkloadHours: normalizeNonNegativeNumber(
      parsed.courseTotalWorkloadHours,
      DEFAULT_APP_PREFERENCE.courseTotalWorkloadHours ?? 0
    ),
    currentCurriculumPeriod: normalizePositiveNumber(
      parsed.currentCurriculumPeriod,
      DEFAULT_APP_PREFERENCE.currentCurriculumPeriod ?? 1
    ),
    discoverySource: normalizeText(parsed.discoverySource),
    gender: normalizeText(parsed.gender),
    primaryContext,
    profilePhoto: normalizeProfilePhoto(parsed.profilePhoto),
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
  const primaryContext = normalizePrimaryContext(readMetadataString(metadata, "primary_context"));
  const contexts = normalizeFocusedContexts(readMetadataStringArray(metadata, "contexts", [primaryContext]), primaryContext);
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
    profilePhoto: normalizeProfilePhoto(
      readMetadataString(metadata, "avatar_url") || readMetadataString(metadata, "picture")
    ),
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

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return values.length ? values : fallback;
}

function normalizePrimaryContext(value: unknown) {
  return value === "trabalho" ? "trabalho" : "faculdade";
}

function normalizeFocusedContexts(value: unknown, primaryContext: string) {
  const contexts = normalizeStringArray(value, DEFAULT_APP_PREFERENCE.contexts).filter(
    (context) => context === "faculdade" || context === "trabalho"
  );
  return contexts.length ? contexts : [primaryContext];
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

function getDisplayNameFromEmail(email?: string | null) {
  if (!email) {
    return "";
  }

  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : "";
}
