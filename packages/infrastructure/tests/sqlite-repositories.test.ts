import { describe, expect, it } from "vitest";
import {
  createDatabase,
  migrate,
  SqliteTaskRepository,
} from "../src/index";
import { createTask } from "@task-platform/domain";

describe("SQLite task repository", () => {
  it("persists and reloads a task", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const repository = new SqliteTaskRepository(db);
    const task = createTask({
      id: "task_repo",
      title: "Book train ticket",
      remainingMinutes: 15,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    await repository.save(task);
    const loaded = await repository.findById("task_repo");

    expect(loaded?.title).toBe("Book train ticket");
  });
});
