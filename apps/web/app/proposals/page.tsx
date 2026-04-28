import React from "react";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = (await taskPlatform.listProposals("pending")) as Array<{
    id: string;
    reason: string;
    summary?: {
      riskFlags?: string[];
      unscheduledTaskIds?: string[];
      capacityPressureByDate?: Record<string, number>;
    };
  }>;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 24,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(23, 32, 51, 0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Proposals</h2>
        <p style={{ color: "#5a6475", marginBottom: 0 }}>
          Review schedule changes before they become the active plan.
        </p>
      </div>
      <h3 style={{ margin: 0 }}>Unscheduled tasks</h3>
      <h3 style={{ margin: 0 }}>Capacity pressure</h3>
      <div style={{ display: "grid", gap: 16 }}>
        {proposals.length === 0 ? (
          <article
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255,255,255,0.88)",
            }}
          >
            No pending proposals.
          </article>
        ) : (
          proposals.map((proposal) => (
            <article
              key={proposal.id}
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(23, 32, 51, 0.08)",
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{proposal.id}</h3>
                <p style={{ margin: "4px 0 0", color: "#5a6475" }}>{proposal.reason}</p>
              </div>
              <div>
                <strong>Risk flags</strong>
                <p style={{ margin: "6px 0 0" }}>
                  {(proposal.summary?.riskFlags ?? []).join(", ") || "none"}
                </p>
              </div>
              <div>
                <strong>Unscheduled tasks</strong>
                <p style={{ margin: "6px 0 0" }}>
                  {(proposal.summary?.unscheduledTaskIds ?? []).join(", ") || "none"}
                </p>
              </div>
              <div>
                <strong>Capacity pressure</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                  {Object.entries(proposal.summary?.capacityPressureByDate ?? {}).length === 0 ? (
                    <li>none</li>
                  ) : (
                    Object.entries(proposal.summary?.capacityPressureByDate ?? {}).map(
                      ([date, pressure]) => <li key={date}>{date}: {pressure}</li>,
                    )
                  )}
                </ul>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <form action={`/api/schedules/proposals/${proposal.id}/approve`} method="post">
                  <button type="submit">Approve</button>
                </form>
                <form action={`/api/schedules/proposals/${proposal.id}/reject`} method="post">
                  <button type="submit">Reject</button>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
