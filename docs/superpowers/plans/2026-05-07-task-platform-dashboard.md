# Task Platform Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated dashboard route with `週次` and `タスク別` tabs that visualizes the last 8 weeks of planned vs actual hours.

**Architecture:** Add read-only aggregate use cases in `packages/application` backed by new SQLite summary queries in `packages/infrastructure`. Surface the data through a new server-rendered dashboard page in `apps/web`, and render charts with focused chart wrapper components so the rest of the UI remains independent from the chart library.

**Tech Stack:** TypeScript, Next.js App Router, SQLite, Vitest, React Testing Library, Recharts

---

## File Structure

- Create: `packages/application/src/use-cases/get-dashboard-weekly-summary.ts`
  - Returns the last 8 weeks of planned vs actual totals and headline weekly metrics.
- Create: `packages/application/src/use-cases/get-dashboard-task-timeline.ts`
  - Returns a single task's last 8 weeks of planned vs actual totals plus task header metrics.
- Modify: `packages/application/src/ports.ts`
  - Add aggregate repository interfaces for the new dashboard reads.
- Modify: `packages/application/src/index.ts`
  - Export the new dashboard use cases.
- Create: `packages/infrastructure/src/sqlite-dashboard-repository.ts`
  - Implement weekly and task-specific SQLite aggregates.
- Modify: `packages/infrastructure/src/index.ts`
  - Export the new dashboard repository.
- Modify: `apps/web/lib/task-platform.ts`
  - Wire the new repository and expose dashboard read helpers.
- Create: `apps/web/app/dashboard/page.tsx`
  - Add the new dashboard route and server-side data loading.
- Create: `apps/web/components/dashboard-tabs.tsx`
  - Client tab switcher for `週次` and `タスク別`.
- Create: `apps/web/components/dashboard-weekly-chart.tsx`
  - Recharts wrapper for the weekly planned vs actual graph.
- Create: `apps/web/components/dashboard-task-chart.tsx`
  - Recharts wrapper for the per-task planned vs actual graph.
- Create: `apps/web/components/task-selector.tsx`
  - Compact selector for choosing the task shown in the task-specific tab.
- Modify: `apps/web/components/app-shell.tsx`
  - Add `ダッシュボード` to navigation.
- Modify: `apps/web/app/globals.css`
  - Add only the chart container and dashboard layout styles that are not already covered by utilities.
- Create: `packages/application/tests/dashboard-use-cases.test.ts`
  - Focused tests for weekly and task-specific aggregates.
- Create: `packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`
  - SQLite integration tests for weekly and task timeline queries.
- Create: `apps/web/tests/dashboard.test.tsx`
  - Render tests for the dashboard page and tabs.
- Modify: `README.md`
  - Document the new dashboard route and what it shows.

## Task 1: Add the dashboard repository contract

**Files:**
- Modify: `packages/application/src/ports.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/tests/dashboard-use-cases.test.ts`

- [ ] **Step 1: Write the failing repository-shape test**

```ts
import { describe, expect, it } from "vitest";
import type { DashboardRepository } from "../src/ports";

describe("dashboard repository port", () => {
  it("exposes weekly and task timeline readers", () => {
    const repository = {} as DashboardRepository;

    expect(typeof repository.getWeeklySummary).toBe("function");
    expect(typeof repository.getTaskTimeline).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/application/tests/dashboard-use-cases.test.ts`
Expected: FAIL because `DashboardRepository` does not exist or lacks the required methods.

- [ ] **Step 3: Add the port and export**

```ts
export type DashboardWeeklyBucket = {
  weekStart: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedTaskCount: number;
  completionRate: number;
};

export type DashboardTaskBucket = {
  weekStart: string;
  plannedMinutes: number;
  actualMinutes: number;
};

export type DashboardTaskHeader = {
  taskId: string;
  title: string;
  totalEstimatedMinutes: number;
  remainingMinutes: number;
  loggedMinutes: number;
  progressRate: number;
  dueDate: string | null;
};

export interface DashboardRepository {
  getWeeklySummary(input: {
    endDate: string;
    weeks: number;
  }): Promise<DashboardWeeklyBucket[]>;
  getTaskTimeline(input: {
    taskId: string;
    endDate: string;
    weeks: number;
  }): Promise<{
    header: DashboardTaskHeader;
    buckets: DashboardTaskBucket[];
  }>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/application/tests/dashboard-use-cases.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/application/src/ports.ts packages/application/src/index.ts packages/application/tests/dashboard-use-cases.test.ts
git commit -m "feat: add dashboard repository contracts"
```

