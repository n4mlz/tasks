import React, { type ReactNode } from "react";
import "./globals.css";
import { AppShell } from "../components/app-shell";
import { Provider } from "../components/ui/provider";

export const metadata = {
  applicationName: "Task Platform",
  title: "Task Platform",
  description: "タスクと日々の計画を管理します。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "Task Platform",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <Provider>
          <AppShell>{children}</AppShell>
        </Provider>
      </body>
    </html>
  );
}
