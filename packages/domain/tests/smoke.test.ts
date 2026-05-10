import { describe, expect, it } from "vitest";
import { createTask } from "../src/index";

describe("domain smoke test", () => {
  it("creates an active task by default", () => {
    const task = createTask({
      id: "task_1",
      title: "Prepare seminar slides",
      remainingMinutes: 180,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    expect(task.status).toBe("active");
    expect(task.urgency).toBe("normal");
  });
});
