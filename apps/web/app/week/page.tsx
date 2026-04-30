import React from "react";
import { PlanningCalendar } from "../../components/planning-calendar";
import { PlanningAlert } from "../../components/planning-alert";
import { StatusBadge } from "../../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { taskPlatform } from "../../lib/task-platform";
import {
  energyLabels,
  formatCompletionRate,
  formatHoursFromMinutes,
  taskTypeLabels,
} from "../../lib/presentation";

export const dynamic = "force-dynamic";

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

export default async function WeekPage(props: {
  searchParams?: Promise<{ referenceDate?: string }>;
} = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const searchParams = (await props.searchParams) ?? {};
  const referenceDate = searchParams.referenceDate || today;
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const calendarDays = buildCalendarDays(referenceDate);
  const calendarStart = calendarDays[0] ?? monthStart;
  const calendarEnd = calendarDays.at(-1) ?? monthEnd;

  const capacities = (await taskPlatform.getCapacities(calendarStart, calendarEnd)) as Array<{
    date: string;
    availableMinutes: number;
  }>;
  const metrics = (await taskPlatform.getMetrics(monthStart, monthEnd)) as {
    plannedMinutes: number;
    actualMinutes: number;
    pendingProposalCount: number;
  };
  const planningHealth = (await taskPlatform.getPlanningHealth()) as {
    missingCapacityDatesWithin7Days: string[];
    warningCount: number;
  };
  const schedule = (await taskPlatform.getCurrentSchedule()) as {
    activeProposalId: string | null;
    slices: Array<{
      task_id?: string;
      date?: string;
      planned_minutes?: number;
    }>;
  };
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    remainingMinutes: number;
    dueDate: string | null;
    status: string;
    taskType?: string;
    energy?: string;
  }>;
  const workLogs = (await taskPlatform.getWorkLogs(tasks.map((task) => task.id))) as Array<{
    taskId: string;
    spentMinutes: number;
  }>;

  const slicesByDate = new Map<string, Array<{ taskId: string; plannedMinutes: number }>>();
  for (const slice of schedule.slices) {
    if (!slice.date || !slice.task_id) continue;
    const current = slicesByDate.get(slice.date) ?? [];
    current.push({
      taskId: slice.task_id,
      plannedMinutes: slice.planned_minutes ?? 0,
    });
    slicesByDate.set(slice.date, current);
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const spentMinutesByTask = new Map<string, number>();
  for (const workLog of workLogs) {
    spentMinutesByTask.set(
      workLog.taskId,
      (spentMinutesByTask.get(workLog.taskId) ?? 0) + workLog.spentMinutes,
    );
  }

  const taskOverview = tasks
    .filter((task) => task.status !== "archived")
    .map((task) => {
      const slices = schedule.slices
        .filter((slice) => slice.task_id === task.id)
        .sort((left, right) => String(left.date).localeCompare(String(right.date)));
      const spentMinutes = spentMinutesByTask.get(task.id) ?? 0;
      const totalMinutes = spentMinutes + task.remainingMinutes;
      const endDate = slices.at(-1)?.date ?? null;
      const upcomingSchedule = slices
        .slice(0, 3)
        .map((slice) => `${slice.date} ${formatHoursFromMinutes(slice.planned_minutes ?? 0)}`);

      return {
        ...task,
        spentMinutes,
        totalMinutes,
        endDate,
        upcomingSchedule,
      };
    })
    .sort((left, right) => {
      if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
      if (left.dueDate) return -1;
      if (right.dueDate) return 1;
      return left.title.localeCompare(right.title);
    });

  const calendarPayload = {
    referenceDate,
    monthLabel: formatMonthHeading(referenceDate),
    calendarDays,
    monthStart,
    monthEnd,
    capacities,
    slicesByDate: Object.fromEntries(
      calendarDays.map((date) => [
        date,
        (slicesByDate.get(date) ?? []).map((slice) => ({
          taskTitle: taskMap.get(slice.taskId)?.title ?? slice.taskId,
          plannedMinutes: slice.plannedMinutes,
        })),
      ]),
    ),
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">計画</h1>
        <div className="flex flex-wrap gap-2">
          <StatusBadge>{referenceDate.slice(0, 7)}</StatusBadge>
          <StatusBadge tone="secondary">
            {`予定 ${formatHoursFromMinutes(metrics.plannedMinutes)}`}
          </StatusBadge>
          <StatusBadge tone="secondary">
            {`実績 ${formatHoursFromMinutes(metrics.actualMinutes)}`}
          </StatusBadge>
          <StatusBadge tone={metrics.pendingProposalCount > 0 ? "warning" : "outline"}>
            {`提案 ${metrics.pendingProposalCount}`}
          </StatusBadge>
        </div>
      </div>

      <PlanningAlert dates={planningHealth.missingCapacityDatesWithin7Days} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/80 bg-white/94">
          <CardContent className="p-4">
            <PlanningCalendar initialPayload={calendarPayload} today={today} />
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/94">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.03em]">task 一覧</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>task</TableHead>
                    <TableHead>全体</TableHead>
                    <TableHead>残り</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>期限</TableHead>
                    <TableHead>見込み</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskOverview.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium text-slate-900">{task.title}</span>
                          <div className="flex flex-wrap gap-1">
                            {task.taskType && task.taskType !== "unknown" ? (
                              <StatusBadge tone="outline">
                                {taskTypeLabels[task.taskType] ?? task.taskType}
                              </StatusBadge>
                            ) : null}
                            {task.energy && task.energy !== "unknown" ? (
                              <StatusBadge tone="outline">
                                {energyLabels[task.energy] ?? task.energy}
                              </StatusBadge>
                            ) : null}
                          </div>
                          {task.upcomingSchedule.length > 0 ? (
                            <div className="text-xs text-slate-500">
                              {task.upcomingSchedule.join(" / ")}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatHoursFromMinutes(task.totalMinutes)}</TableCell>
                      <TableCell>{formatHoursFromMinutes(task.remainingMinutes)}</TableCell>
                      <TableCell>{formatCompletionRate(task.spentMinutes, task.totalMinutes)}</TableCell>
                      <TableCell>{task.dueDate ?? "-"}</TableCell>
                      <TableCell>{task.endDate ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
