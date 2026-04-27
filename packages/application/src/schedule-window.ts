import { createDayCapacity, type DayCapacity, type Task } from "@task-platform/domain";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayBefore(date: string): string {
  return addDays(date, -1);
}

export function selectScheduleHorizon(input: {
  today: string;
  tasks: Task[];
}): { start: string; end: string } {
  const minimumEnd = addDays(input.today, 6);
  const dueBasedEnd = input.tasks
    .filter((task) => task.dueDate)
    .map((task) => dayBefore(task.dueDate!))
    .sort((left, right) => left.localeCompare(right))
    .at(-1);

  return {
    start: input.today,
    end: dueBasedEnd && dueBasedEnd > minimumEnd ? dueBasedEnd : minimumEnd,
  };
}

export function expandCapacityWindow(input: {
  dateFrom: string;
  dateTo: string;
  capacities: DayCapacity[];
}): DayCapacity[] {
  const byDate = new Map(input.capacities.map((capacity) => [capacity.date, capacity]));
  const result: DayCapacity[] = [];

  for (
    let current = input.dateFrom;
    current <= input.dateTo;
    current = addDays(current, 1)
  ) {
    result.push(
      byDate.get(current) ??
        createDayCapacity({
          date: current,
          availableMinutes: 0,
          bufferMinutes: 0,
        }),
    );
  }

  return result;
}
