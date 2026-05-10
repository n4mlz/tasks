import { createTask } from "@task-platform/domain";
import { describe, expect, it } from "vitest";
import {
  createDatabase,
  migrate,
  SqliteDashboardRepository,
  SqliteScheduleRepository,
  SqliteTaskRepository,
  SqliteWorkLogRepository,
} from "../src/index";

describe("SqliteDashboardRepository", () => {
  it("aggregates planned and actual minutes by week", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const taskRepository = new SqliteTaskRepository(db);
    const scheduleRepository = new SqliteScheduleRepository(db);
    const workLogRepository = new SqliteWorkLogRepository(db);

    await taskRepository.save(
      createTask({
        id: "task-weekly",
        title: "Write report",
        remainingMinutes: 120,
        createdAt: "2026-03-16T00:00:00.000Z",
      }),
    );

    await scheduleRepository.saveCurrentSchedule({
      id: "schedule-weekly",
      reason: "manual",
      generatedAt: "2026-05-07T00:00:00.000Z",
      horizonStart: "2026-03-16",
      horizonEnd: "2026-05-10",
      slices: [
        { taskId: "task-weekly", date: "2026-05-05", plannedMinutes: 180, kind: "focus" },
        { taskId: "task-weekly", date: "2026-05-06", plannedMinutes: 120, kind: "focus" },
      ],
      riskFlags: [],
      summary: {
        riskFlags: [],
        unscheduledTaskIds: [],
        capacityPressureByDate: {},
      },
    });

    await workLogRepository.append({
      id: "log-weekly-1",
      taskId: "task-weekly",
      date: "2026-05-05",
      spentMinutes: 90,
      remainingMinutesAfter: 30,
      note: "",
    });
    await workLogRepository.append({
      id: "log-weekly-2",
      taskId: "task-weekly",
      date: "2026-05-06",
      spentMinutes: 150,
      remainingMinutesAfter: 0,
      note: "",
    });

    const repository = new SqliteDashboardRepository(db);
    const summary = await repository.getWeeklySummary({
      endDate: "2026-05-07",
      weeks: 8,
    });

    expect(summary).toHaveLength(8);
    expect(summary.at(-1)).toEqual({
      weekStart: "2026-05-04",
      plannedMinutes: 300,
      actualMinutes: 240,
      completedTaskCount: 1,
      completionRate: 0.8,
    });
  });

  it("aggregates one task timeline and header metrics", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const taskRepository = new SqliteTaskRepository(db);
    const scheduleRepository = new SqliteScheduleRepository(db);
    const workLogRepository = new SqliteWorkLogRepository(db);

    await taskRepository.save(
      createTask({
        id: "task-crypto",
        title: "Crypto 予習",
        remainingMinutes: 180,
        createdAt: "2026-03-16T00:00:00.000Z",
        dueDate: "2026-05-10",
      }),
    );

    await scheduleRepository.saveCurrentSchedule({
      id: "schedule-task",
      reason: "manual",
      generatedAt: "2026-05-07T00:00:00.000Z",
      horizonStart: "2026-03-16",
      horizonEnd: "2026-05-10",
      slices: [
        { taskId: "task-crypto", date: "2026-05-05", plannedMinutes: 180, kind: "focus" },
        { taskId: "task-crypto", date: "2026-05-06", plannedMinutes: 60, kind: "focus" },
      ],
      riskFlags: [],
      summary: {
        riskFlags: [],
        unscheduledTaskIds: [],
        capacityPressureByDate: {},
      },
    });

    await workLogRepository.append({
      id: "log-task-1",
      taskId: "task-crypto",
      date: "2026-05-05",
      spentMinutes: 120,
      remainingMinutesAfter: 240,
      note: "",
    });
    await workLogRepository.append({
      id: "log-task-2",
      taskId: "task-crypto",
      date: "2026-05-06",
      spentMinutes: 120,
      remainingMinutesAfter: 180,
      note: "",
    });

    const repository = new SqliteDashboardRepository(db);
    const timeline = await repository.getTaskTimeline({
      taskId: "task-crypto",
      endDate: "2026-05-07",
      weeks: 8,
    });

    expect(timeline.header).toEqual({
      taskId: "task-crypto",
      title: "Crypto 予習",
      totalEstimatedMinutes: 420,
      remainingMinutes: 180,
      loggedMinutes: 240,
      progressRate: 240 / 420,
      dueDate: "2026-05-10",
    });
    expect(timeline.buckets).toHaveLength(8);
    expect(timeline.buckets.at(-1)).toEqual({
      weekStart: "2026-05-04",
      plannedMinutes: 240,
      actualMinutes: 240,
    });
  });
});
