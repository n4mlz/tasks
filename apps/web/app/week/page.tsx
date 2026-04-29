import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PlanningAlert } from "../../components/planning-alert";
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
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">計画</h1>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{`${referenceDate} - ${weekEnd}`}</StatusBadge>
          <StatusBadge tone="secondary">{`予定 ${formatMinutes(metrics.plannedMinutes)}`}</StatusBadge>
          <StatusBadge tone="secondary">{`実績 ${formatMinutes(metrics.actualMinutes)}`}</StatusBadge>
          <StatusBadge tone={metrics.pendingProposalCount > 0 ? "warning" : "outline"}>
            {`提案 ${metrics.pendingProposalCount}`}
          </StatusBadge>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
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
        <form action="/week" className="flex flex-wrap items-end gap-2" method="get">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            基準日
            <Input aria-label="基準日" defaultValue={referenceDate} name="referenceDate" type="date" />
          </label>
          <Button type="submit">移動</Button>
        </form>
      </div>

      <PlanningAlert dates={planningHealth.missingCapacityDatesWithin7Days} />

      <Card className="border-white/80 bg-white/94">
        <CardContent className="p-0">
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
                    <TableCell className="align-top font-medium text-slate-900">
                      {capacity.date}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-2">
                        {capacity.missing ? (
                          <StatusBadge tone="warning">未設定</StatusBadge>
                        ) : (
                          <StatusBadge tone="success">設定済み</StatusBadge>
                        )}
                        <StatusBadge tone="secondary">
                          {`余力 ${formatMinutes(capacity.availableMinutes)}`}
                        </StatusBadge>
                        <StatusBadge tone="outline">
                          {`バッファ ${formatMinutes(capacity.bufferMinutes)}`}
                        </StatusBadge>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-slate-600">
                      {formatMinutes(capacity.usableMinutes)}
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
