# Dashboard Daily View + Logs Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert dashboard weekly chart to daily bars with week navigation (Mon-Sun), remove change log from logs page, add infinite-scroll pagination to redistribution logs.

**Architecture:** Add `getDailySummary(weekStart)` to `SqliteDashboardRepository`, new `getDashboardDailySummary` use case, and a `dashboard-daily-chart.tsx` component. For logs, add cursor-based `listRuns` to `SchedulerStateRepository`, create `/api/scheduler-runs` for client-side fetching, and convert `/app/logs/page.tsx` to a client component with `IntersectionObserver` infinite scroll.

**Tech Stack:** Next.js 16 (App Router), React 19, Recharts, SQLite (better-sqlite3), Vitest

---

### Task 1: Add `getDailySummary` to SqliteDashboardRepository

**Files:**
- Modify: `packages/infrastructure/src/sqlite-dashboard-repository.ts`

- [ ] **Step 1: Add `getDailySummary` method**

Add the following method to `SqliteDashboardRepository`, after the existing `getTaskTimeline` method (before the closing `}` of the class at line 253):

```typescript
  async getDailySummary(input: {
    weekStart: string;
  }): Promise<{
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  }> {
    const dateFrom = input.weekStart;
    const dateTo = addDays(dateFrom, 6);

    const plannedRows = this.db
      .prepare(
        `
          SELECT
            s.date,
            COALESCE(SUM(s.planned_minutes), 0) AS minutes
          FROM scheduled_task_slices s
          WHERE s.proposal_id = (
            SELECT active_proposal_id
            FROM schedule_snapshots
            ORDER BY updated_at DESC
            LIMIT 1
          )
            AND s.date >= ?
            AND s.date <= ?
          GROUP BY s.date
          ORDER BY s.date
        `,
      )
      .all(dateFrom, dateTo) as Array<{ date: string; minutes: number }>;

    const actualRows = this.db
      .prepare(
        `
          SELECT
            date,
            COALESCE(SUM(spent_minutes), 0) AS minutes
          FROM task_work_logs
          WHERE date >= ?
            AND date <= ?
          GROUP BY date
          ORDER BY date
        `,
      )
      .all(dateFrom, dateTo) as Array<{ date: string; minutes: number }>;

    const completedCount = this.db
      .prepare(
        `
          SELECT COUNT(DISTINCT task_id) AS count
          FROM task_work_logs
          WHERE date >= ?
            AND date <= ?
            AND remaining_minutes_after = 0
        `,
      )
      .get(dateFrom, dateTo) as { count: number };

    const plannedMap = new Map(plannedRows.map((r) => [r.date, Number(r.minutes)]));
    const actualMap = new Map(actualRows.map((r) => [r.date, Number(r.minutes)]));

    const days = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(dateFrom, i),
      plannedMinutes: plannedMap.get(addDays(dateFrom, i)) ?? 0,
      actualMinutes: actualMap.get(addDays(dateFrom, i)) ?? 0,
    }));

    const totalPlanned = days.reduce((sum, d) => sum + d.plannedMinutes, 0);
    const totalActual = days.reduce((sum, d) => sum + d.actualMinutes, 0);

    return {
      days,
      weekTotals: {
        plannedMinutes: totalPlanned,
        actualMinutes: totalActual,
        completionRate: totalPlanned === 0 ? 0 : totalActual / totalPlanned,
        completedTaskCount: Number(completedCount.count),
      },
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add packages/infrastructure/src/sqlite-dashboard-repository.ts
git commit -m "feat: add getDailySummary to SqliteDashboardRepository"
```

---

### Task 2: Add `getDailySummary` to DashboardRepository port

**Files:**
- Modify: `packages/application/src/ports.ts`

- [ ] **Step 1: Add method to the interface**

After the existing `getTaskTimeline` method in the `DashboardRepository` interface (around line 179), add:

