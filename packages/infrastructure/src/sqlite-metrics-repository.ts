import type { SqliteDatabase } from "./db";

export class SqliteMetricsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async getRangeSummary(range: { dateFrom: string; dateTo: string }): Promise<{
    plannedMinutes: number;
    actualMinutes: number;
    completedMinutes: number;
    atRiskTaskCount: number;
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
          SELECT COALESCE(json_array_length(summary_json, '$.riskFlags'), 0) AS at_risk_count
          FROM schedule_proposals
          WHERE id = (
            SELECT active_proposal_id
            FROM schedule_snapshots
            ORDER BY updated_at DESC
            LIMIT 1
          )
        `,
      )
      .get() as { at_risk_count: number } | undefined;

    return {
      plannedMinutes: Number(plannedRow.planned_minutes),
      actualMinutes: Number(actualRow.actual_minutes),
      completedMinutes: Number(completedRow.completed_minutes),
      atRiskTaskCount: Number(riskRow?.at_risk_count ?? 0),
    };
  }
}
