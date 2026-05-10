import { updateTaskEstimate } from "@task-platform/domain";
import type {
  Clock,
  IdGenerator,
  SchedulerStateRepository,
  TaskRepository,
  WorkLogRepository,
} from "../ports";
import { recordPlanningMutation } from "../record-mutation";

export async function logWorkUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "save" | "listSchedulable">;
    workLogRepository: WorkLogRepository;
    schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note?: string;
  },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const updatedTask = updateTaskEstimate(task, {
    remainingMinutes: input.remainingMinutesAfter,
    updatedAt: deps.clock.now(),
  });
  const savedTask =
    input.remainingMinutesAfter === 0
      ? {
          ...updatedTask,
          status: "done" as const,
        }
      : updatedTask;

  await deps.workLogRepository.append({
    id: deps.idGenerator.next("worklog"),
    taskId: input.taskId,
    date: input.date,
    spentMinutes: input.spentMinutes,
    remainingMinutesAfter: input.remainingMinutesAfter,
    note: input.note ?? "",
  });

  await deps.taskRepository.save(savedTask);
  await recordPlanningMutation({
    schedulerStateRepository: deps.schedulerStateRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    mutationKind: "work_logged",
    entityType: "task",
    entityId: savedTask.id,
    details: {
      spentMinutes: input.spentMinutes,
      remainingMinutesAfter: input.remainingMinutesAfter,
      date: input.date,
    },
  });
}
