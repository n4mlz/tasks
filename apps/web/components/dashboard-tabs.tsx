"use client";

import React from "react";
import { MetricCard } from "./metric-card";
import { DashboardTaskChart } from "./dashboard-task-chart";
import { DashboardWeeklyChart } from "./dashboard-weekly-chart";
import { TaskSelector } from "./task-selector";
import { formatHoursFromMinutes } from "../lib/presentation";
import { cn } from "../lib/utils";

function MetricTile({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return <MetricCard label={label} value={value} />;
}

export function DashboardTabs({
  weeklySummary,
  tasks,
  selectedTask,
}: Readonly<{
  weeklySummary: Array<{
    weekStart: string;
    plannedMinutes: number;
    actualMinutes: number;
    completedTaskCount: number;
    completionRate: number;
  }>;
  tasks: Array<{ id: string; title: string }>;
  selectedTask: {
    header: {
      taskId: string;
      title: string;
      totalEstimatedMinutes: number;
      remainingMinutes: number;
      loggedMinutes: number;
      progressRate: number;
      dueDate: string | null;
    };
    buckets: Array<{
      weekStart: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
  } | null;
}>) {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "task">("weekly");
  const currentWeek = weeklySummary.at(-1) ?? {
    weekStart: "",
    plannedMinutes: 0,
    actualMinutes: 0,
    completedTaskCount: 0,
    completionRate: 0,
  };

  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label="ダッシュボード切替"
        className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "weekly"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "weekly" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("weekly")}
        >
          週次
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "task"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "task" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("task")}
        >
          タスク別
        </button>
      </div>

      {activeTab === "weekly" ? (
        <div role="tabpanel" className="grid gap-4">
          <DashboardWeeklyChart data={weeklySummary} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="今週の予定" value={formatHoursFromMinutes(currentWeek.plannedMinutes)} />
            <MetricTile label="今週の実績" value={formatHoursFromMinutes(currentWeek.actualMinutes)} />
            <MetricTile
              label="今週の達成率"
              value={`${Math.round(currentWeek.completionRate * 100)}%`}
            />
            <MetricTile label="完了タスク" value={`${currentWeek.completedTaskCount}`} />
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="grid gap-4">
          {tasks.length > 0 ? (
            <TaskSelector tasks={tasks} selectedTaskId={selectedTask?.header.taskId ?? tasks[0].id} />
          ) : null}
          {selectedTask ? (
            <>
              <DashboardTaskChart data={selectedTask.buckets} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricTile
                  label="全体"
                  value={formatHoursFromMinutes(selectedTask.header.totalEstimatedMinutes)}
                />
                <MetricTile
                  label="残り"
                  value={formatHoursFromMinutes(selectedTask.header.remainingMinutes)}
                />
                <MetricTile
                  label="進捗"
                  value={`${Math.round(selectedTask.header.progressRate * 100)}%`}
                />
                <MetricTile label="期限" value={selectedTask.header.dueDate ?? "未設定"} />
                <MetricTile
                  label="累計実績"
                  value={formatHoursFromMinutes(selectedTask.header.loggedMinutes)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              表示できる task がありません。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
