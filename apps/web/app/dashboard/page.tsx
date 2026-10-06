import React from "react";
import { Heading, Stack } from "@chakra-ui/react";
import { DashboardTabs } from "../../components/dashboard-tabs";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function getMondayOfWeek(date: Date): string {
  const value = new Date(date);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return value.toISOString().slice(0, 10);
}

type DashboardPageProps = {
  searchParams?: Promise<{ taskId?: string; week?: string; showCompleted?: string; view?: string }>;
};

async function DashboardPage(): Promise<React.ReactElement>;
async function DashboardPage(props: DashboardPageProps): Promise<React.ReactElement>;
async function DashboardPage(props: DashboardPageProps = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const showCompleted = searchParams.showCompleted === "1";
  const today = new Date();
  const weekStart = searchParams.week ?? getMondayOfWeek(today);
  const [dailySummary, allTasks, status, logs] = await Promise.all([
    taskPlatform.getDashboardDailySummary({ weekStart }),
    taskPlatform.listTasks(),
    taskPlatform.getSchedulerStatus(),
    taskPlatform.listSchedulerLogs({ limit: 20 }),
  ]);
  const schedulerLogs = logs as { runs: React.ComponentProps<typeof DashboardTabs>["initialRuns"] };

  const taskRecords = allTasks as Array<{ id: string; title: string; status?: string; updatedAt?: string }>;
  const tasks = showCompleted
    ? taskRecords
        .filter((task) => task.status === "done")
        .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))
        .map(({ id, title }) => ({ id, title }))
    : taskRecords
        .filter((task) => task.status !== "done" && task.status !== "archived")
        .map(({ id, title }) => ({ id, title }));
  const completedCount = taskRecords.filter((task) => task.status === "done").length;
  const selectedTaskId =
    (searchParams.taskId && tasks.some((task) => task.id === searchParams.taskId)
      ? searchParams.taskId
      : tasks[0]?.id) ?? null;

  const [selectedTask, selectedTaskDaily] = selectedTaskId
    ? await Promise.all([
        taskPlatform.getDashboardTaskTimeline(selectedTaskId),
        taskPlatform.getDashboardTaskDailySummary({ taskId: selectedTaskId, weekStart }),
      ])
    : [null, null];

  return (
    <Stack gap={{ base: "5", md: "7" }}>
      <Heading size="2xl" letterSpacing="-0.04em" color="#1e302e">振り返り</Heading>
      <DashboardTabs
        dailySummary={dailySummary as React.ComponentProps<typeof DashboardTabs>["dailySummary"]}
        tasks={tasks}
        selectedTask={selectedTask as React.ComponentProps<typeof DashboardTabs>["selectedTask"]}
        selectedTaskDaily={selectedTaskDaily as React.ComponentProps<typeof DashboardTabs>["selectedTaskDaily"]}
        initialWeekStart={weekStart}
        initialView={searchParams.view === "history" ? "history" : "progress"}
        showCompleted={showCompleted}
        completedCount={completedCount}
        status={status as React.ComponentProps<typeof DashboardTabs>["status"]}
        initialRuns={schedulerLogs.runs}
      />
    </Stack>
  );
}

export default DashboardPage;
