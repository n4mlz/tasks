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
  searchParams?: Promise<{ taskId?: string; week?: string }>;
} = {}) {
  const searchParams = (await props.searchParams) ?? {};
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
  }>;
  const tasks = allTasks
    .filter((task) => task.status !== "archived")
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

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ダッシュボード</h1>
      </div>
      <DashboardTabs
        dailySummary={dailySummary}
        tasks={tasks}
        selectedTask={selectedTask}
        initialWeekStart={weekStart}
      />
    </section>
  );
}
