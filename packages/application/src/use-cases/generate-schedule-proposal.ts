import { buildScheduleProposal } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function generateScheduleProposalUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "listSchedulable">;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: { reason: "task_created" | "task_updated" | "work_logged" | "capacity_updated" | "manual" },
): Promise<void> {
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
    reason: input.reason,
    generatedAt: deps.clock.now(),
  });
}
