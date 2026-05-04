import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server.js";

describe("createMcpServer", () => {
  it("registers the monitoring and planning tools", () => {
    const server = createMcpServer({
      listTasks: async () => [],
      createTask: async () => undefined,
      updateTask: async () => undefined,
      logWork: async () => undefined,
      getCapacity: async () => [],
      setCapacity: async () => undefined,
      getCurrentSchedule: async () => ({ slices: [], riskFlags: [] }),
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: [],
        warningCount: 0,
      }),
      getSchedulerStatus: async () => ({
        schedulerStatus: "idle",
      }),
      listSchedulerLogs: async () => ({
        mutations: [],
        runs: [],
      }),
    });

    const toolNames = Object.keys((server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools);

    expect(toolNames).toContain("task_create");
    expect(toolNames).toContain("tasks_list");
    expect(toolNames).toContain("task_update");
    expect(toolNames).toContain("task_log_work");
    expect(toolNames).toContain("capacity_get");
    expect(toolNames).toContain("capacity_set");
    expect(toolNames).toContain("schedule_get_current");
    expect(toolNames).toContain("metrics_get");
    expect(toolNames).toContain("planning_health_get");
    expect(toolNames).toContain("scheduler_status_get");
    expect(toolNames).toContain("scheduler_logs_list");
  });

  it("exposes richer planning fields in MCP tool schemas", () => {
    const server = createMcpServer({
      listTasks: async () => [],
      createTask: async () => undefined,
      updateTask: async () => undefined,
      logWork: async () => undefined,
      getCapacity: async () => [],
      setCapacity: async () => undefined,
      getCurrentSchedule: async () => ({
        activeScheduleId: "schedule_1",
        slices: [],
        summary: {
          riskFlags: [],
          unscheduledTaskIds: [],
          capacityPressureByDate: {},
        },
      }),
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: ["2026-04-29"],
        warningCount: 1,
      }),
      getSchedulerStatus: async () => ({
        schedulerStatus: "pending",
      }),
      listSchedulerLogs: async () => ({
        mutations: [],
        runs: [],
      }),
    });

    const registeredTools = (server as unknown as {
      _registeredTools: Record<string, Record<string, unknown>>;
    })._registeredTools;
    const taskCreateSchema =
      (registeredTools.task_create.config as { inputSchema?: Record<string, unknown> } | undefined)
        ?.inputSchema ??
      (registeredTools.task_create.inputSchema as Record<string, unknown> | undefined);
    const taskUpdateSchema =
      (registeredTools.task_update.config as { inputSchema?: Record<string, unknown> } | undefined)
        ?.inputSchema ??
      (registeredTools.task_update.inputSchema as Record<string, unknown> | undefined);

    expect(taskCreateSchema).toBeTruthy();
    expect(taskUpdateSchema).toBeTruthy();

    if (
      taskCreateSchema &&
      typeof taskCreateSchema === "object" &&
      "safeParse" in taskCreateSchema &&
      typeof taskCreateSchema.safeParse === "function"
    ) {
      const result = taskCreateSchema.safeParse({
        title: "Draft proposal",
        remainingMinutes: 90,
        taskType: "writing",
        cognitiveLoad: "high",
        energy: "high",
        tags: ["頭使う", "執筆系"],
      });
      expect(result.success).toBe(true);
    }

    if (
      taskUpdateSchema &&
      typeof taskUpdateSchema === "object" &&
      "safeParse" in taskUpdateSchema &&
      typeof taskUpdateSchema.safeParse === "function"
    ) {
      const result = taskUpdateSchema.safeParse({
        taskId: "task_1",
        taskType: "implementation",
        cognitiveLoad: "high",
        energy: "medium",
        tags: ["頭使う", "実装系"],
      });
      expect(result.success).toBe(true);
    }
  });

  it("exposes a planning-health tool with an empty input schema", () => {
    const server = createMcpServer({
      listTasks: async () => [],
      createTask: async () => undefined,
      updateTask: async () => undefined,
      logWork: async () => undefined,
      getCapacity: async () => [],
      setCapacity: async () => undefined,
      getCurrentSchedule: async () => ({ slices: [], riskFlags: [] }),
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: ["2026-04-29", "2026-05-01"],
        warningCount: 2,
      }),
      getSchedulerStatus: async () => ({
        schedulerStatus: "idle",
      }),
      listSchedulerLogs: async () => ({
        mutations: [],
        runs: [],
      }),
    });

    const registeredTools = (server as unknown as {
      _registeredTools: Record<string, Record<string, unknown>>;
    })._registeredTools;
    const planningHealthSchema =
      (registeredTools.planning_health_get.config as { inputSchema?: Record<string, unknown> } | undefined)
        ?.inputSchema ??
      (registeredTools.planning_health_get.inputSchema as Record<string, unknown> | undefined);

    expect(planningHealthSchema).toBeTruthy();

    if (
      planningHealthSchema &&
      typeof planningHealthSchema === "object" &&
      "safeParse" in planningHealthSchema &&
      typeof planningHealthSchema.safeParse === "function"
    ) {
      const result = planningHealthSchema.safeParse({});
      expect(result.success).toBe(true);
    }
  });
});
