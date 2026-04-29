import React from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FolderClock } from "lucide-react";
import { MetricCard } from "../components/metric-card";
import { PlanningAlert } from "../components/planning-alert";
import { SectionHeader } from "../components/section-header";
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
    completedMinutes: number;
    atRiskTaskCount: number;
    pendingProposalCount: number;
  };

  const taskTitles = new Map(tasks.map((task) => [task.id, task]));
  const todaysSlices = schedule.slices.filter((slice) => slice.date === today);

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_34%),linear-gradient(135deg,#fffdf8_0%,#ffffff_55%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.5fr_1fr]">
          <SectionHeader
            eyebrow="今日"
            title="今日の実行面"
            description="承認済みの今日のスライスだけを見て、終わったら実績と残り時間を返します。計画の調整は他の画面に隔離します。"
          />
          <div className="grid gap-3 rounded-[24px] border border-slate-200/80 bg-white/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">有効な提案</span>
              <StatusBadge tone={schedule.activeProposalId ? "success" : "outline"}>
                {schedule.activeProposalId ?? "未承認"}
              </StatusBadge>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              今日の作業だけをここで処理し、余力時間や提案の確認は `計画` と `提案` に分けます。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                hint="今日に割り当て済み"
                icon={<Clock3 className="h-5 w-5" />}
                label="予定"
                value={formatMinutes(
                  todaysSlices.reduce((total, slice) => total + (slice.planned_minutes ?? 0), 0),
                )}
              />
              <MetricCard
                hint="今日記録した実績"
                icon={<Activity className="h-5 w-5" />}
                label="実績"
                value={formatMinutes(metrics.actualMinutes)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="本日予定された合計"
          icon={<Clock3 className="h-5 w-5" />}
          label="今日の予定"
          value={formatMinutes(metrics.plannedMinutes)}
        />
        <MetricCard
          hint="作業ログから集計"
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="今日の実績"
          tone="success"
          value={formatMinutes(metrics.actualMinutes)}
        />
        <MetricCard
          hint="見直しが必要な task"
          icon={<AlertTriangle className="h-5 w-5" />}
          label="危険タスク"
          tone={metrics.atRiskTaskCount > 0 ? "warning" : "default"}
          value={metrics.atRiskTaskCount}
        />
        <MetricCard
          hint="承認待ちの再配分"
          icon={<FolderClock className="h-5 w-5" />}
          label="保留中の提案"
          tone={metrics.pendingProposalCount > 0 ? "warning" : "default"}
          value={metrics.pendingProposalCount}
        />
      </div>

      <PlanningAlert compact dates={planningHealth.missingCapacityDatesWithin7Days} />

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-4">
          <SectionHeader
            compact
            title="今日やること"
            description="日付が今日のスライスだけを表示しています。ここを消化できれば、計画上は順調です。"
          />

          {todaysSlices.length === 0 ? (
            <Card className="border-dashed border-slate-300/90 bg-white/90">
              <CardContent className="p-6">
                <p className="text-sm leading-6 text-slate-600">
                  今日に承認済みのスライスはまだありません。受信箱や提案画面を見直してから、必要なら再スケジュールを承認してください。
                </p>
              </CardContent>
            </Card>
          ) : (
            todaysSlices.map((slice, index) => {
              const task = taskTitles.get(slice.task_id ?? "");
              return (
                <Card
                  key={`${slice.task_id ?? "task"}-${index}`}
                  className="border-white/80 bg-white/94 shadow-[0_14px_44px_rgba(15,23,42,0.07)]"
                >
                  <CardHeader className="gap-3 pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="text-xl tracking-[-0.03em]">
                          {task?.title ?? slice.task_id ?? "不明な task"}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge>{formatIsoDate(slice.date ?? "unknown")}</StatusBadge>
                          <StatusBadge tone="secondary">
                            {formatMinutes(slice.planned_minutes ?? 0)}
                          </StatusBadge>
                          <StatusBadge tone="outline">
                            {taskTypeLabels[task?.taskType ?? "unknown"] ?? "未分類"}
                          </StatusBadge>
                          <StatusBadge tone="outline">
                            {energyLabels[task?.energy ?? "unknown"] ?? "未設定"}
                          </StatusBadge>
                        </div>
                      </div>
                      <StatusBadge tone={slice.kind === "focus" ? "success" : "secondary"}>
                        {slice.kind === "focus" ? "集中枠" : "補助枠"}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="grid gap-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          実行メモ
                        </span>
                        <p className="text-sm leading-6 text-slate-600">
                          予定時間は {formatMinutes(slice.planned_minutes ?? 0)} です。終わったら実績と残り時間を入れるだけで、次の提案が更新されます。
                        </p>
                      </div>
                    </div>
                    <form
                      action={`/api/tasks/${slice.task_id}/log-work`}
                      className="grid gap-3"
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
                      <Button className="justify-self-start" type="submit">
                        実績を記録する
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="grid gap-4">
          <Card className="border-white/70 bg-white/92">
            <CardHeader>
              <CardTitle className="text-lg">すぐ見る指標</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-sm font-medium text-slate-700">今日の完了感</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  今日の画面に task が並んでいるなら、それを処理することだけ考えれば十分です。
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-sm font-medium text-slate-700">次に見る場所</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  余力時間が足りない日は `計画`、再配分の差分確認は `提案`、新しい task の投入は `受信箱` を使います。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
