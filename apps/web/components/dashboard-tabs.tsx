"use client";

import React from "react";
import { MetricCard } from "./metric-card";
import { DashboardTaskChart } from "./dashboard-task-chart";
import { DashboardDailyChart } from "./dashboard-daily-chart";
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

function formatWeekRange(weekStart: string): string {
  const startDate = new Date(`${weekStart}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return `${startDate.getUTCMonth() + 1}/${startDate.getUTCDate()} (月) - ${endDate.getUTCMonth() + 1}/${endDate.getUTCDate()} (日)`;
}

export function DashboardTabs({
  dailySummary,
  tasks,
  selectedTask,
  initialWeekStart,
}: Readonly<{
  dailySummary: {
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  };
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
  initialWeekStart: string;
}>) {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "task">("weekly");
  const [weekStart, setWeekStart] = React.useState(initialWeekStart);

  function navigateWeek(direction: -1 | 1) {
    setWeekStart((prev) => {
      const d = new Date(`${prev}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + direction * 7);
      return d.toISOString().slice(0, 10);
    });
  }

  function goToToday() {
    const today = new Date();
    const day = today.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    today.setUTCDate(today.getUTCDate() + diff);
    setWeekStart(today.toISOString().slice(0, 10));
  }

  const handleWeekChange = React.useCallback(
    (direction: -1 | 1) => () => navigateWeek(direction),
    [],
  );

  const totals = dailySummary.weekTotals;

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
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleWeekChange(-1)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              &larr; 前週
            </button>
            <span className="text-sm font-medium text-slate-700">
              {formatWeekRange(weekStart)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                今日
              </button>
              <button
                type="button"
                onClick={handleWeekChange(1)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                次週 &rarr;
              </button>
            </div>
          </div>
          <DashboardDailyChart data={dailySummary.days} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="今週の予定" value={formatHoursFromMinutes(totals.plannedMinutes)} />
            <MetricTile label="今週の実績" value={formatHoursFromMinutes(totals.actualMinutes)} />
            <MetricTile
              label="達成率"
              value={`${Math.round(totals.completionRate * 100)}%`}
            />
            <MetricTile label="完了タスク" value={`${totals.completedTaskCount}`} />
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
