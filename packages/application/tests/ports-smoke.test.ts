import { describe, expect, it } from "vitest";
import { createTaskInputSchema } from "@task-platform/contracts";

describe("contracts smoke test", () => {
  it("parses a task creation payload", () => {
    const parsed = createTaskInputSchema.parse({
      title: "Draft essay",
      remainingMinutes: 90,
      dueDate: "2026-04-30",
      urgency: "soon",
    });

    expect(parsed.title).toBe("Draft essay");
  });
});
