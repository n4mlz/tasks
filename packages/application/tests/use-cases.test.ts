import { createDayCapacity, createTask } from "@task-platform/domain";
import { describe, expect, it, vi } from "vitest";
import {
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
} from "../src/index";

describe("mutation use cases", () => {
  it("records a mutation when a task is created", async () => {
    const taskRepository = { save: vi.fn().mockResolvedValue(undefined) };
    const schedulerStateRepository = { recordMutation: vi.fn().mockResolvedValue({ revision: 1 }) };

    await createTaskUseCase(
      {
        taskRepository,
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T09:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        title: "Write plan",
        remainingMinutes: 120,
      },
    );

    expect(taskRepository.save).toHaveBeenCalledTimes(1);
    expect(schedulerStateRepository.recordMutation).toHaveBeenCalledTimes(1);
  });

  it("records a mutation when work is logged and marks task done at zero", async () => {
    const existingTask = createTask({
      id: "task_1",
      title: "Write report",
      remainingMinutes: 60,
      createdAt: "2026-04-27T00:00:00.000Z",
    });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
      listSchedulable: vi.fn().mockResolvedValue([]),
    };
    const schedulerStateRepository = { recordMutation: vi.fn().mockResolvedValue({ revision: 2 }) };

    await logWorkUseCase(
      {
        taskRepository,
        workLogRepository: {
          append: vi.fn().mockResolvedValue(undefined),
          listByTaskIds: vi.fn().mockResolvedValue([]),
        },
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        taskId: "task_1",
        date: "2026-04-27",
        spentMinutes: 60,
        remainingMinutesAfter: 0,
      },
    );

    expect(taskRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        remainingMinutes: 0,
      }),
    );
    expect(schedulerStateRepository.recordMutation).toHaveBeenCalledTimes(1);
  });

  it("records a mutation when a task is updated", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(
        createTask({
          id: "task_1",
          title: "Old title",
          remainingMinutes: 60,
          createdAt: "2026-04-27T00:00:00.000Z",
        }),
      ),
      save: vi.fn().mockResolvedValue(undefined),
      listSchedulable: vi.fn().mockResolvedValue([]),
    };
    const schedulerStateRepository = { recordMutation: vi.fn().mockResolvedValue({ revision: 3 }) };

    await updateTaskUseCase(
      {
        taskRepository,
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        taskId: "task_1",
        title: "New title",
      },
    );

    expect(schedulerStateRepository.recordMutation).toHaveBeenCalledTimes(1);
  });

  it("records a mutation when capacity changes", async () => {
    const capacityRepository = { upsert: vi.fn().mockResolvedValue(undefined) };
    const schedulerStateRepository = { recordMutation: vi.fn().mockResolvedValue({ revision: 4 }) };

    await setCapacityUseCase(
      {
        capacityRepository,
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        date: "2026-04-27",
        availableMinutes: 180,
      },
    );

    expect(schedulerStateRepository.recordMutation).toHaveBeenCalledTimes(1);
  });

  it("records a mutation when a task is deleted", async () => {
    const taskRepository = {
      findById: vi.fn().mockResolvedValue({ id: "task_1", title: "Delete me" }),
      delete: vi.fn().mockResolvedValue(undefined),
      listSchedulable: vi.fn().mockResolvedValue([]),
    };
    const schedulerStateRepository = { recordMutation: vi.fn().mockResolvedValue({ revision: 5 }) };

    await deleteTaskUseCase(
      {
        taskRepository,
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      { taskId: "task_1" },
    );

    expect(taskRepository.delete).toHaveBeenCalledWith("task_1");
    expect(schedulerStateRepository.recordMutation).toHaveBeenCalledTimes(1);
  });
});

