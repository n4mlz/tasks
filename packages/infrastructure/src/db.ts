import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function createDatabase(filename: string): SqliteDatabase {
  return new Database(filename);
}
