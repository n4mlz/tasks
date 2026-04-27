import { buildScheduleProposal, createDayCapacity } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";

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
  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    input.date,
  );
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
