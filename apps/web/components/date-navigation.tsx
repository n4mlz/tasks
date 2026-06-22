"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DateNavigationProps = {
  date: string;
};

export function DateNavigation({ date }: DateNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(direction: -1 | 1) {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", d.toISOString().slice(0, 10));
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  function goToToday() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  function formatDisplay(d: string): string {
    const dateObj = new Date(`${d}T00:00:00.000Z`);
    const month = dateObj.getUTCMonth() + 1;
    const day = dateObj.getUTCDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[dateObj.getUTCDay()];
    return `${month}/${day} (${weekday})`;
  }

  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        &larr; 前日
      </button>
      <span className="text-sm font-medium text-slate-700">
        {formatDisplay(date)}
      </span>
      {date !== todayDate && (
        <button
          type="button"
          onClick={goToToday}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          今日
        </button>
      )}
      <button
        type="button"
        onClick={() => navigate(1)}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        翌日 &rarr;
      </button>
    </div>
  );
}
