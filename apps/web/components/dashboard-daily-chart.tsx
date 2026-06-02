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
    dateLabel: formatDateLabel(entry.date),
    dayLabel: DAY_LABELS[index],
    plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
    actualHours: Number((entry.actualMinutes / 60).toFixed(2)),
  }));

  const isTest = process.env.NODE_ENV === "test";

  const hasAnyData = chartData.some(
    (d) => d.plannedHours > 0 || d.actualHours > 0,
  );

  const customTooltip = (tooltipProps: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
    label?: string;
  }) => {
    if (!tooltipProps.active || !tooltipProps.payload?.length) return null;
    const entry = chartData.find(
      (d) => d.dateLabel === tooltipProps.label || d.dayLabel === tooltipProps.label,
    );
    const label = entry
      ? `${entry.dateLabel} (${entry.dayLabel})`
      : tooltipProps.label;
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "13px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{label}</div>
        {tooltipProps.payload.map((p) => (
          <div key={p.name} style={{ color: "#475569" }}>
            {p.name === "plannedHours" ? "計画" : "実績"}:{" "}
            {formatTooltipHours(p.value)}
          </div>
        ))}
      </div>
    );
  };

  const chart = (
    <BarChart
      data={chartData}
      width={isTest ? 720 : undefined}
      height={isTest ? 260 : undefined}
    >
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="dateLabel"
        tick={({ x, y, payload, index }: { x: number; y: number; payload: { value: string }; index: number }) => (
          <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fontSize={11} fill="#475569">
              {payload.value}
            </text>
            <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {chartData[index]?.dayLabel}
            </text>
          </g>
        )}
        tickLine={false}
        axisLine={false}
      />
      <YAxis tickLine={false} axisLine={false} />
      <Tooltip content={customTooltip} />
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
          <ResponsiveContainer height="100%" minWidth={0} minHeight={288} width="100%">
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
