import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createTaskInputSchema,
  logWorkInputSchema,
  setCapacityInputSchema,
} from "@task-platform/contracts";
import { z } from "zod";

type ScheduleStatus = "pending" | "approved" | "rejected" | "superseded";
type TaskStatus = "inbox" | "active" | "done" | "archived";
type TaskUrgency = "today" | "soon" | "normal";
type TaskType =
  | "deep"
  | "shallow"
  | "admin"
  | "research"
  | "writing"
  | "implementation"
  | "unknown";
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
    energy?: TaskEnergy;
    status?: TaskStatus;
    notes?: string;
  }): Promise<void>;
  logWork(input: z.infer<typeof logWorkInputSchema>): Promise<void>;
  getCapacity(input: { dateFrom: string; dateTo: string }): Promise<unknown[]>;
  setCapacity(input: z.infer<typeof setCapacityInputSchema>): Promise<void>;
  generateSchedule(input: { reason: string }): Promise<void>;
  getCurrentSchedule(): Promise<unknown>;
  listProposals(input?: { status?: ScheduleStatus }): Promise<unknown[]>;
  getProposal(input: { proposalId: string }): Promise<unknown>;
  approveProposal(input: { proposalId: string }): Promise<void>;
  rejectProposal(input: { proposalId: string; reason?: string }): Promise<void>;
  getMetrics(input: { dateFrom?: string; dateTo?: string }): Promise<unknown>;
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
        taskType: z
          .enum(["deep", "shallow", "admin", "research", "writing", "implementation", "unknown"])
          .optional(),
        energy: z.enum(["low", "medium", "high", "unknown"]).optional(),
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
    "schedule_generate",
    {
      description: "Generate a new pending schedule proposal.",
      inputSchema: { reason: z.string().min(1) },
    },
    async (input) => {
      await deps.generateSchedule(input);
      return { content: [{ type: "text", text: "schedule generated" }] };
    },
  );

  server.registerTool(
    "schedule_get_current",
    {
      description: "Get the current approved schedule.",
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getCurrentSchedule()) }],
    }),
  );

  server.registerTool(
    "schedule_list_proposals",
    {
      description: "List schedule proposals by status.",
      inputSchema: {
        status: z.enum(["pending", "approved", "rejected", "superseded"]).optional(),
      },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.listProposals(input)) }],
    }),
  );

  server.registerTool(
    "schedule_get_proposal",
    {
      description: "Get a single schedule proposal.",
      inputSchema: { proposalId: z.string().min(1) },
    },
    async (input) => ({
      content: [{ type: "text", text: JSON.stringify(await deps.getProposal(input)) }],
    }),
  );

  server.registerTool(
    "schedule_approve",
    {
      description: "Approve a pending schedule proposal.",
      inputSchema: { proposalId: z.string().min(1) },
    },
    async (input) => {
      await deps.approveProposal(input);
      return { content: [{ type: "text", text: "proposal approved" }] };
    },
  );

  server.registerTool(
    "schedule_reject",
    {
      description: "Reject a pending schedule proposal.",
      inputSchema: {
        proposalId: z.string().min(1),
        reason: z.string().optional(),
      },
    },
    async (input) => {
      await deps.rejectProposal(input);
      return { content: [{ type: "text", text: "proposal rejected" }] };
    },
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

  return server;
}
