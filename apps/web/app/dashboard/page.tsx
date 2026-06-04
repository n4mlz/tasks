import React from "react";
import { DashboardTabs } from "../../components/dashboard-tabs";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ taskId?: string; week?: string; showCompleted?: string }>;
} = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const showCompleted = searchParams.showCompleted === "1";
  const today = new Date();
  const weekStart = searchParams.week ?? getMondayOfWeek(today);
  const dailySummary = (await taskPlatform.getDashboardDailySummary({ weekStart })) as {
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
  const allTasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    status?: string;
    updatedAt?: string;
  }>;
  const tasks = showCompleted
    ? allTasks
        .filter((task) => task.status === "done")
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .map((task) => ({ id: task.id, title: task.title }))
    : allTasks
        .filter((task) => task.status !== "done" && task.status !== "archived")
        .map((task) => ({ id: task.id, title: task.title }));
  const selectedTaskId =
    (searchParams.taskId && tasks.some((task) => task.id === searchParams.taskId)
      ? searchParams.taskId
      : tasks[0]?.id) ?? null;
  const selectedTask = selectedTaskId
    ? ((await taskPlatform.getDashboardTaskTimeline(selectedTaskId)) as {
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
      })
    : null;
  const selectedTaskDaily = selectedTaskId
    ? ((await taskPlatform.getDashboardTaskDailySummary({ taskId: selectedTaskId, weekStart })) as {
        days: Array<{
          date: string;
          plannedMinutes: number;
          actualMinutes: number;
        }>;
      })
    : null;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ダッシュボード</h1>
        <a
          href={(() => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (showCompleted) {
              params.delete("showCompleted");
            } else {
              params.set("showCompleted", "1");
            }
            const qs = params.toString();
            return qs ? `/dashboard?${qs}` : "/dashboard";
          })()}
          className="text-xs text-slate-500 underline hover:text-slate-700"
        >
          {showCompleted ? "未完了を表示" : "完了を表示"}
        </a>
      </div>
      <DashboardTabs
        dailySummary={dailySummary}
        tasks={tasks}
        selectedTask={selectedTask}
        selectedTaskDaily={selectedTaskDaily}
        initialWeekStart={weekStart}
      />
    </section>
  );
}
