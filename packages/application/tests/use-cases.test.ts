import { describe, expect, it, vi } from "vitest";
import {
  approveProposalUseCase,
  createTaskUseCase,
  generateScheduleProposalUseCase,
  getMetricsUseCase,
  logWorkUseCase,
  rejectProposalUseCase,
  setCapacityUseCase,
  updateTaskUseCase,
} from "../src/index";

describe("createTaskUseCase", () => {
  it("stores a task with work-shape hints and generates a pending proposal", async () => {
    const taskRepository = {
      save: vi.fn().mockResolvedValue(undefined),
    };

    const capacityRepository = {
      listBetween: vi.fn().mockResolvedValue([
        { date: "2026-04-27", availableMinutes: 120, bufferMinutes: 0 },
        { date: "2026-04-28", availableMinutes: 120, bufferMinutes: 0 },
        { date: "2026-04-29", availableMinutes: 120, bufferMinutes: 0 },
        { date: "2026-04-30", availableMinutes: 120, bufferMinutes: 0 },
      ]),
    };

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    const clock = {
      now: () => "2026-04-27T09:00:00.000Z",
      today: () => "2026-04-27",
    };

    const idGenerator = {
      next: (prefix: string) => `${prefix}_1`,
    };

    await createTaskUseCase(
      {
        taskRepository,
        scheduleRepository,
        capacityRepository,
        clock,
        idGenerator,
      },
      {
        title: "Prepare application essay",
        remainingMinutes: 180,
        dueDate: "2026-05-01",
        taskType: "writing",
        energy: "high",
      },
    );

    expect(taskRepository.save).toHaveBeenCalledTimes(1);
    expect(taskRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: "writing",
        energy: "high",
      }),
    );
    expect(capacityRepository.listBetween).toHaveBeenCalledWith(
      "2026-04-27",
      "2026-05-03",
    );
    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledTimes(1);
  });
});

describe("logWorkUseCase", () => {
  it("logs work and stores the updated remaining estimate", async () => {
    const existingTask = {
      id: "task_1",
      title: "Draft report",
      notes: "",
      status: "active" as const,
      remainingMinutes: 120,
      dueDate: null,
      urgency: "normal" as const,
      taskType: "implementation" as const,
      energy: "high" as const,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
    };

    const taskRepository = {
      findById: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
      listSchedulable: vi.fn().mockResolvedValue([existingTask]),
    };

    const workLogRepository = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    const capacityRepository = {
      listBetween: vi.fn().mockResolvedValue([
        { date: "2026-04-27", availableMinutes: 60, bufferMinutes: 0 },
        { date: "2026-04-28", availableMinutes: 60, bufferMinutes: 0 },
      ]),
    };

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      logWorkUseCase(
        {
          taskRepository,
          workLogRepository,
          capacityRepository,
          scheduleRepository,
          clock: {
            now: () => "2026-04-27T12:00:00.000Z",
            today: () => "2026-04-27",
          },
          idGenerator: { next: (prefix: string) => `${prefix}_1` },
        },
        {
          taskId: "task_1",
          date: "2026-04-27",
          spentMinutes: 45,
          remainingMinutesAfter: 60,
        },
      ),
    ).resolves.toBeUndefined();

    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          unscheduledTaskIds: expect.any(Array),
        }),
      }),
    );
  });
});

describe("setCapacityUseCase", () => {
  it("stores day capacity and generates a proposal", async () => {
    const capacityRepository = {
      upsert: vi.fn().mockResolvedValue(undefined),
      listBetween: vi.fn().mockResolvedValue([
        { date: "2026-04-27", availableMinutes: 180, bufferMinutes: 30 },
        { date: "2026-04-28", availableMinutes: 240, bufferMinutes: 60 },
        { date: "2026-04-29", availableMinutes: 240, bufferMinutes: 60 },
      ]),
    };

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    await setCapacityUseCase(
      {
        capacityRepository,
        taskRepository: {
          listSchedulable: vi.fn().mockResolvedValue([
            {
              id: "task_cap",
              title: "Deep work",
              notes: "",
              status: "active" as const,
              remainingMinutes: 180,
              dueDate: "2026-04-30",
              urgency: "normal" as const,
              taskType: "deep" as const,
              energy: "high" as const,
              createdAt: "2026-04-27T00:00:00.000Z",
              updatedAt: "2026-04-27T00:00:00.000Z",
            },
          ]),
        },
        scheduleRepository,
        clock: {
          now: () => "2026-04-27T10:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        date: "2026-04-28",
        availableMinutes: 240,
        bufferMinutes: 60,
      },
    );

    expect(capacityRepository.upsert).toHaveBeenCalledTimes(1);
    expect(capacityRepository.listBetween).toHaveBeenCalledWith(
      "2026-04-27",
      "2026-05-03",
    );
    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        horizonEnd: "2026-05-03",
      }),
    );
  });
});

