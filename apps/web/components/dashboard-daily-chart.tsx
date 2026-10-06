"use client";

import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatWeekday(dateStr: string): string {
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${dateStr}T00:00:00.000Z`));
}

function formatHours(value: unknown): string {
  const parsed = Number(value ?? 0);
  return `${parsed.toFixed(1)} 時間`;
}

export function DashboardDailyChart({
  data,
}: Readonly<{ data: Array<{ date: string; plannedMinutes: number; actualMinutes: number }> }>) {
  const chartData = data.map((entry) => ({
    label: `${Number(entry.date.slice(8, 10))} (${formatWeekday(entry.date)})`,
    tooltipLabel: formatDateLabel(entry.date),
    plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
    actualHours: Number((entry.actualMinutes / 60).toFixed(2)),
  }));
  const hasData = chartData.some((item) => item.plannedHours > 0 || item.actualHours > 0);

  return (
    <Box
      role="group"
      aria-label="日別の予定時間と実績時間"
      borderWidth="1px"
      borderColor="#e2e9e6"
      borderRadius="xl"
      bg="white"
      p={{ base: "3", sm: "5" }}
    >
      <HStack gap="5" mb="2" fontSize="xs" color="#68777b">
        <HStack gap="2"><Box w="2.5" h="2.5" borderRadius="sm" bg="#c6d5d1" /><Text>予定</Text></HStack>
        <HStack gap="2"><Box w="2.5" h="2.5" borderRadius="sm" bg="#27645d" /><Text>実績</Text></HStack>
      </HStack>
      <Box h={{ base: "15rem", sm: "18rem" }} minW="0" aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={240}
          initialDimension={{ width: 390, height: 240 }}
        >
          <BarChart data={chartData} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e8eeec" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={({ x, y, payload }) => {
                const parts = payload.value?.toString().split(" (") ?? [];
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={10} textAnchor="middle" fontSize={10} fill="#536560">{parts[0] ?? ""}</text>
                    <text x={0} y={0} dy={24} textAnchor="middle" fontSize={10} fill="#8a9693">{parts[1]?.replace(")", "") ?? ""}</text>
                  </g>
                );
              }}
              tickLine={false}
              axisLine={false}
              height={40}
              interval={0}
            />
            <YAxis tickLine={false} axisLine={false} width={38} tick={{ fontSize: 10, fill: "#71807e" }} />
            <Tooltip
              formatter={(value) => formatHours(value)}
              labelFormatter={(label) => chartData.find((item) => item.label === label)?.tooltipLabel ?? String(label)}
            />
            <Bar dataKey="plannedHours" fill="#c6d5d1" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="actualHours" fill="#27645d" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {!hasData ? <Text mt="2" fontSize="sm" color="#71807e">この週の記録はまだありません。</Text> : null}
    </Box>
  );
}
