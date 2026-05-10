import { describe, expect, it, vi } from "vitest";
import type { DashboardRepository } from "../src/ports";
import {
  getDashboardTaskTimelineUseCase,
  getDashboardWeeklySummaryUseCase,
} from "../src";

describe("dashboard repository port", () => {
  it("accepts a repository with weekly and task timeline readers", () => {
    const repository: DashboardRepository = {
      getWeeklySummary: vi.fn().mockResolvedValue([]),
      getTaskTimeline: vi.fn().mockResolvedValue({
        header: {
          taskId: "task-1",
          title: "Task",
          totalEstimatedMinutes: 0,
          remainingMinutes: 0,
          loggedMinutes: 0,
          progressRate: 1,
          dueDate: null,
        },
        buckets: [],
      }),
    };

    expect(repository).toBeDefined();
  });
});

describe("dashboard use cases", () => {
  it("loads 8 weeks of weekly summary data", async () => {
    const dashboardRepository = {
      getWeeklySummary: vi.fn().mockResolvedValue([
        {
          weekStart: "2026-03-16",
          plannedMinutes: 300,
          actualMinutes: 240,
          completedTaskCount: 2,
          completionRate: 0.8,
        },
      ]),
    };

    const result = await getDashboardWeeklySummaryUseCase({
      dashboardRepository: dashboardRepository as unknown as DashboardRepository,
      today: "2026-05-07",
    });

    expect(dashboardRepository.getWeeklySummary).toHaveBeenCalledWith({
      endDate: "2026-05-07",
      weeks: 8,
    });
    expect(result).toHaveLength(1);
  });

  it("loads one task timeline with header data", async () => {
    const dashboardRepository = {
      getTaskTimeline: vi.fn().mockResolvedValue({
        header: {
          taskId: "task-1",
          title: "Crypto 予習",
          totalEstimatedMinutes: 420,
          remainingMinutes: 180,
          loggedMinutes: 240,
          progressRate: 240 / 420,
          dueDate: "2026-05-10",
        },
        buckets: [{ weekStart: "2026-03-16", plannedMinutes: 180, actualMinutes: 120 }],
      }),
    };

    const result = await getDashboardTaskTimelineUseCase({
      dashboardRepository: dashboardRepository as unknown as DashboardRepository,
      taskId: "task-1",
      today: "2026-05-07",
    });

    expect(dashboardRepository.getTaskTimeline).toHaveBeenCalledWith({
      taskId: "task-1",
      endDate: "2026-05-07",
      weeks: 8,
    });
    expect(result.header.title).toBe("Crypto 予習");
  });
});
