"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ClipboardCheck } from "lucide-react";
import { Modal } from "./ui/modal";

type WorkLogDialogProps = {
  taskId: string;
  title: string;
  date: string;
  defaultRemainingHours: number;
  triggerLabel?: string;
  selectableTasks?: Array<{ id: string; title: string }>;
  selectedTaskId?: string;
  onSelectedTaskIdChange?: (taskId: string) => void;
};

export function WorkLogDialog({
  taskId,
  title,
  date,
  defaultRemainingHours,
  triggerLabel = "作業を記録",
  selectableTasks,
  selectedTaskId,
  onSelectedTaskIdChange,
}: WorkLogDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [spentHours, setSpentHours] = React.useState("");
  const [remainingHours, setRemainingHours] = React.useState(String(defaultRemainingHours));
  const [markDone, setMarkDone] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (markDone) {
      setRemainingHours("0");
      return;
    }
    const spent = Number(spentHours);
    setRemainingHours(
      Number.isFinite(spent) && spent > 0
        ? String(Math.max(0, defaultRemainingHours - spent))
        : String(defaultRemainingHours),
    );
  }, [defaultRemainingHours, markDone, spentHours]);

  React.useEffect(() => {
    if (open) return;
    setSpentHours("");
    setNote("");
    setMarkDone(false);
    setRemainingHours(String(defaultRemainingHours));
  }, [defaultRemainingHours, open]);

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setError(false);
      }}
      description="進めた時間を記録し、残りの見積もりを更新します。"
      title={title}
      trigger={<Button colorPalette="teal" size="sm">{triggerLabel}</Button>}
    >
      <Box
        as="form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            const response = await fetch(`/api/tasks/${taskId}/log-work`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                date,
                spentMinutes: spentHours,
                remainingMinutesAfter: remainingHours,
                markDone,
                note,
              }),
            });
            if (!response.ok) throw new Error("failed to save work log");
            window.dispatchEvent(new Event("task-platform:planning-changed"));
            setOpen(false);
            router.refresh();
          } catch {
            setError(true);
          } finally {
            setSaving(false);
          }
        }}
      >
        <Stack gap="4">
          {error ? <Text role="alert" fontSize="sm" color="red.700">記録できませんでした。もう一度お試しください。</Text> : null}
          {selectableTasks?.length ? (
            <label>
              <Text mb="1.5" fontSize="sm" fontWeight="600">タスク</Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="タスク"
                  value={selectedTaskId}
                  onChange={(event) => onSelectedTaskIdChange?.(event.target.value)}
                >
                  {selectableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </label>
          ) : null}
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600">進めた時間</Text>
            <Input
              min="0.25"
              step="0.25"
              type="number"
              inputMode="decimal"
              required
              value={spentHours}
              onChange={(event) => setSpentHours(event.target.value)}
              placeholder="時間"
              borderColor="#d5dfdc"
            />
          </label>
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600">残り時間</Text>
            <Input
              min="0"
              step="0.25"
              type="number"
              inputMode="decimal"
              value={remainingHours}
              onChange={(event) => {
                setMarkDone(event.target.value === "0");
                setRemainingHours(event.target.value);
              }}
              borderColor="#d5dfdc"
            />
          </label>
          <Checkbox.Root checked={markDone} onCheckedChange={(details) => setMarkDone(details.checked === true)}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label fontSize="sm">完了としてマークする</Checkbox.Label>
          </Checkbox.Root>
          <label>
            <Text mb="1.5" fontSize="sm" fontWeight="600">メモ（任意）</Text>
            <Textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} borderColor="#d5dfdc" />
          </label>
          <Button type="submit" loading={saving} colorPalette="teal" alignSelf="flex-end">
            <ClipboardCheck size={17} />
            記録を保存
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
