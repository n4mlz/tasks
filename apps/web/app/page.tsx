import React from "react";
import { taskPlatform } from "../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const schedule = (await taskPlatform.getCurrentSchedule()) as {
    activeProposalId: string | null;
    slices: Array<{
      task_id?: string;
      date?: string;
      planned_minutes?: number;
      kind?: string;
    }>;
  };
  const tasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    taskType?: string;
    energy?: string;
  }>;
  const taskTitles = new Map(tasks.map((task) => [task.id, task]));

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gap: 8,
          padding: 20,
          borderRadius: 24,
          background: "#172033",
          color: "#f8fafc",
          boxShadow: "0 20px 48px rgba(23, 32, 51, 0.18)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28 }}>Today</h2>
        <p style={{ margin: 0, color: "#d7deea" }}>
          Focus on approved slices and return only the effort you actually spent.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#f5c98d" }}>
          Active proposal: {schedule.activeProposalId ?? "none"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        {schedule.slices.length === 0 ? (
          <article
            style={{
              padding: 20,
              borderRadius: 20,
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(23, 32, 51, 0.08)",
            }}
          >
            <p style={{ margin: 0 }}>No approved slices yet.</p>
          </article>
        ) : (
          schedule.slices.map((slice, index) => {
            const task = taskTitles.get(slice.task_id ?? "");
            return (
              <article
                key={`${slice.task_id ?? "task"}-${index}`}
                style={{
                  padding: 20,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(23, 32, 51, 0.08)",
                  boxShadow: "0 12px 28px rgba(23, 32, 51, 0.06)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 20 }}>
                    {task?.title ?? slice.task_id ?? "Unknown task"}
                  </h3>
                  <p style={{ margin: "6px 0 0", color: "#5a6475" }}>
                    {slice.date ?? "unknown date"} · {slice.planned_minutes ?? 0} min ·{" "}
                    {task?.taskType ?? "unknown"} / {task?.energy ?? "unknown"}
                  </p>
                </div>
                <form
                  action={`/api/tasks/${slice.task_id}/log-work`}
                  method="post"
                  style={{ display: "grid", gap: 10 }}
                >
                  <input name="date" type="hidden" value={slice.date ?? ""} />
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Spent minutes</span>
                    <input min="1" name="spentMinutes" type="number" />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Remaining after</span>
                    <input min="0" name="remainingMinutesAfter" type="number" />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Note</span>
                    <input name="note" />
                  </label>
                  <button
                    style={{
                      justifySelf: "start",
                      border: 0,
                      borderRadius: 999,
                      padding: "10px 16px",
                      background: "#d58f36",
                      color: "#172033",
                      fontWeight: 700,
                    }}
                    type="submit"
                  >
                    Log work
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>

      <aside
        style={{
          padding: 20,
          borderRadius: 20,
          background: "rgba(255,255,255,0.84)",
          border: "1px solid rgba(23, 32, 51, 0.08)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Quick log</h3>
        <p style={{ marginBottom: 12, color: "#5a6475" }}>
          If there are no approved slices yet, you can still use the page as the place where
          work logging belongs.
        </p>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Spent minutes</span>
          <input min="1" name="spentMinutes" type="number" />
        </label>
        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
          <span>Remaining after</span>
          <input min="0" name="remainingMinutesAfter" type="number" />
        </label>
      </aside>
    </section>
  );
}
