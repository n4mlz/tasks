import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server.js";

describe("createMcpServer", () => {
  it("registers the MVP task and schedule tools", () => {
    const server = createMcpServer({
      listTasks: async () => [],
      createTask: async () => undefined,
      updateTask: async () => undefined,
      logWork: async () => undefined,
      getCapacity: async () => [],
      setCapacity: async () => undefined,
      generateSchedule: async () => undefined,
      getCurrentSchedule: async () => ({ slices: [], riskFlags: [] }),
      listProposals: async () => [],
      getProposal: async () => null,
      approveProposal: async () => undefined,
      rejectProposal: async () => undefined,
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
        pendingProposalCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: [],
        warningCount: 0,
      }),
    });

    const toolNames = Object.keys((server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools);

    expect(toolNames).toContain("task_create");
    expect(toolNames).toContain("tasks_list");
    expect(toolNames).toContain("task_update");
    expect(toolNames).toContain("task_log_work");
    expect(toolNames).toContain("capacity_get");
    expect(toolNames).toContain("capacity_set");
    expect(toolNames).toContain("schedule_generate");
    expect(toolNames).toContain("schedule_get_current");
    expect(toolNames).toContain("schedule_list_proposals");
    expect(toolNames).toContain("schedule_get_proposal");
    expect(toolNames).toContain("schedule_approve");
    expect(toolNames).toContain("schedule_reject");
    expect(toolNames).toContain("metrics_get");
    expect(toolNames).toContain("planning_health_get");
  });

  it("exposes richer planning fields in MCP tool schemas", () => {
    const server = createMcpServer({
      listTasks: async () => [],
      createTask: async () => undefined,
      updateTask: async () => undefined,
      logWork: async () => undefined,
      getCapacity: async () => [],
      setCapacity: async () => undefined,
      generateSchedule: async () => undefined,
      getCurrentSchedule: async () => ({
        activeProposalId: "proposal_1",
        slices: [],
        summary: {
          riskFlags: [],
          unscheduledTaskIds: [],
          capacityPressureByDate: {},
        },
      }),
      listProposals: async () => [
        {
          id: "proposal_1",
          summary: {
            riskFlags: [],
            unscheduledTaskIds: ["task_1"],
            capacityPressureByDate: { "2026-04-28": 90 },
          },
        },
      ],
      getProposal: async () => ({
        id: "proposal_1",
        summary: {
          riskFlags: [],
          unscheduledTaskIds: ["task_1"],
          capacityPressureByDate: { "2026-04-28": 90 },
        },
      }),
      approveProposal: async () => undefined,
      rejectProposal: async () => undefined,
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
        pendingProposalCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: ["2026-04-29"],
        warningCount: 1,
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
        energy: "high",
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
        taskType: "deep",
        energy: "medium",
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
      generateSchedule: async () => undefined,
      getCurrentSchedule: async () => ({ slices: [], riskFlags: [] }),
      listProposals: async () => [],
      getProposal: async () => null,
      approveProposal: async () => undefined,
      rejectProposal: async () => undefined,
      getMetrics: async () => ({
        plannedMinutes: 0,
        actualMinutes: 0,
        completedMinutes: 0,
        atRiskTaskCount: 0,
        pendingProposalCount: 0,
      }),
      getPlanningHealth: async () => ({
        missingCapacityDatesWithin7Days: ["2026-04-29", "2026-05-01"],
        warningCount: 2,
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
