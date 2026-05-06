"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";

type PlanningCalendarPayload = {
  referenceDate: string;
  monthLabel: string;
  calendarDays: string[];
  monthStart: string;
  monthEnd: string;
  capacities: Array<{ date: string; availableMinutes: number }>;
  slicesByDate: Record<string, Array<{ taskTitle: string; plannedMinutes: number }>>;
};

type PlanningCalendarProps = {
  initialPayload: PlanningCalendarPayload;
  today: string;
};

function shiftMonth(referenceDate: string, months: number): string {
  const value = new Date(`${referenceDate.slice(0, 7)}-01T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function formatHours(minutes: number): string {
  if (minutes === 0) return "0";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(hours);
}

export function PlanningCalendar({ initialPayload, today }: PlanningCalendarProps) {
  const [payload, setPayload] = React.useState(initialPayload);
  const [jumpDate, setJumpDate] = React.useState(initialPayload.referenceDate);
  const [loading, setLoading] = React.useState(false);
  const [openDate, setOpenDate] = React.useState<string | null>(null);

  const loadMonth = React.useCallback(async (referenceDate: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/planning-month?referenceDate=${referenceDate}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("failed to load month");
      }
      const nextPayload = (await response.json()) as PlanningCalendarPayload;
      setPayload(nextPayload);
      setJumpDate(nextPayload.referenceDate);
    } finally {
      setLoading(false);
    }
  }, []);

  const capacityMap = React.useMemo(
    () => new Map(payload.capacities.map((capacity) => [capacity.date, capacity.availableMinutes])),
    [payload.capacities],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <h2 className="mr-3 text-lg font-semibold tracking-[-0.03em] text-slate-900">
          {payload.monthLabel}
        </h2>
        <Button onClick={() => loadMonth(shiftMonth(payload.referenceDate, -1))} type="button" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          前の月
        </Button>
        <Button onClick={() => loadMonth(today)} type="button" variant="outline">
          今日へ戻る
        </Button>
        <Button onClick={() => loadMonth(shiftMonth(payload.referenceDate, 1))} type="button" variant="outline">
          次の月
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void loadMonth(jumpDate);
          }}
        >
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            基準日
            <Input
              aria-label="基準日"
              onChange={(event) => setJumpDate(event.target.value)}
              type="date"
              value={jumpDate}
            />
          </label>
          <Button type="submit">移動</Button>
        </form>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:text-xs sm:tracking-[0.08em]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="bg-slate-50 px-1.5 py-2 text-center sm:px-3">
            {label}
          </div>
        ))}
      </div>
      <div
        className={`grid grid-cols-7 overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-slate-200 ${loading ? "opacity-60" : ""}`}
      >
        {payload.calendarDays.map((date) => {
          const availableMinutes = capacityMap.get(date) ?? 0;
          const slices = payload.slicesByDate[date] ?? [];
          const plannedMinutes = slices.reduce((sum, slice) => sum + slice.plannedMinutes, 0);
          const inMonth = date >= payload.monthStart && date <= payload.monthEnd;
          const isToday = date === today;

          return (
            <Modal
              key={date}
              description={plannedMinutes > 0 ? `配分 ${formatHours(plannedMinutes)} 時間` : "配分はありません"}
              onOpenChange={(open) => setOpenDate(open ? date : openDate === date ? null : openDate)}
              open={openDate === date}
              title={`${date} の余力時間`}
              trigger={
                <button
                  aria-label={`${date} を編集`}
                  className={`min-h-24 border-r border-b border-slate-200 px-1.5 py-2 text-left last:border-r-0 sm:min-h-28 sm:px-2 sm:py-2.5 lg:min-h-32 lg:px-3 lg:py-3 ${inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50 text-slate-400 hover:bg-slate-100"} ${isToday ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""}`}
                  type="button"
                >
                  <div className="mb-2 flex items-start justify-between gap-1 sm:mb-3 sm:gap-2">
                    <span
                      className={`text-xs font-semibold sm:text-sm ${isToday ? "text-amber-900" : "text-slate-900"}`}
                    >
                      {Number(date.slice(8, 10))}
                    </span>
                    {isToday ? <CalendarDays className="h-3.5 w-3.5 text-amber-700 sm:h-4 sm:w-4" /> : null}
                  </div>
                  <div
                    className={`text-[11px] leading-tight sm:text-xs lg:text-sm ${availableMinutes > 0 ? "text-slate-700" : "text-slate-400"}`}
                  >
                    {availableMinutes > 0 ? `${formatHours(availableMinutes)} 時間` : "未設定"}
                  </div>
                  {slices.length > 0 ? (
                    <div className="mt-2 grid gap-0.5 text-[10px] leading-tight text-slate-500 sm:mt-3 sm:gap-1 sm:text-[11px] lg:text-xs">
                      {slices.slice(0, 2).map((slice) => (
                        <div key={`${date}-${slice.taskTitle}`} className="truncate">
                          {slice.taskTitle} {formatHours(slice.plannedMinutes)}h
                        </div>
                      ))}
                    </div>
                  ) : null}
                </button>
              }
            >
              <CalendarEditForm
                availableHours={availableMinutes === 0 ? "" : formatHours(availableMinutes)}
                date={date}
                onSaved={async () => {
                  setOpenDate(null);
                  await loadMonth(payload.referenceDate);
                }}
                tasks={slices.map(
                  (slice) => `${slice.taskTitle} ${formatHours(slice.plannedMinutes)} 時間`,
                )}
              />
            </Modal>
          );
        })}
      </div>
    </div>
  );
}

function CalendarEditForm({
  date,
  availableHours,
  tasks,
  onSaved,
}: {
  date: string;
  availableHours: string;
  tasks: string[];
  onSaved: () => Promise<void> | void;
}) {
  const [hours, setHours] = React.useState(availableHours);
  const [saving, setSaving] = React.useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          const response = await fetch("/api/capacity", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              date,
              availableMinutes: Number(hours || "0"),
            }),
          });
          if (!response.ok) {
            throw new Error("failed to save capacity");
          }
          await onSaved();
          window.dispatchEvent(new Event("task-platform:planning-changed"));
        } finally {
          setSaving(false);
        }
      }}
    >
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        余力時間 (時間)
        <Input
          aria-label="余力時間 (時間)"
          inputMode="decimal"
          min="0"
          onChange={(event) => setHours(event.target.value)}
          placeholder="0"
          step="0.25"
          type="number"
          value={hours}
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
        <Button disabled={saving} type="submit">
          保存
        </Button>
      </div>
    </form>
  );
}
