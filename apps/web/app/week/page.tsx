import React from "react";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function WeekPage(props: {
  searchParams?: Promise<{ referenceDate?: string }>;
} = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const searchParams = (await props.searchParams) ?? {};
  const referenceDate = searchParams.referenceDate || today;
  const weekEnd = addDays(referenceDate, 6);
  const capacities = (await taskPlatform.getCapacities(referenceDate, weekEnd)) as Array<{
    date: string;
    availableMinutes: number;
    bufferMinutes: number;
  }>;
  const metrics = (await taskPlatform.getMetrics(referenceDate, weekEnd)) as {
    plannedMinutes: number;
    actualMinutes: number;
    completedMinutes: number;
    atRiskTaskCount: number;
    pendingProposalCount: number;
  };
  const planningHealth = (await taskPlatform.getPlanningHealth()) as {
    missingCapacityDatesWithin7Days: string[];
    warningCount: number;
  };
  const capacityMap = new Map(capacities.map((capacity) => [capacity.date, capacity]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(referenceDate, index);
    return (
      capacityMap.get(date) ?? {
        date,
        availableMinutes: 0,
        bufferMinutes: 0,
      }
    );
  });

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: 20,
          borderRadius: 24,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(23, 32, 51, 0.08)",
        }}
      >
        <h2 style={{ margin: 0 }}>Week</h2>
        <p style={{ margin: 0, color: "#5a6475" }}>
          Shape your week first, then let the proposal layer decide what fits where.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <a href={`/week?referenceDate=${addDays(referenceDate, -7)}`}>Previous</a>
          <a href={`/week?referenceDate=${today}`}>Today</a>
          <a href={`/week?referenceDate=${addDays(referenceDate, 7)}`}>Next</a>
          <form action="/week" method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label
              style={{ display: "grid", gap: 4, minWidth: 180, color: "#5a6475", fontSize: 14 }}
            >
              <span>Reference date</span>
              <input defaultValue={referenceDate} name="referenceDate" type="date" />
            </label>
            <button type="submit">Jump</button>
          </form>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["Planned", metrics.plannedMinutes],
            ["Actual", metrics.actualMinutes],
            ["Completed", metrics.completedMinutes],
            ["At-risk tasks", metrics.atRiskTaskCount],
            ["Pending proposals", metrics.pendingProposalCount],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: 14,
                borderRadius: 18,
                background: "#f7f4ee",
              }}
            >
              <p style={{ margin: 0, color: "#7c5c2b", fontSize: 13 }}>{label}</p>
              <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {planningHealth.warningCount > 0 ? (
        <article
          style={{
            display: "grid",
            gap: 8,
            padding: 16,
            borderRadius: 18,
            background: "rgba(250, 236, 210, 0.95)",
            border: "1px solid rgba(213, 143, 54, 0.28)",
            color: "#5f4318",
          }}
        >
          <strong>Missing capacity</strong>
          <p style={{ margin: 0 }}>
            Planning confidence is lower because near-term capacity is missing for:{" "}
            {planningHealth.missingCapacityDatesWithin7Days.join(", ")}
          </p>
        </article>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        {days.map((capacity) => (
          <article
            key={capacity.date}
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(23, 32, 51, 0.08)",
            }}
          >
            <form action="/api/capacity" method="post" style={{ display: "grid", gap: 10 }}>
              <input name="date" type="hidden" value={capacity.date} />
              <h3 style={{ margin: 0 }}>{capacity.date}</h3>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Available minutes</span>
                <input
                  defaultValue={capacity.availableMinutes}
                  min="0"
                  name="availableMinutes"
                  type="number"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Buffer minutes</span>
                <input
                  defaultValue={capacity.bufferMinutes}
                  min="0"
                  name="bufferMinutes"
                  type="number"
                />
              </label>
              <button type="submit">Save capacity</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
