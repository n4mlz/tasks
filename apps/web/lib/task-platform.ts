import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createTaskUseCase,
  deleteTaskUseCase,
  getDashboardTaskTimelineUseCase,
  getDashboardWeeklySummaryUseCase,
  getMetricsUseCase,
  getPlanningHealthUseCase,
  getSchedulerStatusUseCase,
  listSchedulerLogsUseCase,
  logWorkUseCase,
  postponeSchedulerUseCase,
  runSchedulerTickUseCase,
  setCapacityUseCase,
  updateTaskUseCase,
} from "../../../packages/application/src/index";
import {
  createDatabase,
  migrate,
  resolveWorkspaceRoot,
  SqliteCapacityRepository,
  SqliteDashboardRepository,
  SqliteMetricsRepository,
  SqliteSchedulerStateRepository,
  SqliteScheduleRepository,
  SqliteTaskRepository,
  SqliteWorkLogRepository,
} from "../../../packages/infrastructure/src/index";
import { createPlanningIntelligence } from "./planning-intelligence";

type TaskPlatform = {
  createTask: (input: {
    title: string;
    remainingMinutes: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    taskType?:
      | "implementation"
      | "writing"
      | "research"
      | "communication"
      | "memorization"
      | "admin"
      | "design"
      | "other"
      | "unknown";
    cognitiveLoad?: "low" | "medium" | "high" | "unknown";
    energy?: "low" | "medium" | "high" | "unknown";
    tags?: string[];
    notes?: string;
  }) => Promise<void>;
  logWork: (input: {
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note?: string;
  }) => Promise<void>;
  setCapacity: (input: {
    date: string;
    availableMinutes: number;
    bufferMinutes?: number;
  }) => Promise<void>;
  deleteTask: (input: { taskId: string }) => Promise<void>;
  updateTask: (input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    taskType?:
      | "implementation"
      | "writing"
      | "research"
      | "communication"
      | "memorization"
      | "admin"
      | "design"
      | "other"
      | "unknown";
    cognitiveLoad?: "low" | "medium" | "high" | "unknown";
    energy?: "low" | "medium" | "high" | "unknown";
    tags?: string[];
    status?: "inbox" | "active" | "done" | "archived";
    notes?: string;
  }) => Promise<void>;
  listTasks: (input?: {
    status?: "inbox" | "active" | "done" | "archived";
    dueBefore?: string;
    scheduledOn?: string;
  }) => Promise<unknown>;
  getCapacities: (dateFrom: string, dateTo: string) => Promise<unknown>;
  getCurrentSchedule: () => Promise<unknown>;
  getMetrics: (dateFrom?: string, dateTo?: string) => Promise<unknown>;
  getDashboardWeeklySummary: () => Promise<unknown>;
  getDashboardTaskTimeline: (taskId: string) => Promise<unknown>;
  getPlanningHealth: () => Promise<unknown>;
  getWorkLogs: (input: {
    taskIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  } | string[]) => Promise<unknown>;
  getSchedulerStatus: () => Promise<unknown>;
  postponeScheduler: (input: { delayMilliseconds: number }) => Promise<void>;
  listSchedulerLogs: () => Promise<unknown>;
  runSchedulerTick: (input?: { force?: boolean }) => Promise<unknown>;
};

let taskPlatformInstance: TaskPlatform | null = null;
const BACKGROUND_SCHEDULER_KEY = "__taskPlatformBackgroundScheduler";

export function startBackgroundScheduler(taskPlatform: Pick<TaskPlatform, "runSchedulerTick">, intervalMs = 30_000) {
  const registry = globalThis as typeof globalThis & {
    [BACKGROUND_SCHEDULER_KEY]?: ReturnType<typeof setInterval>;
  };

  if (registry[BACKGROUND_SCHEDULER_KEY]) {
    return registry[BACKGROUND_SCHEDULER_KEY];
  }

  const timer = setInterval(() => {
    void taskPlatform.runSchedulerTick().catch(() => {});
  }, intervalMs);
  timer.unref?.();

  registry[BACKGROUND_SCHEDULER_KEY] = timer;
  return timer;
}

function resolveDatabasePath(): string {
  const workspaceRoot = resolveWorkspaceRoot();
  const configuredPath = process.env.TASK_PLATFORM_DB;

  if (!configuredPath) {
    return path.join(workspaceRoot, "task-platform.db");
  }
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }
  return path.join(workspaceRoot, configuredPath);
}

