/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { taskPlatformMock, refreshMock } = vi.hoisted(() => ({
  taskPlatformMock: {
    listTasks: vi.fn(),
    getCurrentSchedule: vi.fn(),
    getPlanningHealth: vi.fn(),
    getCapacities: vi.fn(),
    getMetrics: vi.fn(),
    getWorkLogs: vi.fn(),
  },
  refreshMock: vi.fn(),
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

import HomePage from "../app/page";
import { AppShell } from "../components/app-shell";
import InboxPage from "../app/inbox/page";
import { SchedulerStatus } from "../components/scheduler-status";
import WeekPage from "../app/week/page";

describe("Web UI", () => {
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
              latestRunAt: "2026-04-28T08:30:00.000Z",
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

    taskPlatformMock.listTasks.mockResolvedValue([
      {
        id: "task_today",
        title: "Write notes",
        taskType: "writing",
        cognitiveLoad: "high",
        energy: "medium",
        tags: ["頭使う"],
        remainingMinutes: 90,
        dueDate: "2026-04-30",
        status: "active",
      },
      {
        id: "task_extra",
        title: "Reply to mail",
        taskType: "admin",
        cognitiveLoad: "low",
        energy: "low",
        tags: ["軽作業寄り"],
        remainingMinutes: 30,
        dueDate: null,
        status: "active",
      },
    ]);
    taskPlatformMock.getCurrentSchedule.mockResolvedValue({
      activeScheduleId: "schedule_1",
      slices: [
        { task_id: "task_today", date: "2026-04-28", planned_minutes: 60, kind: "focus" },
        { task_id: "task_today", date: "2026-04-30", planned_minutes: 30, kind: "focus" },
      ],
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
    taskPlatformMock.getWorkLogs.mockResolvedValue([
      {
        id: "log_1",
        taskId: "task_today",
        date: "2026-04-27",
        spentMinutes: 60,
        remainingMinutesAfter: 90,
        note: "",
      },
    ]);
  });

  it("renders the daily execution heading", async () => {
    vi.useRealTimers();
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
  });

  it("renders the app shell marker for the redesigned UI foundation", () => {
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );

    expect(document.querySelector("[data-app-shell='task-platform']")).not.toBeNull();
    expect(screen.getByRole("link", { name: "今日" })).toHaveAttribute("aria-current", "page");
  });

  it("shows a scheduler delay button while pending", async () => {
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: {
            currentRevision: 2,
            lastScheduledRevision: 1,
            lastMutationAt: "2026-04-28T08:59:00.000Z",
            lastScheduledAt: "2026-04-28T08:30:00.000Z",
            latestRunAt: "2026-04-28T08:30:00.000Z",
            schedulerStatus: "pending",
            runningRevision: null,
            hasPendingChanges: true,
            nextRunAt: "2026-04-28T09:02:00.000Z",
            secondsUntilNextRun: 120,
          },
        }),
      }),
    );

    render(<SchedulerStatus />);
    expect(await screen.findByRole("button", { name: "3分延長" })).toBeInTheDocument();
  });

  it("shows a force-run button while not running", async () => {
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: {
            currentRevision: 2,
            lastScheduledRevision: 1,
            lastMutationAt: "2026-04-28T08:59:00.000Z",
            lastScheduledAt: "2026-04-28T08:30:00.000Z",
            latestRunAt: "2026-04-28T08:30:00.000Z",
            schedulerStatus: "pending",
            runningRevision: null,
            hasPendingChanges: true,
            nextRunAt: "2026-04-28T09:02:00.000Z",
            secondsUntilNextRun: 120,
          },
        }),
      }),
    );

    render(<SchedulerStatus />);
    expect(await screen.findByRole("button", { name: "今すぐ再配分" })).toBeInTheDocument();
  });

  it("updates the badge and refreshes when an immediate rerun fails", async () => {
    vi.useRealTimers();
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount += 1;
        const status =
          callCount === 1
            ? {
                currentRevision: 2,
                lastScheduledRevision: 1,
                lastMutationAt: "2026-04-28T08:59:00.000Z",
                lastScheduledAt: "2026-04-28T08:30:00.000Z",
                latestRunAt: "2026-04-28T08:30:00.000Z",
                schedulerStatus: "pending",
                runningRevision: null,
                hasPendingChanges: true,
                nextRunAt: "2026-04-28T09:02:00.000Z",
                secondsUntilNextRun: 120,
              }
            : {
                currentRevision: 2,
                lastScheduledRevision: 2,
                lastMutationAt: "2026-04-28T08:59:00.000Z",
                lastScheduledAt: "2026-04-28T08:30:00.000Z",
                latestRunAt: "2026-04-28T09:00:30.000Z",
                schedulerStatus: "failed",
                runningRevision: null,
                hasPendingChanges: true,
                nextRunAt: null,
                secondsUntilNextRun: null,
              };
        return Promise.resolve({
          ok: true,
          json: async () => ({ status }),
        });
      }),
    );

    render(<SchedulerStatus />);
    fireEvent.click(await screen.findByRole("button", { name: "今すぐ再配分" }));

    await waitFor(() => {
      expect(screen.getByText("要見直し")).toBeInTheDocument();
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows only today's slices on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText("Write notes")).toBeInTheDocument();
    expect(screen.getAllByText("1.0 時間").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "作業記録" })).toHaveLength(1);
    expect(screen.queryByText("2026-04-30")).not.toBeInTheDocument();
  });

  it("renders work-log triggers on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByRole("button", { name: "作業記録" })).toBeInTheDocument();
  });

  it("renders a planning-health warning on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText(/計画の見直しが必要です/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-29/)).toBeInTheDocument();
  });

  it("renders the richer Inbox fields", async () => {
    render(await InboxPage());

    expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("期限").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("状態")).toBeNull();
    expect(screen.queryByLabelText("緊急度")).toBeNull();
    expect(screen.queryByLabelText("task 種別")).toBeNull();
    expect(screen.queryByLabelText("energy")).toBeNull();
  });

  it("renders editable capacity inputs on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getAllByRole("button", { name: /を編集/ }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("バッファ")).toBeNull();
  });

  it("renders arbitrary-date planning controls on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByText("2026年5月")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /前の月/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /今日へ戻る/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /次の月/i })).toBeInTheDocument();
    expect(screen.getByLabelText("基準日")).toBeInTheDocument();
  });

  it("renders missing-capacity warnings on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByText(/計画の見直しが必要です/)).toBeInTheDocument();
    expect(screen.getAllByText(/2026-05-01/).length).toBeGreaterThan(0);
  });

  it("renders task overview with total time and progress", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-04-28" }) }));

    expect(screen.getByRole("columnheader", { name: "全体" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "残り" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "進捗" })).toBeInTheDocument();
    expect(screen.getByText("2.5 時間")).toBeInTheDocument();
    expect(screen.getByText("1.5 時間")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders delete actions for inbox tasks", async () => {
    render(await InboxPage());

    expect(screen.getAllByRole("button", { name: "削除" }).length).toBeGreaterThan(0);
  });
});
