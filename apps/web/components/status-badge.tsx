import React from "react";
import { Badge } from "./ui/badge";

export function StatusBadge({
  children,
  tone = "default",
}: Readonly<{
  children: React.ReactNode;
  tone?: "default" | "secondary" | "outline" | "warning" | "success" | "danger";
}>) {
  return (
    <Badge className="rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]" variant={tone}>
      {children}
    </Badge>
  );
}