describe("runSchedulerTickUseCase", () => {
  it("skips when the debounce window has not elapsed", async () => {
    const result = await runSchedulerTickUseCase(
      {
        taskRepository: {
          listSchedulable: vi.fn(),
          save: vi.fn(),
        },
        capacityRepository: {
          listBetween: vi.fn(),
        },
        scheduleRepository: {
          saveCurrentSchedule: vi.fn(),
        },
        schedulerStateRepository: {
          tryStartRun: vi.fn().mockResolvedValue({
            started: false,
            state: {
              currentRevision: 2,
              lastScheduledRevision: 1,
              lastMutationAt: "2026-04-27T11:59:00.000Z",
              lastScheduledAt: "2026-04-27T11:50:00.000Z",
              schedulerStatus: "pending",
              runningRevision: null,
            },
          }),
          completeRun: vi.fn(),
          insertRun: vi.fn(),
          listMutations: vi.fn(),
          getState: vi.fn(),
        },
        planningIntelligence: {
          analyzeSchedule: vi.fn(),
        },
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
    );

    expect(result.ran).toBe(false);
  });

  it("schedules when due and stores a successful run", async () => {
    const task = createTask({
      id: "task_1",
      title: "Write report",
      remainingMinutes: 120,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const scheduleRepository = { saveCurrentSchedule: vi.fn().mockResolvedValue(undefined) };
    const schedulerStateRepository = {
      tryStartRun: vi.fn().mockResolvedValue({
        started: true,
        targetRevision: 3,
        state: {
          currentRevision: 3,
          lastScheduledRevision: 2,
          lastMutationAt: "2026-04-27T11:50:00.000Z",
          lastScheduledAt: "2026-04-27T11:40:00.000Z",
          schedulerStatus: "running",
          runningRevision: 3,
        },
      }),
      listMutations: vi.fn().mockResolvedValue([]),
      getState: vi.fn().mockResolvedValue({
        currentRevision: 3,
        lastScheduledRevision: 2,
        lastMutationAt: "2026-04-27T11:50:00.000Z",
        lastScheduledAt: "2026-04-27T11:40:00.000Z",
        schedulerStatus: "running",
        runningRevision: 3,
      }),
      insertRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runSchedulerTickUseCase(
      {
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([task]),
          save: vi.fn().mockResolvedValue(undefined),
        },
        capacityRepository: {
          listBetween: vi.fn().mockResolvedValue([
            createDayCapacity({ date: "2026-04-27", availableMinutes: 180 }),
          ]),
        },
        scheduleRepository,
        schedulerStateRepository,
        planningIntelligence: {
          analyzeSchedule: vi.fn().mockResolvedValue({
            annotations: [
              {
                taskId: "task_1",
                taskType: "writing",
                cognitiveLoad: "high",
                energy: "medium",
                tags: ["頭使う", "執筆系"],
              },
            ],
            slices: [{ taskId: "task_1", date: "2026-04-27", plannedMinutes: 120 }],
            rationale: "締切と負荷から優先しました。",
          }),
          correctSchedule: vi.fn().mockResolvedValue({
            slices: [{ taskId: "task_1", date: "2026-04-27", plannedMinutes: 120 }],
            rationale: "fixed",
          }),
        },
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
    );

    expect(result.ran).toBe(true);
    expect(result.scheduled).toBe(true);
    expect(scheduleRepository.saveCurrentSchedule).toHaveBeenCalledTimes(1);
    expect(scheduleRepository.saveCurrentSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          bufferUsageByDate: expect.any(Object),
          datesUsingReserve: expect.any(Array),
          insufficientEvenWithReserve: expect.any(Boolean),
        }),
      }),
    );
    expect(schedulerStateRepository.insertRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "scheduled" }),
    );
  });

  it("does not call planning intelligence when total capacity is insufficient", async () => {
    const schedulerStateRepository = {
      tryStartRun: vi.fn().mockResolvedValue({
        started: true,
        targetRevision: 4,
        state: {
          currentRevision: 4,
          lastScheduledRevision: 3,
          lastMutationAt: "2026-04-27T11:50:00.000Z",
          lastScheduledAt: "2026-04-27T11:40:00.000Z",
          schedulerStatus: "running",
          runningRevision: 4,
        },
      }),
      listMutations: vi.fn().mockResolvedValue([]),
      getState: vi.fn().mockResolvedValue({
        currentRevision: 4,
        lastScheduledRevision: 3,
        lastMutationAt: "2026-04-27T11:50:00.000Z",
        lastScheduledAt: "2026-04-27T11:40:00.000Z",
        schedulerStatus: "running",
        runningRevision: 4,
      }),
      insertRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };
    const planningIntelligence = {
      analyzeSchedule: vi.fn(),
    };

    const result = await runSchedulerTickUseCase(
      {
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([
            createTask({
              id: "task_1",
              title: "Long task",
              remainingMinutes: 240,
              createdAt: "2026-04-27T00:00:00.000Z",
              dueDate: "2026-04-29",
            }),
          ]),
          save: vi.fn().mockResolvedValue(undefined),
        },
        capacityRepository: {
          listBetween: vi.fn().mockResolvedValue([
            createDayCapacity({ date: "2026-04-27", availableMinutes: 60 }),
            createDayCapacity({ date: "2026-04-28", availableMinutes: 60 }),
          ]),
        },
        scheduleRepository: {
          saveCurrentSchedule: vi.fn().mockResolvedValue(undefined),
        },
        schedulerStateRepository,
        planningIntelligence,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
    );

    expect(result.scheduled).toBe(false);
    expect(result.status).toBe("failed");
    expect(planningIntelligence.analyzeSchedule).not.toHaveBeenCalled();
    expect(schedulerStateRepository.insertRun).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "insufficient_capacity_window" }),
    );
  });

  it("can force a rerun even when the latest revision was already scheduled", async () => {
    const scheduleRepository = { saveCurrentSchedule: vi.fn().mockResolvedValue(undefined) };
    const schedulerStateRepository = {
      tryStartRun: vi.fn().mockResolvedValue({
        started: true,
        targetRevision: 4,
        state: {
          currentRevision: 4,
          lastScheduledRevision: 4,
          lastMutationAt: "2026-04-27T11:50:00.000Z",
          lastScheduledAt: "2026-04-27T11:55:00.000Z",
          schedulerStatus: "running",
          runningRevision: 4,
        },
      }),
      listMutations: vi.fn().mockResolvedValue([]),
      getState: vi.fn().mockResolvedValue({
        currentRevision: 4,
        lastScheduledRevision: 4,
        lastMutationAt: "2026-04-27T11:50:00.000Z",
        lastScheduledAt: "2026-04-27T11:55:00.000Z",
        schedulerStatus: "running",
        runningRevision: 4,
      }),
      insertRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runSchedulerTickUseCase(
      {
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([
            createTask({
              id: "task_1",
              title: "Write report",
              remainingMinutes: 60,
              createdAt: "2026-04-27T00:00:00.000Z",
            }),
          ]),
          save: vi.fn().mockResolvedValue(undefined),
        },
        capacityRepository: {
          listBetween: vi.fn().mockResolvedValue([
            createDayCapacity({ date: "2026-04-27", availableMinutes: 120 }),
          ]),
        },
        scheduleRepository,
        schedulerStateRepository,
        planningIntelligence: {
          analyzeSchedule: vi.fn().mockResolvedValue({
            annotations: [],
            slices: [{ taskId: "task_1", date: "2026-04-27", plannedMinutes: 60 }],
            rationale: "forced rerun",
          }),
          correctSchedule: vi.fn().mockResolvedValue({
            slices: [{ taskId: "task_1", date: "2026-04-27", plannedMinutes: 60 }],
            rationale: "fixed",
          }),
        },
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      { force: true },
    );

    expect(result.scheduled).toBe(true);
    expect(schedulerStateRepository.tryStartRun).toHaveBeenCalledWith({
      now: "2026-04-27T12:00:00.000Z",
      debounceMilliseconds: 3 * 60_000,
      force: true,
    });
    expect(scheduleRepository.saveCurrentSchedule).toHaveBeenCalledTimes(1);
  });

  it("fails the run instead of falling back when planning intelligence errors", async () => {
    const scheduleRepository = { saveCurrentSchedule: vi.fn().mockResolvedValue(undefined) };
    const schedulerStateRepository = {
      tryStartRun: vi.fn().mockResolvedValue({
        started: true,
        targetRevision: 5,
        state: {
          currentRevision: 5,
          lastScheduledRevision: 4,
          lastMutationAt: "2026-04-27T11:50:00.000Z",
          lastScheduledAt: "2026-04-27T11:40:00.000Z",
          schedulerStatus: "running",
          runningRevision: 5,
        },
      }),
      listMutations: vi.fn().mockResolvedValue([]),
      getState: vi.fn(),
      insertRun: vi.fn().mockResolvedValue(undefined),
      completeRun: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runSchedulerTickUseCase({
      taskRepository: {
        listSchedulable: vi.fn().mockResolvedValue([
          createTask({
            id: "task_1",
            title: "Write report",
            remainingMinutes: 60,
            createdAt: "2026-04-27T00:00:00.000Z",
          }),
        ]),
        save: vi.fn().mockResolvedValue(undefined),
      },
      capacityRepository: {
        listBetween: vi.fn().mockResolvedValue([
          createDayCapacity({ date: "2026-04-27", availableMinutes: 120 }),
        ]),
      },
      scheduleRepository,
      schedulerStateRepository,
      planningIntelligence: {
        analyzeSchedule: vi.fn().mockRejectedValue(new Error("llm unavailable")),
      },
      clock: {
        now: () => "2026-04-27T12:00:00.000Z",
        today: () => "2026-04-27",
      },
      idGenerator: { next: (prefix: string) => `${prefix}_1` },
    });

    expect(result.scheduled).toBe(false);
    expect(result.status).toBe("failed");
    expect(scheduleRepository.saveCurrentSchedule).not.toHaveBeenCalled();
    expect(schedulerStateRepository.insertRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", errorMessage: "llm unavailable" }),
    );
  });
});