```typescript
  getDailySummary(input: {
    weekStart: string;
  }): Promise<{
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  }>;
```

The `DashboardRepository` interface should now be (lines 167-180+):

```typescript
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
  getDailySummary(input: {
    weekStart: string;
  }): Promise<{
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/application/src/ports.ts
git commit -m "feat: add getDailySummary to DashboardRepository port"
```

---

### Task 3: Create `getDashboardDailySummary` use case

**Files:**
- Create: `packages/application/src/use-cases/get-dashboard-daily-summary.ts`
- Modify: `packages/application/src/index.ts`

- [ ] **Step 1: Create the use case file**

```typescript
import type { DashboardRepository } from "../ports";

export async function getDashboardDailySummaryUseCase(input: {
  dashboardRepository: DashboardRepository;
  weekStart: string;
}) {
  return input.dashboardRepository.getDailySummary({
    weekStart: input.weekStart,
  });
}
```

- [ ] **Step 2: Export from packages/application/src/index.ts**

Read `packages/application/src/index.ts` first.

Add this export:

```typescript
export { getDashboardDailySummaryUseCase } from "./use-cases/get-dashboard-daily-summary";
```

- [ ] **Step 3: Commit**

```bash
git add packages/application/src/use-cases/get-dashboard-daily-summary.ts packages/application/src/index.ts
git commit -m "feat: add getDashboardDailySummary use case"
```

---

### Task 4: Wire `getDashboardDailySummary` into task-platform

**Files:**
- Modify: `apps/web/lib/task-platform.ts`

- [ ] **Step 1: Import the new use case**

After the existing `getDashboardWeeklySummaryUseCase` import (line 7), add:

```typescript
import {
  getDashboardDailySummaryUseCase,
} from "../../../packages/application/src/index";
```

Alternatively, add `getDashboardDailySummaryUseCase` to the existing import block on line 6-8.

- [ ] **Step 2: Add the type to TaskPlatform**

After the `getDashboardWeeklySummary` type (line 96), add:

```typescript
  getDashboardDailySummary: (input: { weekStart: string }) => Promise<unknown>;
```

- [ ] **Step 3: Add the method implementation**

After the `getDashboardWeeklySummary` method (lines 270-275), add:

```typescript
    async getDashboardDailySummary(input: { weekStart: string }) {
      return getDashboardDailySummaryUseCase({
        dashboardRepository,
        weekStart: input.weekStart,
      });
    },
```

