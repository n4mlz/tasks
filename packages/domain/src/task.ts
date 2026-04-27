export type TaskStatus = "inbox" | "active" | "done" | "archived";
export type TaskUrgency = "today" | "soon" | "normal";
export type TaskType =
  | "deep"
  | "shallow"
  | "admin"
  | "research"
  | "writing"
  | "implementation"
  | "unknown";
export type TaskEnergy = "low" | "medium" | "high" | "unknown";

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  remainingMinutes: number;
  dueDate: string | null;
  urgency: TaskUrgency;
  taskType: TaskType;
  energy: TaskEnergy;
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
  taskType?: TaskType;
  energy?: TaskEnergy;
  status?: TaskStatus;
}

export function assertPositiveMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("remainingMinutes must be positive");
  }
}

export function assertNonNegativeMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("remainingMinutes must be zero or positive");
  }
}

export function createTask(input: CreateTaskInput): Task {
  assertPositiveMinutes(input.remainingMinutes);

  return {
    id: input.id,
    title: input.title.trim(),
    notes: input.notes ?? "",
    status: input.status ?? "inbox",
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate ?? null,
    urgency: input.urgency ?? "normal",
    taskType: input.taskType ?? "unknown",
    energy: input.energy ?? "unknown",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function updateTaskEstimate(
  task: Task,
  input: { remainingMinutes: number; updatedAt: string },
): Task {
  assertNonNegativeMinutes(input.remainingMinutes);

  return {
    ...task,
    remainingMinutes: input.remainingMinutes,
    updatedAt: input.updatedAt,
  };
}
