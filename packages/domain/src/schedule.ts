import type { DayCapacity } from "./capacity";
import type { Task } from "./task";

export interface ScheduledSlice {
  taskId: string;
  date: string;
  plannedMinutes: number;
  kind: "focus" | "buffer_fill";
}

export interface DomainSchedulePlan {
  horizonStart: string;
  horizonEnd: string;
  slices: ScheduledSlice[];
  riskFlags: string[];
  summary: {
    riskFlags: string[];
    unscheduledTaskIds: string[];
    capacityPressureByDate: Record<string, number>;
    bufferUsageByDate: Record<string, number>;
    datesUsingReserve: string[];
    insufficientEvenWithReserve: boolean;
  };
}
export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
}

export function usableMinutesForDay(capacity: DayCapacity): number {
  return Math.max(capacity.availableMinutes - capacity.bufferMinutes, 0);
}

export function baseMinutesForDay(capacity: DayCapacity): number {
  return Math.floor(usableMinutesForDay(capacity) * 0.8);
}

function reserveMinutesForDay(capacity: DayCapacity): number {
  return usableMinutesForDay(capacity) - baseMinutesForDay(capacity);
}

function latestSchedulableDate(task: Task, today: string): string | null {
  if (!task.dueDate) {
    return null;
  }

  if (task.dueDate <= today) {
    return today;
  }

  const value = new Date(`${task.dueDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function sliceToSchedulePlan(input: {
  slices: ScheduledSlice[];
  today: string;
  tasks: Task[];
  capacities: DayCapacity[];
  rationale: string;
}): DomainSchedulePlan {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const unscheduledTaskIds = new Set(input.tasks.map((t) => t.id));
  const riskFlags: string[] = [];

  for (const slice of input.slices) {
    unscheduledTaskIds.delete(slice.taskId);
  }

  const capacityPressureByDate: Record<string, number> = {};
  const bufferUsageByDate: Record<string, number> = {};
  const datesUsingReserve: string[] = [];

  for (const capacity of input.capacities) {
    const usable = usableMinutesForDay(capacity);
    const base = baseMinutesForDay(capacity);
    const dayPlanned = input.slices
      .filter((s) => s.date === capacity.date)
      .reduce((sum, s) => sum + s.plannedMinutes, 0);
    capacityPressureByDate[capacity.date] = usable > 0 ? dayPlanned / usable : 0;
    bufferUsageByDate[capacity.date] = dayPlanned > base ? dayPlanned - base : 0;
    if (dayPlanned > base) {
      datesUsingReserve.push(capacity.date);
    }
  }

  const unarr = [...unscheduledTaskIds];
  for (const id of unarr) {
    riskFlags.push(`${id}:unscheduled`);
  }

  return {
    horizonStart: input.today,
    horizonEnd: input.capacities.length > 0
      ? input.capacities[input.capacities.length - 1].date
      : input.today,
    slices: input.slices,
    riskFlags,
    summary: {
      riskFlags,
      unscheduledTaskIds: unarr,
      capacityPressureByDate,
      bufferUsageByDate,
      datesUsingReserve,
      insufficientEvenWithReserve: unarr.length > 0,
    },
  };
}

export function validateSlices(input: {
  slices: ScheduledSlice[];
  tasks: Task[];
  capacities: DayCapacity[];
}): ScheduleValidationResult {
  const errors: string[] = [];
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const capacityByDate = new Map(
    input.capacities.map((c) => [c.date, usableMinutesForDay(c)]),
  );
  const taskTotals = new Map<string, number>();
  const dayTotals = new Map<string, number>();

  for (const slice of input.slices) {
    const task = taskById.get(slice.taskId);
    if (!task) {
      errors.push(`unknown_task:${slice.taskId}`);
      continue;
    }

    if (!capacityByDate.has(slice.date)) {
      errors.push(`out_of_horizon:${slice.taskId}:${slice.date}`);
    }

    if (slice.plannedMinutes <= 0) {
      errors.push(`non_positive:${slice.taskId}:${slice.date}`);
    }

    const latestDate = latestSchedulableDate(task, input.capacities[0]?.date ?? "");
    if (latestDate && slice.date > latestDate) {
      errors.push(`past_due:${slice.taskId}:${slice.date}`);
    }

    taskTotals.set(slice.taskId, (taskTotals.get(slice.taskId) ?? 0) + slice.plannedMinutes);
    dayTotals.set(slice.date, (dayTotals.get(slice.date) ?? 0) + slice.plannedMinutes);
  }

  for (const task of input.tasks) {
    const total = taskTotals.get(task.id) ?? 0;
    if (total > task.remainingMinutes) {
      errors.push(`over_remaining:${task.id}:${total}:${task.remainingMinutes}`);
    }
  }

  for (const [date, planned] of dayTotals.entries()) {
    const usable = capacityByDate.get(date) ?? 0;
    if (planned > usable) {
      errors.push(`over_capacity:${date}:${planned}:${usable}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

function burdenScore(task: Task): number {
  const energyScore = {
    low: 1,
    medium: 2,
    high: 3,
    unknown: 2,
  }[task.energy];
  const cognitiveScore = {
    low: 1,
    medium: 2,
    high: 3,
    unknown: 2,
  }[task.cognitiveLoad];
  const taskTypeScore = {
    implementation: 2,
    writing: 2,
    research: 3,
    communication: 1,
    memorization: 2,
    admin: 1,
    design: 2,
    other: 1,
    unknown: 1,
  }[task.taskType];

  return energyScore + cognitiveScore + taskTypeScore;
}

export function buildSchedulePlan(input: {
  today: string;
  tasks: Task[];
  capacities: DayCapacity[];
  priorityOrder?: string[];
}): DomainSchedulePlan {
  const dayCapacities = new Map(
    input.capacities.map((capacity) => [capacity.date, usableMinutesForDay(capacity)]),
  );
  const priorityOrder = new Map(
    (input.priorityOrder ?? []).map((taskId, index) => [taskId, index]),
  );

  const sortedTasks = [...input.tasks].sort((left, right) => {
    if (left.urgency === "today" && right.urgency !== "today") return -1;
    if (left.urgency !== "today" && right.urgency === "today") return 1;
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    const leftPriority = priorityOrder.get(left.id);
    const rightPriority = priorityOrder.get(right.id);
    if (leftPriority !== undefined && rightPriority !== undefined && leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    if (leftPriority !== undefined) return -1;
    if (rightPriority !== undefined) return 1;

    const leftBurden = burdenScore(left);
    const rightBurden = burdenScore(right);
    if (leftBurden !== rightBurden) return rightBurden - leftBurden;

    return left.createdAt.localeCompare(right.createdAt);
  });

  const dayBudgets = new Map(
    input.capacities.map((capacity) => [capacity.date, usableMinutesForDay(capacity)]),
  );
  const baseBudgets = new Map(
    input.capacities.map((capacity) => [capacity.date, baseMinutesForDay(capacity)]),
  );
  const dayLoadScores = new Map(input.capacities.map((capacity) => [capacity.date, 0]));

  const slices: ScheduledSlice[] = [];
  const riskFlags: string[] = [];
  const unscheduledTaskIds: string[] = [];
  const bufferUsageByDate = new Map(input.capacities.map((capacity) => [capacity.date, 0]));

  for (const task of sortedTasks) {
    let remaining = task.remainingMinutes;
    const taskBurden = burdenScore(task);
    const latestDate = latestSchedulableDate(task, input.today);
    const candidateDays = [...input.capacities]
      .sort((left, right) => {
        const leftBudget = dayCapacities.get(left.date) ?? 0;
        const rightBudget = dayCapacities.get(right.date) ?? 0;
        const leftLoad = dayLoadScores.get(left.date) ?? 0;
        const rightLoad = dayLoadScores.get(right.date) ?? 0;
        const prefersLighterDays = taskBurden >= 6;

        if (prefersLighterDays && leftLoad !== rightLoad) {
          return leftLoad - rightLoad;
        }

        if (prefersLighterDays && leftBudget !== rightBudget) {
          return rightBudget - leftBudget;
        }

        if (!prefersLighterDays && left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        return rightBudget - leftBudget;
      })
      .map((capacity) => capacity.date)
      .filter((date) => (latestDate ? date <= latestDate : true));

    for (const date of candidateDays) {
      if (remaining <= 0) {
        continue;
      }

      const totalBudget = dayBudgets.get(date) ?? 0;
      const baseBudget = baseBudgets.get(date) ?? 0;
      if (totalBudget <= 0) {
        continue;
      }

      const plannedMinutes = Math.min(totalBudget, remaining);
      slices.push({
        taskId: task.id,
        date,
        plannedMinutes,
        kind: "focus",
      });
      dayBudgets.set(date, totalBudget - plannedMinutes);
      const reserveUsage = Math.max(plannedMinutes - baseBudget, 0);
      if (reserveUsage > 0) {
        bufferUsageByDate.set(date, (bufferUsageByDate.get(date) ?? 0) + reserveUsage);
      }
      baseBudgets.set(date, Math.max(baseBudget - plannedMinutes, 0));
      dayLoadScores.set(
        date,
        (dayLoadScores.get(date) ?? 0) + Math.max(1, Math.ceil(plannedMinutes / 60)) * taskBurden,
      );
      remaining -= plannedMinutes;
    }

    if (remaining > 0 && task.dueDate) {
      riskFlags.push(`${task.id}:insufficient_capacity_before_due_date`);
    }

    if (remaining > 0) {
      unscheduledTaskIds.push(task.id);
    }
  }

  const capacityPressureByDate = Object.fromEntries(
    input.capacities.map((capacity) => {
      const original = usableMinutesForDay(capacity);
      const remaining = dayBudgets.get(capacity.date) ?? 0;
      return [capacity.date, Math.max(original - remaining, 0)];
    }),
  );
  const bufferUsageByDateRecord = Object.fromEntries(
    input.capacities.map((capacity) => [capacity.date, bufferUsageByDate.get(capacity.date) ?? 0]),
  );
  const datesUsingReserve = Object.entries(bufferUsageByDateRecord)
    .filter(([, value]) => value > 0)
    .map(([date]) => date);

  return {
    horizonStart: input.capacities[0]?.date ?? input.today,
    horizonEnd: input.capacities.at(-1)?.date ?? input.today,
    slices,
    riskFlags,
    summary: {
      riskFlags,
      unscheduledTaskIds,
      capacityPressureByDate,
      bufferUsageByDate: bufferUsageByDateRecord,
      datesUsingReserve,
      insufficientEvenWithReserve: unscheduledTaskIds.length > 0,
    },
  };
}

export function validateSchedulePlan(input: {
  plan: DomainSchedulePlan;
  tasks: Task[];
  capacities: DayCapacity[];
}): ScheduleValidationResult {
  const errors: string[] = [];
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const capacityByDate = new Map(
    input.capacities.map((capacity) => [capacity.date, usableMinutesForDay(capacity)]),
  );
  const baseCapacityByDate = new Map(
    input.capacities.map((capacity) => [capacity.date, baseMinutesForDay(capacity)]),
  );
  const taskTotals = new Map<string, number>();
  const dayTotals = new Map<string, number>();

  for (const slice of input.plan.slices) {
    const task = taskById.get(slice.taskId);
    if (!task) {
      errors.push(`unknown_task:${slice.taskId}`);
      continue;
    }

    if (!capacityByDate.has(slice.date)) {
      errors.push(`unknown_date:${slice.date}`);
    }

    if (slice.plannedMinutes <= 0) {
      errors.push(`non_positive_slice:${slice.taskId}:${slice.date}`);
    }

    taskTotals.set(slice.taskId, (taskTotals.get(slice.taskId) ?? 0) + slice.plannedMinutes);
    dayTotals.set(slice.date, (dayTotals.get(slice.date) ?? 0) + slice.plannedMinutes);

    const latestDate = latestSchedulableDate(task, input.plan.horizonStart);
    if (latestDate && slice.date > latestDate) {
      errors.push(`past_due_slice:${slice.taskId}:${slice.date}`);
    }
  }

  for (const [date, planned] of dayTotals.entries()) {
    const usable = capacityByDate.get(date) ?? 0;
    if (planned > usable) {
      errors.push(`over_capacity:${date}`);
    }
    const baseCapacity = baseCapacityByDate.get(date) ?? 0;
    const reserveMarked = input.plan.summary.datesUsingReserve.includes(date);
    if (planned > baseCapacity && !reserveMarked) {
      errors.push(`missing_reserve_marker:${date}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
