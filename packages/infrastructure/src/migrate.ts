import fs from "node:fs";
import type { SqliteDatabase } from "./db";
import { resolveWorkspacePath } from "./workspace-path";

export function migrate(db: SqliteDatabase): void {
  const migrationPath = resolveWorkspacePath(
    "packages/infrastructure/migrations/001_initial.sql",
  );
  const migration = fs.readFileSync(migrationPath, "utf8");
  db.exec(migration);

  const taskColumns = db
    .prepare(`PRAGMA table_info(tasks)`)
    .all() as Array<{ name: string }>;
  const columnNames = new Set(taskColumns.map((column) => column.name));

  if (!columnNames.has("task_type")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'unknown'`);
  }

  if (!columnNames.has("cognitive_load")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN cognitive_load TEXT NOT NULL DEFAULT 'unknown'`);
  }

  if (!columnNames.has("energy")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN energy TEXT NOT NULL DEFAULT 'unknown'`);
  }

  if (!columnNames.has("tags_json")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'`);
  }
}
