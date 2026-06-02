import React from "react";
import { LogsPageClient } from "./logs-page-client";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const status = (await taskPlatform.getSchedulerStatus()) as {
    schedulerStatus: string;
    lastScheduledAt: string | null;
    latestRunAt: string | null;
    hasPendingChanges: boolean;
    secondsUntilNextRun: number | null;
  };
  const logs = (await taskPlatform.listSchedulerLogs({ limit: 20 })) as {
    runs: Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: { errors?: string[] };
      errorMessage: string;
    }>;
  };

  return <LogsPageClient status={status} initialRuns={logs.runs} />;
}
