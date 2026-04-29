import React, { type ReactNode } from "react";
import "./globals.css";
import { AppShell } from "../components/app-shell";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
