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
    listProposals: vi.fn(),
    getWorkLogs: vi.fn(),
  },
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import HomePage from "../app/page";
import { AppShell } from "../components/app-shell";
import InboxPage from "../app/inbox/page";
import ProposalsPage from "../app/proposals/page";
import WeekPage from "../app/week/page";

describe("Web UI", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T09:00:00.000Z"));

    taskPlatformMock.listTasks.mockResolvedValue([
      {
        id: "task_today",
        title: "Write notes",
        taskType: "writing",
        energy: "medium",
        remainingMinutes: 90,
        dueDate: "2026-04-30",
        status: "active",
      },
      {
        id: "task_extra",
        title: "Reply to mail",
        taskType: "admin",
        energy: "low",
        remainingMinutes: 30,
        dueDate: null,
        status: "inbox",
      },
    ]);
    taskPlatformMock.getCurrentSchedule.mockResolvedValue({
      activeProposalId: "proposal_1",
      slices: [
        { task_id: "task_today", date: "2026-04-28", planned_minutes: 60, kind: "focus" },
        { task_id: "task_today", date: "2026-04-30", planned_minutes: 30, kind: "focus" },
      ],
    });
    taskPlatformMock.getPlanningHealth.mockResolvedValue({
      missingCapacityDatesWithin7Days: ["2026-04-29", "2026-05-01"],
      warningCount: 2,
    });
    taskPlatformMock.getCapacities.mockResolvedValue([]);
    taskPlatformMock.getMetrics.mockResolvedValue({
      plannedMinutes: 180,
      actualMinutes: 45,
      completedMinutes: 0,
      atRiskTaskCount: 1,
      pendingProposalCount: 1,
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
    taskPlatformMock.listProposals.mockResolvedValue([
      {
        id: "proposal_pending",
        reason: "task_updated",
        summary: {
          riskFlags: ["task_today:insufficient_capacity_before_due_date"],
          unscheduledTaskIds: ["task_extra"],
          capacityPressureByDate: {
            "2026-04-30": 75,
          },
        },
      },
    ]);
  });

  it("renders the daily execution heading", async () => {
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

    expect(screen.getByText(/余力時間が未設定の日があります/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-29/)).toBeInTheDocument();
  });

  it("renders the richer Inbox fields", async () => {
    render(await InboxPage());

    expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("期限").length).toBeGreaterThan(0);
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

    expect(screen.getByText(/余力時間が未設定の日があります/)).toBeInTheDocument();
    expect(screen.getAllByText(/2026-05-01/).length).toBeGreaterThan(0);
  });

  it("renders proposal detail sections", async () => {
    render(await ProposalsPage());

    expect(screen.getAllByText("未配分の task").length).toBeGreaterThan(0);
    expect(screen.getAllByText("日ごとの配分").length).toBeGreaterThan(0);
    expect(screen.getByText("Reply to mail")).toBeInTheDocument();
    expect(screen.getByText("task 更新を受けて再配分しました")).toBeInTheDocument();
    expect(screen.getByText(/期限までに収まりきらない可能性があります/)).toBeInTheDocument();
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
