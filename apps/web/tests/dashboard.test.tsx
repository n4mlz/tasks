/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { taskPlatformMock } = vi.hoisted(() => ({
  taskPlatformMock: {
    getDashboardWeeklySummary: vi.fn(),
    getDashboardTaskTimeline: vi.fn(),
    listTasks: vi.fn(),
  },
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    taskPlatformMock.getDashboardWeeklySummary.mockResolvedValue([
      {
        weekStart: "2026-03-16",
        plannedMinutes: 600,
        actualMinutes: 480,
        completedTaskCount: 3,
        completionRate: 0.8,
      },
      {
        weekStart: "2026-03-23",
        plannedMinutes: 420,
        actualMinutes: 240,
        completedTaskCount: 1,
        completionRate: 240 / 420,
      },
    ]);
    taskPlatformMock.getDashboardTaskTimeline.mockResolvedValue({
      header: {
        taskId: "task-1",
        title: "Crypto 予習",
        totalEstimatedMinutes: 420,
        remainingMinutes: 180,
        loggedMinutes: 240,
        progressRate: 240 / 420,
        dueDate: "2026-05-10",
      },
      buckets: [
        { weekStart: "2026-03-16", plannedMinutes: 180, actualMinutes: 120 },
        { weekStart: "2026-03-23", plannedMinutes: 60, actualMinutes: 120 },
      ],
    });
    taskPlatformMock.listTasks.mockResolvedValue([{ id: "task-1", title: "Crypto 予習" }]);
  });

  it("renders the dashboard route and both tabs", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "週次" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "タスク別" })).toBeInTheDocument();
  });

  it("renders weekly summary labels", async () => {
    render(await DashboardPage());

    expect(screen.getByText("今週の予定")).toBeInTheDocument();
    expect(screen.getByText("今週の実績")).toBeInTheDocument();
    expect(screen.getByText("今週の達成率")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
  });

  it("renders task selector and task summary after switching tabs", async () => {
    render(await DashboardPage());

    fireEvent.click(screen.getByRole("tab", { name: "タスク別" }));

    expect(screen.getByRole("combobox", { name: "タスク" })).toBeInTheDocument();
    expect(screen.getByText("全体")).toBeInTheDocument();
    expect(screen.getByText("残り")).toBeInTheDocument();
    expect(screen.getByText("累計実績")).toBeInTheDocument();
  });
});
