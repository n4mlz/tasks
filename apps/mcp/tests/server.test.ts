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
  });
});
