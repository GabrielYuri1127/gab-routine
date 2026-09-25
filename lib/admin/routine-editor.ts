import { z } from "zod";

import type { RoutineData } from "@/features/data/seed";

const shortText = z.string().trim().max(160);
const optionalDate = z.string().max(10).optional();
const optionalTime = z.string().max(5).optional();

const profileOperationSchema = z.object({
  type: z.literal("profile"),
  patch: z
    .object({
      courseInstitution: shortText.optional(),
      courseOrArea: shortText.optional(),
      currentCurriculumPeriod: z.number().int().min(1).max(100).optional(),
      displayName: shortText.optional(),
      profileLabel: shortText.optional()
    })
    .strict()
});

const subjectOperationSchema = z.object({
  type: z.literal("subject"),
  id: z.string().min(1).max(220),
  patch: z
    .object({
      code: shortText.optional(),
      name: shortText.optional(),
      professor: shortText.optional(),
      room: shortText.optional(),
      semester: shortText.optional(),
      status: z.enum(["planned", "active", "completed", "failed", "paused", "archived"]).optional(),
      workloadHours: z.number().int().min(0).max(2000).optional()
    })
    .strict()
});

const taskOperationSchema = z.object({
  type: z.literal("task"),
  id: z.string().min(1).max(220),
  patch: z
    .object({
      category: shortText.optional(),
      date: optionalDate,
      dueDate: optionalDate,
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      status: z.enum(["open", "blocked", "done", "snoozed", "cancelled"]).optional(),
      time: optionalTime,
      title: z.string().trim().min(1).max(240).optional()
    })
    .strict()
});

const reminderOperationSchema = z.object({
  type: z.literal("reminder"),
  id: z.string().min(1).max(220),
  patch: z
    .object({
      remindAt: z.string().min(16).max(40).optional(),
      status: z.enum(["scheduled", "sent", "dismissed"]).optional(),
      title: z.string().trim().min(1).max(240).optional()
    })
    .strict()
});

const activityOperationSchema = z.object({
  type: z.literal("activity"),
  subjectId: z.string().min(1).max(220),
  id: z.string().min(1).max(220),
  patch: z
    .object({
      dueDate: z.string().max(10).optional(),
      status: z.enum(["not_started", "in_progress", "submitted", "corrected", "late"]).optional(),
      time: optionalTime,
      title: z.string().trim().min(1).max(240).optional()
    })
    .strict()
});

export const adminRoutineMutationSchema = z.object({
  expectedUpdatedAt: z.string().optional(),
  operation: z.discriminatedUnion("type", [
    profileOperationSchema,
    subjectOperationSchema,
    taskOperationSchema,
    reminderOperationSchema,
    activityOperationSchema
  ])
});

export type AdminRoutineOperation = z.infer<typeof adminRoutineMutationSchema>["operation"];

export class AdminRoutineTargetNotFoundError extends Error {
  constructor() {
    super("O item que seria alterado nao existe mais.");
    this.name = "AdminRoutineTargetNotFoundError";
  }
}

export function applyAdminRoutineOperation(data: RoutineData, operation: AdminRoutineOperation) {
  const fields = Object.keys(operation.patch);

  if (operation.type === "profile") {
    return {
      data: {
        ...data,
        appPreference: { ...data.appPreference, ...operation.patch }
      },
      fields,
      summary: `Atualizou o perfil (${fields.join(", ") || "sem campos"}).`
    };
  }

  if (operation.type === "subject") {
    ensureTarget(data.subjects.some((subject) => subject.id === operation.id));
    return {
      data: {
        ...data,
        subjects: data.subjects.map((subject) =>
          subject.id === operation.id ? { ...subject, ...operation.patch } : subject
        )
      },
      fields,
      summary: `Atualizou uma disciplina (${fields.join(", ") || "sem campos"}).`
    };
  }

  if (operation.type === "task") {
    ensureTarget(data.tasks.some((task) => task.id === operation.id));
    return {
      data: {
        ...data,
        tasks: data.tasks.map((task) => (task.id === operation.id ? { ...task, ...operation.patch } : task))
      },
      fields,
      summary: `Atualizou uma tarefa (${fields.join(", ") || "sem campos"}).`
    };
  }

  if (operation.type === "reminder") {
    ensureTarget(data.reminders.some((reminder) => reminder.id === operation.id));
    return {
      data: {
        ...data,
        reminders: data.reminders.map((reminder) =>
          reminder.id === operation.id ? { ...reminder, ...operation.patch } : reminder
        )
      },
      fields,
      summary: `Atualizou um lembrete (${fields.join(", ") || "sem campos"}).`
    };
  }

  const subject = data.subjects.find((item) => item.id === operation.subjectId);
  ensureTarget(Boolean(subject?.activities.some((activity) => activity.id === operation.id)));
  return {
    data: {
      ...data,
      subjects: data.subjects.map((item) =>
        item.id === operation.subjectId
          ? {
              ...item,
              activities: item.activities.map((activity) =>
                activity.id === operation.id ? { ...activity, ...operation.patch } : activity
              )
            }
          : item
      )
    },
    fields,
    summary: `Atualizou uma atividade (${fields.join(", ") || "sem campos"}).`
  };
}

function ensureTarget(found: boolean) {
  if (!found) {
    throw new AdminRoutineTargetNotFoundError();
  }
}