describe("updateTaskUseCase", () => {
  it("updates a task and generates a new pending proposal", async () => {
    const existingTask = {
      id: "task_5",
      title: "Initial title",
      notes: "",
      status: "inbox" as const,
      remainingMinutes: 90,
      dueDate: null,
      urgency: "normal" as const,
      taskType: "unknown" as const,
      energy: "unknown" as const,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
    };

    const taskRepository = {
      findById: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
      listSchedulable: vi.fn().mockResolvedValue([existingTask]),
    };

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    await updateTaskUseCase(
      {
        taskRepository,
        capacityRepository: { listBetween: vi.fn().mockResolvedValue([]) },
        scheduleRepository,
        clock: {
          now: () => "2026-04-27T11:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        taskId: "task_5",
        title: "Updated title",
        remainingMinutes: 60,
        status: "active",
      },
    );

    expect(taskRepository.save).toHaveBeenCalledTimes(1);
    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledTimes(1);
  });
});

describe("approveProposalUseCase", () => {
  it("approves a proposal and updates the schedule snapshot", async () => {
    const scheduleRepository = {
      approveProposal: vi.fn().mockResolvedValue(undefined),
    };

    await approveProposalUseCase(
      {
        scheduleRepository,
        clock: {
          now: () => "2026-04-27T14:00:00.000Z",
          today: () => "2026-04-27",
        },
      },
      { proposalId: "proposal_1" },
    );

    expect(scheduleRepository.approveProposal).toHaveBeenCalledWith(
      "proposal_1",
      "2026-04-27T14:00:00.000Z",
    );
  });
});

describe("rejectProposalUseCase", () => {
  it("rejects a pending proposal", async () => {
    const scheduleRepository = {
      rejectProposal: vi.fn().mockResolvedValue(undefined),
    };

    await rejectProposalUseCase(
      {
        scheduleRepository,
      },
      { proposalId: "proposal_2" },
    );

    expect(scheduleRepository.rejectProposal).toHaveBeenCalledWith("proposal_2");
  });
});

describe("generateScheduleProposalUseCase", () => {
  it("creates a pending proposal from current schedulable tasks", async () => {
    const tasks = [
      {
        id: "task_gen",
        title: "Draft talk",
        notes: "",
        status: "active" as const,
        remainingMinutes: 120,
        dueDate: null,
        urgency: "normal" as const,
        taskType: "unknown" as const,
        energy: "unknown" as const,
        createdAt: "2026-04-27T00:00:00.000Z",
        updatedAt: "2026-04-27T00:00:00.000Z",
      },
    ];

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    await generateScheduleProposalUseCase(
      {
        taskRepository: { listSchedulable: vi.fn().mockResolvedValue(tasks) },
        capacityRepository: { listBetween: vi.fn().mockResolvedValue([]) },
        scheduleRepository,
        clock: {
          now: () => "2026-04-27T15:00:00.000Z",
          today: () => "2026-04-27",
        },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      { reason: "manual" },
    );

    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledTimes(1);
  });
});

describe("getMetricsUseCase", () => {
  it("returns basic progress metrics", async () => {
    const metricsRepository = {
      getRangeSummary: vi.fn().mockResolvedValue({
        plannedMinutes: 300,
        actualMinutes: 240,
        completedMinutes: 180,
        atRiskTaskCount: 2,
        pendingProposalCount: 1,
      }),
    };

    const result = await getMetricsUseCase(
      { metricsRepository },
      { dateFrom: "2026-04-21", dateTo: "2026-04-27" },
    );

    expect(result.actualMinutes).toBe(240);
  });
});
