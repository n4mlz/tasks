import type { SqliteDatabase } from "./db";

const SINGLETON_ID = "scheduler";

type PlanningStateRow = {
  singleton_id: string;
  current_revision: number;
  last_scheduled_revision: number;
  last_mutation_at: string | null;
  last_scheduled_at: string | null;
  scheduler_status: "idle" | "pending" | "running" | "failed";
  running_revision: number | null;
};

export class SqliteSchedulerStateRepository {
  constructor(private readonly db: SqliteDatabase) {}

  private ensureState(): void {
    this.db
      .prepare(
        `
          INSERT OR IGNORE INTO planning_state (
            singleton_id,
            current_revision,
            last_scheduled_revision,
            last_mutation_at,
            last_scheduled_at,
            scheduler_status,
            running_revision
          ) VALUES (?, 0, 0, NULL, NULL, 'idle', NULL)
        `,
      )
      .run(SINGLETON_ID);
  }

  async getState(): Promise<{
    currentRevision: number;
    lastScheduledRevision: number;
    lastMutationAt: string | null;
    lastScheduledAt: string | null;
    schedulerStatus: "idle" | "pending" | "running" | "failed";
    runningRevision: number | null;
  }> {
    this.ensureState();
    const row = this.db
      .prepare(`SELECT * FROM planning_state WHERE singleton_id = ?`)
      .get(SINGLETON_ID) as PlanningStateRow;

    return {
      currentRevision: row.current_revision,
      lastScheduledRevision: row.last_scheduled_revision,
      lastMutationAt: row.last_mutation_at,
      lastScheduledAt: row.last_scheduled_at,
      schedulerStatus: row.scheduler_status,
      runningRevision: row.running_revision,
    };
  }

