import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTaskPlatformRuntime, type McpTaskPlatform } from "./runtime.js";
import { createMcpServer } from "./server.js";

export function createRuntimeMcpServer(taskPlatform: McpTaskPlatform = createTaskPlatformRuntime()) {
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

export async function startStdioServer() {
  const server = createRuntimeMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  startStdioServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
