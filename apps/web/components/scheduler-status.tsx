"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeShort, formatEtaMinutes } from "../lib/presentation";
import { Button } from "./ui/button";
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
  const [displaySecondsUntilNextRun, setDisplaySecondsUntilNextRun] = React.useState<number | null>(null);
  const previousRefreshKey = React.useRef<string | null>(null);

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
    setDisplaySecondsUntilNextRun(payload.status.secondsUntilNextRun);
    const nextRefreshKey = [
      payload.status.lastScheduledAt,
      payload.status.schedulerStatus,
      payload.status.currentRevision,
      payload.status.lastScheduledRevision,
    ].join("|");
    if (previousRefreshKey.current && previousRefreshKey.current !== nextRefreshKey) {
      router.refresh();
    }
    previousRefreshKey.current = nextRefreshKey;
  }, [router]);

  React.useEffect(() => {
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [poll]);

  React.useEffect(() => {
    const onChanged = () => {
      void poll();
    };
    window.addEventListener("task-platform:planning-changed", onChanged);
    return () => window.removeEventListener("task-platform:planning-changed", onChanged);
  }, [poll]);

  React.useEffect(() => {
    if (displaySecondsUntilNextRun === null) return;
    const interval = window.setInterval(() => {
      setDisplaySecondsUntilNextRun((current) =>
        current === null ? null : Math.max(0, current - 1),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [displaySecondsUntilNextRun]);

  if (!status) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <StatusBadge tone={status.schedulerStatus === "running" ? "warning" : status.schedulerStatus === "failed" ? "danger" : status.hasPendingChanges ? "secondary" : "outline"}>
        {status.schedulerStatus === "running"
          ? "再配分中"
          : status.schedulerStatus === "failed"
            ? "要見直し"
          : status.hasPendingChanges
            ? "再配分待ち"
            : "最新"}
      </StatusBadge>
      <span>{`最終再配分 ${formatDateTimeShort(status.lastScheduledAt)}`}</span>
      {status.hasPendingChanges ? (
        <span>{`次回 ${formatEtaMinutes(displaySecondsUntilNextRun)}`}</span>
      ) : null}
      {status.hasPendingChanges && status.schedulerStatus !== "running" && status.schedulerStatus !== "failed" ? (
        <Button
          onClick={async () => {
            const response = await fetch(new URL("/api/scheduler/delay", window.location.origin), {
              method: "POST",
              cache: "no-store",
            });
            if (!response.ok) return;
            const payload = (await response.json()) as { status: SchedulerStatusPayload };
            setStatus(payload.status);
            setDisplaySecondsUntilNextRun(payload.status.secondsUntilNextRun);
            window.dispatchEvent(new Event("task-platform:planning-changed"));
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          3分延長
        </Button>
      ) : null}
    </div>
  );
}
