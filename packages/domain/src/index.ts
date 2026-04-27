export type TaskStatus = "inbox" | "active" | "done" | "archived";
export type TaskUrgency = "today" | "soon" | "normal";

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  remainingMinutes: number;
  dueDate: string | null;
  urgency: TaskUrgency;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  id: string;
  title: string;
  remainingMinutes: number;
  createdAt: string;
  dueDate?: string | null;
  notes?: string;
  urgency?: TaskUrgency;
  status?: TaskStatus;
}

export function createTask(input: CreateTaskInput): Task {
  return {
    id: input.id,
    title: input.title.trim(),
    notes: input.notes ?? "",
    status: input.status ?? "inbox",
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate ?? null,
    urgency: input.urgency ?? "normal",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}