describe("status and logs use cases", () => {
  it("returns scheduler timing status", async () => {
    const status = await getSchedulerStatusUseCase({
      schedulerStateRepository: {
        getState: vi.fn().mockResolvedValue({
          currentRevision: 3,
          lastScheduledRevision: 2,
          lastMutationAt: "2026-04-27T11:58:00.000Z",
          lastScheduledAt: "2026-04-27T11:30:00.000Z",
          schedulerStatus: "pending",
          runningRevision: null,
        }),
        listRuns: vi.fn().mockResolvedValue([
          { startedAt: "2026-04-27T11:59:30.000Z" },
        ]),
      },
      clock: {
        now: () => "2026-04-27T12:00:00.000Z",
        today: () => "2026-04-27",
      },
    });

    expect(status.hasPendingChanges).toBe(true);
    expect(status.secondsUntilNextRun).toBeGreaterThan(0);
    expect(status.latestRunAt).toBe("2026-04-27T11:59:30.000Z");
  });

  it("returns scheduler runs with default limit", async () => {
    const logs = await listSchedulerLogsUseCase({
      schedulerStateRepository: {
        listRuns: vi.fn().mockResolvedValue([{ id: "r1" }]),
      },
    });

    expect(logs.runs).toHaveLength(1);
  });
});

