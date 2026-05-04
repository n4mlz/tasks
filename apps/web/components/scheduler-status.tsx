"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeShort, formatEtaMinutes } from "../lib/presentation";
import { StatusBadge } from "./status-badge";

type SchedulerStatusPayload = {
  currentRevision: number;
  lastScheduledRevision: number;
  lastMutationAt: string | null;
  lastScheduledAt: string | null;
  schedulerStatus: "idle" | "pending" | "running" | "failed";
  runningRevision: number | null;
  hasPendingChanges: boolean;
  nextRunAt: string | null;
  secondsUntilNextRun: number | null;
};

export function SchedulerStatus() {
  const router = useRouter();
  const [status, setStatus] = React.useState<SchedulerStatusPayload | null>(null);
  const [lastSeenScheduledAt, setLastSeenScheduledAt] = React.useState<string | null>(null);

  const poll = React.useCallback(async () => {
    const response = await fetch(new URL("/api/scheduler/tick", window.location.origin), {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as {
      status: SchedulerStatusPayload;
    };
    setStatus(payload.status);
    setLastSeenScheduledAt((current) => {
      if (current && payload.status.lastScheduledAt && current !== payload.status.lastScheduledAt) {
        router.refresh();
      }
      return payload.status.lastScheduledAt;
    });
  }, [router]);

  React.useEffect(() => {
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [poll]);

  if (!status) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <StatusBadge tone={status.schedulerStatus === "running" ? "warning" : status.hasPendingChanges ? "secondary" : "outline"}>
        {status.schedulerStatus === "running"
          ? "再配分中"
          : status.hasPendingChanges
            ? "再配分待ち"
            : "最新"}
      </StatusBadge>
      <span>{`最終再配分 ${formatDateTimeShort(status.lastScheduledAt)}`}</span>
      {status.hasPendingChanges ? (
        <span>{`次回 ${formatEtaMinutes(status.secondsUntilNextRun)}`}</span>
      ) : null}
    </div>
  );
}
