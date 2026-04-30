import React from "react";
import { PencilLine } from "lucide-react";
import { DeleteTaskDialog } from "../../components/delete-task-dialog";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { taskPlatform } from "../../lib/task-platform";
import {
  energyLabels,
  formatHoursFromMinutes,
  statusLabels,
  taskTypeLabels,
} from "../../lib/presentation";

export const dynamic = "force-dynamic";

const statusOptions = ["inbox", "active", "done", "archived"] as const;

export default async function InboxPage() {
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    remainingMinutes: number;
    status: string;
    dueDate: string | null;
    taskType?: string;
    energy?: string;
    notes?: string;
  }>;

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Inbox</h1>
        <StatusBadge tone="secondary">{`${tasks.length} 件`}</StatusBadge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/80 bg-white/94">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.03em]">追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/tasks" className="grid gap-4" method="post">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                タイトル
                <Input name="title" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  必要な時間 (時間)
                  <Input min="0.25" name="remainingMinutes" step="0.25" type="number" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  期限
                  <Input name="dueDate" type="date" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                メモ
                <Textarea name="notes" rows={4} />
              </label>
              <Button className="justify-self-start" type="submit">
                追加
              </Button>
            </form>
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
                        <StatusBadge tone="secondary">{statusLabels[task.status] ?? task.status}</StatusBadge>
                        <StatusBadge tone="outline">
                          {task.dueDate ? `期限 ${task.dueDate}` : "期限なし"}
                        </StatusBadge>
                        {task.taskType && task.taskType !== "unknown" ? (
                          <StatusBadge tone="outline">{taskTypeLabels[task.taskType] ?? task.taskType}</StatusBadge>
                        ) : null}
                        {task.energy && task.energy !== "unknown" ? (
                          <StatusBadge tone="outline">{energyLabels[task.energy] ?? task.energy}</StatusBadge>
                        ) : null}
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
                        状態
                        <Select defaultValue={task.status} name="status">
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {statusLabels[option]}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
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
