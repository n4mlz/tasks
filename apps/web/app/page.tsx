import React from "react";
import { Box, Button, Flex, Heading, HStack, Link as ChakraLink, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { DateNavigation } from "../components/date-navigation";
import { PlanningAlert } from "../components/planning-alert";
import { QuickWorkLog } from "../components/quick-work-log";
import { WorkLogDialog } from "../components/work-log-dialog";
import { taskPlatform } from "../lib/task-platform";
import { formatHoursFromMinutes, formatJapaneseDate } from "../lib/presentation";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{ date?: string }>;
};

async function HomePage(): Promise<React.ReactElement>;
async function HomePage(props: HomePageProps): Promise<React.ReactElement>;
async function HomePage(props: HomePageProps = {}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const today = searchParams.date ?? new Date().toISOString().slice(0, 10);
  const realToday = new Date().toISOString().slice(0, 10);
  const schedule = (await taskPlatform.getCurrentSchedule()) as {
    activeScheduleId: string | null;
    slices: Array<{ task_id?: string; date?: string; planned_minutes?: number }>;
  };
  const planningHealth = (await taskPlatform.getPlanningHealth()) as {
    missingCapacityDatesWithin7Days: string[];
    hasInsufficientCapacity?: boolean;
    shortfallMinutes?: number;
    horizonEnd?: string;
  };
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    remainingMinutes?: number;
    status?: string;
  }>;
  const activeTasks = tasks.filter((task) => task.status === "active");
  const metrics = (await taskPlatform.getMetrics(today, today)) as {
    plannedMinutes: number;
    actualMinutes: number;
  };

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const slices = schedule.slices.filter((slice) => {
    if (slice.date !== today) return false;
    const task = taskById.get(slice.task_id ?? "");
    return !task || task.status !== "done";
  });
  const assignedIds = new Set(slices.map((slice) => slice.task_id).filter(Boolean));
  const unassignedTasks = activeTasks.filter((task) => task.id && !assignedIds.has(task.id));

  return (
    <Stack gap={{ base: "5", md: "7" }}>
      <Flex align={{ base: "flex-start", sm: "center" }} justify="space-between" gap="4" wrap="wrap">
        <Stack gap="1">
          <Heading size="2xl" letterSpacing="-0.04em" color="#1e302e">
            {today === realToday ? "今日" : "予定"}
          </Heading>
          {today !== realToday ? <Text color="#71807e">{formatJapaneseDate(today)}</Text> : null}
        </Stack>
        <DateNavigation date={today} />
      </Flex>

      <HStack gap={{ base: "5", sm: "8" }} flexWrap="wrap" color="#526360">
        <HStack gap="2">
          <Text fontSize="sm" color="#778582">予定</Text>
          <Text fontSize="lg" fontWeight="650" color="#263a37">{formatHoursFromMinutes(metrics.plannedMinutes)}</Text>
        </HStack>
        <HStack gap="2">
          <Text fontSize="sm" color="#778582">実績</Text>
          <Text fontSize="lg" fontWeight="650" color="#263a37">{formatHoursFromMinutes(metrics.actualMinutes)}</Text>
        </HStack>
      </HStack>

      <Stack gap="3">
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Heading size="md" color="#263a37">今日のタスク</Heading>
          {unassignedTasks.length > 0 ? (
            <QuickWorkLog
              date={today}
              tasks={unassignedTasks.map((task) => ({
                id: task.id,
                title: task.title,
                remainingMinutes: task.remainingMinutes ?? 0,
              }))}
            />
          ) : null}
        </Flex>

        {slices.length === 0 ? (
          <Box borderWidth="1px" borderStyle="dashed" borderColor="#d5dfdc" borderRadius="xl" bg="white" p={{ base: "5", md: "7" }}>
            <Stack gap="2" align="flex-start">
              <Text fontWeight="600" color="#3c504d">今日の予定はありません</Text>
              <Text fontSize="sm" color="#71807e">タスクを追加するか、計画で今日の余力時間を確認できます。</Text>
              <HStack gap="4" mt="1">
                <ChakraLink asChild color="#27645d" fontWeight="600" textDecoration="underline">
                  <NextLink href="/inbox">タスクを追加</NextLink>
                </ChakraLink>
                <ChakraLink asChild color="#27645d" fontWeight="600" textDecoration="underline">
                  <NextLink href="/week">計画を確認</NextLink>
                </ChakraLink>
              </HStack>
            </Stack>
          </Box>
        ) : (
          <Stack gap="2.5">
            {slices.map((slice, index) => {
              const task = taskById.get(slice.task_id ?? "");
              const title = task?.title ?? slice.task_id ?? "不明なタスク";
              const dueSoon = task?.dueDate && task.dueDate <= today ? task.dueDate : null;
              return (
                <Flex
                  as="article"
                  key={`${slice.task_id ?? "task"}-${index}`}
                  align={{ base: "flex-start", sm: "center" }}
                  justify="space-between"
                  gap="4"
                  borderWidth="1px"
                  borderColor="#e3e9e7"
                  borderRadius="xl"
                  bg="white"
                  px={{ base: "4", sm: "5" }}
                  py="4"
                  direction={{ base: "column", sm: "row" }}
                >
                  <Stack minW="0" gap="1">
                    <Text fontWeight="600" color="#243633" overflowWrap="anywhere">{title}</Text>
                    <HStack gap="3" flexWrap="wrap">
                      <Text fontSize="sm" color="#667673">
                        予定 {formatHoursFromMinutes(slice.planned_minutes ?? 0)}
                      </Text>
                      {dueSoon ? <Text fontSize="sm" color="#a35436">期限 {formatJapaneseDate(dueSoon)}</Text> : null}
                    </HStack>
                  </Stack>
                  <WorkLogDialog
                    date={slice.date ?? today}
                    defaultRemainingHours={(task?.remainingMinutes ?? 0) / 60}
                    taskId={slice.task_id ?? ""}
                    title={title}
                  />
                </Flex>
              );
            })}
          </Stack>
        )}
      </Stack>

      <PlanningAlert initialHealth={planningHealth} />
    </Stack>
  );
}

export default HomePage;
