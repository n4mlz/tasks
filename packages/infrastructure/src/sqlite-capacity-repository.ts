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
}
