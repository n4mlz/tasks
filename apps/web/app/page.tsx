import React from "react";
import { PlanningAlert } from "../components/planning-alert";
import { QuickWorkLog } from "../components/quick-work-log";
import { StatusBadge } from "../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { WorkLogDialog } from "../components/work-log-dialog";
import { taskPlatform } from "../lib/task-platform";
import {
  cognitiveLoadLabels,
  energyLabels,
  formatHoursFromMinutes,
  formatIsoDate,
  taskTypeLabels,
} from "../lib/presentation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const schedule = (await taskPlatform.getCurrentSchedule()) as {
    activeScheduleId: string | null;
    summary?: {
      bufferUsageByDate?: Record<string, number>;
      datesUsingReserve?: string[];
      insufficientEvenWithReserve?: boolean;
    } | null;
    slices: Array<{
      task_id?: string;
      date?: string;
      planned_minutes?: number;
      kind?: string;
    }>;
  };
  const planningHealth = (await taskPlatform.getPlanningHealth()) as {
    missingCapacityDatesWithin7Days: string[];
    warningCount: number;
    hasInsufficientCapacity?: boolean;
    shortfallMinutes?: number;
    horizonEnd?: string;
  };
  const tasks = (await taskPlatform.listTasks({ status: "active" })) as Array<{
    id: string;
    title: string;
    taskType?: string;
    cognitiveLoad?: string;
    energy?: string;
    tags?: string[];
    remainingMinutes?: number;
    status?: string;
  }>;
  const metrics = (await taskPlatform.getMetrics(today, today)) as {
    plannedMinutes: number;
    actualMinutes: number;
  };

  const taskTitles = new Map(tasks.map((task) => [task.id, task]));
  const todaysSlices = schedule.slices.filter((slice) => slice.date === today);
  const todaysTaskIds = new Set(todaysSlices.map((slice) => slice.task_id).filter(Boolean));
  const otherActiveTasks = tasks.filter(
    (task) => task.id && !todaysTaskIds.has(task.id),
  );
  const todayReserveMinutes = schedule.summary?.bufferUsageByDate?.[today] ?? 0;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">今日</h1>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{formatHoursFromMinutes(metrics.plannedMinutes)}</StatusBadge>
          <StatusBadge tone="secondary">
            {`実績 ${formatHoursFromMinutes(metrics.actualMinutes)}`}
          </StatusBadge>
          <StatusBadge tone={todayReserveMinutes > 0 ? "warning" : "outline"}>
            {todayReserveMinutes > 0
              ? `バッファ使用 ${formatHoursFromMinutes(todayReserveMinutes)}`
              : "通常予算内"}
          </StatusBadge>
          <StatusBadge tone={schedule.activeScheduleId ? "success" : "outline"}>
            {schedule.activeScheduleId ? "計画あり" : "まだ未計画"}
          </StatusBadge>
        </div>
      </div>

      <PlanningAlert compact initialHealth={planningHealth} />

      {otherActiveTasks.length > 0 ? (
        <div className="flex justify-end">
          <QuickWorkLog
            date={today}
            tasks={otherActiveTasks.map((task) => ({
              id: task.id,
              title: task.title,
              remainingMinutes: task.remainingMinutes ?? 0,
            }))}
          />
        </div>
      ) : null}

      {todaysSlices.length === 0 ? (
        <Card className="border-dashed border-slate-300/90 bg-white/90">
          <CardContent className="p-5 text-sm text-slate-600">今日の task はありません。</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {todaysSlices.map((slice, index) => {
            const task = taskTitles.get(slice.task_id ?? "");

            return (
              <Card key={`${slice.task_id ?? "task"}-${index}`} className="border-white/80 bg-white/94">
                <CardHeader className="gap-2 pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg tracking-[-0.03em]">
                        {task?.title ?? slice.task_id ?? "不明な task"}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge>{formatIsoDate(slice.date ?? "unknown")}</StatusBadge>
                        <StatusBadge tone="secondary">
                          {formatHoursFromMinutes(slice.planned_minutes ?? 0)}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          {taskTypeLabels[task?.taskType ?? "unknown"] ?? "未分類"}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          {cognitiveLoadLabels[task?.cognitiveLoad ?? "unknown"] ?? "未設定"}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          {energyLabels[task?.energy ?? "unknown"] ?? "未設定"}
                        </StatusBadge>
                        {task?.tags?.map((tag) => (
                          <StatusBadge key={tag} tone="outline">
                            {tag}
                          </StatusBadge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-end">
                    <WorkLogDialog
                      date={slice.date ?? today}
                      defaultRemainingHours={(task?.remainingMinutes ?? 0) / 60}
                      taskId={slice.task_id ?? ""}
                      title={task?.title ?? slice.task_id ?? "不明な task"}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
