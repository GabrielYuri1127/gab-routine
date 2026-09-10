import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { assignRoutineDataUser, normalizeRoutineData } from "@/features/data/routine-store";
import type { RoutineData } from "@/features/data/seed";
import type { Reminder, Task } from "@/types/domain";

type DbRoutineSnapshot = {
  data: unknown;
  updated_at: string;
  user_id: string;
};

type DbTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Task["priority"];
  category: string | null;
  date: string | null;
  time: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  snoozed_until: string | null;
  status: Task["status"];
};

type DbReminder = {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
  source_type: Reminder["sourceType"] | null;
  source_id: string | null;
  status: Reminder["status"];
};

export async function getCloudAuthState() {
  if (!isSupabaseConfigured()) {
    return { configured: false, userId: null, email: null };
  }

  const client = createSupabaseBrowserClient();
  const { data } = await client.auth.getUser();

  return {
    configured: true,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null
  };
}

export async function fetchCloudRoutineData(userId: string) {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.from("routine_snapshots").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as DbRoutineSnapshot;
  return {
    data: assignRoutineDataUser(normalizeRoutineData(row.data, userId), userId),
    updatedAt: row.updated_at
  };
}

export async function upsertCloudRoutineData(routineData: RoutineData, userId: string) {
  const client = createSupabaseBrowserClient();
  const snapshot = assignRoutineDataUser(normalizeRoutineData(routineData, userId), userId);
  const { data, error } = await client
    .from("routine_snapshots")
    .upsert({
      data: snapshot,
      updated_at: new Date().toISOString(),
      user_id: userId
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const row = data as DbRoutineSnapshot;
  return {
    data: assignRoutineDataUser(normalizeRoutineData(row.data, userId), userId),
    updatedAt: row.updated_at
  };
}

export async function fetchCloudTasks() {
  const auth = await getCloudAuthState();
  if (!auth.userId) {
    return [];
  }

  const client = createSupabaseBrowserClient();
  const { data, error } = await client.from("tasks").select("*").eq("user_id", auth.userId).order("date", {
    ascending: true,
    nullsFirst: false
  });

  if (error) {
    throw error;
  }

  return (data as DbTask[]).map(taskFromRow);
}

export async function upsertCloudTask(task: Task) {
  const auth = await getCloudAuthState();
  if (!auth.userId) {
    return null;
  }

  const client = createSupabaseBrowserClient();
  const { data, error } = await client.from("tasks").upsert(taskToRow(task, auth.userId)).select("*").single();

  if (error) {
    throw error;
  }

  return taskFromRow(data as DbTask);
}

export async function fetchCloudReminders() {
  const auth = await getCloudAuthState();
  if (!auth.userId) {
    return [];
  }

  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("reminders")
    .select("*")
    .eq("user_id", auth.userId)
    .order("remind_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as DbReminder[]).map(reminderFromRow);
}

export async function upsertCloudReminder(reminder: Reminder) {
  const auth = await getCloudAuthState();
  if (!auth.userId) {
    return null;
  }

  const client = createSupabaseBrowserClient();
  const { data, error } = await client.from("reminders").upsert(reminderToRow(reminder, auth.userId)).select("*").single();

  if (error) {
    throw error;
  }

  return reminderFromRow(data as DbReminder);
}

function taskFromRow(row: DbTask): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    category: row.category ?? undefined,
    date: row.date ?? undefined,
    time: row.time?.slice(0, 5),
    dueDate: row.due_date ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    completedAt: row.completed_at ?? undefined,
    snoozedUntil: row.snoozed_until ?? undefined,
    status: row.status
  };
}

function taskToRow(task: Task, userId: string): DbTask {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    category: task.category ?? null,
    date: task.date ?? null,
    time: task.time ?? null,
    due_date: task.dueDate ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    completed_at: task.completedAt ?? null,
    snoozed_until: task.snoozedUntil ?? null,
    status: task.status
  };
}

function reminderFromRow(row: DbReminder): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    remindAt: row.remind_at,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
    status: row.status
  };
}

function reminderToRow(reminder: Reminder, userId: string): DbReminder {
  return {
    id: reminder.id,
    user_id: userId,
    title: reminder.title,
    remind_at: reminder.remindAt,
    source_type: reminder.sourceType ?? null,
    source_id: reminder.sourceId ?? null,
    status: reminder.status
  };
}
