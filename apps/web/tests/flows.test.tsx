/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { taskPlatformMock } = vi.hoisted(() => ({
  taskPlatformMock: {
    listTasks: vi.fn(),
    getCurrentSchedule: vi.fn(),
    getPlanningHealth: vi.fn(),
    getCapacities: vi.fn(),
    getMetrics: vi.fn(),
    getWorkLogs: vi.fn(),
  },
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/inbox",
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

import InboxPage from "../app/inbox/page";
import WeekPage from "../app/week/page";

describe("Inbox flow", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T09:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/planning-health")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              missingCapacityDatesWithin7Days: ["2026-04-29", "2026-05-01"],
              warningCount: 2,
              hasInsufficientCapacity: false,
              shortfallMinutes: 0,
              horizonEnd: "2026-05-04",
            }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: {
              currentRevision: 1,
              lastScheduledRevision: 1,
              lastMutationAt: null,
              lastScheduledAt: "2026-04-28T08:30:00.000Z",
              schedulerStatus: "idle",
              runningRevision: null,
              hasPendingChanges: false,
              nextRunAt: null,
              secondsUntilNextRun: null,
            },
          }),
        });
      }),
    );

    taskPlatformMock.listTasks.mockResolvedValue([]);
    taskPlatformMock.getCurrentSchedule.mockResolvedValue({
      activeScheduleId: "schedule_1",
      slices: [],
    });
    taskPlatformMock.getPlanningHealth.mockResolvedValue({
      missingCapacityDatesWithin7Days: ["2026-04-29", "2026-05-01"],
      warningCount: 2,
      hasInsufficientCapacity: false,
      shortfallMinutes: 0,
      horizonEnd: "2026-05-04",
    });
    taskPlatformMock.getCapacities.mockResolvedValue([]);
    taskPlatformMock.getMetrics.mockResolvedValue({
      plannedMinutes: 180,
      actualMinutes: 45,
      completedMinutes: 0,
      atRiskTaskCount: 1,
    });
    taskPlatformMock.getWorkLogs.mockResolvedValue([]);
  });

  it("renders task fields for planning inputs", async () => {
    render(await InboxPage());

    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    expect(screen.getByLabelText("必要な時間 (時間)")).toBeInTheDocument();
    expect(screen.getByLabelText("期限")).toBeInTheDocument();
  });

  it("renders week planning actions", async () => {
    vi.useRealTimers();
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getAllByRole("button", { name: /を編集/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "移動" })).toBeInTheDocument();
  }, 15000);
});
