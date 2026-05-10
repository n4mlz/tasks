"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type CapacityDayDialogProps = {
  date: string;
  dayLabel: string;
  availableHours: string;
  plannedHoursText: string;
  tasks: string[];
};

export function CapacityDayDialog({
  date,
  dayLabel,
  availableHours,
  plannedHoursText,
  tasks,
}: CapacityDayDialogProps) {
  return (
    <Modal
      description={plannedHoursText}
      title={`${date} の余力時間`}
      trigger={
        <button
          className="flex h-full min-h-28 w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          type="button"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{dayLabel}</span>
            <CalendarDays className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-sm text-slate-700">
            {availableHours ? `${availableHours} 時間` : "未設定"}
          </div>
          {tasks.length > 0 ? (
            <div className="mt-3 line-clamp-2 text-xs text-slate-500">{tasks.join(" / ")}</div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">クリックして編集</div>
          )}
          <div className="mt-auto pt-3">
            <span className="inline-flex rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
              編集
            </span>
          </div>
        </button>
      }
    >
      <form action="/api/capacity" className="grid gap-4" method="post">
        <input name="date" type="hidden" value={date} />
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          余力時間 (時間)
          <Input
            aria-label="余力時間 (時間)"
            defaultValue={availableHours}
            inputMode="decimal"
            min="0"
            name="availableMinutes"
            placeholder="0"
            step="0.25"
            type="number"
          />
        </label>
        {tasks.length > 0 ? (
          <div className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium text-slate-900">この日の配分</span>
            {tasks.map((task) => (
              <div key={task}>{task}</div>
            ))}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Modal>
  );
}
