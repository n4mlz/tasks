import { createDayCapacity } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  SchedulerStateRepository,
} from "../ports";
import { recordPlanningMutation } from "../record-mutation";

export async function setCapacityUseCase(
  deps: {
    capacityRepository: Pick<CapacityRepository, "upsert">;
    schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
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
  await recordPlanningMutation({
    schedulerStateRepository: deps.schedulerStateRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    mutationKind: "capacity_updated",
    entityType: "capacity",
    entityId: capacity.date,
    details: {
      availableMinutes: capacity.availableMinutes,
    },
  });
}
