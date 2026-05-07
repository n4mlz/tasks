import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startBackgroundScheduler } from "../lib/task-platform";

describe("startBackgroundScheduler", () => {
  const registry = globalThis as typeof globalThis & {
    __taskPlatformBackgroundScheduler?: ReturnType<typeof setInterval>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    delete registry.__taskPlatformBackgroundScheduler;
  });

  afterEach(() => {
    if (registry.__taskPlatformBackgroundScheduler) {
      clearInterval(registry.__taskPlatformBackgroundScheduler);
      delete registry.__taskPlatformBackgroundScheduler;
    }
    vi.useRealTimers();
  });

  it("starts only one interval and ticks in the background", async () => {
    const runSchedulerTick = vi.fn().mockResolvedValue(undefined);

    const timerA = startBackgroundScheduler({ runSchedulerTick }, 1000);
    const timerB = startBackgroundScheduler({ runSchedulerTick }, 1000);

    expect(timerA).toBe(timerB);

    await vi.advanceTimersByTimeAsync(3000);

    expect(runSchedulerTick).toHaveBeenCalledTimes(3);
  });
});
