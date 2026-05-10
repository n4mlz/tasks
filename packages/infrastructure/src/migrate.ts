import fs from "node:fs";
import type { SqliteDatabase } from "./db";
import { resolveWorkspacePath } from "./workspace-path";

export function migrate(db: SqliteDatabase): void {
  const migrationPath = resolveWorkspacePath(
    "packages/infrastructure/migrations/001_initial.sql",
  );
  const migration = fs.readFileSync(migrationPath, "utf8");
  db.exec(migration);
}
