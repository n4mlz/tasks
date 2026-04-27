import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  approveProposalUseCase,
  createTaskUseCase,
  generateScheduleProposalUseCase,
  getMetricsUseCase,
  logWorkUseCase,
  rejectProposalUseCase,
  setCapacityUseCase,
  updateTaskUseCase,
} from "../../../packages/application/src/index";
import {
  createDatabase,
  migrate,
  resolveWorkspaceRoot,
  SqliteCapacityRepository,
  SqliteMetricsRepository,
  SqliteScheduleRepository,
  SqliteTaskRepository,
  SqliteWorkLogRepository,
} from "../../../packages/infrastructure/src/index";

type TaskPlatform = {
  createTask: (input: {
    title: string;
    remainingMinutes: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
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
  approveProposal: (input: { proposalId: string }) => Promise<void>;
  rejectProposal: (input: { proposalId: string }) => Promise<void>;
  updateTask: (input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    status?: "inbox" | "active" | "done" | "archived";
    notes?: string;
  }) => Promise<void>;
  generateSchedule: (input: {
    reason: "task_created" | "task_updated" | "work_logged" | "capacity_updated" | "manual";
  }) => Promise<void>;
  listTasks: () => Promise<unknown>;
  getCapacities: (dateFrom: string, dateTo: string) => Promise<unknown>;
  listProposals: (status?: string) => Promise<unknown>;
  getProposal: (proposalId: string) => Promise<unknown>;
  getCurrentSchedule: () => Promise<unknown>;
  getMetrics: (dateFrom: string, dateTo: string) => Promise<unknown>;
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
          capacityRepository,
          scheduleRepository,
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
          capacityRepository,
          scheduleRepository,
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
          taskRepository,
          scheduleRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async approveProposal(input) {
      return approveProposalUseCase(
        {
          scheduleRepository,
          clock,
        },
        input,
      );
    },
    async rejectProposal(input) {
      return rejectProposalUseCase(
        {
          scheduleRepository,
        },
        input,
      );
    },
    async updateTask(input) {
      return updateTaskUseCase(
        {
          taskRepository,
          capacityRepository,
          scheduleRepository,
          clock,
          idGenerator,
        },
        input,
      );
    },
    async generateSchedule(input) {
      return generateScheduleProposalUseCase(
        {
          taskRepository,
          capacityRepository,
          scheduleRepository,
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
    async listProposals(status?: string) {
      return scheduleRepository.listByStatus(status);
    },
    async getProposal(proposalId: string) {
      return scheduleRepository.findById(proposalId);
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
  };

  return taskPlatformInstance;
}

export const taskPlatform = new Proxy({} as TaskPlatform, {
  get(_target, property) {
    return getTaskPlatform()[property as keyof TaskPlatform];
  },
});
