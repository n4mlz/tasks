import { z } from "zod";

export const taskUrgencySchema = z.enum(["today", "soon", "normal"]);
export const taskStatusSchema = z.enum(["inbox", "active", "done", "archived"]);
export const taskTypeSchema = z.enum([
  "implementation",
  "writing",
  "research",
  "communication",
  "memorization",
  "admin",
  "design",
  "other",
  "unknown",
]);
export const taskCognitiveLoadSchema = z.enum(["low", "medium", "high", "unknown"]);
export const taskEnergySchema = z.enum(["low", "medium", "high", "unknown"]);

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  remainingMinutes: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  urgency: taskUrgencySchema.optional(),
  taskType: taskTypeSchema.optional(),
  cognitiveLoad: taskCognitiveLoadSchema.optional(),
  energy: taskEnergySchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});

export const setCapacityInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availableMinutes: z.number().int().min(0),
  bufferMinutes: z.number().int().min(0).optional(),
});

export const logWorkInputSchema = z.object({
  taskId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  spentMinutes: z.number().int().positive(),
  remainingMinutesAfter: z.number().int().min(0),
  note: z.string().optional(),
});
