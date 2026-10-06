"use client";

import React from "react";
import { Badge, Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import {
  formatDateTimeLong,
  schedulerRunReasonLabels,
  schedulerRunStatusLabels,
} from "../../lib/presentation";

export type SchedulerStatus = {
  schedulerStatus: string;
  lastScheduledAt: string | null;
  latestRunAt: string | null;
  hasPendingChanges: boolean;
  secondsUntilNextRun: number | null;
};

export type SchedulerRun = {
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

function useRuns(initialRuns: SchedulerRun[]) {
  const [runs, setRuns] = React.useState(initialRuns);
  const [cursor, setCursor] = React.useState<string | null>(initialRuns.at(-1)?.startedAt ?? null);
  const [hasMore, setHasMore] = React.useState(initialRuns.length === 20);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const loadMore = React.useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(`/api/scheduler-runs?${params.toString()}`);
      if (!response.ok) throw new Error("failed to load history");
      const data = (await response.json()) as { runs: SchedulerRun[]; nextCursor: string | null };
      setRuns((previous) => [...previous, ...data.runs]);
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  return { runs, loading, error, hasMore, loadMore };
}

export function LogsPageClient({
  status: initialStatus,
  initialRuns,
}: Readonly<{ status: SchedulerStatus; initialRuns: SchedulerRun[] }>) {
  const [status, setStatus] = React.useState(initialStatus);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState(false);
  const { runs, loading, error, hasMore, loadMore } = useRuns(initialRuns);
  const stateLabel = status.schedulerStatus === "failed"
    ? "配分を確認"
    : status.schedulerStatus === "running"
      ? "再配分中"
      : status.hasPendingChanges
        ? "再配分待ち"
        : "配分済み";

  async function runAction(path: string, body?: object) {
    setBusy(true);
    setActionError(false);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("scheduler action failed");
      const result = (await response.json()) as { status: SchedulerStatus };
      setStatus(result.status);
      window.dispatchEvent(new Event("task-platform:planning-changed"));
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap="5">
      <Flex align="center" justify="space-between" gap="4" wrap="wrap" borderWidth="1px" borderColor="#e2e9e6" borderRadius="xl" bg="white" px="4" py="3">
        <HStack gap="3" flexWrap="wrap">
          <Badge colorPalette={status.schedulerStatus === "failed" ? "red" : status.hasPendingChanges ? "orange" : status.schedulerStatus === "running" ? "blue" : "green"}>
            {stateLabel}
          </Badge>
          <Text fontSize="sm" color="#667673">最終更新 {formatDateTimeLong(status.lastScheduledAt)}</Text>
        </HStack>
        <HStack gap="2" flexWrap="wrap">
          {status.hasPendingChanges && status.schedulerStatus !== "running" ? (
            <Button size="sm" variant="outline" borderColor="#d5dfdc" loading={busy} onClick={() => void runAction("/api/scheduler/delay")}>
              3分待つ
            </Button>
          ) : null}
          {status.schedulerStatus === "running" ? (
            <Button size="sm" variant="outline" colorPalette="red" loading={busy} onClick={() => void runAction("/api/scheduler/cancel")}>
              配分を中止
            </Button>
          ) : (
            <Button size="sm" colorPalette="teal" loading={busy} onClick={() => void runAction("/api/scheduler/tick", { force: true })}>
              今すぐ再配分
            </Button>
          )}
        </HStack>
      </Flex>
      {actionError ? <Text role="alert" fontSize="sm" color="red.700">操作を完了できませんでした。時間をおいて再度お試しください。</Text> : null}

      <Stack gap="2">
        <Text fontSize="sm" fontWeight="600" color="#526360">過去の再配分</Text>
        {runs.map((run) => {
          const failed = run.status === "failed" || Boolean(run.errorMessage) || Boolean(run.validation?.errors?.length);
          return (
            <Box key={run.id} borderWidth="1px" borderColor={failed ? "#eed7d0" : "#e3e9e7"} borderRadius="lg" bg="white" px="4" py="3">
              <Flex align="center" justify="space-between" gap="3" wrap="wrap">
                <HStack gap="3" flexWrap="wrap">
                  <Badge colorPalette={failed ? "red" : run.status === "scheduled" ? "green" : "gray"}>
                    {schedulerRunStatusLabels[run.status] ?? run.status}
                  </Badge>
                  <Text fontSize="sm" color="#526360">{schedulerRunReasonLabels[run.reason] ?? run.reason}</Text>
                </HStack>
                <Text fontSize="sm" color="#71807e">{formatDateTimeLong(run.startedAt)}</Text>
              </Flex>
              {failed ? (
                <details>
                  <summary style={{ cursor: "pointer", marginTop: "0.5rem", color: "#8b4a36", fontSize: "0.875rem" }}>失敗の詳細</summary>
                  <Stack mt="2" gap="1" fontSize="sm" color="#8b4a36">
                    {run.errorMessage ? <Text>{run.errorMessage}</Text> : null}
                    {run.validation?.errors?.map((item) => <Text key={item}>{item}</Text>)}
                    {run.rationale ? <Text>{run.rationale}</Text> : null}
                  </Stack>
                </details>
              ) : null}
            </Box>
          );
        })}
        {runs.length === 0 ? <Text py="4" color="#71807e" fontSize="sm">再配分履歴はまだありません。</Text> : null}
        {hasMore ? (
          <Button alignSelf="center" variant="outline" borderColor="#d5dfdc" loading={loading} onClick={() => void loadMore()}>
            さらに読み込む
          </Button>
        ) : null}
        {error ? <Text role="alert" textAlign="center" color="red.700" fontSize="sm">履歴を読み込めませんでした。もう一度お試しください。</Text> : null}
      </Stack>
    </Stack>
  );
}
