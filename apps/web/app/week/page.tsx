import React from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarRange, Clock3, ShieldAlert } from "lucide-react";
import { MetricCard } from "../../components/metric-card";
import { PlanningAlert } from "../../components/planning-alert";
import { SectionHeader } from "../../components/section-header";
import { StatusBadge } from "../../components/status-badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { taskPlatform } from "../../lib/task-platform";
import { formatMinutes } from "../../lib/presentation";

export const dynamic = "force-dynamic";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function WeekPage(props: {
  searchParams?: Promise<{ referenceDate?: string }>;
} = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const searchParams = (await props.searchParams) ?? {};
  const referenceDate = searchParams.referenceDate || today;
  const weekEnd = addDays(referenceDate, 6);
  const capacities = (await taskPlatform.getCapacities(referenceDate, weekEnd)) as Array<{
    date: string;
    availableMinutes: number;
    bufferMinutes: number;
  }>;
  const metrics = (await taskPlatform.getMetrics(referenceDate, weekEnd)) as {
    plannedMinutes: number;
    actualMinutes: number;
    completedMinutes: number;
    atRiskTaskCount: number;
    pendingProposalCount: number;
  };
  const planningHealth = (await taskPlatform.getPlanningHealth()) as {
    missingCapacityDatesWithin7Days: string[];
    warningCount: number;
  };
  const capacityMap = new Map(capacities.map((capacity) => [capacity.date, capacity]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(referenceDate, index);
    const capacity = capacityMap.get(date) ?? {
      date,
      availableMinutes: 0,
      bufferMinutes: 0,
    };

    return {
      ...capacity,
      usableMinutes: Math.max(capacity.availableMinutes - capacity.bufferMinutes, 0),
      missing: !capacityMap.has(date),
    };
  });

  return (
    <section className="grid gap-6">
      <Card className="border-white/70 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <CardContent className="grid gap-5 p-6">
          <SectionHeader
            eyebrow="計画"
            title="余力時間の計画面"
            description="任意の日付から 7 日ぶんの余力時間とバッファを編集できます。ここが埋まるほど、スケジューラと agent の提案は安定します。"
            actions={
              <>
                <a className={buttonVariants({ variant: "outline" })} href={`/week?referenceDate=${addDays(referenceDate, -7)}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  前の 7 日
                </a>
                <a className={buttonVariants({ variant: "outline" })} href={`/week?referenceDate=${today}`}>
                  今日へ戻る
                </a>
                <a className={buttonVariants({ variant: "outline" })} href={`/week?referenceDate=${addDays(referenceDate, 7)}`}>
                  次の 7 日
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <form action="/week" className="grid gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4" method="get">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                基準日
                <Input aria-label="基準日" defaultValue={referenceDate} name="referenceDate" type="date" />
              </label>
              <p className="text-sm leading-6 text-slate-600">
                任意の日付から 7 日ウィンドウを開けます。毎週の初めに限らず、必要なタイミングで編集してください。
              </p>
              <Button className="justify-self-start" type="submit">
                この日付へ移動
              </Button>
            </form>
            <div className="grid gap-3 rounded-[24px] border border-amber-200/70 bg-amber-50/85 p-4">
              <div className="flex items-center gap-2 text-amber-900">
                <CalendarRange className="h-4 w-4" />
                <span className="text-sm font-semibold">今見ている範囲</span>
              </div>
              <p className="text-sm leading-6 text-slate-700">
                {referenceDate} から {weekEnd} まで。直近 7 日の未設定日は今日画面と計画画面の両方で警告され、MCP 経由でも読めます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          hint="この 7 日に予定された合計"
          icon={<Clock3 className="h-5 w-5" />}
          label="予定"
          value={formatMinutes(metrics.plannedMinutes)}
        />
        <MetricCard
          hint="この 7 日の実績"
          icon={<CalendarRange className="h-5 w-5" />}
          label="実績"
          tone="success"
          value={formatMinutes(metrics.actualMinutes)}
        />
        <MetricCard
          hint="完了で消化された時間"
          icon={<ShieldAlert className="h-5 w-5" />}
          label="完了"
          value={formatMinutes(metrics.completedMinutes)}
        />
        <MetricCard
          hint="締切や容量不足の注意"
          icon={<AlertTriangle className="h-5 w-5" />}
          label="危険タスク"
          tone={metrics.atRiskTaskCount > 0 ? "warning" : "default"}
          value={metrics.atRiskTaskCount}
        />
        <MetricCard
          hint="承認待ちの再配分"
          icon={<CalendarRange className="h-5 w-5" />}
          label="保留中の提案"
          tone={metrics.pendingProposalCount > 0 ? "warning" : "default"}
          value={metrics.pendingProposalCount}
        />
      </div>

      <PlanningAlert dates={planningHealth.missingCapacityDatesWithin7Days} />

      <Card className="border-white/80 bg-white/94 shadow-[0_16px_52px_rgba(15,23,42,0.06)]">
        <CardContent className="p-0">
          <div className="border-b border-slate-200/80 px-6 py-5">
            <SectionHeader
              compact
              title="7 日間の余力テーブル"
              description="available と buffer を入れるだけで、usable は自動計算されます。未設定の日はその場で見えるようにしています。"
            />
          </div>
          <div className="overflow-x-auto px-4 py-4 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>使える時間</TableHead>
                  <TableHead>編集</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((capacity) => (
                  <TableRow key={capacity.date}>
                    <TableCell className="align-top">
                      <div className="grid gap-1">
                        <span className="font-medium text-slate-900">{capacity.date}</span>
                        <span className="text-sm text-slate-500">
                          usable: {formatMinutes(capacity.usableMinutes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-2">
                        {capacity.missing ? (
                          <StatusBadge tone="warning">未設定</StatusBadge>
                        ) : (
                          <StatusBadge tone="success">設定済み</StatusBadge>
                        )}
                        <StatusBadge tone="secondary">
                          available {formatMinutes(capacity.availableMinutes)}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          buffer {formatMinutes(capacity.bufferMinutes)}
                        </StatusBadge>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm leading-6 text-slate-600">
                      バッファを引いた後に、実際に配分に使える時間です。
                    </TableCell>
                    <TableCell className="align-top">
                      <form action="/api/capacity" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="post">
                        <input name="date" type="hidden" value={capacity.date} />
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          余力時間
                          <Input
                            aria-label="余力時間"
                            defaultValue={capacity.availableMinutes}
                            min="0"
                            name="availableMinutes"
                            type="number"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          バッファ
                          <Input
                            aria-label="バッファ"
                            defaultValue={capacity.bufferMinutes}
                            min="0"
                            name="bufferMinutes"
                            type="number"
                          />
                        </label>
                        <div className="flex items-end">
                          <Button type="submit">保存</Button>
                        </div>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
