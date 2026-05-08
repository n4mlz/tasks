"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";
import { Select } from "./ui/select";

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
  triggerLabel = "作業記録",
  selectableTasks,
  selectedTaskId,
  onSelectedTaskIdChange,
}: WorkLogDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [spentHours, setSpentHours] = React.useState("");
  const [remainingHours, setRemainingHours] = React.useState(defaultRemainingHours.toString());
  const [markDone, setMarkDone] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (markDone) {
      setRemainingHours("0");
      return;
    }

    const spent = Number(spentHours);
    if (!Number.isFinite(spent) || spent <= 0) {
      setRemainingHours(defaultRemainingHours.toString());
      return;
    }

    setRemainingHours(Math.max(0, defaultRemainingHours - spent).toString());
  }, [defaultRemainingHours, markDone, spentHours]);

  React.useEffect(() => {
    if (!open) {
      setSpentHours("");
      setNote("");
      setMarkDone(false);
      setRemainingHours(defaultRemainingHours.toString());
    }
  }, [defaultRemainingHours, open]);

  return (
    <Modal
      description="進めた時間と残り見積もりを更新します。"
      onOpenChange={setOpen}
      open={open}
      title={title}
      trigger={<Button type="button">{triggerLabel}</Button>}
    >
      <form
        className="grid gap-4"
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
            if (!response.ok) {
              throw new Error("failed to save work log");
            }
            window.dispatchEvent(new Event("task-platform:planning-changed"));
            setOpen(false);
            router.refresh();
          } finally {
            setSaving(false);
          }
        }}
      >
        {selectableTasks?.length ? (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            task
            <Select
              aria-label="task"
              onChange={(event) => onSelectedTaskIdChange?.(event.target.value)}
              value={selectedTaskId}
            >
              {selectableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          進めた時間 (時間)
          <Input
            min="0.25"
            onChange={(event) => setSpentHours(event.target.value)}
            step="0.25"
            type="number"
            value={spentHours}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          残り時間 (時間)
          <Input
            min="0"
            onChange={(event) => {
              setMarkDone(event.target.value === "0");
              setRemainingHours(event.target.value);
            }}
            step="0.25"
            type="number"
            value={remainingHours}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            checked={markDone}
            className="h-4 w-4 rounded border-slate-300"
            onChange={(event) => setMarkDone(event.target.checked)}
            type="checkbox"
          />
          完了としてマークする
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          メモ
          <Input onChange={(event) => setNote(event.target.value)} value={note} />
        </label>
        <div className="flex justify-end">
          <Button disabled={saving} type="submit">
            <ClipboardCheck className="h-4 w-4" />
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
