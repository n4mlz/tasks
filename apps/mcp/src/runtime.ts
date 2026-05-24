import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createPlanningIntelligence,
  createTaskUseCase,
  deleteTaskUseCase,
  getMetricsUseCase,
  getPlanningHealthUseCase,
  getSchedulerStatusUseCase,
  listSchedulerLogsUseCase,
  logWorkUseCase,
  postponeSchedulerUseCase,
  runSchedulerTickUseCase,
  setCapacityUseCase,
  updateTaskUseCase,
} from "@task-platform/application";
import type { PlanningIntelligence } from "@task-platform/application";
import {
  createDatabase,
  migrate,
  resolveWorkspaceRoot,
  SqliteCapacityRepository,
  SqliteMetricsRepository,
  SqliteSchedulerStateRepository,
  SqliteScheduleRepository,
  SqliteTaskRepository,
  SqliteWorkLogRepository,
} from "@task-platform/infrastructure";
import type { Task } from "@task-platform/domain";

type TaskStatus = "inbox" | "active" | "done" | "archived";
type TaskUrgency = "today" | "soon" | "normal";
type TaskType =
  | "implementation"
  | "writing"
  | "research"
  | "communication"
  | "memorization"
  | "admin"
  | "design"
  | "other"
  | "unknown";
type TaskLoad = "low" | "medium" | "high" | "unknown";
type TaskEnergy = "low" | "medium" | "high" | "unknown";
type CreateTaskInput = {
  title: string;
  remainingMinutes: number;
  dueDate?: string | null;
  urgency?: TaskUrgency;
  taskType?: TaskType;
  cognitiveLoad?: TaskLoad;
  energy?: TaskEnergy;
  tags?: string[];
  notes?: string;
};
type UpdateTaskInput = {
  taskId: string;
  title?: string;
  remainingMinutes?: number;
  dueDate?: string | null;
  urgency?: TaskUrgency;
  taskType?: TaskType;
  cognitiveLoad?: TaskLoad;
  energy?: TaskEnergy;
  tags?: string[];
  status?: TaskStatus;
  notes?: string;
};
type LogWorkInput = {
  taskId: string;
  date: string;
  spentMinutes: number;
  remainingMinutesAfter: number;
  note?: string;
};
type SetCapacityInput = {
  date: string;
  availableMinutes: number;
  bufferMinutes?: number;
};

export type McpTaskPlatform = {
  createTask: (input: CreateTaskInput) => Promise<void>;
  logWork: (input: LogWorkInput) => Promise<void>;
  setCapacity: (input: SetCapacityInput) => Promise<void>;
  deleteTask: (input: { taskId: string }) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  listTasks: (input?: {
    status?: TaskStatus;
    dueBefore?: string;
    scheduledOn?: string;
  }) => Promise<unknown[]>;
  getCapacity: (input: { dateFrom: string; dateTo: string }) => Promise<unknown[]>;
  getCurrentSchedule: () => Promise<unknown>;
  getMetrics: (input: { dateFrom?: string; dateTo?: string }) => Promise<unknown>;
  getPlanningHealth: () => Promise<unknown>;
  listWorkLogs: (input?: {
    taskIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<unknown[]>;
  getSchedulerStatus: () => Promise<unknown>;
  postponeScheduler: (input: { delayMilliseconds: number }) => Promise<void>;
  listSchedulerLogs: () => Promise<unknown>;
  runSchedulerTick: (input?: { force?: boolean }) => Promise<unknown>;
};

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

export function createTaskPlatformRuntime(): McpTaskPlatform {
  const db = createDatabase(resolveDatabasePath());
  migrate(db);

  const taskRepository = new SqliteTaskRepository(db);
  const capacityRepository = new SqliteCapacityRepository(db);
  const scheduleRepository = new SqliteScheduleRepository(db);
  const workLogRepository = new SqliteWorkLogRepository(db);
  const metricsRepository = new SqliteMetricsRepository(db);
  const schedulerStateRepository = new SqliteSchedulerStateRepository(db);
  const planningIntelligence: PlanningIntelligence = createPlanningIntelligence();

  const clock = {
    now: () => new Date().toISOString(),
    today: () => new Date().toISOString().slice(0, 10),
  };

  const idGenerator = {
    next: (prefix: string) => `${prefix}_${randomUUID()}`,
  };

  return {
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
      let tasks: Task[] = await taskRepository.listAll();

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
    async getCapacity(input) {
      return capacityRepository.listBetween(input.dateFrom, input.dateTo);
    },
    async getCurrentSchedule() {
      return scheduleRepository.getCurrentSchedule();
    },
    async getMetrics(input) {
      const dateFrom = input.dateFrom ?? clock.today();
      const dateTo = input.dateTo ?? dateFrom;
      return getMetricsUseCase(
        {
          metricsRepository,
        },
        { dateFrom, dateTo },
      );
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
    async listWorkLogs(input) {
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
      return runSchedulerTickUseCase(
        {
          taskRepository,
          capacityRepository,
          scheduleRepository,
          schedulerStateRepository,
          planningIntelligence,
          clock,
          idGenerator,
        },
        input,
      );
    },
  };
}
