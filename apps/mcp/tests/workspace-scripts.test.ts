import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("workspace scripts", () => {
  it("defines a root dev script that starts web and mcp together", () => {
    const packageJsonPath = fileURLToPath(new URL("../../../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toBeDefined();
    expect(packageJson.scripts?.dev).toContain("pnpm dev:web");
    expect(packageJson.scripts?.dev).toContain("pnpm dev:mcp");
  });

  it("defines runnable MCP scripts for stdio clients", () => {
    const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toContain("src/main.ts");
    expect(packageJson.scripts?.start).toBe("node --import tsx src/main.ts");
  });
});
