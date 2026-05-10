import React from "react";
import { DashboardTabs } from "../../components/dashboard-tabs";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: {
  searchParams?: Promise<{ taskId?: string }>;
} = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const weeklySummary = (await taskPlatform.getDashboardWeeklySummary()) as Array<{
    weekStart: string;
    plannedMinutes: number;
    actualMinutes: number;
    completedTaskCount: number;
    completionRate: number;
  }>;
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
      <DashboardTabs weeklySummary={weeklySummary} tasks={tasks} selectedTask={selectedTask} />
    </section>
  );
}
