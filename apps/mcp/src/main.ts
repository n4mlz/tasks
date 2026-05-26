import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { pathToFileURL } from "node:url";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createTaskPlatformRuntime, type McpTaskPlatform } from "./runtime.js";
import { createMcpServer } from "./server.js";

type LaunchTransport = "stdio" | "http";

type LaunchOptions = {
  transport: LaunchTransport;
  host: string;
  port: number;
  path: string;
  allowedHosts?: string[];
};

type SessionState = {
  server: ReturnType<typeof createRuntimeMcpServer>;
  transport: StreamableHTTPServerTransport;
};

function parseList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function parseNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveLaunchOptions(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): LaunchOptions {
  const argMap = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...valueParts] = arg.slice(2).split("=");
    argMap.set(key, valueParts.join("=") || "true");
  }

  const transportValue =
    argMap.get("transport") ?? env.TASK_PLATFORM_MCP_TRANSPORT ?? "stdio";
  const transport: LaunchTransport = transportValue === "http" ? "http" : "stdio";

  const host =
    argMap.get("host") ??
    env.TASK_PLATFORM_MCP_HOST ??
    (transport === "http" ? "127.0.0.1" : "127.0.0.1");
  const port = parseNumber(argMap.get("port") ?? env.TASK_PLATFORM_MCP_PORT, 3100);
  const path = argMap.get("path") ?? env.TASK_PLATFORM_MCP_PATH ?? "/mcp";
  const allowedHosts = parseList(
    argMap.get("allowed-hosts") ?? env.TASK_PLATFORM_MCP_ALLOWED_HOSTS,
  );

  return {
    transport,
    host,
    port,
    path: path.startsWith("/") ? path : `/${path}`,
    allowedHosts,
  };
}

export function createRuntimeMcpServer(
  taskPlatform: McpTaskPlatform = createTaskPlatformRuntime(),
) {
  return createMcpServer({
    listTasks: taskPlatform.listTasks,
    createTask: taskPlatform.createTask,
    updateTask: taskPlatform.updateTask,
    deleteTask: taskPlatform.deleteTask,
    logWork: taskPlatform.logWork,
    listWorkLogs: taskPlatform.listWorkLogs,
    getCapacity: taskPlatform.getCapacity,
    setCapacity: taskPlatform.setCapacity,
    getCurrentSchedule: taskPlatform.getCurrentSchedule,
    getMetrics: taskPlatform.getMetrics,
    getPlanningHealth: taskPlatform.getPlanningHealth,
    getSchedulerStatus: taskPlatform.getSchedulerStatus,
    postponeScheduler: taskPlatform.postponeScheduler,
    listSchedulerLogs: taskPlatform.listSchedulerLogs,
    runSchedulerTick: taskPlatform.runSchedulerTick,
  });
}

function readSessionId(header: string | string[] | undefined): string | null {
  if (Array.isArray(header)) {
    return header[0] ?? null;
  }
  return header ?? null;
}

function sendJsonRpcError(
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
    };
  },
  statusCode: number,
  code: number,
  message: string,
) {
  res.status(statusCode).json({
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id: null,
  });
}

export function createHttpApp(options: LaunchOptions) {
  const sessions = new Map<string, SessionState>();
  const app = createMcpExpressApp({
    host: options.host,
    allowedHosts: options.allowedHosts,
  });

  app.post(options.path, async (req: any, res: any) => {
    try {
      const sessionId = readSessionId(req.headers["mcp-session-id"]);
      if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
          sendJsonRpcError(res, 404, -32001, "Unknown MCP session ID.");
          return;
        }
        await existing.transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        sendJsonRpcError(res, 400, -32000, "Missing MCP session ID for non-initialize request.");
        return;
      }

      const server = createRuntimeMcpServer();
      let transport: StreamableHTTPServerTransport;
      let sessionClosed = false;
      transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          sessions.set(initializedSessionId, { server, transport });
        },
      });

      transport.onclose = () => {
        if (sessionClosed) return;
        sessionClosed = true;
        const activeSessionId = transport.sessionId;
        if (activeSessionId) {
          sessions.delete(activeSessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Failed to handle MCP POST request", error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, "Internal MCP server error.");
      }
    }
  });

  app.get(options.path, async (req: any, res: any) => {
    const sessionId = readSessionId(req.headers["mcp-session-id"]);
    if (!sessionId) {
      sendJsonRpcError(res, 400, -32000, "Missing MCP session ID.");
      return;
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      sendJsonRpcError(res, 404, -32001, "Unknown MCP session ID.");
      return;
    }

    await existing.transport.handleRequest(req, res);
  });

  app.delete(options.path, async (req: any, res: any) => {
    const sessionId = readSessionId(req.headers["mcp-session-id"]);
    if (!sessionId) {
      sendJsonRpcError(res, 400, -32000, "Missing MCP session ID.");
      return;
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      sendJsonRpcError(res, 404, -32001, "Unknown MCP session ID.");
      return;
    }

    await existing.transport.handleRequest(req, res);
  });

  app.get("/", (_req: any, res: any) => {
    res.status(200).json({
      name: "task-platform-mcp",
      transport: "streamable-http",
      endpoint: options.path,
    });
  });

  return { app, sessions };
}

export async function startStdioServer() {
  const server = createRuntimeMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function listenHttpServer(options: LaunchOptions): Promise<Server> {
  const { app } = createHttpApp(options);

  return new Promise<Server>((resolve, reject) => {
    const listener = app.listen(options.port, options.host, () => {
      listener.ref();
      const address = listener.address();
      const resolvedPort =
        address && typeof address === "object" ? address.port : options.port;
      console.log(
        `Task Platform MCP HTTP listening on http://${options.host}:${resolvedPort}${options.path}`,
      );
      resolve(listener);
    });
    listener.on("error", reject);
  });
}

async function closeHttpServer(listener: Server) {
  await new Promise<void>((resolve, reject) => {
    listener.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function startHttpServer(options: LaunchOptions) {
  const listener = await listenHttpServer(options);

  await new Promise<void>((resolve, reject) => {
    let closed = false;

    const shutdown = async () => {
      if (closed) return;
      closed = true;
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
      try {
        await closeHttpServer(listener);
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    const handleSignal = () => {
      void shutdown();
    };

    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);
  });
}

export async function startServer(
  options: LaunchOptions = resolveLaunchOptions(),
) {
  if (options.transport === "http") {
    await startHttpServer(options);
    return;
  }
  await startStdioServer();
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
