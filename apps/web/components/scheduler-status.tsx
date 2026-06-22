"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatDateTimeShort, formatEtaMinutes } from "../lib/presentation";
import { Button } from "./ui/button";
import { StatusBadge } from "./status-badge";

type SchedulerStatusPayload = {
  currentRevision: number;
  lastScheduledRevision: number;
  lastMutationAt: string | null;
  lastScheduledAt: string | null;
  latestRunAt: string | null;
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
  const [isForcing, setIsForcing] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const previousRefreshKey = React.useRef<string | null>(null);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const applyStatus = React.useCallback((nextStatus: SchedulerStatusPayload) => {
    setStatus(nextStatus);
    setDisplaySecondsUntilNextRun(nextStatus.secondsUntilNextRun);
    const nextRefreshKey = [
      nextStatus.lastScheduledAt,
      nextStatus.latestRunAt,
      nextStatus.schedulerStatus,
      nextStatus.currentRevision,
      nextStatus.lastScheduledRevision,
    ].join("|");
    if (previousRefreshKey.current && previousRefreshKey.current !== nextRefreshKey) {
      router.refresh();
    }
    previousRefreshKey.current = nextRefreshKey;
  }, [router]);

  const poll = React.useCallback(async () => {
    const response = await fetch(new URL("/api/scheduler/tick", window.location.origin), {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as {
      status: SchedulerStatusPayload;
    };
    applyStatus(payload.status);
    return payload.status;
  }, [applyStatus]);

  const resetPolling = React.useCallback((intervalMs: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => {
      void poll();
    }, intervalMs);
  }, [poll]);

  React.useEffect(() => {
    void poll();
    pollIntervalRef.current = setInterval(() => {
      void poll();
    }, 30_000);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
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

  const handleForceRun = React.useCallback(async () => {
    setIsForcing(true);
    setStatus((prev) => prev ? { ...prev, schedulerStatus: "running" } : null);
    resetPolling(2_000);
    try {
      const response = await fetch(new URL("/api/scheduler/tick", window.location.origin), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { status: SchedulerStatusPayload };
      applyStatus(payload.status);
      window.dispatchEvent(new Event("task-platform:planning-changed"));
    } finally {
      setIsForcing(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(() => {
        void poll().then((latest) => {
          if (latest?.schedulerStatus !== "running") {
            resetPolling(30_000);
          }
        });
      }, 2_000);
    }
  }, [applyStatus, poll, resetPolling]);

  const handleCancel = React.useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(new URL("/api/scheduler/cancel", window.location.origin), {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { status: SchedulerStatusPayload };
      applyStatus(payload.status);
      resetPolling(30_000);
      window.dispatchEvent(new Event("task-platform:planning-changed"));
    } finally {
      setIsCancelling(false);
    }
  }, [applyStatus, resetPolling]);

  const handleDelay = React.useCallback(async () => {
    const response = await fetch(new URL("/api/scheduler/delay", window.location.origin), {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { status: SchedulerStatusPayload };
    applyStatus(payload.status);
    window.dispatchEvent(new Event("task-platform:planning-changed"));
  }, [applyStatus]);

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
          onClick={handleDelay}
          size="sm"
          type="button"
          variant="outline"
        >
          3分延長
        </Button>
      ) : null}
      {status.schedulerStatus === "running" ? (
        <Button
          onClick={handleCancel}
          size="sm"
          type="button"
          variant="warning"
          disabled={isCancelling}
        >
          {isCancelling ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              キャンセル中
            </>
          ) : (
            "配分キャンセル"
          )}
        </Button>
      ) : (
        <Button
          onClick={handleForceRun}
          size="sm"
          type="button"
          variant="secondary"
          disabled={isForcing}
        >
          {isForcing ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              再配分中
            </>
          ) : (
            "今すぐ再配分"
          )}
        </Button>
      )}
    </div>
  );
}
