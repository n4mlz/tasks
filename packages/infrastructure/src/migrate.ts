import fs from "node:fs";
import path from "node:path";
import type { SqliteDatabase } from "./db";

export function migrate(db: SqliteDatabase): void {
  const migration = fs.readFileSync(
    path.resolve("packages/infrastructure/migrations/001_initial.sql"),
    "utf8",
  );
  db.exec(migration);
}
