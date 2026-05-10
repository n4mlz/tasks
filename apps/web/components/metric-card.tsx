import React, { type ReactNode } from "react";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: Readonly<{
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
  icon?: ReactNode;
}>) {
  return (
    <Card
      className={cn(
        "border-white/70 bg-white/92 shadow-[0_12px_38px_rgba(15,23,42,0.06)]",
        tone === "warning" && "border-amber-200/80 bg-amber-50/85",
        tone === "success" && "border-emerald-200/80 bg-emerald-50/75",
        tone === "danger" && "border-rose-200/80 bg-rose-50/75",
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
          {hint ? <p className="text-sm leading-5 text-slate-600">{hint}</p> : null}
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
