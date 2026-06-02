# Dashboard Daily View + Week Navigation + Logs Pagination

## Overview

Convert the dashboard weekly summary chart from 8-week bars to daily bars within a single week, with week-to-week navigation (Monday start). Remove the change log card from the logs page and add infinite-scroll pagination to redistribution logs.

## 1. Dashboard: Daily Bar Chart with Week Navigation

### Current State
- `/app/dashboard/page.tsx` fetches `getDashboardWeeklySummary(weeks: 8)` returning 8 week-start aggregates
- `dashboard-weekly-chart.tsx` renders 8 bars (one per week) with `M/D` labels
- Week starts are already Monday-based (`startOfWeek()` in `sqlite-dashboard-repository.ts`)

### Target State
- **Chart**: 7 daily bars (Mon–Sun) per week, planned vs actual hours
- **Labels**: Each bar shows `M/D` date + day of week (e.g., "6/1 月")
- **Week header**: "6/1 (月) - 6/7 (日)" format
- **Navigation**: "前週" / "今日" / "次週" buttons
- **URL**: `?week=2026-06-01` query param for shareable links
- **Summary tiles**: Recalculated for the displayed week (planned, actual, completion rate, completed tasks)
- **Default week**: Current week (even if incomplete)

### Data Layer Changes

**New/Modified Use Case**: `getDashboardDailySummary({ weekStart: string })`

Returns:
```ts
{
  days: Array<{
    date: string;
    plannedMinutes: number;
    actualMinutes: number;
  }>;
  weekTotals: {
    plannedMinutes: number;
    actualMinutes: number;
    completionRate: number;
    completedTasks: number;
  };
}
```

**Repository**: Add method to `sqlite-dashboard-repository.ts`:
- Query `scheduled_task_slices` grouped by `date` within the week range
- Query `task_work_logs` grouped by `date` within the week range
- Query `task_work_logs` for completed tasks within the week

**Week start**: Reuse existing `startOfWeek(date)` = Monday logic.

### Component Changes

**New component**: `dashboard-daily-chart.tsx`
- Props: `{ days, weekStart }` 
- Recharts `BarChart` with 7 bars
- Each bar: two bars (planned=blue, actual=dark)
- X-axis: date + day-of-week labels

**Modified**: `dashboard-tabs.tsx`
- Add `weekStart` state (ISO date string, default current Monday)
- "前週" → subtract 7 days, "次週" → add 7 days, "今日" → reset to current Monday
- Pass `weekStart` to chart and summary tiles
- Existing "タスク別" (per-task) tab unchanged

**Modified**: `app/dashboard/page.tsx`
- Read `?week=` searchParam
- Call `getDashboardDailySummary({ weekStart })` instead of `getDashboardWeeklySummary()`
- Pass data as props

**Removed**: `dashboard-weekly-chart.tsx` (replaced by daily chart)

### No DB Migration Needed
Read-only queries on existing `scheduled_task_slices` and `task_work_logs` tables.

## 2. Logs Page: Remove Change Log, Paginate Redistribution Log

### Current State
- `/app/logs/page.tsx` shows two cards side by side: 変更ログ (mutations) and 再配分ログ (runs)
- `listSchedulerLogs()` returns `mutations(50)` + `runs(30)` with fixed limits
- Server component fetches all data at once

### Target State
- Remove the 変更ログ card entirely
- Keep 再配分ログ card with existing UI (status badge, revision, reason, rationale, errors)
- Add infinite scroll: cursor-based pagination via `started_at`

### Data Layer Changes

**Modified**: `listSchedulerLogs` use case
```ts
listSchedulerLogsUseCase(deps, input?: {
  runCursor?: string;  // started_at ISO string for cursor
  runLimit?: number;   // default 20
})
```

**Modified**: `listRuns` repository method
```sql
SELECT * FROM schedule_runs
WHERE (? IS NULL OR started_at < ?)
ORDER BY started_at DESC
LIMIT ?
```

**Removed**: `listMutations` call from the use case (no longer needed by UI)

### Component Changes

**Modified**: `app/logs/page.tsx`
- Remove the 変更ログ card and all related JSX
- Change to client component (or use a client component for the run list)
- Add `IntersectionObserver` at the bottom of the run list
- When intersection triggers, fetch next page via API route or server action

**New API route** or **Server Action**: `/api/scheduler-runs?cursor=...&limit=...`
- Returns `{ runs, nextCursor }` for cursor-based pagination

### UX Detail
- Scroll trigger appears ~200px before reaching the bottom
- Loading indicator while fetching next page
- No more data → stop observing

### No DB Migration Needed
Cursor uses existing `started_at` column. Read-only queries.

## 3. Files Affected

| File | Action |
|------|--------|
| `packages/infrastructure/src/sqlite-dashboard-repository.ts` | Add `getDailySummary()` method |
| `packages/application/src/use-cases/get-dashboard-weekly-summary.ts` | Add `getDashboardDailySummary` use case |
| `packages/application/src/ports.ts` | Add port for daily summary |
| `apps/web/components/dashboard-daily-chart.tsx` | **New** daily bar chart |
| `apps/web/components/dashboard-tabs.tsx` | Add week navigation state/buttons |
| `apps/web/app/dashboard/page.tsx` | Pass `weekStart` to use case |
| `packages/application/src/use-cases/list-scheduler-logs.ts` | Remove mutations, add cursor to runs |
| `packages/infrastructure/src/sqlite-scheduler-state-repository.ts` | Cursor-based `listRuns`, remove `listMutations` |
| `apps/web/app/logs/page.tsx` | Remove change log card, infinite scroll |
| `apps/web/app/api/scheduler-runs/route.ts` | **New** cursor-based API |
| `apps/web/lib/task-platform.ts` | Wire new methods |

## 4. Non-Goals
- Redistribution log detail enhancement (deferred)
- Task-specific daily chart (タスク別 tab stays weekly)
- DB schema changes
