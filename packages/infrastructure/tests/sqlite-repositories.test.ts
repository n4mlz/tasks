import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SqliteCapacityRepository,
  createDatabase,
  migrate,
  SqliteScheduleRepository,
  SqliteTaskRepository,
} from "../src/index";
import { createTask } from "@task-platform/domain";

describe("SQLite task repository", () => {
  it("persists and reloads a task", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const repository = new SqliteTaskRepository(db);
    const task = createTask({
      id: "task_repo",
      title: "Book train ticket",
      remainingMinutes: 15,
      createdAt: "2026-04-27T00:00:00.000Z",
      taskType: "admin",
      energy: "low",
    });

    await repository.save(task);
    const loaded = await repository.findById("task_repo");

    expect(loaded?.title).toBe("Book train ticket");
    expect(loaded?.taskType).toBe("admin");
    expect(loaded?.energy).toBe("low");
  });

  it("returns only persisted capacity rows and does not synthesize missing dates", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const repository = new SqliteCapacityRepository(db);

    await repository.upsert({
      date: "2026-04-28",
      availableMinutes: 180,
      bufferMinutes: 30,
    });
    await repository.upsert({
      date: "2026-04-30",
      availableMinutes: 120,
      bufferMinutes: 20,
    });

    const loaded = await repository.listBetween("2026-04-28", "2026-05-04");

    expect(loaded).toEqual([
      {
        date: "2026-04-28",
        availableMinutes: 180,
        bufferMinutes: 30,
      },
      {
        date: "2026-04-30",
        availableMinutes: 120,
        bufferMinutes: 20,
      },
    ]);
  });

  it("persists and reloads proposal summary details", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const repository = new SqliteScheduleRepository(db);

    await repository.savePendingProposal({
      id: "proposal_repo",
      reason: "manual",
      generatedAt: "2026-04-27T00:00:00.000Z",
      horizonStart: "2026-04-27",
      horizonEnd: "2026-05-03",
      slices: [],
      riskFlags: ["task_1:insufficient_capacity_before_due_date"],
      summary: {
        riskFlags: ["task_1:insufficient_capacity_before_due_date"],
        unscheduledTaskIds: ["task_1"],
        capacityPressureByDate: {
          "2026-04-27": 120,
        },
      },
    });

    const loaded = await repository.findById("proposal_repo");

    expect(loaded?.summary).toEqual({
      riskFlags: ["task_1:insufficient_capacity_before_due_date"],
      unscheduledTaskIds: ["task_1"],
      capacityPressureByDate: {
        "2026-04-27": 120,
      },
    });
  });

  it("loads migrations independently of the current working directory", () => {
    const originalCwd = process.cwd();

    try {
      process.chdir(path.resolve(originalCwd, "apps/web"));

      const db = createDatabase(":memory:");

      expect(() => migrate(db)).not.toThrow();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
