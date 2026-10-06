import React from "react";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { PlanningAlert } from "../../components/planning-alert";
import { PlanningCalendar } from "../../components/planning-calendar";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function monthEnd(date: string): string {
  const value = new Date(`${monthStart(date)}T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

function calendarStart(date: string): string {
  const value = new Date(`${monthStart(date)}T00:00:00.000Z`);
  const offset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

function calendarEnd(date: string): string {
  const end = new Date(`${monthEnd(date)}T00:00:00.000Z`);
  const offset = (7 - ((end.getUTCDay() + 6) % 7) - 1) % 7;
  end.setUTCDate(end.getUTCDate() + offset);
  return end.toISOString().slice(0, 10);
}

function listCalendarDays(referenceDate: string): string[] {
  const first = calendarStart(referenceDate);
  const last = calendarEnd(referenceDate);
  const result: string[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) result.push(date);
  return result;
}

function formatMonth(date: string): string {
  const [year, month] = date.split("-");
  return `${year}年${Number(month)}月`;
}

type WeekPageProps = {
  searchParams?: Promise<{ referenceDate?: string }>;
};

async function WeekPage(): Promise<React.ReactElement>;
async function WeekPage(props: WeekPageProps): Promise<React.ReactElement>;
async function WeekPage(props: WeekPageProps = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const searchParams = (await props.searchParams) ?? {};
  const referenceDate = searchParams.referenceDate || today;
  const days = listCalendarDays(referenceDate);
  const first = days[0] ?? monthStart(referenceDate);
  const last = days.at(-1) ?? monthEnd(referenceDate);

  const [capacities, schedule, tasks, planningHealth] = await Promise.all([
    taskPlatform.getCapacities(first, last),
    taskPlatform.getCurrentSchedule(),
    taskPlatform.listTasks(),
    taskPlatform.getPlanningHealth(),
  ]);

  const taskById = new Map((tasks as Array<{ id: string; title: string }>).map((task) => [task.id, task.title]));
  const scheduleSlices = (schedule as {
    slices: Array<{ task_id?: string; date?: string; planned_minutes?: number }>;
  }).slices;
  const slicesByDate = Object.fromEntries(
    days.map((date) => [
      date,
      scheduleSlices
        .filter((slice) => slice.date === date && slice.task_id)
        .map((slice) => ({
          taskTitle: taskById.get(slice.task_id!) ?? slice.task_id!,
          plannedMinutes: slice.planned_minutes ?? 0,
        })),
    ]),
  );

  const calendarPayload = {
    referenceDate,
    monthLabel: formatMonth(referenceDate),
    calendarDays: days,
    monthStart: monthStart(referenceDate),
    monthEnd: monthEnd(referenceDate),
    capacities: capacities as Array<{ date: string; availableMinutes: number }>,
    slicesByDate,
  };

  return (
    <Stack gap={{ base: "5", md: "7" }}>
      <Box>
        <Heading size="2xl" letterSpacing="-0.04em" color="#1e302e">計画</Heading>
        <Text mt="1.5" color="#71807e" fontSize="sm">日ごとの余力時間と、タスクの配分を確認します。</Text>
      </Box>
      <Box borderWidth="1px" borderColor="#e2e9e6" borderRadius="2xl" bg="white" p={{ base: "3", sm: "5", lg: "6" }}>
        <PlanningCalendar initialPayload={calendarPayload} today={today} />
      </Box>
      <PlanningAlert initialHealth={planningHealth as {
        missingCapacityDatesWithin7Days: string[];
        hasInsufficientCapacity?: boolean;
        shortfallMinutes?: number;
        horizonEnd?: string;
      }} />
    </Stack>
  );
}

export default WeekPage;