  async recordMutation(input: {
    mutationId: string;
    mutationKind: string;
    entityType: string;
    entityId?: string | null;
    createdAt: string;
    details: Record<string, unknown>;
  }): Promise<{ revision: number }> {
    this.ensureState();

    const tx = this.db.transaction(() => {
      const row = this.db
        .prepare(`SELECT current_revision, scheduler_status FROM planning_state WHERE singleton_id = ?`)
        .get(SINGLETON_ID) as { current_revision: number; scheduler_status: string };
      const nextRevision = Number(row.current_revision) + 1;

      this.db
        .prepare(
          `
            UPDATE planning_state
            SET
              current_revision = ?,
              last_mutation_at = ?,
              scheduler_status = CASE WHEN scheduler_status = 'running' THEN scheduler_status ELSE 'pending' END
            WHERE singleton_id = ?
          `,
        )
        .run(nextRevision, input.createdAt, SINGLETON_ID);

      this.db
        .prepare(
          `
            INSERT INTO planning_mutations (
              id, revision, mutation_kind, entity_type, entity_id, created_at, details_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          input.mutationId,
          nextRevision,
          input.mutationKind,
          input.entityType,
          input.entityId ?? null,
          input.createdAt,
          JSON.stringify(input.details),
        );

      return { revision: nextRevision };
    });

    return tx();
  }

  async tryStartRun(input: {
    now: string;
    debounceMilliseconds: number;
  }): Promise<
    | { started: false; state: Awaited<ReturnType<SqliteSchedulerStateRepository["getState"]>> }
    | {
        started: true;
        targetRevision: number;
        state: Awaited<ReturnType<SqliteSchedulerStateRepository["getState"]>>;
      }
  > {
    this.ensureState();

    const tx = this.db.transaction(() => {
      const row = this.db
        .prepare(`SELECT * FROM planning_state WHERE singleton_id = ?`)
        .get(SINGLETON_ID) as PlanningStateRow;

      const state = {
        currentRevision: row.current_revision,
        lastScheduledRevision: row.last_scheduled_revision,
        lastMutationAt: row.last_mutation_at,
        lastScheduledAt: row.last_scheduled_at,
        schedulerStatus: row.scheduler_status,
        runningRevision: row.running_revision,
      };

      if (state.schedulerStatus === "running") {
        return { started: false as const, state };
      }
      if (state.currentRevision <= state.lastScheduledRevision) {
        return { started: false as const, state };
      }
      if (!state.lastMutationAt) {
        return { started: false as const, state };
      }

      const elapsed =
        new Date(input.now).getTime() - new Date(state.lastMutationAt).getTime();
      if (elapsed < input.debounceMilliseconds) {
        return { started: false as const, state };
      }

      this.db
        .prepare(
          `
            UPDATE planning_state
            SET scheduler_status = 'running', running_revision = ?
            WHERE singleton_id = ?
          `,
        )
        .run(state.currentRevision, SINGLETON_ID);

      return {
        started: true as const,
        targetRevision: state.currentRevision,
        state: {
          ...state,
          schedulerStatus: "running" as const,
          runningRevision: state.currentRevision,
        },
      };
    });

    return tx();
  }

  async completeRun(input: {
    targetRevision: number;
    finishedAt: string;
    status: "idle" | "pending" | "failed";
    scheduled: boolean;
  }): Promise<void> {
    this.ensureState();
    const row = this.db
      .prepare(`SELECT current_revision FROM planning_state WHERE singleton_id = ?`)
      .get(SINGLETON_ID) as { current_revision: number };
    const revisionAdvanced = Number(row.current_revision) !== input.targetRevision;

    this.db
      .prepare(
        `
          UPDATE planning_state
          SET
            last_scheduled_revision = CASE WHEN ? THEN ? ELSE last_scheduled_revision END,
            last_scheduled_at = CASE WHEN ? THEN ? ELSE last_scheduled_at END,
            scheduler_status = ?,
            running_revision = NULL
          WHERE singleton_id = ?
        `,
      )
      .run(
        input.scheduled && !revisionAdvanced ? 1 : 0,
        input.targetRevision,
        input.scheduled && !revisionAdvanced ? 1 : 0,
        input.finishedAt,
        revisionAdvanced ? "pending" : input.status,
        SINGLETON_ID,
      );
  }

  async listMutations(limit = 50): Promise<
    Array<{
      id: string;
      revision: number;
      mutationKind: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      details: Record<string, unknown>;
    }>
  > {
    this.ensureState();
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM planning_mutations
          ORDER BY revision DESC, created_at DESC
          LIMIT ?
        `,
      )
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      revision: Number(row.revision),
      mutationKind: String(row.mutation_kind),
      entityType: String(row.entity_type),
      entityId: row.entity_id ? String(row.entity_id) : null,
      createdAt: String(row.created_at),
      details: JSON.parse(String(row.details_json)) as Record<string, unknown>,
    }));
  }

  async listRuns(limit = 30): Promise<
    Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>
  > {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM schedule_runs
          ORDER BY started_at DESC
          LIMIT ?
        `,
      )
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      targetRevision: Number(row.target_revision),
      status: String(row.status),
      reason: String(row.reason),
      startedAt: String(row.started_at),
      finishedAt: row.finished_at ? String(row.finished_at) : null,
      rationale: String(row.rationale),
      validation: JSON.parse(String(row.validation_json)) as Record<string, unknown>,
      errorMessage: String(row.error_message ?? ""),
    }));
  }

  async insertRun(input: {
    id: string;
    targetRevision: number;
    status: string;
    reason: string;
    startedAt: string;
    finishedAt?: string | null;
    rationale?: string;
    validation?: Record<string, unknown>;
    errorMessage?: string;
  }): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO schedule_runs (
            id, target_revision, status, reason, started_at, finished_at, rationale, validation_json, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.id,
        input.targetRevision,
        input.status,
        input.reason,
        input.startedAt,
        input.finishedAt ?? null,
        input.rationale ?? "",
        JSON.stringify(input.validation ?? {}),
        input.errorMessage ?? "",
      );
  }
}
