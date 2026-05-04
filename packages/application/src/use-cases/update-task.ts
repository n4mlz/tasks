import type {
  Clock,
  IdGenerator,
  SchedulerStateRepository,
  TaskRepository,
} from "../ports";
import { recordPlanningMutation } from "../record-mutation";

export async function updateTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "save" | "listSchedulable">;
    schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    taskType?:
      | "implementation"
      | "writing"
      | "research"
      | "communication"
      | "memorization"
      | "admin"
      | "design"
      | "other"
      | "unknown";
    cognitiveLoad?: "low" | "medium" | "high" | "unknown";
    energy?: "low" | "medium" | "high" | "unknown";
    tags?: string[];
    status?: "inbox" | "active" | "done" | "archived";
    notes?: string;
  },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const updatedTask = {
    ...task,
    title: input.title ?? task.title,
    remainingMinutes: input.remainingMinutes ?? task.remainingMinutes,
    dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
    urgency: input.urgency ?? task.urgency,
    taskType: input.taskType ?? task.taskType,
    cognitiveLoad: input.cognitiveLoad ?? task.cognitiveLoad,
    energy: input.energy ?? task.energy,
    tags: input.tags ?? task.tags,
    status: input.status ?? task.status,
    notes: input.notes ?? task.notes,
    updatedAt: deps.clock.now(),
  };

  await deps.taskRepository.save(updatedTask);
  await recordPlanningMutation({
    schedulerStateRepository: deps.schedulerStateRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    mutationKind: "task_updated",
    entityType: "task",
    entityId: updatedTask.id,
    details: {
      title: updatedTask.title,
      dueDate: updatedTask.dueDate,
      remainingMinutes: updatedTask.remainingMinutes,
      status: updatedTask.status,
    },
  });
}
