import { describe, expect, it, vi } from "vitest";
import { scheduleAfterTaskMutation } from "../src/index";

describe("scheduleAfterTaskMutation", () => {
  it("invokes proposal generation with the supplied reason", async () => {
    const generate = vi.fn().mockResolvedValue(undefined);

    await scheduleAfterTaskMutation(generate, "task_updated");

    expect(generate).toHaveBeenCalledWith("task_updated");
  });
});
