"use client";

import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import * as React from "react";
import { Box, Button, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { MetricCard } from "./metric-card";
import { DashboardDailyChart } from "./dashboard-daily-chart";
import { TaskSelector } from "./task-selector";
import { formatHoursFromMinutes, formatJapaneseDate } from "../lib/presentation";
import { LogsPageClient } from "../app/logs/logs-page-client";

type Props = React.ComponentProps<typeof LogsPageClient> & {
  dailySummary: {
    days: Array<{ date: string; plannedMinutes: number; actualMinutes: number }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  };
  tasks: Array<{ id: string; title: string }>;
  selectedTask: {
    header: {
      taskId: string;
      title: string;
      totalEstimatedMinutes: number;
      remainingMinutes: number;
      loggedMinutes: number;
      progressRate: number;
      dueDate: string | null;
    };
    buckets: Array<{ weekStart: string; plannedMinutes: number; actualMinutes: number }>;
  } | null;
  selectedTaskDaily: { days: Array<{ date: string; plannedMinutes: number; actualMinutes: number }> } | null;
  initialWeekStart: string;
  initialView: "progress" | "history";
  showCompleted: boolean;
  completedCount: number;
};

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const format = (date: Date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  return `${format(start)} – ${format(end)}`;
}

function ReviewSwitch({
  value,
  onChange,
}: {
  value: "progress" | "history";
  onChange: (value: "progress" | "history") => void;
}) {
  return (
    <HStack gap="2" role="group" aria-label="振り返りの内容">
      <Button
        aria-pressed={value === "progress"}
        onClick={() => onChange("progress")}
        size="sm"
        variant={value === "progress" ? "solid" : "outline"}
        colorPalette={value === "progress" ? "teal" : "gray"}
      >
        進捗
      </Button>
      <Button
        aria-pressed={value === "history"}
        onClick={() => onChange("history")}
        size="sm"
        variant={value === "history" ? "solid" : "outline"}
        colorPalette={value === "history" ? "teal" : "gray"}
      >
        再配分履歴
      </Button>
    </HStack>
  );
}

export function DashboardTabs({
  dailySummary,
  tasks,
  selectedTask,
  selectedTaskDaily,
  initialWeekStart,
  initialView,
  showCompleted,
  completedCount,
  status,
  initialRuns,
}: Props) {
  const [view, setView] = React.useState(initialView);
  const [activeTab, setActiveTab] = React.useState<"weekly" | "task">("weekly");
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekStart = searchParams.get("week") ?? initialWeekStart;

  function navigateWeek(direction: -1 | 1) {
    const date = new Date(`${weekStart}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + direction * 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", date.toISOString().slice(0, 10));
    router.push(`/dashboard?${params.toString()}`);
  }

  function goToThisWeek() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("week");
    router.push(params.size > 0 ? `/dashboard?${params.toString()}` : "/dashboard");
  }

  const totals = dailySummary.weekTotals;

  return (
    <Stack gap="6">
      <ReviewSwitch value={view} onChange={setView} />

      {view === "history" ? (
        <Box>
          <LogsPageClient status={status} initialRuns={initialRuns} />
        </Box>
      ) : (
        <Stack gap="5">
          <Stack gap="4">
            <HStack gap="2" role="group" aria-label="進捗の表示">
              <Button
                aria-pressed={activeTab === "weekly"}
                onClick={() => setActiveTab("weekly")}
                size="sm"
                variant={activeTab === "weekly" ? "subtle" : "ghost"}
                colorPalette="teal"
              >
                週ごと
              </Button>
              <Button
                aria-pressed={activeTab === "task"}
                onClick={() => setActiveTab("task")}
                size="sm"
                variant={activeTab === "task" ? "subtle" : "ghost"}
                colorPalette="teal"
              >
                タスク別
              </Button>
            </HStack>

            <Flex align="center" justify="space-between" gap="2" wrap="wrap">
              <Button onClick={() => navigateWeek(-1)} variant="outline" size="sm" borderColor="#d5dfdc">
                前週
              </Button>
              <Text order={{ base: -1, sm: 0 }} w={{ base: "full", sm: "auto" }} textAlign="center" fontSize="sm" fontWeight="600" color="#455654">
                {formatWeekRange(weekStart)}
              </Text>
              <HStack ml="auto" gap="2">
                <Button onClick={goToThisWeek} variant="outline" size="sm" borderColor="#d5dfdc">今週</Button>
                <Button onClick={() => navigateWeek(1)} variant="outline" size="sm" borderColor="#d5dfdc">次週</Button>
              </HStack>
            </Flex>
          </Stack>

          {activeTab === "weekly" ? (
            <Stack gap="4">
              <DashboardDailyChart data={dailySummary.days} />
              <Grid templateColumns={{ base: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap="3">
                <MetricCard label="今週の予定" value={formatHoursFromMinutes(totals.plannedMinutes)} />
                <MetricCard label="今週の実績" value={formatHoursFromMinutes(totals.actualMinutes)} />
                <MetricCard label="予定に対する実績" value={`${Math.round(totals.completionRate * 100)}%`} />
                <MetricCard label="完了タスク" value={String(totals.completedTaskCount)} />
              </Grid>
            </Stack>
          ) : (
            <Stack gap="4">
              <Flex align="end" justify="space-between" gap="3" wrap="wrap">
                {tasks.length > 0 ? (
                  <TaskSelector tasks={tasks} selectedTaskId={selectedTask?.header.taskId ?? tasks[0].id} />
                ) : null}
                <Button asChild variant="outline" size="sm" borderColor="#d5dfdc">
                  <NextLink href={showCompleted ? "/dashboard" : "/dashboard?showCompleted=1"}>
                    {showCompleted ? "未完了タスクを見る" : `完了タスクを見る（${completedCount}）`}
                  </NextLink>
                </Button>
              </Flex>
              {selectedTask ? (
                <>
                  <Box>
                    <Heading size="md" color="#263a37">{selectedTask.header.title}</Heading>
                    <Text mt="1" fontSize="sm" color="#71807e">このタスクの予定と実績</Text>
                  </Box>
                  <DashboardDailyChart data={selectedTaskDaily?.days ?? []} />
                  <Grid templateColumns={{ base: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap="3">
                    <MetricCard label="実績時間" value={formatHoursFromMinutes(selectedTask.header.loggedMinutes)} />
                    <MetricCard label="残り時間" value={formatHoursFromMinutes(selectedTask.header.remainingMinutes)} />
                    <MetricCard label="進捗" value={`${Math.round(selectedTask.header.progressRate * 100)}%`} />
                    <MetricCard
                      label="期限"
                      value={selectedTask.header.dueDate ? formatJapaneseDate(selectedTask.header.dueDate) : "未設定"}
                    />
                  </Grid>
                </>
              ) : (
                <Box borderWidth="1px" borderStyle="dashed" borderColor="#d5dfdc" borderRadius="xl" bg="white" p="5">
                  <Text fontSize="sm" color="#71807e">表示できるタスクがありません。</Text>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
