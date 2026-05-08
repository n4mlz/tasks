# Task Platform Worklog And Reserve Buffer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users log work for non-today-assigned tasks from `Today`, and make scheduling preserve a default 20% reserve buffer while carrying unfinished work forward through ordinary rescheduling.

**Architecture:** Extend the domain scheduler so each day has a base budget and a reserve budget, with validation and schedule summary reflecting reserve usage. Keep the work-log data model unchanged, but widen the Today-side entry point so any active task can be logged against today, which then feeds the same deferred scheduler flow and carry-over behavior.

**Tech Stack:** TypeScript, Next.js App Router, SQLite, Vitest, React Testing Library

---

## File Structure

- Modify: `packages/domain/src/schedule.ts`
  - Add reserve-aware capacity handling, reserve usage summary, and carry-over-safe validation behavior.
- Modify: `packages/domain/tests/schedule.test.ts`
  - Add failing tests for reserve preservation and reserve consumption.
- Modify: `packages/application/src/use-cases/run-scheduler-tick.ts`
  - Pass through the richer schedule summary and maintain carry-over behavior through remaining minutes.
- Modify: `packages/application/tests/use-cases.test.ts`
  - Assert reserve usage and insufficient-even-with-reserve scenarios.
- Modify: `packages/infrastructure/src/sqlite-schedule-repository.ts`
  - Persist new reserve-related summary fields.
- Modify: `packages/infrastructure/tests/sqlite-repositories.test.ts`
  - Verify reserve-related summary fields round-trip from current schedule.
- Modify: `apps/web/components/work-log-dialog.tsx`
  - Generalize the dialog to optionally choose a task instead of being bound only to a rendered slice.
- Create: `apps/web/components/quick-work-log.tsx`
  - Add a `他の task を記録` launcher for `Today`.
- Modify: `apps/web/app/page.tsx`
  - Add the extra work-log entry point and light reserve usage badges.
- Modify: `apps/web/app/week/page.tsx`
  - Surface reserve usage lightly in the planning calendar / task overview.
- Modify: `apps/web/lib/task-platform.ts`
  - No new data model, but expose reserve-aware schedule summary through existing reads.
- Modify: `apps/web/tests/ui.test.tsx`
  - Cover the new Today-side logging entry point and reserve display.
- Modify: `README.md`
  - Document non-assigned task logging and reserve behavior.

## Task 1: Add reserve-aware domain schedule tests

**Files:**
- Modify: `packages/domain/tests/schedule.test.ts`
- Modify: `packages/domain/src/schedule.ts`

- [ ] **Step 1: Write the failing reserve tests**

```ts
it("keeps work inside the 80% base budget when possible", () => {
  const plan = buildSchedulePlan({
    today: "2026-05-08",
    tasks: [
      createTask({
        id: "task_1",
        title: "Write report",
        remainingMinutes: 360,
        createdAt: "2026-05-08T00:00:00.000Z",
      }),
    ],
    capacities: [
      createDayCapacity({
        date: "2026-05-08",
        availableMinutes: 480,
      }),
    ],
  });

  expect(plan.summary.bufferUsageByDate["2026-05-08"]).toBe(0);
});

it("uses reserve only when base budget is insufficient", () => {
  const plan = buildSchedulePlan({
    today: "2026-05-08",
    tasks: [
      createTask({
        id: "task_1",
        title: "Finish slide deck",
        remainingMinutes: 420,
        createdAt: "2026-05-08T00:00:00.000Z",
        dueDate: "2026-05-09",
      }),
    ],
    capacities: [
      createDayCapacity({
        date: "2026-05-08",
        availableMinutes: 480,
      }),
    ],
  });

  expect(plan.summary.bufferUsageByDate["2026-05-08"]).toBe(36);
  expect(plan.summary.datesUsingReserve).toContain("2026-05-08");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/domain/tests/schedule.test.ts`
Expected: FAIL because `bufferUsageByDate` and `datesUsingReserve` do not exist yet.

- [ ] **Step 3: Implement minimal reserve-aware schedule summary**

```ts
const baseCapacityMinutes = Math.floor(capacity.availableMinutes * 0.8);
const reserveCapacityMinutes = capacity.availableMinutes - baseCapacityMinutes;
```

```ts
summary: {
  riskFlags,
  unscheduledTaskIds,
  capacityPressureByDate,
  bufferUsageByDate,
  datesUsingReserve,
  insufficientEvenWithReserve,
}
```

Implement a two-phase day budget:

