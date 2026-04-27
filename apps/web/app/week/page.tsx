import React from "react";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const today = new Date().toISOString().slice(0, 10);
  const capacities = (await taskPlatform.getCapacities(today, today)) as Array<{
    date: string;
    availableMinutes: number;
    bufferMinutes: number;
  }>;
  const metrics = (await taskPlatform.getMetrics(today, today)) as {
    plannedMinutes: number;
    actualMinutes: number;
    completedMinutes: number;
    atRiskTaskCount: number;
    pendingProposalCount: number;
  };

  return (
    <section>
      <h1>Week</h1>
      <p>Adjust daily capacity and inspect near-term load.</p>
      <p>
        Planned: {metrics.plannedMinutes} / Actual: {metrics.actualMinutes} / Completed:{" "}
        {metrics.completedMinutes}
      </p>
      <p>
        At-risk tasks: {metrics.atRiskTaskCount} / Pending proposals:{" "}
        {metrics.pendingProposalCount}
      </p>
      <ul>
        {capacities.length === 0 ? (
          <li>No capacity entries yet.</li>
        ) : (
          capacities.map((capacity) => (
            <li key={capacity.date}>
              {capacity.date}: {capacity.availableMinutes} available / {capacity.bufferMinutes}{" "}
              buffer
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
