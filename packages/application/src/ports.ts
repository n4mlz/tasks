import type {
  DayCapacity,
  DomainSchedulePlan,
  Task,
} from "@task-platform/domain";

export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(taskId: string): Promise<Task | null>;
  listSchedulable(): Promise<Task[]>;
  listAll(): Promise<Task[]>;
  delete(taskId: string): Promise<void>;
}

export interface CapacityRepository {
  upsert(capacity: DayCapacity): Promise<void>;
  listBetween(dateFrom: string, dateTo: string): Promise<DayCapacity[]>;
}

export interface ScheduleRepository {
  saveCurrentSchedule(schedule: DomainSchedulePlan & {
    id: string;
    reason: string;
    generatedAt: string;
  }): Promise<void>;
  getCurrentSchedule(): Promise<unknown>;
}

export interface SchedulerStateRepository {
  getState(): Promise<{
    currentRevision: number;
    lastScheduledRevision: number;
    lastMutationAt: string | null;
    lastScheduledAt: string | null;
    schedulerStatus: "idle" | "pending" | "running" | "failed";
    runningRevision: number | null;
    runningStartedAt: string | null;
  }>;
  recordMutation(input: {
    mutationId: string;
    mutationKind: string;
    entityType: string;
    entityId?: string | null;
    createdAt: string;
    details: Record<string, unknown>;
  }): Promise<{ revision: number }>;
  tryStartRun(input: {
    now: string;
    debounceMilliseconds: number;
    force?: boolean;
  }): Promise<
    | { started: false; state: Awaited<ReturnType<SchedulerStateRepository["getState"]>> }
    | {
        started: true;
        targetRevision: number;
        state: Awaited<ReturnType<SchedulerStateRepository["getState"]>>;
      }
  >;
  completeRun(input: {
    targetRevision: number;
    finishedAt: string;
    status: "idle" | "pending" | "failed";
    scheduled: boolean;
    processed?: boolean;
  }): Promise<void>;
  postponeNextRun(input: {
    now: string;
    delayMilliseconds: number;
    debounceMilliseconds: number;
  }): Promise<void>;
  listMutations(limit?: number): Promise<
    Array<{
      id: string;
      revision: number;
      mutationKind: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      details: Record<string, unknown>;
    }>
  >;
  listRuns(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>
  >;
  insertRun(input: {
    id: string;
    targetRevision: number;
    status: string;
    reason: string;
    startedAt: string;
    finishedAt?: string | null;
    rationale?: string;
    validation?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<void>;
}

export interface WorkLogRepository {
  append(entry: {
    id: string;
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note: string;
  }): Promise<void>;
  listByTaskIds(taskIds: string[]): Promise<
    Array<{
      id: string;
      taskId: string;
      date: string;
      spentMinutes: number;
      remainingMinutesAfter: number;
      note: string;
    }>
  >;
  list(input?: {
    taskIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<
    Array<{
      id: string;
      taskId: string;
      date: string;
      spentMinutes: number;
      remainingMinutesAfter: number;
      note: string;
    }>
  >;
}

export type DashboardWeeklyBucket = {
  weekStart: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedTaskCount: number;
  completionRate: number;
};

export type DashboardTaskBucket = {
  weekStart: string;
  plannedMinutes: number;
  actualMinutes: number;
};

export type DashboardTaskHeader = {
  taskId: string;
  title: string;
  totalEstimatedMinutes: number;
  remainingMinutes: number;
  loggedMinutes: number;
  progressRate: number;
  dueDate: string | null;
};

export interface DashboardRepository {
  getWeeklySummary(input: {
    endDate: string;
    weeks: number;
  }): Promise<DashboardWeeklyBucket[]>;
  getTaskTimeline(input: {
    taskId: string;
    endDate: string;
    weeks: number;
  }): Promise<{
    header: DashboardTaskHeader;
    buckets: DashboardTaskBucket[];
  }>;
  getDailySummary(input: {
    weekStart: string;
  }): Promise<{
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  }>;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): string;
  today(): string;
}

export interface PlanningIntelligence {
  analyzeSchedule(input: {
    today: string;
    tasks: Task[];
    capacities: DayCapacity[];
    recentMutations: Array<{
      mutationKind: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
    }>;
  }): Promise<{
    annotations: Array<{
      taskId: string;
      taskType: Task["taskType"];
      cognitiveLoad: Task["cognitiveLoad"];
      energy: Task["energy"];
      tags: string[];
    }>;
    priorityOrder: string[];
    rationale: string;
  }>;
}
