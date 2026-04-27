import type { DayCapacity } from "@task-platform/domain";
import type { SqliteDatabase } from "./db";

export class SqliteCapacityRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async upsert(capacity: DayCapacity): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO day_capacities (date, available_minutes, buffer_minutes)
          VALUES (@date, @availableMinutes, @bufferMinutes)
          ON CONFLICT(date) DO UPDATE SET
            available_minutes = excluded.available_minutes,
            buffer_minutes = excluded.buffer_minutes
        `,
      )
      .run(capacity);
  }

  async listBetween(dateFrom: string, dateTo: string): Promise<DayCapacity[]> {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM day_capacities
          WHERE date >= ? AND date <= ?
          ORDER BY date ASC
        `,
      )
      .all(dateFrom, dateTo) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      date: String(row.date),
      availableMinutes: Number(row.available_minutes),
      bufferMinutes: Number(row.buffer_minutes),
    }));
  }
}
