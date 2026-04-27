import React from "react";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = (await taskPlatform.listProposals("pending")) as Array<{
    id: string;
    reason: string;
    summary?: { riskFlags?: string[] };
  }>;

  return (
    <section>
      <h1>Proposals</h1>
      <p>Review pending schedule changes before approval.</p>
      <ul>
        {proposals.length === 0 ? (
          <li>No pending proposals.</li>
        ) : (
          proposals.map((proposal) => (
            <li key={proposal.id}>
              <p>
                {proposal.id} - {proposal.reason}
              </p>
              <p>
                Risk flags: {(proposal.summary?.riskFlags ?? []).join(", ") || "none"}
              </p>
              <form
                action={`/api/schedules/proposals/${proposal.id}/approve`}
                method="post"
              >
                <button type="submit">Approve</button>
              </form>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
