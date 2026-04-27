import type { SqliteDatabase } from "./db";

export class SqliteMetricsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async getRangeSummary(range: { dateFrom: string; dateTo: string }): Promise<{
    plannedMinutes: number;
    actualMinutes: number;
    completedMinutes: number;
    atRiskTaskCount: number;
    pendingProposalCount: number;
  }> {
    const plannedRow = this.db
      .prepare(
        `
          SELECT COALESCE(SUM(planned_minutes), 0) AS planned_minutes
          FROM scheduled_task_slices
          WHERE date >= ? AND date <= ?
        `,
      )
      .get(range.dateFrom, range.dateTo) as { planned_minutes: number };

    const actualRow = this.db
      .prepare(
        `
          SELECT COALESCE(SUM(spent_minutes), 0) AS actual_minutes
          FROM task_work_logs
          WHERE date >= ? AND date <= ?
        `,
      )
      .get(range.dateFrom, range.dateTo) as { actual_minutes: number };

    const completedRow = this.db
      .prepare(
        `
          SELECT COALESCE(SUM(spent_minutes), 0) AS completed_minutes
          FROM task_work_logs
          WHERE date >= ? AND date <= ? AND remaining_minutes_after = 0
        `,
      )
      .get(range.dateFrom, range.dateTo) as { completed_minutes: number };

    const riskRow = this.db
      .prepare(
        `
          SELECT COUNT(*) AS at_risk_count
          FROM schedule_proposals
          WHERE status = 'pending'
            AND json_extract(summary_json, '$.riskFlags[0]') IS NOT NULL
        `,
      )
      .get() as { at_risk_count: number };

    const pendingRow = this.db
      .prepare(
        `
          SELECT COUNT(*) AS pending_count
          FROM schedule_proposals
          WHERE status = 'pending'
        `,
      )
      .get() as { pending_count: number };

    return {
      plannedMinutes: Number(plannedRow.planned_minutes),
      actualMinutes: Number(actualRow.actual_minutes),
      completedMinutes: Number(completedRow.completed_minutes),
      atRiskTaskCount: Number(riskRow.at_risk_count),
      pendingProposalCount: Number(pendingRow.pending_count),
    };
  }
}