## Task 2: Add the application use cases

**Files:**
- Create: `packages/application/src/use-cases/get-dashboard-weekly-summary.ts`
- Create: `packages/application/src/use-cases/get-dashboard-task-timeline.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/tests/dashboard-use-cases.test.ts`

- [ ] **Step 1: Write the failing use-case tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { getDashboardWeeklySummaryUseCase, getDashboardTaskTimelineUseCase } from "../src";

describe("dashboard use cases", () => {
  it("loads 8 weeks of weekly summary data", async () => {
    const dashboardRepository = {
      getWeeklySummary: vi.fn().mockResolvedValue([{ weekStart: "2026-03-16", plannedMinutes: 300, actualMinutes: 240, completedTaskCount: 2, completionRate: 0.8 }]),
    };

    const result = await getDashboardWeeklySummaryUseCase({
      dashboardRepository,
      today: "2026-05-07",
    });

    expect(dashboardRepository.getWeeklySummary).toHaveBeenCalledWith({
      endDate: "2026-05-07",
      weeks: 8,
    });
    expect(result).toHaveLength(1);
  });

  it("loads one task timeline with header data", async () => {
    const dashboardRepository = {
      getTaskTimeline: vi.fn().mockResolvedValue({
        header: {
          taskId: "task-1",
          title: "Crypto 予習",
          totalEstimatedMinutes: 420,
          remainingMinutes: 180,
          loggedMinutes: 240,
          progressRate: 240 / 420,
          dueDate: "2026-05-10",
        },
        buckets: [{ weekStart: "2026-03-16", plannedMinutes: 180, actualMinutes: 120 }],
      }),
    };

    const result = await getDashboardTaskTimelineUseCase({
      dashboardRepository,
      taskId: "task-1",
      today: "2026-05-07",
    });

    expect(dashboardRepository.getTaskTimeline).toHaveBeenCalledWith({
      taskId: "task-1",
      endDate: "2026-05-07",
      weeks: 8,
    });
    expect(result.header.title).toBe("Crypto 予習");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/application/tests/dashboard-use-cases.test.ts`
Expected: FAIL because the use cases do not exist.

- [ ] **Step 3: Write the minimal use cases**

```ts
import type { DashboardRepository } from "../ports";

export async function getDashboardWeeklySummaryUseCase(input: {
  dashboardRepository: DashboardRepository;
  today: string;
}) {
  return input.dashboardRepository.getWeeklySummary({
    endDate: input.today,
    weeks: 8,
  });
}
```

```ts
import type { DashboardRepository } from "../ports";

export async function getDashboardTaskTimelineUseCase(input: {
  dashboardRepository: DashboardRepository;
  taskId: string;
  today: string;
}) {
  return input.dashboardRepository.getTaskTimeline({
    taskId: input.taskId,
    endDate: input.today,
    weeks: 8,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/application/tests/dashboard-use-cases.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/application/src/use-cases/get-dashboard-weekly-summary.ts packages/application/src/use-cases/get-dashboard-task-timeline.ts packages/application/src/index.ts packages/application/tests/dashboard-use-cases.test.ts
git commit -m "feat: add dashboard application use cases"
```

## Task 3: Add SQLite weekly dashboard aggregates

**Files:**
- Create: `packages/infrastructure/src/sqlite-dashboard-repository.ts`
- Modify: `packages/infrastructure/src/index.ts`
- Test: `packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`

- [ ] **Step 1: Write the failing weekly aggregate integration test**

```ts
import { describe, expect, it } from "vitest";
import { createInMemoryDatabase } from "./test-helpers";
import { SqliteDashboardRepository } from "../src/sqlite-dashboard-repository";

describe("SqliteDashboardRepository", () => {
  it("aggregates planned and actual minutes by week", async () => {
    const db = createInMemoryDatabase();
    const repository = new SqliteDashboardRepository(db);

    const summary = await repository.getWeeklySummary({
      endDate: "2026-05-07",
      weeks: 8,
    });

    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weekStart: expect.any(String),
          plannedMinutes: expect.any(Number),
          actualMinutes: expect.any(Number),
        }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`
Expected: FAIL because `SqliteDashboardRepository` does not exist.

- [ ] **Step 3: Implement the weekly query**

```ts
const plannedRows = this.db
  .prepare(
    `
      SELECT
        date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
        SUM(planned_minutes) AS planned_minutes
      FROM current_schedule_slices
      WHERE date BETWEEN ? AND ?
      GROUP BY week_start
      ORDER BY week_start
    `,
  )
  .all(startDate, endDate);
```

```ts
const actualRows = this.db
  .prepare(
    `
      SELECT
        date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
        SUM(spent_minutes) AS actual_minutes
      FROM task_work_logs
      WHERE date BETWEEN ? AND ?
      GROUP BY week_start
      ORDER BY week_start
    `,
  )
  .all(startDate, endDate);
```

Build the final 8-week buckets in TypeScript so weeks with zero data still appear.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/infrastructure/src/sqlite-dashboard-repository.ts packages/infrastructure/src/index.ts packages/infrastructure/tests/sqlite-dashboard-repository.test.ts
git commit -m "feat: add weekly dashboard sqlite aggregates"
```

## Task 4: Add SQLite task timeline aggregates

**Files:**
- Modify: `packages/infrastructure/src/sqlite-dashboard-repository.ts`
- Test: `packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`

- [ ] **Step 1: Write the failing task timeline integration test**

```ts
it("aggregates one task timeline and header metrics", async () => {
  const db = createInMemoryDatabase();
  const repository = new SqliteDashboardRepository(db);

  const timeline = await repository.getTaskTimeline({
    taskId: "task-crypto",
    endDate: "2026-05-07",
    weeks: 8,
  });

  expect(timeline.header).toEqual(
    expect.objectContaining({
      taskId: "task-crypto",
      totalEstimatedMinutes: expect.any(Number),
      remainingMinutes: expect.any(Number),
      loggedMinutes: expect.any(Number),
    }),
  );
  expect(timeline.buckets[0]).toEqual(
    expect.objectContaining({
      weekStart: expect.any(String),
      plannedMinutes: expect.any(Number),
      actualMinutes: expect.any(Number),
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`
Expected: FAIL because `getTaskTimeline()` is missing.

- [ ] **Step 3: Implement the timeline query**

```ts
const taskRow = this.db
  .prepare(
    `
      SELECT id, title, remaining_minutes, due_date
      FROM tasks
      WHERE id = ?
    `,
  )
  .get(taskId);
```

```ts
const plannedRows = this.db
  .prepare(
    `
      SELECT
        date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
        SUM(planned_minutes) AS planned_minutes
      FROM current_schedule_slices
      WHERE task_id = ? AND date BETWEEN ? AND ?
      GROUP BY week_start
      ORDER BY week_start
    `,
  )
  .all(taskId, startDate, endDate);
```

```ts
const actualRows = this.db
  .prepare(
    `
      SELECT
        date(date, '-' || ((strftime('%w', date) + 6) % 7) || ' days') AS week_start,
        SUM(spent_minutes) AS actual_minutes
      FROM task_work_logs
      WHERE task_id = ? AND date BETWEEN ? AND ?
      GROUP BY week_start
      ORDER BY week_start
    `,
  )
  .all(taskId, startDate, endDate);
```

Compute:

- `loggedMinutes`
- `totalEstimatedMinutes = loggedMinutes + remainingMinutes`
- `progressRate = totalEstimatedMinutes === 0 ? 1 : loggedMinutes / totalEstimatedMinutes`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-dashboard-repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/infrastructure/src/sqlite-dashboard-repository.ts packages/infrastructure/tests/sqlite-dashboard-repository.test.ts
git commit -m "feat: add task dashboard sqlite aggregates"
```

## Task 5: Wire dashboard reads into the task platform service

**Files:**
- Modify: `apps/web/lib/task-platform.ts`
- Test: `apps/web/tests/task-platform.test.ts`

- [ ] **Step 1: Write the failing task-platform integration test**

```ts
it("exposes dashboard summary readers", async () => {
  const { taskPlatform } = await import("../lib/task-platform");

  expect(typeof taskPlatform.getDashboardWeeklySummary).toBe("function");
  expect(typeof taskPlatform.getDashboardTaskTimeline).toBe("function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/task-platform.test.ts`
Expected: FAIL because the dashboard readers are missing.

- [ ] **Step 3: Expose the methods**

```ts
async getDashboardWeeklySummary() {
  return getDashboardWeeklySummaryUseCase({
    dashboardRepository,
    today: toDateString(clock.now()),
  });
},

async getDashboardTaskTimeline(taskId: string) {
  return getDashboardTaskTimelineUseCase({
    dashboardRepository,
    taskId,
    today: toDateString(clock.now()),
  });
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/task-platform.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/task-platform.ts apps/web/tests/task-platform.test.ts
git commit -m "feat: expose dashboard reads through task platform"
```

## Task 6: Add the dashboard page shell and navigation

**Files:**
- Create: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/components/app-shell.tsx`
- Test: `apps/web/tests/dashboard.test.tsx`

- [ ] **Step 1: Write the failing dashboard render test**

```tsx
import { render, screen } from "@testing-library/react";
import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  it("renders the dashboard route and both tabs", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "週次" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "タスク別" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Add the page shell and nav entry**

```tsx
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">ダッシュボード</h1>
      <DashboardTabs />
    </div>
  );
}
```

Add to app shell navigation:

```ts
{ href: "/dashboard", label: "ダッシュボード" }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/components/app-shell.tsx apps/web/tests/dashboard.test.tsx
git commit -m "feat: add dashboard route shell"
```

## Task 7: Add the weekly dashboard chart

**Files:**
- Create: `apps/web/components/dashboard-tabs.tsx`
- Create: `apps/web/components/dashboard-weekly-chart.tsx`
- Test: `apps/web/tests/dashboard.test.tsx`

- [ ] **Step 1: Write the failing weekly chart test**

```tsx
it("renders weekly chart labels and summary metrics", async () => {
  render(
    <DashboardTabs
      weeklySummary={[
        { weekStart: "2026-03-16", plannedMinutes: 600, actualMinutes: 480, completedTaskCount: 3, completionRate: 0.8 },
      ]}
      tasks={[]}
      selectedTask={null}
    />,
  );

  expect(screen.getByText("今週の予定")).toBeInTheDocument();
  expect(screen.getByText("今週の実績")).toBeInTheDocument();
  expect(screen.getByText("今週の達成率")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: FAIL because the chart tab component does not exist.

- [ ] **Step 3: Implement the weekly tab**

```tsx
<Tabs defaultValue="weekly" className="space-y-6">
  <TabsList>
    <TabsTrigger value="weekly">週次</TabsTrigger>
    <TabsTrigger value="task">タスク別</TabsTrigger>
  </TabsList>
  <TabsContent value="weekly" className="space-y-4">
    <DashboardWeeklyChart data={weeklySummary} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricTile label="今週の予定" value={formatHoursFromMinutes(currentWeek.plannedMinutes)} />
      <MetricTile label="今週の実績" value={formatHoursFromMinutes(currentWeek.actualMinutes)} />
      <MetricTile label="今週の達成率" value={`${Math.round(currentWeek.completionRate * 100)}%`} />
      <MetricTile label="完了タスク" value={`${currentWeek.completedTaskCount}`} />
    </div>
  </TabsContent>
</Tabs>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard-tabs.tsx apps/web/components/dashboard-weekly-chart.tsx apps/web/tests/dashboard.test.tsx
git commit -m "feat: add weekly dashboard chart"
```

## Task 8: Add the task-specific dashboard chart

**Files:**
- Create: `apps/web/components/dashboard-task-chart.tsx`
- Create: `apps/web/components/task-selector.tsx`
- Modify: `apps/web/components/dashboard-tabs.tsx`
- Test: `apps/web/tests/dashboard.test.tsx`

- [ ] **Step 1: Write the failing task-tab test**

```tsx
it("renders task selector and task summary", async () => {
  render(
    <DashboardTabs
      weeklySummary={[]}
      tasks={[{ id: "task-1", title: "Crypto 予習" }]}
      selectedTask={{
        header: {
          taskId: "task-1",
          title: "Crypto 予習",
          totalEstimatedMinutes: 420,
          remainingMinutes: 180,
          loggedMinutes: 240,
          progressRate: 240 / 420,
          dueDate: "2026-05-10",
        },
        buckets: [{ weekStart: "2026-03-16", plannedMinutes: 180, actualMinutes: 120 }],
      }}
    />,
  );

  expect(screen.getByRole("combobox", { name: "タスク" })).toBeInTheDocument();
  expect(screen.getByText("全体")).toBeInTheDocument();
  expect(screen.getByText("残り")).toBeInTheDocument();
  expect(screen.getByText("累計実績")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: FAIL because the task tab is missing.

- [ ] **Step 3: Implement the task tab**

```tsx
<TabsContent value="task" className="space-y-4">
  <TaskSelector tasks={tasks} selectedTaskId={selectedTask?.header.taskId ?? ""} />
  {selectedTask ? (
    <>
      <DashboardTaskChart data={selectedTask.buckets} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricTile label="全体" value={formatHoursFromMinutes(selectedTask.header.totalEstimatedMinutes)} />
        <MetricTile label="残り" value={formatHoursFromMinutes(selectedTask.header.remainingMinutes)} />
        <MetricTile label="進捗" value={`${Math.round(selectedTask.header.progressRate * 100)}%`} />
        <MetricTile label="期限" value={selectedTask.header.dueDate ?? "未設定"} />
        <MetricTile label="累計実績" value={formatHoursFromMinutes(selectedTask.header.loggedMinutes)} />
      </div>
    </>
  ) : null}
</TabsContent>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard-task-chart.tsx apps/web/components/task-selector.tsx apps/web/components/dashboard-tabs.tsx apps/web/tests/dashboard.test.tsx
git commit -m "feat: add task dashboard chart"
```

## Task 9: Add Recharts and finish page data wiring

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/components/dashboard-weekly-chart.tsx`
- Modify: `apps/web/components/dashboard-task-chart.tsx`
- Modify: `package.json` / workspace package manifests as needed
- Test: `apps/web/tests/dashboard.test.tsx`

- [ ] **Step 1: Write the failing chart rendering smoke test**

```tsx
it("renders chart containers for both tabs", async () => {
  render(await DashboardPage());

  expect(screen.getByTestId("dashboard-weekly-chart")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: FAIL because the page is not yet wired with real dashboard data.

- [ ] **Step 3: Install and wire Recharts**

Run:

```bash
pnpm add --filter web recharts
```

Use focused wrappers such as:

```tsx
<ResponsiveContainer width="100%" height={260}>
  <BarChart data={data}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" />
    <XAxis dataKey="label" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="plannedHours" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
    <Bar dataKey="actualHours" fill="#0f172a" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Page wiring should:

- load weekly summary from `taskPlatform.getDashboardWeeklySummary()`
- load active task list from `taskPlatform.listTasks()`
- choose a default selected task
- load one task timeline from `taskPlatform.getDashboardTaskTimeline(selectedTaskId)`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/components/dashboard-weekly-chart.tsx apps/web/components/dashboard-task-chart.tsx apps/web/tests/dashboard.test.tsx package.json pnpm-lock.yaml apps/web/package.json
git commit -m "feat: wire dashboard charts"
```

## Task 10: Update README and run final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README dashboard section**

```md
## ダッシュボード

`/dashboard` では 2 つの分析タブを利用できます。

- `週次`: 直近 8 週間の予定時間と実績時間
- `タスク別`: 1 task を選び、その task の直近 8 週間の予定時間と実績時間
```

- [ ] **Step 2: Run focused tests**

Run: `pnpm test -- --run packages/application/tests/dashboard-use-cases.test.ts packages/infrastructure/tests/sqlite-dashboard-repository.test.ts apps/web/tests/dashboard.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `pnpm test`
Expected: PASS

Run: `timeout 90s pnpm --filter web build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document dashboard analytics"
```

## Self-Review

- Spec coverage:
  - `ダッシュボード` route: Tasks 6-9
  - `週次` tab with 8-week planned vs actual chart: Tasks 2-3, 7, 9
  - `タスク別` tab with one selected task: Tasks 2, 4, 8, 9
  - navigation entry: Task 6
  - trend summaries in hours: Tasks 7-9
  - README update: Task 10
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” placeholders remain.
- Type consistency:
  - `DashboardRepository`, `DashboardWeeklyBucket`, `DashboardTaskHeader`, and `DashboardTaskBucket` are defined first, then reused consistently in later tasks.
