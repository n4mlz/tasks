import React from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function PlanningAlert({
  dates,
  compact = false,
}: Readonly<{
  dates: string[];
  compact?: boolean;
}>) {
  if (dates.length === 0) {
    return null;
  }

  return (
    <Alert className={compact ? "px-4 py-3" : ""} variant="warning">
      <AlertTitle>余力時間が未設定の日があります</AlertTitle>
      <AlertDescription>
        直近 7 日で未設定の日付: {dates.join(", ")}
        {compact ? "。" : "。計画画面で余力時間とバッファを入れると提案の精度が安定します。"}
      </AlertDescription>
    </Alert>
  );
}
