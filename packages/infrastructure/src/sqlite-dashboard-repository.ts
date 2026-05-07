import type {
  DashboardRepository,
  DashboardTaskBucket,
  DashboardTaskHeader,
  DashboardWeeklyBucket,
} from "@task-platform/application";
import type { SqliteDatabase } from "./db";

function startOfWeek(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildWeekStarts(endDate: string, weeks: number): string[] {
  const lastWeekStart = startOfWeek(endDate);
  return Array.from({ length: weeks }, (_, index) => addDays(lastWeekStart, (index - (weeks - 1)) * 7));
}

function sumByWeek<T extends { week_start: string; minutes: number }>(
  rows: T[],
  weekStarts: string[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const weekStart of weekStarts) {
    map.set(weekStart, 0);
  }

  for (const row of rows) {
    map.set(row.week_start, Number(row.minutes));
  }

  return map;
}

export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async getWeeklySummary(input: {
    endDate: string;
    weeks: number;
  }): Promise<DashboardWeeklyBucket[]> {
    const weekStarts = buildWeekStarts(input.endDate, input.weeks);
    const dateFrom = weekStarts[0];
    const dateTo = input.endDate;

    const plannedRows = this.db
      .prepare(
        `
          SELECT
            date(s.date, '-' || ((strftime('%w', s.date) + 6) % 7) || ' days') AS week_start,
            COALESCE(SUM(s.planned_minutes), 0) AS minutes
          FROM scheduled_task_slices s
          WHERE s.proposal_id = (
            SELECT active_proposal_id
            FROM schedule_snapshots
            ORDER BY updated_at DESC
            LIMIT 1
          )
            AND s.date >= ?
            AND s.date <= ?
          GROUP BY week_start
          ORDER BY week_start
        `,
      )
      .all(dateFrom, dateTo) as Array<{ week_start: string; minutes: number }>;

    const actualRows = this.db
      .prepare(
        `
          SELECT
            date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
            COALESCE(SUM(spent_minutes), 0) AS minutes
          FROM task_work_logs
          WHERE date >= ?
            AND date <= ?
          GROUP BY week_start
          ORDER BY week_start
        `,
      )
      .all(dateFrom, dateTo) as Array<{ week_start: string; minutes: number }>;

    const completedRows = this.db
      .prepare(
        `
          SELECT
            date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
            COUNT(DISTINCT task_id) AS completed_count
          FROM task_work_logs
          WHERE date >= ?
            AND date <= ?
            AND remaining_minutes_after = 0
          GROUP BY week_start
          ORDER BY week_start
        `,
      )
      .all(dateFrom, dateTo) as Array<{ week_start: string; completed_count: number }>;

    const plannedMap = sumByWeek(plannedRows, weekStarts);
    const actualMap = sumByWeek(actualRows, weekStarts);
    const completedMap = new Map<string, number>();

    for (const weekStart of weekStarts) {
      completedMap.set(weekStart, 0);
    }
    for (const row of completedRows) {
      completedMap.set(row.week_start, Number(row.completed_count));
    }

    return weekStarts.map((weekStart) => {
      const plannedMinutes = plannedMap.get(weekStart) ?? 0;
      const actualMinutes = actualMap.get(weekStart) ?? 0;
      return {
        weekStart,
        plannedMinutes,
        actualMinutes,
        completedTaskCount: completedMap.get(weekStart) ?? 0,
        completionRate: plannedMinutes === 0 ? 0 : actualMinutes / plannedMinutes,
      };
    });
  }

  async getTaskTimeline(input: {
    taskId: string;
    endDate: string;
    weeks: number;
  }): Promise<{
    header: DashboardTaskHeader;
    buckets: DashboardTaskBucket[];
  }> {
    const taskRow = this.db
      .prepare(
        `
          SELECT id, title, remaining_minutes, due_date
          FROM tasks
          WHERE id = ?
        `,
      )
      .get(input.taskId) as
      | {
          id: string;
          title: string;
          remaining_minutes: number;
          due_date: string | null;
        }
      | undefined;

    if (!taskRow) {
      throw new Error(`task not found: ${input.taskId}`);
    }

    const weekStarts = buildWeekStarts(input.endDate, input.weeks);
    const dateFrom = weekStarts[0];
    const dateTo = input.endDate;

    const plannedRows = this.db
      .prepare(
        `
          SELECT
            date(s.date, '-' || ((strftime('%w', s.date) + 6) % 7) || ' days') AS week_start,
            COALESCE(SUM(s.planned_minutes), 0) AS minutes
          FROM scheduled_task_slices s
          WHERE s.proposal_id = (
            SELECT active_proposal_id
            FROM schedule_snapshots
            ORDER BY updated_at DESC
            LIMIT 1
          )
            AND s.task_id = ?
            AND s.date >= ?
            AND s.date <= ?
          GROUP BY week_start
          ORDER BY week_start
        `,
      )
      .all(input.taskId, dateFrom, dateTo) as Array<{ week_start: string; minutes: number }>;

    const actualRows = this.db
      .prepare(
        `
          SELECT
            date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
            COALESCE(SUM(spent_minutes), 0) AS minutes
          FROM task_work_logs
          WHERE task_id = ?
            AND date >= ?
            AND date <= ?
          GROUP BY week_start
          ORDER BY week_start
        `,
      )
      .all(input.taskId, dateFrom, dateTo) as Array<{ week_start: string; minutes: number }>;

    const loggedRow = this.db
      .prepare(
        `
          SELECT COALESCE(SUM(spent_minutes), 0) AS logged_minutes
          FROM task_work_logs
          WHERE task_id = ?
        `,
      )
      .get(input.taskId) as { logged_minutes: number };

    const plannedMap = sumByWeek(plannedRows, weekStarts);
    const actualMap = sumByWeek(actualRows, weekStarts);
    const loggedMinutes = Number(loggedRow.logged_minutes);
    const remainingMinutes = Number(taskRow.remaining_minutes);
    const totalEstimatedMinutes = loggedMinutes + remainingMinutes;

    return {
      header: {
        taskId: taskRow.id,
        title: taskRow.title,
        totalEstimatedMinutes,
        remainingMinutes,
        loggedMinutes,
        progressRate: totalEstimatedMinutes === 0 ? 1 : loggedMinutes / totalEstimatedMinutes,
        dueDate: taskRow.due_date,
      },
      buckets: weekStarts.map((weekStart) => ({
        weekStart,
        plannedMinutes: plannedMap.get(weekStart) ?? 0,
        actualMinutes: actualMap.get(weekStart) ?? 0,
      })),
    };
  }
}
