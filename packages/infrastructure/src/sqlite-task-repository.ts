import type { Task } from "@task-platform/domain";
import type { SqliteDatabase } from "./db";

export class SqliteTaskRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(task: Task): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO tasks (
            id, title, notes, status, remaining_minutes, due_date, urgency, created_at, updated_at
          ) VALUES (
            @id, @title, @notes, @status, @remainingMinutes, @dueDate, @urgency, @createdAt, @updatedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            notes = excluded.notes,
            status = excluded.status,
            remaining_minutes = excluded.remaining_minutes,
            due_date = excluded.due_date,
            urgency = excluded.urgency,
            updated_at = excluded.updated_at
        `,
      )
      .run(task);
  }

  async findById(taskId: string): Promise<Task | null> {
    const row = this.db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(taskId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      title: String(row.title),
      notes: String(row.notes),
      status: row.status as Task["status"],
      remainingMinutes: Number(row.remaining_minutes),
      dueDate: row.due_date ? String(row.due_date) : null,
      urgency: row.urgency as Task["urgency"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  async listSchedulable(): Promise<Task[]> {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM tasks
          WHERE status IN ('inbox', 'active') AND remaining_minutes > 0
          ORDER BY created_at ASC
        `,
      )
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      notes: String(row.notes),
      status: row.status as Task["status"],
      remainingMinutes: Number(row.remaining_minutes),
      dueDate: row.due_date ? String(row.due_date) : null,
      urgency: row.urgency as Task["urgency"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  async listAll(): Promise<Task[]> {
    const rows = this.db
      .prepare(`SELECT * FROM tasks ORDER BY created_at DESC`)
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      notes: String(row.notes),
      status: row.status as Task["status"],
      remainingMinutes: Number(row.remaining_minutes),
      dueDate: row.due_date ? String(row.due_date) : null,
      urgency: row.urgency as Task["urgency"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}
