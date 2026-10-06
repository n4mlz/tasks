"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Grid, Input, Stack, Text, Textarea } from "@chakra-ui/react";

export function TaskIntakeFlow() {
  const router = useRouter();
  const [draft, setDraft] = React.useState({ title: "", remainingMinutes: "", dueDate: "", notes: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  return (
    <Box
      as="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(draft),
          });
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? "create_failed");
          }
          setDraft({ title: "", remainingMinutes: "", dueDate: "", notes: "" });
          setMessage("保存しました。内容が落ち着くと自動で計画に反映されます。");
          window.dispatchEvent(new Event("task-platform:planning-changed"));
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "create_failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      <Stack gap="4">
        <label>
          <Text mb="1.5" fontSize="sm" fontWeight="600" color="#415552">タスク名</Text>
          <Input
            name="title"
            required
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="例: 資料を読む"
            borderColor="#d5dfdc"
            bg="white"
          />
        </label>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600" color="#415552">必要な時間</Text>
            <Input
              min="0.25"
              name="remainingMinutes"
              required
              step="0.25"
              type="number"
              inputMode="decimal"
              value={draft.remainingMinutes}
              onChange={(event) => setDraft((current) => ({ ...current, remainingMinutes: event.target.value }))}
              placeholder="時間"
              borderColor="#d5dfdc"
              bg="white"
            />
          </label>
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600" color="#415552">期限（任意）</Text>
            <Input
              name="dueDate"
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
              borderColor="#d5dfdc"
              bg="white"
            />
          </label>
        </Grid>
        <details>
          <summary style={{ cursor: "pointer", color: "#526360", fontSize: "0.875rem" }}>メモを追加</summary>
          <Box mt="3">
            <Textarea
              name="notes"
              rows={3}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="タスクについての補足"
              borderColor="#d5dfdc"
              bg="white"
            />
          </Box>
        </details>
        <Box>
          <Button
            type="submit"
            loading={loading}
            disabled={!draft.title.trim() || !draft.remainingMinutes}
            colorPalette="teal"
          >
            タスクを追加
          </Button>
          {message ? <Text mt="2" role="status" fontSize="sm" color="#27645d">{message}</Text> : null}
          {error ? <Text mt="2" role="alert" fontSize="sm" color="red.700">{error}</Text> : null}
        </Box>
      </Stack>
    </Box>
  );
}