describe("metrics and planning health", () => {
  it("returns basic progress metrics", async () => {
    const metrics = await getMetricsUseCase(
      {
        metricsRepository: {
          getRangeSummary: vi.fn().mockResolvedValue({
            plannedMinutes: 120,
            actualMinutes: 90,
            completedMinutes: 30,
            atRiskTaskCount: 1,
          }),
        },
      },
      { dateFrom: "2026-04-27", dateTo: "2026-04-27" },
    );

    expect(metrics.atRiskTaskCount).toBe(1);
  });

  it("reports missing capacity dates within the next 7 days", async () => {
    const result = await getPlanningHealthUseCase(
      {
        capacityRepository: {
          listBetween: vi.fn().mockResolvedValue([
            createDayCapacity({ date: "2026-04-27", availableMinutes: 60 }),
            createDayCapacity({ date: "2026-04-29", availableMinutes: 60 }),
          ]),
        },
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([]),
        },
        clock: {
          today: () => "2026-04-27",
          now: () => "2026-04-27T00:00:00.000Z",
        },
      },
      {},
    );

    expect(result.warningCount).toBeGreaterThan(0);
  });

  it("reports insufficient capacity within the active scheduling horizon", async () => {
    const result = await getPlanningHealthUseCase(
      {
        capacityRepository: {
          listBetween: vi.fn().mockResolvedValue([
            createDayCapacity({ date: "2026-04-27", availableMinutes: 60 }),
            createDayCapacity({ date: "2026-04-28", availableMinutes: 60 }),
          ]),
        },
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([
            createTask({
              id: "task_1",
              title: "Write report",
              remainingMinutes: 240,
              createdAt: "2026-04-27T00:00:00.000Z",
              dueDate: "2026-04-29",
            }),
          ]),
        },
        clock: {
          today: () => "2026-04-27",
          now: () => "2026-04-27T00:00:00.000Z",
        },
      },
      {},
    );

    expect(result.hasInsufficientCapacity).toBe(true);
    expect(result.shortfallMinutes).toBe(120);
  });
});

describe("postponeSchedulerUseCase", () => {
  it("delays the next scheduler run by updating scheduler state", async () => {
    const schedulerStateRepository = {
      postponeNextRun: vi.fn().mockResolvedValue(undefined),
    };

    await postponeSchedulerUseCase(
      {
        schedulerStateRepository,
        clock: {
          now: () => "2026-04-27T12:00:00.000Z",
          today: () => "2026-04-27",
        },
      },
      { delayMilliseconds: 3 * 60_000 },
    );

    expect(schedulerStateRepository.postponeNextRun).toHaveBeenCalledWith({
      now: "2026-04-27T12:00:00.000Z",
      delayMilliseconds: 3 * 60_000,
      debounceMilliseconds: 3 * 60_000,
    });
  });
});
