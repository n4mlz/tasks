import { describe, expect, it } from "vitest";
import {
  buildScheduleProposal,
  createDayCapacity,
  createTask,
} from "../src/index";

describe("schedule proposal generation", () => {
  it("uses a multi-day horizon and schedules before the due date", () => {
    const proposal = buildScheduleProposal({
      today: "2026-04-27",
      tasks: [
        createTask({
          id: "task_1",
          title: "Seminar draft",
          remainingMinutes: 180,
          createdAt: "2026-04-27T00:00:00.000Z",
          dueDate: "2026-05-01",
        }),
      ],
      capacities: [
        createDayCapacity({ date: "2026-04-27", availableMinutes: 60, bufferMinutes: 0 }),
        createDayCapacity({ date: "2026-04-28", availableMinutes: 60, bufferMinutes: 0 }),
        createDayCapacity({ date: "2026-04-29", availableMinutes: 60, bufferMinutes: 0 }),
        createDayCapacity({ date: "2026-04-30", availableMinutes: 60, bufferMinutes: 0 }),
      ],
    });

    expect(proposal.horizonEnd).toBe("2026-04-30");
    expect(proposal.slices).toHaveLength(3);
    expect(proposal.summary.unscheduledTaskIds).toEqual([]);
  });

  it("marks unscheduled work and capacity pressure", () => {
    const proposal = buildScheduleProposal({
      today: "2026-04-27",
      tasks: [
        createTask({
          id: "task_risky",
          title: "Big report",
          remainingMinutes: 300,
          createdAt: "2026-04-27T00:00:00.000Z",
          dueDate: "2026-04-29",
          taskType: "writing",
          energy: "high",
        }),
      ],
      capacities: [
        createDayCapacity({ date: "2026-04-27", availableMinutes: 60, bufferMinutes: 0 }),
        createDayCapacity({ date: "2026-04-28", availableMinutes: 60, bufferMinutes: 0 }),
      ],
    });

    expect(proposal.riskFlags).toContain(
      "task_risky:insufficient_capacity_before_due_date",
    );
    expect(proposal.summary.unscheduledTaskIds).toContain("task_risky");
    expect(proposal.summary.capacityPressureByDate["2026-04-27"]).toBeGreaterThan(0);
  });

  it("places urgency=today work on the current day first", () => {
    const tasks = [
      createTask({
        id: "task_today",
        title: "Reply to professor",
        remainingMinutes: 30,
        urgency: "today",
        createdAt: "2026-04-27T00:00:00.000Z",
      }),
    ];

    const capacities = [
      createDayCapacity({ date: "2026-04-27", availableMinutes: 120 }),
      createDayCapacity({ date: "2026-04-28", availableMinutes: 120 }),
    ];

    const proposal = buildScheduleProposal({
      today: "2026-04-27",
      tasks,
      capacities,
    });

    expect(proposal.slices).toEqual([
      {
        taskId: "task_today",
        date: "2026-04-27",
        plannedMinutes: 30,
        kind: "focus",
      },
    ]);
  });

  it("raises a risk flag when work cannot fit before the deadline", () => {
    const tasks = [
      createTask({
        id: "task_deadline",
        title: "Submit assignment",
        remainingMinutes: 400,
        dueDate: "2026-04-29",
        createdAt: "2026-04-27T00:00:00.000Z",
      }),
    ];

    const capacities = [
      createDayCapacity({ date: "2026-04-27", availableMinutes: 120 }),
      createDayCapacity({ date: "2026-04-28", availableMinutes: 120 }),
    ];

    const proposal = buildScheduleProposal({
      today: "2026-04-27",
      tasks,
      capacities,
    });

    expect(proposal.riskFlags).toContain(
      "task_deadline:insufficient_capacity_before_due_date",
    );
  });

  it("does not emit zero-minute slices", () => {
    const proposal = buildScheduleProposal({
      today: "2026-04-27",
      tasks: [
        createTask({
          id: "task_small",
          title: "Read notes",
          remainingMinutes: 25,
          createdAt: "2026-04-27T00:00:00.000Z",
        }),
      ],
      capacities: [
        createDayCapacity({
          date: "2026-04-27",
          availableMinutes: 25,
          bufferMinutes: 0,
        }),
      ],
    });

    expect(proposal.slices[0]?.plannedMinutes).toBe(25);
  });
});
