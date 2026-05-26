import { describe, expect, it } from "vitest";
import { resolveLaunchOptions } from "../src/main.js";

describe("resolveLaunchOptions", () => {
  it("defaults to stdio transport", () => {
    const options = resolveLaunchOptions([], {});

    expect(options.transport).toBe("stdio");
    expect(options.host).toBe("127.0.0.1");
    expect(options.port).toBe(3100);
    expect(options.path).toBe("/mcp");
  });

  it("accepts http transport settings from args and env", () => {
    const options = resolveLaunchOptions(
      ["--transport=http", "--path=custom-mcp"],
      {
        TASK_PLATFORM_MCP_HOST: "0.0.0.0",
        TASK_PLATFORM_MCP_PORT: "4100",
        TASK_PLATFORM_MCP_ALLOWED_HOSTS: "mcp.example.com,localhost",
      },
    );

    expect(options.transport).toBe("http");
    expect(options.host).toBe("0.0.0.0");
    expect(options.port).toBe(4100);
    expect(options.path).toBe("/custom-mcp");
    expect(options.allowedHosts).toEqual(["mcp.example.com", "localhost"]);
  });
});
