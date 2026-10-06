"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Grid, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { Modal } from "./ui/modal";

type InboxTaskFormProps = {
  taskId: string;
  defaultTitle: string;
  defaultRemainingHours: number;
  defaultDueDate: string | null;
  defaultDone: boolean;
  defaultNotes: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function InboxTaskForm({
  taskId,
  defaultTitle,
  defaultRemainingHours,
  defaultDueDate,
  defaultDone,
  defaultNotes,
  open,
  onOpenChange,
}: InboxTaskFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(false);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("failed to update task");
      setSaved(true);
      window.dispatchEvent(new Event("task-platform:planning-changed"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="タスクを編集"
      description="タスクの内容を更新します。"
      trigger={open === undefined ? <Button size="sm" variant="outline" borderColor="#d5dfdc">編集</Button> : undefined}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="4">
        <label>
          <Text mb="1.5" fontSize="sm" fontWeight="600">タスク名</Text>
          <Input name="title" defaultValue={defaultTitle} required borderColor="#d5dfdc" />
        </label>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600">残り時間</Text>
            <Input
              name="remainingMinutes"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.25"
              defaultValue={defaultRemainingHours}
              borderColor="#d5dfdc"
            />
          </label>
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600">期限</Text>
            <Input name="dueDate" type="date" defaultValue={defaultDueDate ?? ""} borderColor="#d5dfdc" />
          </label>
        </Grid>
        <label>
          <Text mb="1.5" fontSize="sm" fontWeight="600">メモ</Text>
          <Textarea name="notes" rows={4} defaultValue={defaultNotes} borderColor="#d5dfdc" />
        </label>
        <Checkbox.Root defaultChecked={defaultDone} name="done" value="true">
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">完了として扱う</Checkbox.Label>
        </Checkbox.Root>
        {saved ? <Text role="status" fontSize="sm" color="#27645d">更新しました。</Text> : null}
        {error ? <Text role="alert" fontSize="sm" color="red.700">更新できませんでした。入力内容を確認して、もう一度お試しください。</Text> : null}
        <Button type="submit" loading={saving} colorPalette="teal" alignSelf="flex-end">
          変更を保存
        </Button>
        </Stack>
      </form>
    </Modal>
  );
}
