import type {
  Clock,
  IdGenerator,
  SchedulerStateRepository,
  TaskRepository,
} from "../ports";
import { recordPlanningMutation } from "../record-mutation";

export async function deleteTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "delete" | "listSchedulable">;
    schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: { taskId: string },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  await deps.taskRepository.delete(input.taskId);
  await recordPlanningMutation({
    schedulerStateRepository: deps.schedulerStateRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    mutationKind: "task_deleted",
    entityType: "task",
    entityId: task.id,
    details: {
      title: task.title,
    },
  });
}
