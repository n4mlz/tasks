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
  },
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
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
      { id: "task_today", title: "Write notes", taskType: "writing", energy: "medium" },
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
    taskPlatformMock.listProposals.mockResolvedValue([
      {
        id: "proposal_pending",
        reason: "task_updated",
        summary: {
          riskFlags: ["due date pressure"],
          unscheduledTaskIds: ["task_extra"],
          capacityPressureByDate: {
            "2026-04-30": 1.25,
          },
        },
      },
    ]);
  });

  it("renders the daily execution heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "今日の実行面" })).toBeInTheDocument();
  });

  it("renders the app shell marker for the redesigned UI foundation", () => {
    render(
      <AppShell>
        <div>child</div>
      </AppShell>,
    );

    expect(document.querySelector("[data-app-shell='task-platform']")).not.toBeNull();
  });

  it("shows only today's slices on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText("Write notes")).toBeInTheDocument();
    expect(screen.getAllByText("60 分").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "実績を記録する" })).toHaveLength(1);
    expect(screen.queryByText("2026-04-30")).not.toBeInTheDocument();
  });

  it("renders work-log inputs on the Today page", async () => {
    render(await HomePage());

    expect(screen.getAllByLabelText("使った時間").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("残り時間").length).toBeGreaterThan(0);
  });

  it("renders a planning-health warning on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText(/余力時間が未設定の日があります/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-29/)).toBeInTheDocument();
  });

  it("renders the richer Inbox fields", async () => {
    render(await InboxPage());

    expect(screen.getAllByLabelText("期限").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("緊急度").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("task 種別").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("energy").length).toBeGreaterThan(0);
  });

  it("renders editable capacity inputs on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getAllByLabelText("余力時間").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("バッファ").length).toBeGreaterThan(0);
  });

  it("renders arbitrary-date planning controls on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByRole("link", { name: /前の 7 日/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /今日へ戻る/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /次の 7 日/i })).toBeInTheDocument();
    expect(screen.getByLabelText("基準日")).toBeInTheDocument();
  });

  it("renders missing-capacity warnings on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByText(/余力時間が未設定の日があります/)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-01/)).toBeInTheDocument();
  });

  it("renders proposal detail sections", async () => {
    render(await ProposalsPage());

    expect(screen.getAllByText("未配分 task").length).toBeGreaterThan(0);
    expect(screen.getAllByText("容量圧迫").length).toBeGreaterThan(0);
    expect(screen.getByText("task_extra")).toBeInTheDocument();
  });
});
