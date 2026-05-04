"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

const navigationItems = [
  { href: "/", label: "今日" },
  { href: "/inbox", label: "Inbox" },
  { href: "/week", label: "計画" },
  { href: "/logs", label: "ログ" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900",
              isActive ? "bg-white text-slate-950 shadow-sm" : "",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </>
  );
}
