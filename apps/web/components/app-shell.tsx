import React, { type ReactNode } from "react";
import { cn } from "../lib/utils";

const navigationItems = [
  { href: "/", label: "今日" },
  { href: "/inbox", label: "受信箱" },
  { href: "/week", label: "計画" },
  { href: "/proposals", label: "提案" },
];

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8"
      data-app-shell="task-platform"
    >
      <header className="sticky top-0 z-20 rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.82)] px-5 py-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                Task Platform
              </p>
              <div className="space-y-2">
                <h1 className="text-[clamp(1.8rem,3.6vw,3.6rem)] font-semibold leading-none tracking-[-0.04em] text-slate-950">
                  考える量を減らし、
                  <br />
                  進める量を増やす。
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                  計画はまとめて整え、日々は今日のタスクだけを見るための個人用 planning
                  console。
                </p>
              </div>
            </div>
            <div className="grid gap-2 rounded-3xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <span className="font-medium text-slate-900">Control plane と data plane を分離</span>
              <span>受信箱 / 計画 / 提案で整え、今日は実行だけに集中します。</span>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50",
                  item.href === "/"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
