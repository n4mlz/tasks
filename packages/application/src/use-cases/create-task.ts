import { createTask } from "@task-platform/domain";
import type {
  Clock,
  IdGenerator,
  SchedulerStateRepository,
  TaskRepository,
} from "../ports";
import { recordPlanningMutation } from "../record-mutation";

export async function createTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "save">;
    schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    title: string;
    remainingMinutes: number;
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
    notes?: string;
  },
): Promise<void> {
  const createdAt = deps.clock.now();
  const task = createTask({
    id: deps.idGenerator.next("task"),
    title: input.title,
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate,
    urgency: input.urgency,
    taskType: input.taskType,
    cognitiveLoad: input.cognitiveLoad,
    energy: input.energy,
    tags: input.tags,
    notes: input.notes,
    createdAt,
  });

  await deps.taskRepository.save(task);
  await recordPlanningMutation({
    schedulerStateRepository: deps.schedulerStateRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    mutationKind: "task_created",
    entityType: "task",
    entityId: task.id,
    details: {
      title: task.title,
      dueDate: task.dueDate,
      remainingMinutes: task.remainingMinutes,
    },
  });
}
