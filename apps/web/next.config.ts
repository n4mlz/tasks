import type { NextConfig } from "next";
import path from "node:path";

function parseAllowedDevOrigins(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : undefined;
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: parseAllowedDevOrigins(process.env.ALLOWED_DEV_ORIGINS),
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
