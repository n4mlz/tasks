import React from "react";
import { PencilLine } from "lucide-react";
import { DeleteTaskDialog } from "../../components/delete-task-dialog";
import { StatusBadge } from "../../components/status-badge";
import { TaskIntakeFlow } from "../../components/task-intake-flow";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { taskPlatform } from "../../lib/task-platform";
import {
  cognitiveLoadLabels,
  energyLabels,
  formatHoursFromMinutes,
  taskTypeLabels,
} from "../../lib/presentation";

export const dynamic = "force-dynamic";

export default async function InboxPage(props: {
  searchParams?: Promise<{ showCompleted?: string }>;
} = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const showCompleted = searchParams.showCompleted === "1";
  const allTasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    remainingMinutes: number;
    status: string;
    dueDate: string | null;
    taskType?: string;
    cognitiveLoad?: string;
    energy?: string;
    tags?: string[];
    notes?: string;
  }>;
  const tasks = showCompleted
    ? allTasks
    : allTasks.filter((task) => task.status !== "done" && task.status !== "archived");

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Inbox</h1>
        <div className="flex items-center gap-3">
          <StatusBadge tone="secondary">{`${tasks.length} 件`}</StatusBadge>
          <a
            href={showCompleted ? "/inbox" : "/inbox?showCompleted=1"}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            {showCompleted ? "未完了のみ表示" : "完了も表示"}
          </a>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/80 bg-white/94">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.03em]">追加</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskIntakeFlow />
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {tasks.length === 0 ? (
            <Card className="border-dashed border-slate-300/90 bg-white/90">
              <CardContent className="p-5 text-sm text-slate-600">task はありません。</CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="border-white/80 bg-white/94">
                <CardHeader className="gap-3 pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg tracking-[-0.03em]">{task.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge>{formatHoursFromMinutes(task.remainingMinutes)}</StatusBadge>
                        {task.status === "done" ? (
                          <StatusBadge tone="secondary">完了</StatusBadge>
                        ) : null}
                        <StatusBadge tone="outline">
                          {task.dueDate ? `期限 ${task.dueDate}` : "期限なし"}
                        </StatusBadge>
                        {task.taskType && task.taskType !== "unknown" ? (
                          <StatusBadge tone="outline">{taskTypeLabels[task.taskType] ?? task.taskType}</StatusBadge>
                        ) : null}
                        {task.cognitiveLoad && task.cognitiveLoad !== "unknown" ? (
                          <StatusBadge tone="outline">
                            {cognitiveLoadLabels[task.cognitiveLoad] ?? task.cognitiveLoad}
                          </StatusBadge>
                        ) : null}
                        {task.energy && task.energy !== "unknown" ? (
                          <StatusBadge tone="outline">{energyLabels[task.energy] ?? task.energy}</StatusBadge>
                        ) : null}
                        {task.tags?.map((tag) => (
                          <StatusBadge key={tag} tone="outline">
                            {tag}
                          </StatusBadge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PencilLine className="h-5 w-5 text-slate-400" />
                      <DeleteTaskDialog taskId={task.id} title={task.title} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <form action={`/api/tasks/${task.id}`} className="grid gap-4" method="post">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        タイトル
                        <Input defaultValue={task.title} name="title" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        残り時間 (時間)
                        <Input
                          defaultValue={task.remainingMinutes === 0 ? "0" : String(task.remainingMinutes / 60)}
                          min="0"
                          name="remainingMinutes"
                          step="0.25"
                          type="number"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        期限
                        <Input defaultValue={task.dueDate ?? ""} name="dueDate" type="date" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        完了
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-slate-950"
                          defaultChecked={task.status === "done"}
                          name="done"
                          type="checkbox"
                          value="true"
                        />
                      </label>
                    </div>
                    <input name="taskType" type="hidden" value={task.taskType ?? "unknown"} />
                    <input
                      name="cognitiveLoad"
                      type="hidden"
                      value={task.cognitiveLoad ?? "unknown"}
                    />
                    <input name="energy" type="hidden" value={task.energy ?? "unknown"} />
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      メモ
                      <Textarea defaultValue={task.notes ?? ""} name="notes" rows={3} />
                    </label>
                    <Button className="justify-self-start" type="submit" variant="secondary">
                      更新
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
