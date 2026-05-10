import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createTaskInputSchema,
  logWorkInputSchema,
  setCapacityInputSchema,
  taskCognitiveLoadSchema,
  taskEnergySchema,
  taskTypeSchema,
} from "@task-platform/contracts";
import { z } from "zod";

type TaskStatus = "inbox" | "active" | "done" | "archived";
type TaskUrgency = "today" | "soon" | "normal";
type TaskType = z.infer<typeof taskTypeSchema>;
type TaskCognitiveLoad = z.infer<typeof taskCognitiveLoadSchema>;
type TaskEnergy = "low" | "medium" | "high" | "unknown";

export function createMcpServer(deps: {
  listTasks(input?: { status?: TaskStatus; dueBefore?: string; scheduledOn?: string }): Promise<unknown[]>;
  createTask(input: z.infer<typeof createTaskInputSchema>): Promise<void>;
  updateTask(input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: TaskUrgency;
    taskType?: TaskType;
    cognitiveLoad?: TaskCognitiveLoad;
    energy?: TaskEnergy;
    tags?: string[];
    status?: TaskStatus;
    notes?: string;
  }): Promise<void>;
  deleteTask(input: { taskId: string }): Promise<void>;
  logWork(input: z.infer<typeof logWorkInputSchema>): Promise<void>;
  listWorkLogs(input?: {
    taskIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<unknown[]>;
  getCapacity(input: { dateFrom: string; dateTo: string }): Promise<unknown[]>;
  setCapacity(input: z.infer<typeof setCapacityInputSchema>): Promise<void>;
  getCurrentSchedule(): Promise<unknown>;
  getMetrics(input: { dateFrom?: string; dateTo?: string }): Promise<unknown>;
  getPlanningHealth(): Promise<unknown>;
  getSchedulerStatus(): Promise<unknown>;
  postponeScheduler(input: { delayMilliseconds: number }): Promise<void>;
  listSchedulerLogs(): Promise<unknown>;
}) {
  const server = new McpServer({
    name: "task-platform-mcp",
    version: "0.0.1",
  });

  server.registerTool(
    "task_create",
    {
      description: "Create a task in the inbox.",
      inputSchema: createTaskInputSchema.shape,
    },
    async (input) => {
      await deps.createTask(createTaskInputSchema.parse(input));
      return { content: [{ type: "text", text: "task created" }] };
    },
  );

  server.registerTool(
    "tasks_list",
    {
      description: "List tasks by optional filters.",
      inputSchema: {
        status: z.enum(["inbox", "active", "done", "archived"]).optional(),
        dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.listTasks(input)) }],
    }),
  );

  server.registerTool(
    "task_update",
    {
      description: "Update a task's planning fields.",
      inputSchema: {
        taskId: z.string().min(1),
        title: z.string().min(1).optional(),
        remainingMinutes: z.number().int().min(0).optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        urgency: z.enum(["today", "soon", "normal"]).optional(),
        taskType: taskTypeSchema.optional(),
        cognitiveLoad: taskCognitiveLoadSchema.optional(),
        energy: taskEnergySchema.optional(),
        tags: z.array(z.string().min(1)).optional(),
        status: z.enum(["inbox", "active", "done", "archived"]).optional(),
        notes: z.string().optional(),
      },
    },
    async (input) => {
      await deps.updateTask(input);
      return { content: [{ type: "text", text: "task updated" }] };
    },
  );

  server.registerTool(
    "task_delete",
    {
      description: "Delete a task.",
      inputSchema: {
        taskId: z.string().min(1),
      },
    },
    async (input) => {
      await deps.deleteTask(input);
      return { content: [{ type: "text", text: "task deleted" }] };
    },
  );

  server.registerTool(
    "task_log_work",
    {
      description: "Log spent time and the remaining estimate for a task.",
      inputSchema: logWorkInputSchema.shape,
    },
    async (input) => {
      await deps.logWork(logWorkInputSchema.parse(input));
      return { content: [{ type: "text", text: "work logged" }] };
    },
  );

  server.registerTool(
    "work_logs_list",
    {
      description: "List work logs by optional task ids and date range.",
      inputSchema: {
        taskIds: z.array(z.string().min(1)).optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.listWorkLogs(input)) }],
    }),
  );

  server.registerTool(
    "capacity_get",
    {
      description: "Get stored day capacities over a date range.",
      inputSchema: {
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getCapacity(input)) }],
    }),
  );

  server.registerTool(
    "capacity_set",
    {
      description: "Set or update day capacity.",
      inputSchema: setCapacityInputSchema.shape,
    },
    async (input) => {
      await deps.setCapacity(setCapacityInputSchema.parse(input));
      return { content: [{ type: "text", text: "capacity updated" }] };
    },
  );

  server.registerTool(
    "schedule_get_current",
    {
      description: "Get the current schedule.",
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getCurrentSchedule()) }],
    }),
  );

  server.registerTool(
    "metrics_get",
    {
      description: "Read progress metrics over an optional date range.",
      inputSchema: {
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getMetrics(input)) }],
    }),
  );

  server.registerTool(
    "planning_health_get",
    {
      description: "Read planning-health warnings such as missing near-term capacity dates.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getPlanningHealth()) }],
    }),
  );

  server.registerTool(
    "scheduler_status_get",
    {
      description: "Read scheduler timing and pending/running state.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getSchedulerStatus()) }],
    }),
  );

  server.registerTool(
    "scheduler_delay",
    {
      description: "Delay the next automatic scheduling run.",
      inputSchema: {
        delayMinutes: z.number().int().positive().default(3),
      },
    },
    async (input) => {
      await deps.postponeScheduler({
        delayMilliseconds: input.delayMinutes * 60_000,
      });
      return { content: [{ type: "text", text: "scheduler delayed" }] };
    },
  );

  server.registerTool(
    "scheduler_logs_list",
    {
      description: "Read recent planning mutations and scheduler runs.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await deps.listSchedulerLogs()) }],
    }),
  );

  return server;
}