function getTaskPlatform(): TaskPlatform {
  if (taskPlatformInstance) {
    return taskPlatformInstance;
  }

  const dbPath = resolveDatabasePath();
  const db = createDatabase(dbPath);
  migrate(db);

  const taskRepository = new SqliteTaskRepository(db);
  const capacityRepository = new SqliteCapacityRepository(db);
  const scheduleRepository = new SqliteScheduleRepository(db);
  const workLogRepository = new SqliteWorkLogRepository(db);
  const metricsRepository = new SqliteMetricsRepository(db);
  const dashboardRepository = new SqliteDashboardRepository(db);
  const schedulerStateRepository = new SqliteSchedulerStateRepository(db);
  const planningIntelligence = createPlanningIntelligence();

  const clock = {
    now: () => new Date().toISOString(),
    today: () => new Date().toISOString().slice(0, 10),
  };

  const idGenerator = {
    next: (prefix: string) => `${prefix}_${randomUUID()}`,
  };

  taskPlatformInstance = {
    async createTask(input) {
      return createTaskUseCase(
        {
          taskRepository,
          schedulerStateRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async logWork(input) {
      return logWorkUseCase(
        {
          taskRepository,
          workLogRepository,
          schedulerStateRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async setCapacity(input) {
      return setCapacityUseCase(
        {
          capacityRepository,
          schedulerStateRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async deleteTask(input) {
      return deleteTaskUseCase(
        {
          taskRepository,
          schedulerStateRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async updateTask(input) {
      return updateTaskUseCase(
        {
          taskRepository,
          schedulerStateRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async listTasks(input) {
      let tasks = await taskRepository.listAll();

      if (input?.status) {
        tasks = tasks.filter((task) => task.status === input.status);
      }

      if (input?.dueBefore) {
        const dueBefore = input.dueBefore;
        tasks = tasks.filter((task) => task.dueDate && task.dueDate <= dueBefore);
      }

      if (input?.scheduledOn) {
        const schedule = (await scheduleRepository.getCurrentSchedule()) as {
          slices: Array<{ task_id?: string; date?: string }>;
        };
        const scheduledTaskIds = new Set(
          schedule.slices
            .filter((slice) => slice.date === input.scheduledOn && slice.task_id)
            .map((slice) => String(slice.task_id)),
        );
        tasks = tasks.filter((task) => scheduledTaskIds.has(task.id));
      }

      return tasks;
    },
    async getCapacities(dateFrom: string, dateTo: string) {
      return capacityRepository.listBetween(dateFrom, dateTo);
    },
    async getCurrentSchedule() {
      return scheduleRepository.getCurrentSchedule();
    },
    async getMetrics(dateFrom?: string, dateTo?: string) {
      const resolvedDateFrom = dateFrom ?? clock.today();
      const resolvedDateTo = dateTo ?? resolvedDateFrom;
      return getMetricsUseCase(
        {
          metricsRepository,
        },
        { dateFrom: resolvedDateFrom, dateTo: resolvedDateTo },
      );
    },
    async getDashboardWeeklySummary() {
      return getDashboardWeeklySummaryUseCase({
        dashboardRepository,
        today: clock.today(),
      });
    },
    async getDashboardTaskTimeline(taskId: string) {
      return getDashboardTaskTimelineUseCase({
        dashboardRepository,
        taskId,
        today: clock.today(),
      });
    },
    async getPlanningHealth() {
      return getPlanningHealthUseCase(
        {
          capacityRepository,
          taskRepository,
          clock,
        },
        {},
      );
    },
    async getWorkLogs(input: { taskIds?: string[]; dateFrom?: string; dateTo?: string } | string[]) {
      if (Array.isArray(input)) {
        return workLogRepository.listByTaskIds(input);
      }
      return workLogRepository.list(input);
    },
    async getSchedulerStatus() {
      return getSchedulerStatusUseCase({
        schedulerStateRepository,
        clock,
      });
    },
    async postponeScheduler(input) {
      return postponeSchedulerUseCase(
        {
          schedulerStateRepository,
          clock,
        },
        input,
      );
    },
    async listSchedulerLogs() {
      return listSchedulerLogsUseCase({
        schedulerStateRepository,
      });
    },
    async runSchedulerTick(input) {
      return runSchedulerTickUseCase({
        taskRepository,
        capacityRepository,
        scheduleRepository,
        schedulerStateRepository,
        planningIntelligence,
        clock,
        idGenerator,
      }, input);
    },
  };

  if (process.env.NODE_ENV !== "test") {
    startBackgroundScheduler(taskPlatformInstance);
  }

  return taskPlatformInstance;
}

export const taskPlatform = new Proxy({} as TaskPlatform, {
  get(_target, property) {
    return getTaskPlatform()[property as keyof TaskPlatform];
  },
});
