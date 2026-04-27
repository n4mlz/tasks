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

  return (
    <section>
      <h1>Today</h1>
      <p>Execute the current approved slices here.</p>
      <p>Active proposal: {schedule.activeProposalId ?? "none"}</p>
      <ul>
        {schedule.slices.length === 0 ? (
          <li>No approved slices yet.</li>
        ) : (
          schedule.slices.map((slice, index) => (
            <li key={`${slice.task_id ?? "task"}-${index}`}>
              {slice.date ?? "unknown date"} - {slice.task_id ?? "unknown task"} -{" "}
              {slice.planned_minutes ?? 0} min
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
