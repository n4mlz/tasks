import React, { type ReactNode } from "react";
import { cn } from "../lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between",
        compact && "gap-2",
      )}
    >
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
