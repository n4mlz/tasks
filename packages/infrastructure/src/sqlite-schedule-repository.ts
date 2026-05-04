import type { SqliteDatabase } from "./db";

export class SqliteScheduleRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async saveCurrentSchedule(schedule: {
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
    const summaryJson = JSON.stringify(schedule.summary);
    const insertProposal = this.db.prepare(
      `
        INSERT INTO schedule_proposals (
          id, status, reason, generated_at, horizon_start, horizon_end, summary_json
        ) VALUES (?, 'approved', ?, ?, ?, ?, ?)
      `,
    );
    const insertSlice = this.db.prepare(
      `
        INSERT INTO scheduled_task_slices (
          id, proposal_id, task_id, date, planned_minutes, kind
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
    );
    const insertSnapshot = this.db.prepare(
      `
        INSERT INTO schedule_snapshots (id, active_proposal_id, updated_at)
        VALUES (?, ?, ?)
      `,
    );

    const tx = this.db.transaction(() => {
      insertProposal.run(
        schedule.id,
        schedule.reason,
        schedule.generatedAt,
        schedule.horizonStart,
        schedule.horizonEnd,
        summaryJson,
      );

      for (let index = 0; index < schedule.slices.length; index += 1) {
        const slice = schedule.slices[index];
        insertSlice.run(
          `${schedule.id}_slice_${index}`,
          schedule.id,
          slice.taskId,
          slice.date,
          slice.plannedMinutes,
          slice.kind,
        );
      }

      insertSnapshot.run(`${schedule.id}_snapshot`, schedule.id, schedule.generatedAt);
    });

    tx();
  }

  async getCurrentSchedule(): Promise<{
    activeScheduleId: string | null;
    summary: Record<string, unknown> | null;
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
      return { activeScheduleId: null, summary: null, slices: [] };
    }

    const plan = this.db
      .prepare(`SELECT summary_json FROM schedule_proposals WHERE id = ?`)
      .get(snapshot.active_proposal_id) as { summary_json?: string } | undefined;
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
      activeScheduleId: snapshot.active_proposal_id,
      summary: plan?.summary_json ? (JSON.parse(plan.summary_json) as Record<string, unknown>) : null,
      slices,
    };
  }
}
