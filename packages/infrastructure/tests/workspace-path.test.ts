import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveWorkspacePath, resolveWorkspaceRoot } from "../src/workspace-path";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("resolveWorkspacePath", () => {
  it("finds the workspace root from a nested app directory", () => {
    process.chdir(path.resolve(originalCwd, "apps/web"));

    expect(resolveWorkspaceRoot()).toBe(originalCwd);
  });

  it("finds a workspace file from the repository root", () => {
    const resolved = resolveWorkspacePath("packages/infrastructure/migrations/001_initial.sql");

    expect(resolved.endsWith("packages/infrastructure/migrations/001_initial.sql")).toBe(true);
  });

  it("finds a workspace file from a nested app directory", () => {
    process.chdir(path.resolve(originalCwd, "apps/web"));

    const resolved = resolveWorkspacePath("packages/infrastructure/migrations/001_initial.sql");

    expect(resolved.endsWith("packages/infrastructure/migrations/001_initial.sql")).toBe(true);
  });

  it("throws a clear error when the target does not exist in any ancestor", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-platform-path-"));

    try {
      process.chdir(tempDir);

      expect(() => resolveWorkspaceRoot()).toThrow("Could not resolve workspace root");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
