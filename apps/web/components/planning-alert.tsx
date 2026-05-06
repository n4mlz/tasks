"use client";

import * as React from "react";
import { formatHoursFromMinutes } from "../lib/presentation";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type PlanningHealthPayload = {
  missingCapacityDatesWithin7Days: string[];
  hasInsufficientCapacity?: boolean;
  shortfallMinutes?: number;
  horizonEnd?: string;
};

export function PlanningAlert({
  initialHealth,
  compact = false,
}: Readonly<{
  initialHealth: PlanningHealthPayload;
  compact?: boolean;
}>) {
  const [health, setHealth] = React.useState(initialHealth);

  const refresh = React.useCallback(async () => {
    const response = await fetch("/api/planning-health", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as PlanningHealthPayload;
    setHealth(payload);
  }, []);

  React.useEffect(() => {
    const onChanged = () => {
      void refresh();
    };

    window.addEventListener("task-platform:planning-changed", onChanged);
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      window.removeEventListener("task-platform:planning-changed", onChanged);
      window.clearInterval(interval);
    };
  }, [refresh]);

  if (
    health.missingCapacityDatesWithin7Days.length === 0 &&
    !health.hasInsufficientCapacity
  ) {
    return null;
  }

  return (
    <Alert className={compact ? "px-4 py-3" : ""} variant="warning">
      <AlertTitle>計画の見直しが必要です</AlertTitle>
      <AlertDescription className="grid gap-1">
        {health.missingCapacityDatesWithin7Days.length > 0 ? (
          <div>{`直近 7 日で未設定の日付: ${health.missingCapacityDatesWithin7Days.join(", ")}`}</div>
        ) : null}
        {health.hasInsufficientCapacity ? (
          <div>
            {`現在の余力時間では足りません。少なくとも ${formatHoursFromMinutes(
              health.shortfallMinutes ?? 0,
            )} の余力を追加してください${
              health.horizonEnd ? ` (${health.horizonEnd} まで)` : ""
            }。`}
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
