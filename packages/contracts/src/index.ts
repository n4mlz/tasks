import { z } from "zod";

export const taskUrgencySchema = z.enum(["today", "soon", "normal"]);
export const taskStatusSchema = z.enum(["inbox", "active", "done", "archived"]);

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  remainingMinutes: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  urgency: taskUrgencySchema.optional(),
  taskType: z
    .enum(["deep", "shallow", "admin", "research", "writing", "implementation", "unknown"])
    .optional(),
  energy: z.enum(["low", "medium", "high", "unknown"]).optional(),
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
