import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function endOfMonth(date: string): string {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

function startOfCalendar(date: string): string {
  const value = new Date(`${startOfMonth(date)}T00:00:00.000Z`);
  const day = value.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

function endOfCalendar(date: string): string {
  const value = new Date(`${endOfMonth(date)}T00:00:00.000Z`);
  const day = value.getUTCDay();
  const offset = day === 0 ? 0 : 7 - day;
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function buildCalendarDays(referenceDate: string): string[] {
  const days: string[] = [];
  for (
    let current = startOfCalendar(referenceDate);
    current <= endOfCalendar(referenceDate);
    current = addDays(current, 1)
  ) {
    days.push(current);
  }
  return days;
}

function formatMonthHeading(date: string): string {
  const [year, month] = date.split("-");
  return `${year}年${Number(month)}月`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const referenceDate =
    url.searchParams.get("referenceDate") ?? new Date().toISOString().slice(0, 10);
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const calendarDays = buildCalendarDays(referenceDate);
  const calendarStart = calendarDays[0] ?? monthStart;
  const calendarEnd = calendarDays.at(-1) ?? monthEnd;

  const [capacities, schedule, tasks] = await Promise.all([
    taskPlatform.getCapacities(calendarStart, calendarEnd) as Promise<
      Array<{ date: string; availableMinutes: number }>
    >,
    taskPlatform.getCurrentSchedule() as Promise<{
      slices: Array<{ task_id?: string; date?: string; planned_minutes?: number }>;
    }>,
    taskPlatform.listTasks() as Promise<Array<{ id: string; title: string }>>,
  ]);

  const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));
  const slicesByDate = new Map<string, Array<{ taskTitle: string; plannedMinutes: number }>>();
  for (const slice of schedule.slices) {
    if (!slice.date || !slice.task_id) continue;
    const current = slicesByDate.get(slice.date) ?? [];
    current.push({
      taskTitle: taskTitleById.get(slice.task_id) ?? slice.task_id,
      plannedMinutes: slice.planned_minutes ?? 0,
    });
    slicesByDate.set(slice.date, current);
  }

  return NextResponse.json({
    referenceDate,
    monthLabel: formatMonthHeading(referenceDate),
    calendarDays,
    monthStart,
    monthEnd,
    capacities,
    slicesByDate: Object.fromEntries(
      calendarDays.map((date) => [date, slicesByDate.get(date) ?? []]),
    ),
  });
}
