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
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6"
      data-app-shell="task-platform"
    >
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[rgba(248,250,252,0.92)] py-3 backdrop-blur">
        <nav className="flex flex-wrap items-center gap-2">
          <span className="mr-3 text-sm font-semibold tracking-[-0.02em] text-slate-900">Task Platform</span>
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900",
                item.href === "/" ? "bg-white text-slate-950 shadow-sm" : "",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
