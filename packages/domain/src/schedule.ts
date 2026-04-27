import type { DayCapacity } from "./capacity";
import type { Task } from "./task";

export interface ScheduledSlice {
  taskId: string;
  date: string;
  plannedMinutes: number;
  kind: "focus" | "buffer_fill";
}

export interface DomainScheduleProposal {
  horizonStart: string;
  horizonEnd: string;
  slices: ScheduledSlice[];
  riskFlags: string[];
}

export function usableMinutesForDay(capacity: DayCapacity): number {
  return Math.max(capacity.availableMinutes - capacity.bufferMinutes, 0);
}

export function buildScheduleProposal(input: {
  today: string;
  tasks: Task[];
  capacities: DayCapacity[];
}): DomainScheduleProposal {
  const sortedTasks = [...input.tasks].sort((left, right) => {
    if (left.urgency === "today" && right.urgency !== "today") return -1;
    if (left.urgency !== "today" && right.urgency === "today") return 1;
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return left.createdAt.localeCompare(right.createdAt);
  });

  const dayBudgets = new Map(
    input.capacities.map((capacity) => [capacity.date, usableMinutesForDay(capacity)]),
  );

  const slices: ScheduledSlice[] = [];
  const riskFlags: string[] = [];

  for (const task of sortedTasks) {
    let remaining = task.remainingMinutes;
    const candidateDays = input.capacities
      .map((capacity) => capacity.date)
      .filter((date) => (task.dueDate ? date < task.dueDate : true));

    for (const date of candidateDays) {
      const budget = dayBudgets.get(date) ?? 0;
      if (budget <= 0 || remaining <= 0) {
        continue;
      }

      const plannedMinutes = Math.min(budget, remaining);
      slices.push({
        taskId: task.id,
        date,
        plannedMinutes,
        kind: "focus",
      });
      dayBudgets.set(date, budget - plannedMinutes);
      remaining -= plannedMinutes;
    }

    if (remaining > 0 && task.dueDate) {
      riskFlags.push(`${task.id}:insufficient_capacity_before_due_date`);
    }
  }

  return {
    horizonStart: input.capacities[0]?.date ?? input.today,
    horizonEnd: input.capacities.at(-1)?.date ?? input.today,
    slices,
    riskFlags,
  };
}
