"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";

type WorkLogDialogProps = {
  taskId: string;
  title: string;
  date: string;
  defaultRemainingHours: number;
};

export function WorkLogDialog({
  taskId,
  title,
  date,
  defaultRemainingHours,
}: WorkLogDialogProps) {
  const [spentHours, setSpentHours] = React.useState("");
  const [remainingHours, setRemainingHours] = React.useState(defaultRemainingHours.toString());
  const [markDone, setMarkDone] = React.useState(false);

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

  return (
    <Modal
      description="進めた時間と残り見積もりを更新します。"
      title={title}
      trigger={<Button type="button">作業記録</Button>}
    >
      <form action={`/api/tasks/${taskId}/log-work`} className="grid gap-4" method="post">
        <input name="date" type="hidden" value={date} />
        <input name="markDone" type="hidden" value={markDone ? "true" : "false"} />
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          進めた時間 (時間)
          <Input
            min="0.25"
            name="spentMinutes"
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
            name="remainingMinutesAfter"
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
          <Input name="note" />
        </label>
        <div className="flex justify-end">
          <Button type="submit">
            <ClipboardCheck className="h-4 w-4" />
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
