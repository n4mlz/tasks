import React, { type ReactNode } from "react";
import { NavLinks } from "./nav-links";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6"
      data-app-shell="task-platform"
    >
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[rgba(248,250,252,0.92)] py-3 backdrop-blur">
        <nav className="flex flex-wrap items-center gap-2">
          <span className="mr-3 text-sm font-semibold tracking-[-0.02em] text-slate-900">Task Platform</span>
          <NavLinks />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
