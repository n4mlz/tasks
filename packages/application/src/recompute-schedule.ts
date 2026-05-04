import { buildSchedulePlan, type Task } from "@task-platform/domain";
import type { CapacityRepository, Clock, IdGenerator, ScheduleRepository } from "./ports";
import { expandCapacityWindow, selectScheduleHorizon } from "./schedule-window";

export async function recomputeCurrentSchedule(deps: {
  tasks: Task[];
  capacityRepository: Pick<CapacityRepository, "listBetween">;
  scheduleRepository: Pick<ScheduleRepository, "saveCurrentSchedule">;
  clock: Clock;
  idGenerator: IdGenerator;
  reason: "task_created" | "task_updated" | "work_logged" | "capacity_updated" | "manual";
  priorityOrder?: string[];
}): Promise<ReturnType<typeof buildSchedulePlan>> {
  const horizon = selectScheduleHorizon({
    today: deps.clock.today(),
    tasks: deps.tasks,
  });
  const capacities = expandCapacityWindow({
    dateFrom: horizon.start,
    dateTo: horizon.end,
    capacities: await deps.capacityRepository.listBetween(horizon.start, horizon.end),
  });
  const schedule = buildSchedulePlan({
    today: deps.clock.today(),
    tasks: deps.tasks,
    capacities,
    priorityOrder: deps.priorityOrder,
  });

  await deps.scheduleRepository.saveCurrentSchedule({
    ...schedule,
    id: deps.idGenerator.next("schedule"),
    reason: deps.reason,
    generatedAt: deps.clock.now(),
  });

  return schedule;
}
