import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function createDatabase(filename: string): SqliteDatabase {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  return db;
}
