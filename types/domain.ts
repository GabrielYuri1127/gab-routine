import type {
  AcademicActivity,
  AcademicRules,
  AttendanceRecord,
  Grade,
  Subject,
  SubjectSchedule
} from "@/types/academic";

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "done" | "snoozed" | "cancelled";
export type ProjectStatus = "idea" | "planning" | "in_progress" | "paused" | "completed";
export type HabitFrequency = "daily" | "specific_days" | "times_per_week";
export type AssistantAnswerStyle = "direct" | "balanced" | "coach";

export interface EnabledModules {
  assistant: boolean;
  calendar: boolean;
  classroom: boolean;
  reminders: boolean;
  tasks: boolean;
  tutorial: boolean;
}

export interface AppPreference {
  id: string;
  userId: string;
  accentColor: string;
  appName: string;
  assistantAnswerStyle: AssistantAnswerStyle;
  defaultClassesQuantity: number;
  defaultSemester: string;
  defaultWorkloadHours: number;
  displayName: string;
  enabledModules: EnabledModules;
  profileLabel: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Semester {
  id: string;
  userId: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: Priority;
  category?: string;
  date?: string;
  time?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  completedAt?: string;
  snoozedUntil?: string;
  status: TaskStatus;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  date: string;
  startsAt?: string;
  endsAt?: string;
  category: "class" | "task" | "study" | "appointment" | "deadline" | "work" | "personal";
  sourceId?: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  remindAt: string;
  sourceType?: "task" | "activity" | "event" | "study" | "custom";
  sourceId?: string;
  status: "scheduled" | "sent" | "dismissed";
}

export interface NotificationPreference {
  id: string;
  userId: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailySummaryTime: string;
  tomorrowPlanningTime: string;
}

export interface NotificationSchedule {
  id: string;
  userId: string;
  sourceType: string;
  sourceId: string;
  scheduledFor: string;
  status: "pending" | "sent" | "cancelled";
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId?: string;
  topic: string;
  plannedMinutes: number;
  actualMinutes?: number;
  date: string;
  notes?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  dueDate?: string;
  links?: string[];
  notes?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: HabitFrequency;
  targetPerWeek?: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
}

export interface RoutineItem {
  id: string;
  routineId: string;
  title: string;
  order: number;
  defaultTime?: string;
}

export interface AIUsage {
  id: string;
  userId: string;
  provider: string;
  model: string;
  createdAt: string;
  action: string;
}

export type AcademicModel =
  | Subject
  | SubjectSchedule
  | AcademicRules
  | AttendanceRecord
  | AcademicActivity
  | Grade;
