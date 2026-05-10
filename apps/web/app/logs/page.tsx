import React from "react";
import { StatusBadge } from "../../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  formatDateTimeLong,
  formatEtaMinutes,
  formatHoursFromMinutes,
  schedulerMutationLabels,
  schedulerRunReasonLabels,
  schedulerRunStatusLabels,
} from "../../lib/presentation";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function describeMutationDetails(details: Record<string, unknown>): string[] {
  const lines: string[] = [];

  if (typeof details.title === "string" && details.title) {
    lines.push(`タスク: ${details.title}`);
  }
  if (typeof details.availableMinutes === "number") {
    lines.push(`余力時間: ${formatHoursFromMinutes(details.availableMinutes)}`);
  }
  if (typeof details.spentMinutes === "number") {
    lines.push(`進めた時間: ${formatHoursFromMinutes(details.spentMinutes)}`);
  }
  if (typeof details.remainingMinutes === "number") {
    lines.push(`残り時間: ${formatHoursFromMinutes(details.remainingMinutes)}`);
  }
  if (typeof details.remainingMinutesAfter === "number") {
    lines.push(`更新後の残り時間: ${formatHoursFromMinutes(details.remainingMinutesAfter)}`);
  }

  return lines;
}

export default async function LogsPage() {
  const status = (await taskPlatform.getSchedulerStatus()) as {
    schedulerStatus: string;
    lastScheduledAt: string | null;
    latestRunAt: string | null;
    hasPendingChanges: boolean;
    secondsUntilNextRun: number | null;
  };
  const logs = (await taskPlatform.listSchedulerLogs()) as {
    mutations: Array<{
      id: string;
      revision: number;
      mutationKind: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      details: Record<string, unknown>;
    }>;
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

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ログ</h1>
        <StatusBadge
          tone={
            status.schedulerStatus === "running"
              ? "warning"
              : status.hasPendingChanges
                ? "secondary"
                : "outline"
          }
        >
          {status.schedulerStatus === "running"
            ? "再配分中"
            : status.hasPendingChanges
              ? "再配分待ち"
              : "最新"}
        </StatusBadge>
        <StatusBadge tone="outline">{`最終再配分 ${formatDateTimeLong(
          status.lastScheduledAt,
        )}`}</StatusBadge>
        {status.hasPendingChanges ? (
          <StatusBadge tone="outline">{`次回 ${formatEtaMinutes(
            status.secondsUntilNextRun,
          )}`}</StatusBadge>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/80 bg-white/94">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.03em]">変更ログ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700">
            {logs.mutations.map((mutation) => {
              const detailLines = describeMutationDetails(mutation.details);

              return (
                <div key={mutation.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="secondary">{`rev ${mutation.revision}`}</StatusBadge>
                    <StatusBadge tone="outline">
                      {schedulerMutationLabels[mutation.mutationKind] ?? mutation.mutationKind}
                    </StatusBadge>
                    <span>{formatDateTimeLong(mutation.createdAt)}</span>
                  </div>
                  {mutation.entityId ? (
                    <div className="mt-2 text-slate-600">{`対象: ${mutation.entityId}`}</div>
                  ) : null}
                  {detailLines.length ? (
                    <div className="mt-2 grid gap-1 text-slate-600">
                      {detailLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/94">
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.03em]">再配分ログ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700">
            {logs.runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={
                      run.status === "failed"
                        ? "danger"
                        : run.status === "scheduled"
                          ? "success"
                          : "outline"
                    }
                  >
                    {schedulerRunStatusLabels[run.status] ?? run.status}
                  </StatusBadge>
                  <StatusBadge tone="secondary">{`rev ${run.targetRevision}`}</StatusBadge>
                  <span>{formatDateTimeLong(run.startedAt)}</span>
                </div>
                <div className="mt-2 text-slate-600">
                  {schedulerRunReasonLabels[run.reason] ?? run.reason}
                </div>
                {run.rationale ? <div className="mt-1 text-slate-500">{run.rationale}</div> : null}
                {run.validation?.errors?.length ? (
                  <div className="mt-2 text-rose-600">
                    {`検証エラー: ${run.validation.errors.join(", ")}`}
                  </div>
                ) : null}
                {run.errorMessage ? (
                  <div className="mt-2 text-rose-600">{`実行エラー: ${run.errorMessage}`}</div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
