/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    taskPlatformMock.getDashboardWeeklySummary.mockResolvedValue([]);
    taskPlatformMock.getDashboardTaskTimeline.mockResolvedValue(null);
    taskPlatformMock.listTasks.mockResolvedValue([]);
  });

  it("renders the dashboard route and both tabs", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "週次" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "タスク別" })).toBeInTheDocument();
  });
});
