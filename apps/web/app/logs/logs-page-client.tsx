"use client";

import React from "react";
import { StatusBadge } from "../../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  formatDateTimeLong,
  formatEtaMinutes,
  schedulerRunReasonLabels,
  schedulerRunStatusLabels,
} from "../../lib/presentation";

type SchedulerStatus = {
  schedulerStatus: string;
  lastScheduledAt: string | null;
  latestRunAt: string | null;
  hasPendingChanges: boolean;
  secondsUntilNextRun: number | null;
};

type Run = {
  id: string;
  targetRevision: number;
  status: string;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
  rationale: string;
  validation: { errors?: string[] };
  errorMessage: string;
};

function useRuns(initialRuns: Run[]) {
  const [runs, setRuns] = React.useState<Run[]>(initialRuns);
  const [cursor, setCursor] = React.useState<string | null>(
    initialRuns.length > 0 ? initialRuns.at(-1)?.startedAt ?? null : null,
  );
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const observerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const current = observerRef.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setLoading(true);
          const params = new URLSearchParams();
          if (cursor) params.set("cursor", cursor);
          params.set("limit", "20");
          fetch(`/api/scheduler-runs?${params.toString()}`)
            .then((res) => res.json())
            .then((data: { runs: Run[]; nextCursor: string | null }) => {
              setRuns((prev) => [...prev, ...data.runs]);
              setCursor(data.nextCursor);
              setHasMore(data.nextCursor !== null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(current);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading]);

  return { runs, loading, observerRef };
}

export function LogsPageClient({
  status,
  initialRuns,
}: Readonly<{
  status: SchedulerStatus;
  initialRuns: Run[];
}>) {
  const { runs, loading, observerRef } = useRuns(initialRuns);

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
        <StatusBadge tone="outline">
          {`最終再配分 ${formatDateTimeLong(status.lastScheduledAt)}`}
        </StatusBadge>
        {status.hasPendingChanges ? (
          <StatusBadge tone="outline">{`次回 ${formatEtaMinutes(
            status.secondsUntilNextRun,
          )}`}</StatusBadge>
        ) : null}
      </div>

      <Card className="border-white/80 bg-white/94">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.03em]">再配分ログ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700">
          {runs.map((run) => (
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
          <div ref={observerRef} className="h-4" />
          {loading ? (
            <p className="text-center text-sm text-slate-400">読み込み中...</p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
