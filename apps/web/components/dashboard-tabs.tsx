"use client";

import React from "react";
import { cn } from "../lib/utils";

export function DashboardTabs() {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "task">("weekly");

  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label="ダッシュボード切替"
        className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "weekly"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "weekly" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("weekly")}
        >
          週次
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "task"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "task" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("task")}
        >
          タスク別
        </button>
      </div>

      <div role="tabpanel" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {activeTab === "weekly" ? "週次の集計を表示します。" : "タスク別の集計を表示します。"}
      </div>
    </div>
  );
}
