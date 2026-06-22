"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type SubmitState = "idle" | "loading" | "success";

type InboxTaskFormProps = {
  taskId: string;
  defaultTitle: string;
  defaultRemainingHours: number;
  defaultDueDate: string | null;
  defaultDone: boolean;
  taskType: string;
  cognitiveLoad: string;
  energy: string;
  defaultNotes: string;
};

export function InboxTaskForm({
  taskId,
  defaultTitle,
  defaultRemainingHours,
  defaultDueDate,
  defaultDone,
  taskType,
  cognitiveLoad,
  energy,
  defaultNotes,
}: InboxTaskFormProps) {
  const router = useRouter();
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");

    const formData = new FormData(event.currentTarget);
    const json: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      json[key] = value;
    });
    json.tags = [];

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!response.ok) return;
      setSubmitState("success");
      setTimeout(() => {
        setSubmitState("idle");
        router.refresh();
      }, 800);
    } catch {
      setSubmitState("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          タイトル
          <Input defaultValue={defaultTitle} name="title" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          残り時間 (時間)
          <Input
            defaultValue={defaultRemainingHours === 0 ? "0" : String(defaultRemainingHours)}
            min="0"
            name="remainingMinutes"
            step="0.25"
            type="number"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          期限
          <Input defaultValue={defaultDueDate ?? ""} name="dueDate" type="date" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          完了
          <input
            className="h-4 w-4 rounded border-slate-300 text-slate-950"
            defaultChecked={defaultDone}
            name="done"
            type="checkbox"
            value="true"
          />
        </label>
      </div>
      <input name="taskType" type="hidden" value={taskType} />
      <input name="cognitiveLoad" type="hidden" value={cognitiveLoad} />
      <input name="energy" type="hidden" value={energy} />
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        メモ
        <Textarea defaultValue={defaultNotes} name="notes" rows={3} />
      </label>
      <Button
        className="justify-self-start"
        disabled={submitState !== "idle"}
        type="submit"
        variant={submitState === "success" ? "outline" : "secondary"}
      >
        {submitState === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            送信中
          </>
        ) : submitState === "success" ? (
          <>
            <Check className="mr-2 h-4 w-4 text-green-600" />
            更新完了
          </>
        ) : (
          "更新"
        )}
      </Button>
    </form>
  );
}
