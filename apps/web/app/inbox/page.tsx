import React from "react";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    remainingMinutes: number;
    status: string;
    dueDate: string | null;
  }>;

  return (
    <section>
      <h1>Inbox</h1>
      <form action="/api/tasks" method="post">
        <label>
          Title
          <input name="title" />
        </label>
        <label>
          Remaining minutes
          <input min="1" name="remainingMinutes" type="number" />
        </label>
        <button type="submit">Add task</button>
      </form>
      <ul>
        {tasks.length === 0 ? (
          <li>No tasks yet.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.id}>
              {task.title} - {task.remainingMinutes} min - {task.status}
              {task.dueDate ? ` - due ${task.dueDate}` : ""}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
