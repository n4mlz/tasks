import { buildScheduleProposal } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function deleteTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "delete" | "listSchedulable">;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
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

  const tasks = await deps.taskRepository.listSchedulable();
  const horizon = selectScheduleHorizon({
    today: deps.clock.today(),
    tasks,
  });
  const capacities = expandCapacityWindow({
    dateFrom: horizon.start,
    dateTo: horizon.end,
    capacities: await deps.capacityRepository.listBetween(horizon.start, horizon.end),
  });
  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks,
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "task_updated",
    generatedAt: deps.clock.now(),
  });
}