- phase 1 spends `baseCapacityMinutes`
- phase 2 spends reserve only if remaining work still needs placement

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/domain/tests/schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/schedule.ts packages/domain/tests/schedule.test.ts
git commit -m "feat: add reserve-aware scheduling rules"
```

## Task 2: Extend domain validation for reserve semantics

**Files:**
- Modify: `packages/domain/src/schedule.ts`
- Modify: `packages/domain/tests/schedule.test.ts`

- [ ] **Step 1: Write the failing validator test**

```ts
it("marks reserve usage in validation-relevant summary without treating it as invalid", () => {
  const plan = buildSchedulePlan({
    today: "2026-05-08",
    tasks: [
      createTask({
        id: "task_1",
        title: "Finish essay",
        remainingMinutes: 420,
        createdAt: "2026-05-08T00:00:00.000Z",
      }),
    ],
    capacities: [
      createDayCapacity({
        date: "2026-05-08",
        availableMinutes: 480,
      }),
    ],
  });

  const validation = validateSchedulePlan({
    plan,
    tasks: [...],
    capacities: [...],
  });

  expect(validation.isValid).toBe(true);
  expect(plan.summary.bufferUsageByDate["2026-05-08"]).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/domain/tests/schedule.test.ts`
Expected: FAIL because validator does not understand reserve-aware summaries.

- [ ] **Step 3: Implement the minimal validation changes**

```ts
if (planned > availableMinutes) {
  errors.push(`over_capacity:${date}`);
}

if (planned > baseCapacityMinutes && !input.plan.summary.datesUsingReserve.includes(date)) {
  errors.push(`missing_reserve_marker:${date}`);
}
```

Do not treat unscheduled work as structurally invalid.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/domain/tests/schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/schedule.ts packages/domain/tests/schedule.test.ts
git commit -m "feat: validate reserve-aware schedules"
```

## Task 3: Cover reserve behavior in application scheduling

**Files:**
- Modify: `packages/application/tests/use-cases.test.ts`
- Modify: `packages/application/src/use-cases/run-scheduler-tick.ts`

- [ ] **Step 1: Write the failing application tests**

```ts
it("persists reserve usage in the saved current schedule summary", async () => {
  const scheduleRepository = { saveCurrentSchedule: vi.fn().mockResolvedValue(undefined) };

  await runSchedulerTickUseCase(/* existing scheduler deps */);

  expect(scheduleRepository.saveCurrentSchedule).toHaveBeenCalledWith(
    expect.objectContaining({
      summary: expect.objectContaining({
        bufferUsageByDate: expect.any(Object),
        datesUsingReserve: expect.any(Array),
      }),
    }),
  );
});

it("marks shortage when work does not fit even with reserve", async () => {
  const result = await runSchedulerTickUseCase(/* low-capacity deps */);

  expect(result.validation.isValid).toBe(true);
  expect(result.plan?.summary.insufficientEvenWithReserve).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/application/tests/use-cases.test.ts`
Expected: FAIL because the current summary shape does not include reserve fields.

- [ ] **Step 3: Implement the minimal use-case changes**

No new orchestration branch is needed. Update the saved schedule shape so the richer domain summary survives unchanged:

```ts
await scheduleRepository.saveCurrentSchedule({
  id,
  reason,
  generatedAt,
  horizonStart: plan.horizonStart,
  horizonEnd: plan.horizonEnd,
  slices: plan.slices,
  riskFlags: plan.riskFlags,
  summary: plan.summary,
});
```

Ensure the returned `result.plan` and `result.validation` remain intact for callers.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/application/tests/use-cases.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/application/src/use-cases/run-scheduler-tick.ts packages/application/tests/use-cases.test.ts
git commit -m "feat: propagate reserve-aware schedule summaries"
```

## Task 4: Persist reserve-aware schedule summaries in SQLite

**Files:**
- Modify: `packages/infrastructure/src/sqlite-schedule-repository.ts`
- Modify: `packages/infrastructure/tests/sqlite-repositories.test.ts`

- [ ] **Step 1: Write the failing SQLite round-trip test**

```ts
it("round-trips reserve-related summary fields from current schedule", async () => {
  const repository = new SqliteScheduleRepository(db);

  await repository.saveCurrentSchedule({
    id: "schedule_repo",
    reason: "manual",
    generatedAt: "2026-05-08T00:00:00.000Z",
    horizonStart: "2026-05-08",
    horizonEnd: "2026-05-10",
    slices: [],
    riskFlags: [],
    summary: {
      riskFlags: [],
      unscheduledTaskIds: [],
      capacityPressureByDate: {},
      bufferUsageByDate: { "2026-05-08": 36 },
      datesUsingReserve: ["2026-05-08"],
      insufficientEvenWithReserve: false,
    },
  });

  const loaded = await repository.getCurrentSchedule();

  expect(loaded.summary).toEqual(
    expect.objectContaining({
      bufferUsageByDate: { "2026-05-08": 36 },
      datesUsingReserve: ["2026-05-08"],
      insufficientEvenWithReserve: false,
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-repositories.test.ts`
Expected: FAIL because the current typed summary shape does not include the new fields.

- [ ] **Step 3: Update the repository types**

```ts
summary: {
  riskFlags: string[];
  unscheduledTaskIds: string[];
  capacityPressureByDate: Record<string, number>;
  bufferUsageByDate: Record<string, number>;
  datesUsingReserve: string[];
  insufficientEvenWithReserve: boolean;
};
```

The JSON persistence strategy does not need a schema migration.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run packages/infrastructure/tests/sqlite-repositories.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/infrastructure/src/sqlite-schedule-repository.ts packages/infrastructure/tests/sqlite-repositories.test.ts
git commit -m "feat: persist reserve usage in current schedule summary"
```

## Task 5: Add a Today-side launcher for logging non-assigned tasks

**Files:**
- Create: `apps/web/components/quick-work-log.tsx`
- Modify: `apps/web/components/work-log-dialog.tsx`
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/tests/ui.test.tsx`

- [ ] **Step 1: Write the failing Today UI tests**

```tsx
it("renders a launcher for logging work on other active tasks", async () => {
  render(await HomePage());

  expect(screen.getByRole("button", { name: "他の task を記録" })).toBeInTheDocument();
});

it("shows a task selector in the quick work-log dialog", async () => {
  render(<QuickWorkLog tasks={[{ id: "task_1", title: "Reply mail", remainingMinutes: 60 }]} date="2026-05-08" />);

  fireEvent.click(screen.getByRole("button", { name: "他の task を記録" }));

  expect(screen.getByRole("combobox", { name: "task" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/ui.test.tsx`
Expected: FAIL because the new launcher does not exist.

- [ ] **Step 3: Implement the launcher and generalize the dialog**

Use a thin wrapper:

```tsx
export function QuickWorkLog({ tasks, date }: { tasks: Array<{ id: string; title: string; remainingMinutes: number }>; date: string }) {
  const [selectedTaskId, setSelectedTaskId] = React.useState(tasks[0]?.id ?? "");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <WorkLogDialog
      triggerLabel="他の task を記録"
      selectableTasks={tasks}
      selectedTaskId={selectedTaskId}
      onSelectedTaskIdChange={setSelectedTaskId}
      taskId={selectedTask?.id ?? ""}
      title={selectedTask?.title ?? "task を選択"}
      date={date}
      defaultRemainingHours={(selectedTask?.remainingMinutes ?? 0) / 60}
    />
  );
}
```

Generalize `WorkLogDialog` so it can optionally render a `<Select aria-label="task">`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/quick-work-log.tsx apps/web/components/work-log-dialog.tsx apps/web/app/page.tsx apps/web/tests/ui.test.tsx
git commit -m "feat: add quick work logging for non-assigned tasks"
```

## Task 6: Surface reserve usage lightly in Today and 計画

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/week/page.tsx`
- Test: `apps/web/tests/ui.test.tsx`

- [ ] **Step 1: Write the failing reserve-display tests**

```tsx
it("shows reserve usage on Today when today's plan consumed reserve", async () => {
  taskPlatformMock.getCurrentSchedule.mockResolvedValue({
    activeScheduleId: "schedule_1",
    summary: {
      bufferUsageByDate: { "2026-05-08": 36 },
      datesUsingReserve: ["2026-05-08"],
      insufficientEvenWithReserve: false,
    },
    slices: [{ task_id: "task_today", date: "2026-05-08", planned_minutes: 420 }],
  });

  render(await HomePage());

  expect(screen.getByText(/バッファ使用/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run apps/web/tests/ui.test.tsx`
Expected: FAIL because reserve usage is not rendered.

- [ ] **Step 3: Add minimal reserve display**

On `Today`, use compact badges such as:

```tsx
{todayReserveMinutes > 0 ? (
  <StatusBadge tone="warning">{`バッファ使用 ${formatHoursFromMinutes(todayReserveMinutes)}`}</StatusBadge>
) : (
  <StatusBadge tone="outline">{`通常予算内`}</StatusBadge>
)}
```

On `計画`, show a subtle note in each day cell or summary area when reserve is used.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run apps/web/tests/ui.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/week/page.tsx apps/web/tests/ui.test.tsx
git commit -m "feat: show reserve usage in planning surfaces"
```

## Task 7: Update README and run verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update user-facing docs**

```md
- `Today` から、今日の割当 task 以外の active task も記録できます
- scheduler は各日の余力時間のうち原則 20% を reserve として残し、必要時だけ使います
- 未完了 task は残り時間として次回の自動再配分に持ち越されます
```

- [ ] **Step 2: Run focused tests**

Run: `pnpm test -- --run packages/domain/tests/schedule.test.ts packages/application/tests/use-cases.test.ts packages/infrastructure/tests/sqlite-repositories.test.ts apps/web/tests/ui.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `pnpm test`
Expected: PASS

Run: `timeout 90s pnpm --filter web build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe reserve-aware logging workflow"
```

## Self-Review

- Spec coverage:
  - non-assigned task logging from Today: Task 5
  - reserve-aware scheduling and validation: Tasks 1-4
  - carry-over through remaining minutes and normal rescheduling: Tasks 1-3
  - light reserve display in UI: Task 6
  - docs: Task 7
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” placeholders remain.
- Type consistency:
  - `bufferUsageByDate`, `datesUsingReserve`, and `insufficientEvenWithReserve` are introduced in domain summary first and reused with the same names in application, infrastructure, UI, and docs.