- [ ] **Step 4: Run type check**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/task-platform.ts
git commit -m "feat: wire getDashboardDailySummary into task-platform"
```

---

### Task 5: Create `dashboard-daily-chart.tsx` component

**Files:**
- Create: `apps/web/components/dashboard-daily-chart.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function formatDateLabel(dateStr: string, index: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatTooltipHours(value: unknown): string {
  if (typeof value === "number") {
    return `${value.toFixed(1)} 時間`;
  }
  const parsed = Number(value ?? 0);
  return `${parsed.toFixed(1)} 時間`;
}

export function DashboardDailyChart({
  data,
}: Readonly<{
  data: Array<{
    date: string;
    plannedMinutes: number;
    actualMinutes: number;
  }>;
}>) {
  const chartData = data.map((entry, index) => ({
    dateLabel: formatDateLabel(entry.date, index),
    dayLabel: DAY_LABELS[index],
    plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
    actualHours: Number((entry.actualMinutes / 60).toFixed(2)),
  }));

  const isTest = process.env.NODE_ENV === "test";

  const hasAnyData = chartData.some(
    (d) => d.plannedHours > 0 || d.actualHours > 0,
  );

  const customTooltip = (props: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
    label?: string;
  }) => {
    if (!props.active || !props.payload?.length) return null;
    const entry = chartData.find(
      (d) => d.dateLabel === props.label || d.dayLabel === props.label,
    );
    const label = entry
      ? `${entry.dateLabel} (${entry.dayLabel})`
      : props.label;
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "13px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{label}</div>
        {props.payload.map((p) => (
          <div key={p.name} style={{ color: "#475569" }}>
            {p.name === "plannedHours" ? "予定" : "実績"}:{" "}
            {formatTooltipHours(p.value)}
          </div>
        ))}
      </div>
    );
  };

  const chart = (
    <BarChart
      data={chartData}
      width={isTest ? 720 : undefined}
      height={isTest ? 260 : undefined}
    >
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="dateLabel"
        tick={({ x, y, payload, index }) => (
          <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fontSize={11} fill="#475569">
              {payload.value}
            </text>
            <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {chartData[index]?.dayLabel}
            </text>
          </g>
        )}
        tickLine={false}
        axisLine={false}
      />
      <YAxis tickLine={false} axisLine={false} />
      <Tooltip content={customTooltip} />
      <Bar dataKey="plannedHours" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
      <Bar dataKey="actualHours" fill="#0f172a" radius={[6, 6, 0, 0]} />
    </BarChart>
  );

  return (
    <div
      data-testid="dashboard-daily-chart"
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-300" />
          計画
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-900" />
          実績
        </span>
      </div>
      <div data-testid="dashboard-daily-chart-frame" className="h-72 min-h-72 min-w-0">
        {isTest ? (
          chart
        ) : (
          <ResponsiveContainer height="100%" minWidth={0} minHeight={288} width="100%">
            {chart}
          </ResponsiveContainer>
        )}
      </div>
      {!hasAnyData ? (
        <p className="mt-3 text-sm text-slate-500">この週のデータはまだありません。</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dashboard-daily-chart.tsx
git commit -m "feat: add dashboard-daily-chart component"
```

---

### Task 6: Update `dashboard-tabs` for daily chart + week navigation

**Files:**
- Modify: `apps/web/components/dashboard-tabs.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file content:

```typescript
"use client";

import React from "react";
import { MetricCard } from "./metric-card";
import { DashboardTaskChart } from "./dashboard-task-chart";
import { DashboardDailyChart } from "./dashboard-daily-chart";
import { TaskSelector } from "./task-selector";
import { formatHoursFromMinutes } from "../lib/presentation";
import { cn } from "../lib/utils";

function MetricTile({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return <MetricCard label={label} value={value} />;
}

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function formatWeekRange(weekStart: string): string {
  const startDate = new Date(`${weekStart}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return `${startDate.getUTCMonth() + 1}/${startDate.getUTCDate()} (月) - ${endDate.getUTCMonth() + 1}/${endDate.getUTCDate()} (日)`;
}

export function DashboardTabs({
  dailySummary,
  tasks,
  selectedTask,
  initialWeekStart,
}: Readonly<{
  dailySummary: {
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  };
  tasks: Array<{ id: string; title: string }>;
  selectedTask: {
    header: {
      taskId: string;
      title: string;
      totalEstimatedMinutes: number;
      remainingMinutes: number;
      loggedMinutes: number;
      progressRate: number;
      dueDate: string | null;
    };
    buckets: Array<{
      weekStart: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
  } | null;
  initialWeekStart: string;
}>) {
  const [activeTab, setActiveTab] = React.useState<"weekly" | "task">("weekly");
  const [weekStart, setWeekStart] = React.useState(initialWeekStart);

  function navigateWeek(direction: -1 | 1) {
    setWeekStart((prev) => {
      const d = new Date(`${prev}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + direction * 7);
      return d.toISOString().slice(0, 10);
    });
  }

  function goToToday() {
    const today = new Date();
    const day = today.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    today.setUTCDate(today.getUTCDate() + diff);
    setWeekStart(today.toISOString().slice(0, 10));
  }

  const handleWeekChange = React.useCallback(
    (direction: -1 | 1) => () => navigateWeek(direction),
    [],
  );

  const totals = dailySummary.weekTotals;

  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label="ダッシュボード切替"
        className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "weekly"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "weekly" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("weekly")}
        >
          週次
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "task"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors",
            activeTab === "task" ? "bg-slate-900 text-white" : "hover:bg-slate-100",
          )}
          onClick={() => setActiveTab("task")}
        >
          タスク別
        </button>
      </div>

      {activeTab === "weekly" ? (
        <div role="tabpanel" className="grid gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleWeekChange(-1)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              &larr; 前週
            </button>
            <span className="text-sm font-medium text-slate-700">
              {formatWeekRange(weekStart)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                今日
              </button>
              <button
                type="button"
                onClick={handleWeekChange(1)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                次週 &rarr;
              </button>
            </div>
          </div>
          <DashboardDailyChart data={dailySummary.days} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="今週の予定" value={formatHoursFromMinutes(totals.plannedMinutes)} />
            <MetricTile label="今週の実績" value={formatHoursFromMinutes(totals.actualMinutes)} />
            <MetricTile
              label="達成率"
              value={`${Math.round(totals.completionRate * 100)}%`}
            />
            <MetricTile label="完了タスク" value={`${totals.completedTaskCount}`} />
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="grid gap-4">
          {tasks.length > 0 ? (
            <TaskSelector tasks={tasks} selectedTaskId={selectedTask?.header.taskId ?? tasks[0].id} />
          ) : null}
          {selectedTask ? (
            <>
              <DashboardTaskChart data={selectedTask.buckets} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricTile
                  label="全体"
                  value={formatHoursFromMinutes(selectedTask.header.totalEstimatedMinutes)}
                />
                <MetricTile
                  label="残り"
                  value={formatHoursFromMinutes(selectedTask.header.remainingMinutes)}
                />
                <MetricTile
                  label="進捗"
                  value={`${Math.round(selectedTask.header.progressRate * 100)}%`}
                />
                <MetricTile label="期限" value={selectedTask.header.dueDate ?? "未設定"} />
                <MetricTile
                  label="累計実績"
                  value={formatHoursFromMinutes(selectedTask.header.loggedMinutes)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              表示できる task がありません。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dashboard-tabs.tsx
git commit -m "feat: add week navigation and daily chart to dashboard-tabs"
```

---

### Task 7: Update dashboard page for daily data + `?week=` param

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Read `?week=` searchParam and call daily summary**

Replace the file content:

```typescript
import React from "react";
import { DashboardTabs } from "../../components/dashboard-tabs";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ taskId?: string; week?: string }>;
} = {}) {
  const searchParams = (await props.searchParams) ?? {};
  const today = new Date();
  const weekStart = searchParams.week ?? getMondayOfWeek(today);
  const dailySummary = (await taskPlatform.getDashboardDailySummary({ weekStart })) as {
    days: Array<{
      date: string;
      plannedMinutes: number;
      actualMinutes: number;
    }>;
    weekTotals: {
      plannedMinutes: number;
      actualMinutes: number;
      completionRate: number;
      completedTaskCount: number;
    };
  };
  const allTasks = (await taskPlatform.listTasks()) as Array<{
    id: string;
    title: string;
    status?: string;
  }>;
  const tasks = allTasks
    .filter((task) => task.status !== "archived")
    .map((task) => ({ id: task.id, title: task.title }));
  const selectedTaskId =
    (searchParams.taskId && tasks.some((task) => task.id === searchParams.taskId)
      ? searchParams.taskId
      : tasks[0]?.id) ?? null;
  const selectedTask = selectedTaskId
    ? ((await taskPlatform.getDashboardTaskTimeline(selectedTaskId)) as {
        header: {
          taskId: string;
          title: string;
          totalEstimatedMinutes: number;
          remainingMinutes: number;
          loggedMinutes: number;
          progressRate: number;
          dueDate: string | null;
        };
        buckets: Array<{
          weekStart: string;
          plannedMinutes: number;
          actualMinutes: number;
        }>;
      })
    : null;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ダッシュボード</h1>
      </div>
      <DashboardTabs
        dailySummary={dailySummary}
        tasks={tasks}
        selectedTask={selectedTask}
        initialWeekStart={weekStart}
      />
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/dashboard/page.tsx
git commit -m "feat: update dashboard page for daily summary + week param"
```

---

### Task 8: Update `listSchedulerLogs` use case — remove mutations, add cursor to runs

**Files:**
- Modify: `packages/application/src/use-cases/list-scheduler-logs.ts`

- [ ] **Step 1: Rewrite use case**

Replace the file content:

```typescript
import type { SchedulerStateRepository } from "../ports";

export async function listSchedulerLogsUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "listRuns">;
  },
  input?: {
    cursor?: string;
    limit?: number;
  },
) {
  const runs = await deps.schedulerStateRepository.listRuns({
    cursor: input?.cursor,
    limit: input?.limit ?? 20,
  });

  return { runs };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/application/src/use-cases/list-scheduler-logs.ts
git commit -m "feat: remove mutations from listSchedulerLogs, add cursor to runs"
```

---

### Task 9: Update `SchedulerStateRepository` interface and implementation for cursor-based `listRuns`

**Files:**
- Modify: `packages/application/src/ports.ts`
- Modify: `packages/infrastructure/src/sqlite-scheduler-state-repository.ts`

- [ ] **Step 1: Update the port interface**

In `packages/application/src/ports.ts`, change the `listRuns` method from:

```typescript
  listRuns(limit?: number): Promise<
    Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>
  >;
```

To:

```typescript
  listRuns(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>
  >;
```

Also remove the `listMutations` method from the interface (lines 71-81):

```typescript
  listMutations(limit?: number): Promise<
    Array<{
      id: string;
      revision: number;
      mutationKind: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      details: Record<string, unknown>;
    }>
  >;
```

- [ ] **Step 2: Update the repository implementation**

In `packages/infrastructure/src/sqlite-scheduler-state-repository.ts`, replace the `listRuns` method (lines 320-355):

```typescript
  async listRuns(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>
  > {
    const limit = input?.limit ?? 20;
    const cursor = input?.cursor;

    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM schedule_runs
          WHERE (? IS NULL OR started_at < ?)
          ORDER BY started_at DESC
          LIMIT ?
        `,
      )
      .all(cursor ?? null, cursor ?? null, limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      targetRevision: Number(row.target_revision),
      status: String(row.status),
      reason: String(row.reason),
      startedAt: String(row.started_at),
      finishedAt: row.finished_at ? String(row.finished_at) : null,
      rationale: String(row.rationale),
      validation: JSON.parse(String(row.validation_json)) as Record<string, unknown>,
      errorMessage: String(row.error_message ?? ""),
    }));
  }
```

- [ ] **Step 3: Remove `listMutations` method**

Remove the `listMutations` method (lines 286-318) from the repository class entirely.

- [ ] **Step 4: Run type check**

```bash
pnpm --filter web exec tsc --noEmit 2>&1 | head -30
```

Expected: No type errors related to our changes. (Pre-existing errors in other files may appear.)

- [ ] **Step 5: Commit**

```bash
git add packages/application/src/ports.ts packages/infrastructure/src/sqlite-scheduler-state-repository.ts
git commit -m "feat: cursor-based listRuns, remove listMutations"
```

---

### Task 10: Update `task-platform.ts` to pass cursor to `listSchedulerLogs`

**Files:**
- Modify: `apps/web/lib/task-platform.ts`

- [ ] **Step 1: Update the `listSchedulerLogs` type and method**

Change the type (line 106):

```typescript
  listSchedulerLogs: (input?: { cursor?: string; limit?: number }) => Promise<unknown>;
```

Change the method implementation (lines 314-318):

```typescript
    async listSchedulerLogs(input?: { cursor?: string; limit?: number }) {
      return listSchedulerLogsUseCase(
        {
          schedulerStateRepository,
        },
        input,
      );
    },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/task-platform.ts
git commit -m "feat: pass cursor to listSchedulerLogs in task-platform"
```

---

### Task 11: Create `/api/scheduler-runs` API route

**Files:**
- Create: `apps/web/app/api/scheduler-runs/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Number(searchParams.get("limit")) || 20;

  const { runs } = (await taskPlatform.listSchedulerLogs({ cursor, limit })) as {
    runs: Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>;
  };

  const nextCursor = runs.length === limit ? runs.at(-1)?.startedAt ?? null : null;

  return NextResponse.json({ runs, nextCursor });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/scheduler-runs/route.ts
git commit -m "feat: add /api/scheduler-runs with cursor-based pagination"
```

---

### Task 12: Update logs page — remove change log, infinite scroll on redistribution log

**Files:**
- Modify: `apps/web/app/logs/page.tsx`

- [ ] **Step 1: Rewrite logs page as client component with infinite scroll**

Replace the entire file:

```typescript
"use client";

import React from "react";
import { StatusBadge } from "../../components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  formatDateTimeLong,
  schedulerRunReasonLabels,
  schedulerRunStatusLabels,
} from "../../lib/presentation";
import type { taskPlatform } from "../../lib/task-platform";

type SchedulerStatus = {
  schedulerStatus: string;
  lastScheduledAt: string | null;
  latestRunAt: string | null;
  hasPendingChanges: boolean;
  secondsUntilNextRun: number | null;
};

type Run = {
  id: string;
  targetRevision: number;
  status: string;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
  rationale: string;
  validation: { errors?: string[] };
  errorMessage: string;
};

function useRuns(initialRuns: Run[]) {
  const [runs, setRuns] = React.useState<Run[]>(initialRuns);
  const [cursor, setCursor] = React.useState<string | null>(
    initialRuns.length > 0 ? initialRuns.at(-1)?.startedAt ?? null : null,
  );
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const observerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setLoading(true);
          const params = new URLSearchParams();
          if (cursor) params.set("cursor", cursor);
          params.set("limit", "20");
          fetch(`/api/scheduler-runs?${params.toString()}`)
            .then((res) => res.json())
            .then((data: { runs: Run[]; nextCursor: string | null }) => {
              setRuns((prev) => [...prev, ...data.runs]);
              setCursor(data.nextCursor);
              setHasMore(data.nextCursor !== null);
            })
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [cursor, hasMore, loading]);

  return { runs, loading, observerRef };
}

export default function LogsPageClient({
  status: initialStatus,
  initialRuns,
}: Readonly<{
  status: SchedulerStatus;
  initialRuns: Run[];
}>) {
  const { runs, loading, observerRef } = useRuns(initialRuns);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ログ</h1>
        <StatusBadge
          tone={
            initialStatus.schedulerStatus === "running"
              ? "warning"
              : initialStatus.hasPendingChanges
                ? "secondary"
                : "outline"
          }
        >
          {initialStatus.schedulerStatus === "running"
            ? "再配分中"
            : initialStatus.hasPendingChanges
              ? "再配分待ち"
              : "最新"}
        </StatusBadge>
        <StatusBadge tone="outline">
          {`最終再配分 ${formatDateTimeLong(initialStatus.lastScheduledAt)}`}
        </StatusBadge>
      </div>

      <Card className="border-white/80 bg-white/94">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.03em]">再配分ログ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700">
          {runs.map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={
                    run.status === "failed"
                      ? "danger"
                      : run.status === "scheduled"
                        ? "success"
                        : "outline"
                  }
                >
                  {schedulerRunStatusLabels[run.status] ?? run.status}
                </StatusBadge>
                <StatusBadge tone="secondary">{`rev ${run.targetRevision}`}</StatusBadge>
                <span>{formatDateTimeLong(run.startedAt)}</span>
              </div>
              <div className="mt-2 text-slate-600">
                {schedulerRunReasonLabels[run.reason] ?? run.reason}
              </div>
              {run.rationale ? <div className="mt-1 text-slate-500">{run.rationale}</div> : null}
              {run.validation?.errors?.length ? (
                <div className="mt-2 text-rose-600">
                  {`検証エラー: ${run.validation.errors.join(", ")}`}
                </div>
              ) : null}
              {run.errorMessage ? (
                <div className="mt-2 text-rose-600">{`実行エラー: ${run.errorMessage}`}</div>
              ) : null}
            </div>
          ))}
          <div ref={observerRef} className="h-4" />
          {loading ? (
            <p className="text-center text-sm text-slate-400">読み込み中...</p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Create server component wrapper**

Create `apps/web/app/logs/page.tsx` (overwrite) as a server component that fetches initial data and renders the client component:

Wait — the file above is the client component. The page needs to be a server component. Let me restructure:

Actually, Next.js App Router pages can be "use client" directly. But the initial data fetch should happen server-side. Let me use a pattern where the page fetches data server-side and passes to a client component.

The solution: rename the above to a client component file, and keep the page as a minimal server wrapper.

Let me restructure this task:

Create `apps/web/app/logs/page.tsx` (server component) that imports and renders the client component, passing fetched data as props. The client component handles `useRuns` for infinite scroll.

Here's the server page:

```typescript
import React from "react";
import { LogsPageClient } from "./logs-page-client";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const status = (await taskPlatform.getSchedulerStatus()) as {
    schedulerStatus: string;
    lastScheduledAt: string | null;
    latestRunAt: string | null;
    hasPendingChanges: boolean;
    secondsUntilNextRun: number | null;
  };
  const logs = (await taskPlatform.listSchedulerLogs({ limit: 20 })) as {
    runs: Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: { errors?: string[] };
      errorMessage: string;
    }>;
  };

  return <LogsPageClient status={status} initialRuns={logs.runs} />;
}
```

And the client component goes to `apps/web/app/logs/logs-page-client.tsx` with the content I wrote above (minus the "Rename the above..." note).

- [ ] **Step 2b: Create the client component**

Create `apps/web/app/logs/logs-page-client.tsx`:

(Content as shown in Step 1 above, with no changes)

- [ ] **Step 2c: Create the server page**

Create/overwrite `apps/web/app/logs/page.tsx` with the server wrapper shown above.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/logs/page.tsx apps/web/app/logs/logs-page-client.tsx
git commit -m "feat: remove change log, add infinite scroll to redistribution logs"
```

---

### Task 13: Update `taskPlatform.listSchedulerLogs` caller in page to pass cursor

**Files:**
- Already handled in Task 12 (the server page calls `listSchedulerLogs({ limit: 20 })`)

No additional changes needed.

---

### Task 14: Run lint / type check and fix issues

- [ ] **Step 1: Run type check**

```bash
pnpm --filter web exec tsc --noEmit 2>&1
```

- [ ] **Step 2: Fix any type errors in our changed files**

Check for errors in:
- `apps/web/app/logs/page.tsx`
- `apps/web/app/logs/logs-page-client.tsx`
- `apps/web/components/dashboard-tabs.tsx`
- `apps/web/components/dashboard-daily-chart.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/api/scheduler-runs/route.ts`

- [ ] **Step 3: Run existing tests to ensure no regressions**

```bash
pnpm test
```

Expected: All existing tests pass. Dashboard test may fail because we changed the page signature — fix in next task if needed.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: type check and lint fixes"
```

---

### Task 15: Update dashboard test for new page signature

**Files:**
- Modify: `apps/web/tests/dashboard.test.tsx`

- [ ] **Step 1: Update the test mock and expectations**

Replace the file content to match the new `DashboardPage` props:

```typescript
/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { taskPlatformMock } = vi.hoisted(() => ({
  taskPlatformMock: {
    getDashboardDailySummary: vi.fn(),
    getDashboardTaskTimeline: vi.fn(),
    listTasks: vi.fn(),
  },
}));

vi.mock("../lib/task-platform", () => ({
  taskPlatform: taskPlatformMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    taskPlatformMock.getDashboardDailySummary.mockResolvedValue({
      days: [
        { date: "2026-06-01", plannedMinutes: 180, actualMinutes: 120 },
        { date: "2026-06-02", plannedMinutes: 120, actualMinutes: 90 },
        { date: "2026-06-03", plannedMinutes: 240, actualMinutes: 0 },
        { date: "2026-06-04", plannedMinutes: 60, actualMinutes: 0 },
        { date: "2026-06-05", plannedMinutes: 300, actualMinutes: 0 },
        { date: "2026-06-06", plannedMinutes: 0, actualMinutes: 0 },
        { date: "2026-06-07", plannedMinutes: 0, actualMinutes: 0 },
      ],
      weekTotals: {
        plannedMinutes: 900,
        actualMinutes: 210,
        completionRate: 210 / 900,
        completedTaskCount: 1,
      },
    });
    taskPlatformMock.getDashboardTaskTimeline.mockResolvedValue({
      header: {
        taskId: "task-1",
        title: "Crypto 予習",
        totalEstimatedMinutes: 420,
        remainingMinutes: 180,
        loggedMinutes: 240,
        progressRate: 240 / 420,
        dueDate: "2026-05-10",
      },
      buckets: [
        { weekStart: "2026-03-16", plannedMinutes: 180, actualMinutes: 120 },
        { weekStart: "2026-03-23", plannedMinutes: 60, actualMinutes: 120 },
      ],
    });
    taskPlatformMock.listTasks.mockResolvedValue([{ id: "task-1", title: "Crypto 予習" }]);
  });

  it("renders the dashboard route and both tabs", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "週次" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "タスク別" })).toBeInTheDocument();
  });

  it("renders weekly summary labels with daily chart", async () => {
    render(await DashboardPage());

    expect(screen.getByText("今週の予定")).toBeInTheDocument();
    expect(screen.getByText("今週の実績")).toBeInTheDocument();
    expect(screen.getByText("達成率")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-daily-chart-frame")).toHaveClass("min-h-72", "min-w-0");
  });

  it("renders week navigation buttons", async () => {
    render(await DashboardPage());

    expect(screen.getByText((content) => content.includes("前週"))).toBeInTheDocument();
    expect(screen.getByText("今日")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("次週"))).toBeInTheDocument();
  });

  it("renders task selector and task summary after switching tabs", async () => {
    render(await DashboardPage());

    fireEvent.click(screen.getByRole("tab", { name: "タスク別" }));

    expect(screen.getByRole("combobox", { name: "タスク" })).toBeInTheDocument();
    expect(screen.getByText("全体")).toBeInTheDocument();
    expect(screen.getByText("残り")).toBeInTheDocument();
    expect(screen.getByText("累計実績")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-task-chart-frame")).toHaveClass("min-h-72", "min-w-0");
  });
});
```

- [ ] **Step 2: Run the dashboard tests**

```bash
pnpm exec vitest --run apps/web/tests/dashboard.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/dashboard.test.tsx
git commit -m "test: update dashboard tests for daily chart and week navigation"
```

---

### Task 16: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

- [ ] **Step 2: Fix any remaining test failures**

Fix any broken tests. Check if other tests reference the old page structure.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: remaining test adjustments"
```

---

### Task 17: Run type check one final time

- [ ] **Step 1: Run type check**

```bash
pnpm lint
```

- [ ] **Step 2: Fix any type errors**

Fix all type errors introduced by our changes.

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "chore: final type check fixes"
```
