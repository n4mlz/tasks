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
    summary: {
      riskFlags: string[];
      unscheduledTaskIds: string[];
      capacityPressureByDate: Record<string, number>;
    };
  }): Promise<void> {
    const summaryJson = JSON.stringify(proposal.summary);
    const insertProposal = this.db.prepare(
      `
        INSERT INTO schedule_proposals (
          id, status, reason, generated_at, horizon_start, horizon_end, summary_json
        ) VALUES (?, 'pending', ?, ?, ?, ?, ?)
      `,
    );
    const insertSlice = this.db.prepare(
      `
        INSERT INTO scheduled_task_slices (
          id, proposal_id, task_id, date, planned_minutes, kind
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
    );

    const tx = this.db.transaction(() => {
      insertProposal.run(
        proposal.id,
        proposal.reason,
        proposal.generatedAt,
        proposal.horizonStart,
        proposal.horizonEnd,
        summaryJson,
      );

      for (let index = 0; index < proposal.slices.length; index += 1) {
        const slice = proposal.slices[index];
        insertSlice.run(
          `${proposal.id}_slice_${index}`,
          proposal.id,
          slice.taskId,
          slice.date,
          slice.plannedMinutes,
          slice.kind,
        );
      }
    });

    tx();
  }

  async findById(proposalId: string): Promise<Record<string, unknown> | null> {
    const row = this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE id = ?`)
      .get(proposalId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const slices = this.db
      .prepare(
        `
          SELECT proposal_id, task_id, date, planned_minutes, kind
          FROM scheduled_task_slices
          WHERE proposal_id = ?
          ORDER BY date ASC, task_id ASC
        `,
      )
      .all(proposalId) as Array<Record<string, unknown>>;

    return {
      ...row,
      summary: JSON.parse(String(row.summary_json)),
      slices,
    };
  }

  async listByStatus(status = "pending"): Promise<Record<string, unknown>[]> {
    const rows = this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE status = ? ORDER BY generated_at DESC`)
      .all(status) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      ...row,
      summary: JSON.parse(String(row.summary_json)),
    }));
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
    const updateStatus = this.db.prepare(
      `UPDATE schedule_proposals SET status = 'approved' WHERE id = ?`,
    );
    const insertSnapshot = this.db.prepare(
      `
        INSERT INTO schedule_snapshots (id, active_proposal_id, updated_at)
        VALUES (?, ?, ?)
      `,
    );
    const tx = this.db.transaction(() => {
      updateStatus.run(_proposalId);
      insertSnapshot.run(`${_proposalId}_snapshot`, _proposalId, _approvedAt);
    });

    tx();
  }

  async rejectProposal(_proposalId: string): Promise<void> {
    this.db
      .prepare(`UPDATE schedule_proposals SET status = 'rejected' WHERE id = ?`)
      .run(_proposalId);
  }
}
