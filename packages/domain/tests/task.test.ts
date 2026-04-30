import { describe, expect, it } from "vitest";
import { createDayCapacity, createTask, updateTaskEstimate } from "../src/index";

describe("task validation", () => {
  it("defaults taskType and energy to unknown", () => {
    const task = createTask({
      id: "task_1",
      title: "Write summary",
      remainingMinutes: 60,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    expect(task.taskType).toBe("unknown");
    expect(task.energy).toBe("unknown");
  });

  it("preserves explicit taskType and energy", () => {
    const task = createTask({
      id: "task_2",
      title: "Implement scheduler",
      remainingMinutes: 120,
      createdAt: "2026-04-27T00:00:00.000Z",
      taskType: "implementation",
      energy: "high",
    });

    expect(task.taskType).toBe("implementation");
    expect(task.energy).toBe("high");
  });

  it("rejects non-positive remaining minutes", () => {
    expect(() =>
      createTask({
        id: "task_invalid",
        title: "Bad task",
        remainingMinutes: 0,
        createdAt: "2026-04-27T00:00:00.000Z",
      }),
    ).toThrow("remainingMinutes must be positive");
  });

  it("updates the remaining estimate and timestamp", () => {
    const task = createTask({
      id: "task_3",
      title: "Write report",
      remainingMinutes: 120,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const updated = updateTaskEstimate(task, {
      remainingMinutes: 45,
      updatedAt: "2026-04-27T02:00:00.000Z",
    });

    expect(updated.remainingMinutes).toBe(45);
    expect(updated.updatedAt).toBe("2026-04-27T02:00:00.000Z");
  });

  it("allows a task to reach zero remaining minutes after work is logged", () => {
    const task = createTask({
      id: "task_4",
      title: "Send reply",
      remainingMinutes: 15,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const updated = updateTaskEstimate(task, {
      remainingMinutes: 0,
      updatedAt: "2026-04-27T00:30:00.000Z",
    });

    expect(updated.remainingMinutes).toBe(0);
  });
});

describe("day capacity defaults", () => {
  it("uses the entered task time as-is by default", () => {
    const capacity = createDayCapacity({
      date: "2026-04-27",
      availableMinutes: 300,
    });

    expect(capacity.bufferMinutes).toBe(0);
  });
});
