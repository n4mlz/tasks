import type { SqliteDatabase } from "./db";

export class SqliteScheduleRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async savePendingProposal(proposal: {
    id: string;
    reason: string;
    generatedAt: string;
    horizonStart: string;
    horizonEnd: string;
    slices: Array<{ taskId: string; date: string; plannedMinutes: number; kind: string }>;
    riskFlags: string[];
  }): Promise<void> {
    const summaryJson = JSON.stringify({ riskFlags: proposal.riskFlags });
    this.db
      .prepare(
        `
          INSERT INTO schedule_proposals (
            id, status, reason, generated_at, horizon_start, horizon_end, summary_json
          ) VALUES (?, 'pending', ?, ?, ?, ?, ?)
        `,
      )
      .run(
        proposal.id,
        proposal.reason,
        proposal.generatedAt,
        proposal.horizonStart,
        proposal.horizonEnd,
        summaryJson,
      );
  }

  async findById(proposalId: string): Promise<Record<string, unknown> | null> {
    const row = this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE id = ?`)
      .get(proposalId) as Record<string, unknown> | undefined;

    return row ?? null;
  }

  async listByStatus(status = "pending"): Promise<Record<string, unknown>[]> {
    return this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE status = ? ORDER BY generated_at DESC`)
      .all(status) as Record<string, unknown>[];
  }

  async getCurrentSchedule(): Promise<{
    activeProposalId: string | null;
    slices: Array<Record<string, unknown>>;
  }> {
    const snapshot = this.db
      .prepare(
        `
          SELECT active_proposal_id
          FROM schedule_snapshots
          ORDER BY updated_at DESC
          LIMIT 1
        `,
      )
      .get() as { active_proposal_id?: string } | undefined;

    if (!snapshot?.active_proposal_id) {
      return { activeProposalId: null, slices: [] };
    }

    const slices = this.db
      .prepare(
        `
          SELECT proposal_id, task_id, date, planned_minutes, kind
          FROM scheduled_task_slices
          WHERE proposal_id = ?
          ORDER BY date ASC
        `,
      )
      .all(snapshot.active_proposal_id) as Array<Record<string, unknown>>;

    return {
      activeProposalId: snapshot.active_proposal_id,
      slices,
    };
  }

  async approveProposal(_proposalId: string, _approvedAt: string): Promise<void> {
    return undefined;
  }

  async rejectProposal(_proposalId: string): Promise<void> {
    return undefined;
  }
}
