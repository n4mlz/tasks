import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
      "@task-platform/application": path.resolve(__dirname, "packages/application/src/index.ts"),
      "@task-platform/contracts": path.resolve(__dirname, "packages/contracts/src/index.ts"),
      "@task-platform/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@task-platform/infrastructure": path.resolve(
        __dirname,
        "packages/infrastructure/src/index.ts",
      ),
      "@task-platform/scheduler": path.resolve(__dirname, "packages/scheduler/src/index.ts"),
    },
  },
  test: {
    projects: [
      "packages/*",
      "apps/*",
    ],
  },
});
