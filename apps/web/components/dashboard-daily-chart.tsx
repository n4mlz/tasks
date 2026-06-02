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

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatTooltipHours(value: unknown): string {
  if (typeof value === "number") {
    return `${value.toFixed(1)} 時間`;
  }
  const parsed = Number(value ?? 0);
  return `${parsed.toFixed(1)} 時間`;
}

export function DashboardDailyChart({
  data,
}: Readonly<{
  data: Array<{
    date: string;
    plannedMinutes: number;
    actualMinutes: number;
  }>;
}>) {
  const chartData = data.map((entry, index) => ({
    label: `${formatDateLabel(entry.date)} (${DAY_LABELS[index]})`,
    plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
    actualHours: Number((entry.actualMinutes / 60).toFixed(2)),
  }));

  const isTest = process.env.NODE_ENV === "test";

  const hasAnyData = chartData.some(
    (d) => d.plannedHours > 0 || d.actualHours > 0,
  );

  const chart = (
    <BarChart
      data={chartData}
      width={isTest ? 720 : undefined}
      height={isTest ? 260 : undefined}
    >
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tick={({ x, y, payload }) => {
          const parts = payload.value?.toString().split(" (") ?? [];
          const datePart = parts[0] ?? "";
          const dayPart = parts[1]?.replace(")", "") ?? "";
          return (
            <g transform={`translate(${x},${y})`}>
              <text x={0} y={0} dy={10} textAnchor="middle" fontSize={11} fill="#475569">
                {datePart}
              </text>
              <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {dayPart}
              </text>
            </g>
          );
        }}
        tickLine={false}
        axisLine={false}
      />
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
      data-testid="dashboard-daily-chart"
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-300" />
          計画
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-900" />
          実績
        </span>
      </div>
      <div data-testid="dashboard-daily-chart-frame" className="h-72 min-h-72 min-w-0">
        {isTest ? (
          chart
        ) : (
          <ResponsiveContainer height={288} minWidth={0} width="100%">
            {chart}
          </ResponsiveContainer>
        )}
      </div>
      {!hasAnyData ? (
        <p className="mt-3 text-sm text-slate-500">この週のデータはまだありません。</p>
      ) : null}
    </div>
  );
}
