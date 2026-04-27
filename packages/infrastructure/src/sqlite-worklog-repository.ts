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
}
