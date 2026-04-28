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
    urgency?: string;
    taskType?: string;
    energy?: string;
    notes?: string;
  }>;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 24,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(23, 32, 51, 0.08)",
          boxShadow: "0 16px 30px rgba(23, 32, 51, 0.06)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Inbox</h2>
        <p style={{ color: "#5a6475" }}>
          Capture tasks quickly, but keep enough shape for the scheduler to place them well.
        </p>
        <form action="/api/tasks" method="post" style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Title</span>
            <input name="title" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Remaining minutes</span>
            <input min="1" name="remainingMinutes" type="number" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Due date</span>
            <input name="dueDate" type="date" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Urgency</span>
            <select defaultValue="normal" name="urgency">
              <option value="today">today</option>
              <option value="soon">soon</option>
              <option value="normal">normal</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Task type</span>
            <select defaultValue="unknown" name="taskType">
              <option value="unknown">unknown</option>
              <option value="deep">deep</option>
              <option value="shallow">shallow</option>
              <option value="admin">admin</option>
              <option value="research">research</option>
              <option value="writing">writing</option>
              <option value="implementation">implementation</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Energy</span>
            <select defaultValue="unknown" name="energy">
              <option value="unknown">unknown</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Notes</span>
            <textarea name="notes" rows={3} />
          </label>
          <button
            style={{
              justifySelf: "start",
              border: 0,
              borderRadius: 999,
              padding: "10px 16px",
              background: "#172033",
              color: "#f8fafc",
              fontWeight: 700,
            }}
            type="submit"
          >
            Add task
          </button>
        </form>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {tasks.length === 0 ? (
          <article
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255,255,255,0.85)",
            }}
          >
            No tasks yet.
          </article>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(23, 32, 51, 0.08)",
                display: "grid",
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{task.title}</h3>
                <p style={{ margin: "6px 0 0", color: "#5a6475" }}>
                  {task.remainingMinutes} min · {task.status}
                  {task.dueDate ? ` · due ${task.dueDate}` : ""}
                </p>
              </div>
              <form
                action={`/api/tasks/${task.id}`}
                method="post"
                style={{ display: "grid", gap: 10 }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Title</span>
                  <input defaultValue={task.title} name="title" />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Remaining minutes</span>
                  <input
                    defaultValue={task.remainingMinutes}
                    min="0"
                    name="remainingMinutes"
                    type="number"
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Due date</span>
                  <input defaultValue={task.dueDate ?? ""} name="dueDate" type="date" />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Urgency</span>
                  <select defaultValue={task.urgency ?? "normal"} name="urgency">
                    <option value="today">today</option>
                    <option value="soon">soon</option>
                    <option value="normal">normal</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Task type</span>
                  <select defaultValue={task.taskType ?? "unknown"} name="taskType">
                    <option value="unknown">unknown</option>
                    <option value="deep">deep</option>
                    <option value="shallow">shallow</option>
                    <option value="admin">admin</option>
                    <option value="research">research</option>
                    <option value="writing">writing</option>
                    <option value="implementation">implementation</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Energy</span>
                  <select defaultValue={task.energy ?? "unknown"} name="energy">
                    <option value="unknown">unknown</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Status</span>
                  <select defaultValue={task.status} name="status">
                    <option value="inbox">inbox</option>
                    <option value="active">active</option>
                    <option value="done">done</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <button type="submit">Save task</button>
              </form>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
