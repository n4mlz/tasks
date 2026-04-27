import type {
  DayCapacity,
  DomainScheduleProposal,
  Task,
} from "@task-platform/domain";

export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(taskId: string): Promise<Task | null>;
  listSchedulable(): Promise<Task[]>;
  listAll(): Promise<Task[]>;
}

export interface CapacityRepository {
  upsert(capacity: DayCapacity): Promise<void>;
  listBetween(dateFrom: string, dateTo: string): Promise<DayCapacity[]>;
}

export interface ScheduleRepository {
  savePendingProposal(proposal: DomainScheduleProposal & {
    id: string;
    reason: string;
    generatedAt: string;
  }): Promise<void>;
  findById(proposalId: string): Promise<unknown | null>;
  listByStatus(status?: string): Promise<unknown[]>;
  getCurrentSchedule(): Promise<unknown>;
  approveProposal(proposalId: string, approvedAt: string): Promise<void>;
  rejectProposal(proposalId: string): Promise<void>;
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
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): string;
  today(): string;
}
