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

import InboxPage from "../app/inbox/page";
import WeekPage from "../app/week/page";

describe("Inbox flow", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T09:00:00.000Z"));

    taskPlatformMock.listTasks.mockResolvedValue([]);
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
  });

  it("renders task fields for planning inputs", async () => {
    render(await InboxPage());

    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    expect(screen.getByLabelText("残り時間")).toBeInTheDocument();
    expect(screen.getByLabelText("期限")).toBeInTheDocument();
  });

  it("renders week planning actions", async () => {
    const WeekPageWithProps = WeekPage as unknown as (props: {
      searchParams?: Promise<Record<string, string>>;
    }) => Promise<React.JSX.Element>;

    render(await WeekPageWithProps({ searchParams: Promise.resolve({ referenceDate: "2026-05-02" }) }));

    expect(screen.getAllByRole("button", { name: "保存" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "この日付へ移動" })).toBeInTheDocument();
  });
});
