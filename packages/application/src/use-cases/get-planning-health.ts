import { usableMinutesForDay } from "@task-platform/domain";
import type { CapacityRepository, Clock, TaskRepository } from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function getPlanningHealthUseCase(
  deps: {
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    taskRepository: Pick<TaskRepository, "listSchedulable">;
    clock: Pick<Clock, "today">;
  },
  _input: Record<string, never>,
) {
    const today = deps.clock.today();
    const end = addDays(today, 6);
    const nearTermCapacities = await deps.capacityRepository.listBetween(today, end);
    const configuredDates = new Set(nearTermCapacities.map((capacity) => capacity.date));
    const missingCapacityDatesWithin7Days: string[] = [];

    for (let current = today; current <= end; current = addDays(current, 1)) {
      if (!configuredDates.has(current)) {
        missingCapacityDatesWithin7Days.push(current);
      }
    }

    const schedulableTasks = await deps.taskRepository.listSchedulable();
    const horizon = selectScheduleHorizon({
      today,
      tasks: schedulableTasks,
    });
    const horizonCapacities = expandCapacityWindow({
      dateFrom: horizon.start,
      dateTo: horizon.end,
      capacities: await deps.capacityRepository.listBetween(horizon.start, horizon.end),
    });
    const availableMinutesWithinHorizon = horizonCapacities.reduce(
      (sum, capacity) => sum + usableMinutesForDay(capacity),
      0,
    );
    const requiredMinutesWithinHorizon = schedulableTasks.reduce(
      (sum, task) => sum + task.remainingMinutes,
      0,
    );
    const shortfallMinutes = Math.max(
      requiredMinutesWithinHorizon - availableMinutesWithinHorizon,
      0,
    );
    const hasInsufficientCapacity = shortfallMinutes > 0;

    return {
      missingCapacityDatesWithin7Days,
      warningCount:
        missingCapacityDatesWithin7Days.length + (hasInsufficientCapacity ? 1 : 0),
      hasInsufficientCapacity,
      shortfallMinutes,
      availableMinutesWithinHorizon,
      requiredMinutesWithinHorizon,
      horizonStart: horizon.start,
      horizonEnd: horizon.end,
    };
}
