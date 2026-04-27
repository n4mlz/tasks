import React, { type ReactNode } from "react";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Today</a>
          <a href="/inbox">Inbox</a>
          <a href="/week">Week</a>
          <a href="/proposals">Proposals</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
