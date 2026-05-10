"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatTooltipHours(value: unknown): string {
  if (typeof value === "number") {
    return `${value.toFixed(1)} 時間`;
  }

  const parsed = Number(value ?? 0);
  return `${parsed.toFixed(1)} 時間`;
}

export function DashboardWeeklyChart({
  data,
}: Readonly<{
  data: Array<{
    weekStart: string;
    plannedMinutes: number;
    actualMinutes: number;
  }>;
}>) {
  const chartData = data.map((entry) => ({
    label: formatWeekLabel(entry.weekStart),
    plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
    actualHours: Number((entry.actualMinutes / 60).toFixed(2)),
  }));
  const isTest = process.env.NODE_ENV === "test";
  const chart = (
    <BarChart data={chartData} width={isTest ? 720 : undefined} height={isTest ? 260 : undefined}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} />
      <YAxis tickLine={false} axisLine={false} />
      <Tooltip
        formatter={(value) => formatTooltipHours(value)}
        labelFormatter={(label) => `${label} 週`}
      />
      <Bar dataKey="plannedHours" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
      <Bar dataKey="actualHours" fill="#0f172a" radius={[6, 6, 0, 0]} />
    </BarChart>
  );

  return (
    <div
      data-testid="dashboard-weekly-chart"
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-300" />
          予定
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-900" />
          実績
        </span>
      </div>
      <div data-testid="dashboard-weekly-chart-frame" className="h-72 min-h-72 min-w-0">
        {isTest ? (
          chart
        ) : (
          <ResponsiveContainer height="100%" minWidth={0} minHeight={288} width="100%">
            {chart}
          </ResponsiveContainer>
        )}
      </div>
      {chartData.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">まだ週次データはありません。</p>
      ) : null}
    </div>
  );
}
