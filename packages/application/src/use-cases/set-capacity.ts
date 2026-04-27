import { buildScheduleProposal, createDayCapacity } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function setCapacityUseCase(
  deps: {
    capacityRepository: Pick<CapacityRepository, "upsert" | "listBetween">;
    taskRepository: Pick<TaskRepository, "listSchedulable">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    date: string;
    availableMinutes: number;
    bufferMinutes?: number;
  },
): Promise<void> {
  const capacity = createDayCapacity(input);
  await deps.capacityRepository.upsert(capacity);

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
    reason: "capacity_updated",
    generatedAt: deps.clock.now(),
  });
}
