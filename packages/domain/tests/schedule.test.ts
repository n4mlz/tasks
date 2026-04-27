import { describe, expect, it } from "vitest";
import {
  buildScheduleProposal,
  createDayCapacity,
  createTask,
} from "../src/index";

describe("schedule proposal generation", () => {
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
