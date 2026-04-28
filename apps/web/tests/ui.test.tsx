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
        { task_id: "task_today", date: "2026-04-29", planned_minutes: 30, kind: "focus" },
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
    taskPlatformMock.listProposals.mockResolvedValue([]);
  });

  it("renders the daily execution heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  it("shows only today's slices on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText(/2026-04-28 · 60 min/)).toBeInTheDocument();
    expect(screen.queryByText(/2026-04-29 · 30 min/)).not.toBeInTheDocument();
  });

  it("renders work-log inputs on the Today page", async () => {
    render(await HomePage());

    expect(screen.getAllByLabelText("Spent minutes").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Remaining after").length).toBeGreaterThan(0);
  });

  it("renders a planning-health warning on the Today page", async () => {
    render(await HomePage());

    expect(screen.getByText(/missing capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-29/)).toBeInTheDocument();
  });

  it("renders the richer Inbox fields", async () => {
    render(await InboxPage());

    expect(screen.getAllByLabelText("Due date").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Urgency").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Task type").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Energy").length).toBeGreaterThan(0);
  });

  it("renders editable capacity inputs on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getAllByLabelText("Available minutes").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Buffer minutes").length).toBeGreaterThan(0);
  });

  it("renders arbitrary-date planning controls on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByRole("link", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Reference date")).toBeInTheDocument();
  });

  it("renders missing-capacity warnings on the Week page", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getByText(/missing capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-01/)).toBeInTheDocument();
  });

  it("renders proposal detail sections", async () => {
    render(await ProposalsPage());

    expect(screen.getByText("Unscheduled tasks")).toBeInTheDocument();
    expect(screen.getByText("Capacity pressure")).toBeInTheDocument();
  });
});
