import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createTaskUseCase,
  deleteTaskUseCase,
  getMetricsUseCase,
  getPlanningHealthUseCase,
  getSchedulerStatusUseCase,
  listSchedulerLogsUseCase,
  logWorkUseCase,
  runSchedulerTickUseCase,
  setCapacityUseCase,
  updateTaskUseCase,
} from "../../../packages/application/src/index";
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
  listTasks: () => Promise<unknown>;
  getCapacities: (dateFrom: string, dateTo: string) => Promise<unknown>;
  getCurrentSchedule: () => Promise<unknown>;
  getMetrics: (dateFrom: string, dateTo: string) => Promise<unknown>;
  getPlanningHealth: () => Promise<unknown>;
  getWorkLogs: (taskIds: string[]) => Promise<unknown>;
  getSchedulerStatus: () => Promise<unknown>;
  listSchedulerLogs: () => Promise<unknown>;
  runSchedulerTick: () => Promise<unknown>;
};

let taskPlatformInstance: TaskPlatform | null = null;

function getTaskPlatform(): TaskPlatform {
  if (taskPlatformInstance) {
    return taskPlatformInstance;
  }

  const dbPath =
    process.env.TASK_PLATFORM_DB ??
    path.join(resolveWorkspaceRoot(), "task-platform.db");
  const db = createDatabase(dbPath);
  migrate(db);

  const taskRepository = new SqliteTaskRepository(db);
  const capacityRepository = new SqliteCapacityRepository(db);
  const scheduleRepository = new SqliteScheduleRepository(db);
  const workLogRepository = new SqliteWorkLogRepository(db);
  const metricsRepository = new SqliteMetricsRepository(db);
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
    async listTasks() {
      return taskRepository.listAll();
    },
    async getCapacities(dateFrom: string, dateTo: string) {
      return capacityRepository.listBetween(dateFrom, dateTo);
    },
    async getCurrentSchedule() {
      return scheduleRepository.getCurrentSchedule();
    },
    async getMetrics(dateFrom: string, dateTo: string) {
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
          clock,
        },
        {},
      );
    },
    async getWorkLogs(taskIds: string[]) {
      return workLogRepository.listByTaskIds(taskIds);
    },
    async getSchedulerStatus() {
      return getSchedulerStatusUseCase({
        schedulerStateRepository,
        clock,
      });
    },
    async listSchedulerLogs() {
      return listSchedulerLogsUseCase({
        schedulerStateRepository,
      });
    },
    async runSchedulerTick() {
      return runSchedulerTickUseCase({
        taskRepository,
        capacityRepository,
        scheduleRepository,
        schedulerStateRepository,
        planningIntelligence,
        clock,
        idGenerator,
      });
    },
  };

  return taskPlatformInstance;
}

export const taskPlatform = new Proxy({} as TaskPlatform, {
  get(_target, property) {
    return getTaskPlatform()[property as keyof TaskPlatform];
  },
});
