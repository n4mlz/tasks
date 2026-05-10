"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function TaskIntakeFlow() {
  const router = useRouter();
  const [draft, setDraft] = React.useState({
    title: "",
    remainingMinutes: "",
    dueDate: "",
    notes: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  return (
    <form
      className="grid gap-4"
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

          setDraft({
            title: "",
            remainingMinutes: "",
            dueDate: "",
            notes: "",
          });
          setMessage("保存しました。変更が落ち着いてから自動で再配分します。");
          window.dispatchEvent(new Event("task-platform:planning-changed"));
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "create_failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        タイトル
        <Input
          name="title"
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          value={draft.title}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          必要な時間 (時間)
          <Input
            min="0.25"
            name="remainingMinutes"
            onChange={(event) => setDraft((current) => ({ ...current, remainingMinutes: event.target.value }))}
            step="0.25"
            type="number"
            value={draft.remainingMinutes}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          期限
          <Input
            name="dueDate"
            onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
            type="date"
            value={draft.dueDate}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        メモ
        <Textarea
          name="notes"
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          rows={4}
          value={draft.notes}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={loading} type="submit">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          追加
        </Button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
