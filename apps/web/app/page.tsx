import React from "react";
import { PlanningAlert } from "../components/planning-alert";
import { StatusBadge } from "../components/status-badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { taskPlatform } from "../lib/task-platform";
import { energyLabels, formatIsoDate, formatMinutes, taskTypeLabels } from "../lib/presentation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const schedule = (await taskPlatform.getCurrentSchedule()) as {
    activeProposalId: string | null;
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
  };
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    taskType?: string;
    energy?: string;
  }>;
  const metrics = (await taskPlatform.getMetrics(today, today)) as {
    plannedMinutes: number;
    actualMinutes: number;
  };

  const taskTitles = new Map(tasks.map((task) => [task.id, task]));
  const todaysSlices = schedule.slices.filter((slice) => slice.date === today);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">今日</h1>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{formatMinutes(metrics.plannedMinutes)}</StatusBadge>
          <StatusBadge tone="secondary">{`実績 ${formatMinutes(metrics.actualMinutes)}`}</StatusBadge>
          <StatusBadge tone={schedule.activeProposalId ? "success" : "outline"}>
            {schedule.activeProposalId ?? "未承認"}
          </StatusBadge>
        </div>
      </div>

      <PlanningAlert compact dates={planningHealth.missingCapacityDatesWithin7Days} />

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
                        <StatusBadge tone="secondary">{formatMinutes(slice.planned_minutes ?? 0)}</StatusBadge>
                        <StatusBadge tone="outline">
                          {taskTypeLabels[task?.taskType ?? "unknown"] ?? "未分類"}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          {energyLabels[task?.energy ?? "unknown"] ?? "未設定"}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <form
                    action={`/api/tasks/${slice.task_id}/log-work`}
                    className="grid gap-3 md:grid-cols-[140px_140px_minmax(0,1fr)_auto]"
                    method="post"
                  >
                    <input name="date" type="hidden" value={slice.date ?? ""} />
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      使った時間
                      <Input min="1" name="spentMinutes" type="number" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      残り時間
                      <Input min="0" name="remainingMinutesAfter" type="number" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      メモ
                      <Input name="note" />
                    </label>
                    <div className="flex items-end">
                      <Button type="submit">記録</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
