import React, { type ReactNode } from "react";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            '"IBM Plex Sans", "Avenir Next", "Hiragino Sans", "Noto Sans JP", sans-serif',
          background:
            "radial-gradient(circle at top left, #f8f0dd 0%, #f4efe6 40%, #ebe7df 100%)",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "24px 16px 48px",
          }}
        >
          <header
            style={{
              display: "grid",
              gap: 16,
              marginBottom: 24,
              position: "sticky",
              top: 0,
              zIndex: 10,
              paddingBottom: 8,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#7c5c2b",
                  }}
                >
                  Task Platform
                </p>
                <h1
                  style={{
                    margin: "8px 0 0",
                    fontSize: "clamp(2rem, 4vw, 3.5rem)",
                    lineHeight: 1,
                    color: "#172033",
                  }}
                >
                  Plan less manually.
                  <br />
                  Execute more calmly.
                </h1>
              </div>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(124,92,43,0.15)",
                  boxShadow: "0 18px 40px rgba(23, 32, 51, 0.08)",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "#5a6475" }}>
                  Control plane for planning. Data plane for today.
                </p>
              </div>
            </div>
            <nav
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
              }}
            >
              {[
                { href: "/", label: "Today" },
                { href: "/inbox", label: "Inbox" },
                { href: "/week", label: "Week" },
                { href: "/proposals", label: "Proposals" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#172033",
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(23, 32, 51, 0.08)",
                    boxShadow: "0 8px 20px rgba(23, 32, 51, 0.06)",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
