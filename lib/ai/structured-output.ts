import { z } from "zod";

export const registerAbsenceIntentSchema = z.object({
  intent: z.literal("register_absence"),
  subjectId: z.string().min(1),
  quantity: z.number().int().positive().max(12),
  date: z.string().min(8),
  confidence: z.number().min(0).max(1)
});

export const addGradeIntentSchema = z.object({
  intent: z.literal("add_grade"),
  subjectId: z.string().min(1),
  name: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  confidence: z.number().min(0).max(1)
});

export const addActivityIntentSchema = z.object({
  intent: z.literal("add_activity"),
  subjectId: z.string().min(1).optional(),
  title: z.string().min(1),
  dueDate: z.string().min(8),
  type: z
    .enum(["activity", "exercise", "list", "work", "project", "report", "presentation", "exam", "seminar", "lab", "other"])
    .default("activity"),
  confidence: z.number().min(0).max(1)
});

export const aiIntentSchema = z.discriminatedUnion("intent", [
  registerAbsenceIntentSchema,
  addGradeIntentSchema,
  addActivityIntentSchema
]);

export type AIIntent = z.infer<typeof aiIntentSchema>;

export function parseAIIntent(raw: string): AIIntent {
  const parsed = JSON.parse(raw) as unknown;
  return aiIntentSchema.parse(parsed);
}
