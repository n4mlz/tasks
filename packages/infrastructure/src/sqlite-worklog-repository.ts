import type { SqliteDatabase } from "./db";

export class SqliteWorkLogRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async append(entry: {
    id: string;
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note: string;
  }): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO task_work_logs (
            id, task_id, date, spent_minutes, remaining_minutes_after, note
          ) VALUES (
            @id, @taskId, @date, @spentMinutes, @remainingMinutesAfter, @note
          )
        `,
      )
      .run(entry);
  }

  async listByTaskIds(taskIds: string[]): Promise<
    Array<{
      id: string;
      taskId: string;
      date: string;
      spentMinutes: number;
      remainingMinutesAfter: number;
      note: string;
    }>
  > {
    if (taskIds.length === 0) {
      return [];
    }

    const placeholders = taskIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `
          SELECT id, task_id, date, spent_minutes, remaining_minutes_after, note
          FROM task_work_logs
          WHERE task_id IN (${placeholders})
          ORDER BY date ASC, id ASC
        `,
      )
      .all(...taskIds) as Array<{
      id: string;
      task_id: string;
      date: string;
      spent_minutes: number;
      remaining_minutes_after: number;
      note: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      date: row.date,
      spentMinutes: Number(row.spent_minutes),
      remainingMinutesAfter: Number(row.remaining_minutes_after),
      note: row.note,
    }));
  }

  async list(input?: {
    taskIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<
    Array<{
      id: string;
      taskId: string;
      date: string;
      spentMinutes: number;
      remainingMinutesAfter: number;
      note: string;
    }>
  > {
    const conditions: string[] = [];
    const values: string[] = [];

    if (input?.taskIds?.length) {
      const placeholders = input.taskIds.map(() => "?").join(", ");
      conditions.push(`task_id IN (${placeholders})`);
      values.push(...input.taskIds);
    }
    if (input?.dateFrom) {
      conditions.push("date >= ?");
      values.push(input.dateFrom);
    }
    if (input?.dateTo) {
      conditions.push("date <= ?");
      values.push(input.dateTo);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db
      .prepare(
        `
          SELECT id, task_id, date, spent_minutes, remaining_minutes_after, note
          FROM task_work_logs
          ${whereClause}
          ORDER BY date ASC, id ASC
        `,
      )
      .all(...values) as Array<{
      id: string;
      task_id: string;
      date: string;
      spent_minutes: number;
      remaining_minutes_after: number;
      note: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      date: row.date,
      spentMinutes: Number(row.spent_minutes),
      remainingMinutesAfter: Number(row.remaining_minutes_after),
      note: row.note,
    }));
  }
}
