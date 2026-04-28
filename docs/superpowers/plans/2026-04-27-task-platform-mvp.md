# Task Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current Task Platform MVP so it satisfies the intended weekly planning workflow, proposal review flow, Web-first daily operation, and agent-assisted scheduling model.

**Architecture:** Keep the existing pnpm-workspace modular monolith. Extend the domain and application layers first so scheduling, task attributes, and proposal summaries become multi-day and explainable. Then connect the richer model to a modern Next.js dashboard UI and the MCP server, and finally clean up the remaining leaked local-path history.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js App Router, React 19, Vitest, zod, better-sqlite3, `@modelcontextprotocol/sdk`

---

## File Structure

Modify and maintain the following files during this implementation:

- `README.md`
- `docs/superpowers/specs/2026-04-27-task-platform-design.md`
- `docs/superpowers/plans/2026-04-27-task-platform-mvp.md`
- `package.json`
- `packages/contracts/src/index.ts`
- `packages/domain/src/task.ts`
- `packages/domain/src/schedule.ts`
- `packages/domain/src/index.ts`
- `packages/domain/tests/task.test.ts`
- `packages/domain/tests/schedule.test.ts`
- `packages/application/src/use-cases/create-task.ts`
- `packages/application/src/use-cases/update-task.ts`
- `packages/application/src/use-cases/log-work.ts`
- `packages/application/src/use-cases/set-capacity.ts`
- `packages/application/src/use-cases/generate-schedule-proposal.ts`
- `packages/application/src/index.ts`
- `packages/application/tests/use-cases.test.ts`
- `packages/infrastructure/migrations/001_initial.sql`
- `packages/infrastructure/src/sqlite-task-repository.ts`
- `packages/infrastructure/src/sqlite-schedule-repository.ts`
- `packages/infrastructure/src/sqlite-metrics-repository.ts`
- `packages/infrastructure/tests/sqlite-repositories.test.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/inbox/page.tsx`
- `apps/web/app/week/page.tsx`
- `apps/web/app/proposals/page.tsx`
- `apps/web/app/api/tasks/route.ts`
- `apps/web/app/api/tasks/[taskId]/route.ts`
- `apps/web/app/api/tasks/[taskId]/log-work/route.ts`
- `apps/web/app/api/capacity/route.ts`
- `apps/web/app/api/schedules/proposals/route.ts`
- `apps/web/app/api/schedules/proposals/[proposalId]/approve/route.ts`
- `apps/web/app/api/schedules/proposals/[proposalId]/reject/route.ts`
- `apps/web/lib/task-platform.ts`
- `apps/web/tests/ui.test.tsx`
- `apps/web/tests/flows.test.tsx`
- `apps/mcp/src/server.ts`
- `apps/mcp/tests/server.test.ts`

The existing repository already contains the baseline implementation. This plan focuses on targeted upgrades rather than re-bootstrap work.

## Task 1: Extend The Domain Model For Work Shape And Horizon-Based Planning

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/domain/src/task.ts`
- Modify: `packages/domain/src/schedule.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/tests/task.test.ts`
- Test: `packages/domain/tests/schedule.test.ts`

- [ ] **Step 1: Write failing task-model tests for new attributes**

Add test cases covering:

```ts
it("defaults taskType and energy to unknown", () => {
  const task = createTask({
    id: "task_1",
    title: "Write summary",
    remainingMinutes: 60,
    createdAt: "2026-04-27T00:00:00.000Z",
  });

  expect(task.taskType).toBe("unknown");
  expect(task.energy).toBe("unknown");
});
```

```ts
it("preserves explicit taskType and energy", () => {
  const task = createTask({
    id: "task_2",
    title: "Implement scheduler",
    remainingMinutes: 120,
    createdAt: "2026-04-27T00:00:00.000Z",
    taskType: "implementation",
    energy: "high",
  });

  expect(task.taskType).toBe("implementation");
  expect(task.energy).toBe("high");
});
```

- [ ] **Step 2: Run the domain task tests and verify they fail**

Run: `pnpm test -- packages/domain/tests/task.test.ts`

Expected: FAIL because `taskType` and `energy` are not part of the task model yet.

- [ ] **Step 3: Extend task contracts and domain types**

Update `packages/contracts/src/index.ts` so `createTaskInputSchema` accepts:

```ts
taskType: z
  .enum(["deep", "shallow", "admin", "research", "writing", "implementation", "unknown"])
  .optional(),
energy: z.enum(["low", "medium", "high", "unknown"]).optional(),
```

Update `packages/domain/src/task.ts` so:

- `Task` includes `taskType` and `energy`
- `CreateTaskInput` includes `taskType` and `energy`
- `createTask()` defaults both to `"unknown"`

- [ ] **Step 4: Re-run the task tests and verify they pass**

Run: `pnpm test -- packages/domain/tests/task.test.ts`

Expected: PASS

- [ ] **Step 5: Write failing schedule tests for multi-day horizon and summary**

Add schedule tests covering:

```ts
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
```

```ts
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

  expect(proposal.riskFlags).toContain("task_risky:insufficient_capacity_before_due_date");
  expect(proposal.summary.unscheduledTaskIds).toContain("task_risky");
  expect(proposal.summary.capacityPressureByDate["2026-04-27"]).toBeGreaterThan(0);
});
```

- [ ] **Step 6: Run the schedule tests and verify they fail**

Run: `pnpm test -- packages/domain/tests/schedule.test.ts`

Expected: FAIL because the schedule proposal currently lacks richer summary and real horizon behavior.

- [ ] **Step 7: Implement multi-day scheduling and proposal summary**

Update `packages/domain/src/schedule.ts` to:

- add a `summary` object to the proposal type
- compute `unscheduledTaskIds`
- compute `capacityPressureByDate`
- prefer larger-capacity days for `deep` / `high` energy work
- treat `admin` / `shallow` work neutrally or as easier gap-fill work
- preserve `date < dueDate`

Keep the API explainable and deterministic. Avoid ML or hidden scoring.

- [ ] **Step 8: Re-run the domain schedule tests and verify they pass**

Run: `pnpm test -- packages/domain/tests/schedule.test.ts`

Expected: PASS

- [ ] **Step 9: Commit the domain-model upgrade**

```bash
git add packages/contracts/src/index.ts packages/domain/src/task.ts packages/domain/src/schedule.ts packages/domain/src/index.ts packages/domain/tests/task.test.ts packages/domain/tests/schedule.test.ts
git commit -m "feat: extend task model and schedule domain"
```

## Task 2: Upgrade Application And SQLite Layers For Richer Scheduling

**Files:**
- Modify: `packages/application/src/use-cases/create-task.ts`
- Modify: `packages/application/src/use-cases/update-task.ts`
- Modify: `packages/application/src/use-cases/log-work.ts`
- Modify: `packages/application/src/use-cases/set-capacity.ts`
- Modify: `packages/application/src/use-cases/generate-schedule-proposal.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `packages/application/tests/use-cases.test.ts`
- Modify: `packages/infrastructure/migrations/001_initial.sql`
- Modify: `packages/infrastructure/src/sqlite-task-repository.ts`
- Modify: `packages/infrastructure/src/sqlite-schedule-repository.ts`
- Modify: `packages/infrastructure/src/sqlite-metrics-repository.ts`
- Test: `packages/infrastructure/tests/sqlite-repositories.test.ts`

- [ ] **Step 1: Write failing application tests for horizon-based proposal generation**

Add use-case tests asserting that:

- `createTaskUseCase` stores `taskType` and `energy`
- `setCapacityUseCase` can generate a proposal covering more than one day
- `logWorkUseCase` produces a refreshed summary containing `unscheduledTaskIds`

- [ ] **Step 2: Run the use-case tests and verify they fail**

Run: `pnpm test -- packages/application/tests/use-cases.test.ts`

Expected: FAIL because current use cases only read a narrow capacity range and do not persist richer fields.

- [ ] **Step 3: Expand task persistence and use-case inputs**

Update:

- task repository mapping to store and load `task_type` and `energy`
- use-case input types so create/update paths accept those fields

Update the migration so `tasks` contains:

```sql
task_type TEXT NOT NULL DEFAULT 'unknown',
energy TEXT NOT NULL DEFAULT 'unknown'
```

Keep the migration idempotent for test environments.

- [ ] **Step 4: Introduce shared horizon selection in application use cases**

Refactor proposal-generating use cases to compute the horizon as:

- start = `today`
- end = `max(latest due date - 1 day, today + 6 days)`

Apply this consistently in:

- `create-task.ts`
- `update-task.ts`
- `log-work.ts`
- `set-capacity.ts`
- `generate-schedule-proposal.ts`

- [ ] **Step 5: Persist richer proposal summaries**

Update `sqlite-schedule-repository.ts` so `summary_json` reads and writes:

- `riskFlags`
- `unscheduledTaskIds`
- `capacityPressureByDate`

Make sure `findById`, `listByStatus`, and `getCurrentSchedule` expose the parsed summary.

- [ ] **Step 6: Add failing SQLite repository tests for new columns and summary shape**

Add integration tests that:

- create a task with `taskType` and `energy` and read it back
- persist a proposal with detailed summary and read it back intact

- [ ] **Step 7: Run the SQLite repository tests and verify they fail**

Run: `pnpm test -- packages/infrastructure/tests/sqlite-repositories.test.ts`

Expected: FAIL due to missing columns or incomplete summary persistence.

- [ ] **Step 8: Implement the repository changes and re-run tests**

Run:

```bash
pnpm test -- packages/application/tests/use-cases.test.ts
pnpm test -- packages/infrastructure/tests/sqlite-repositories.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit the application and infrastructure upgrade**

```bash
git add packages/application/src/use-cases/create-task.ts packages/application/src/use-cases/update-task.ts packages/application/src/use-cases/log-work.ts packages/application/src/use-cases/set-capacity.ts packages/application/src/use-cases/generate-schedule-proposal.ts packages/application/src/index.ts packages/application/tests/use-cases.test.ts packages/infrastructure/migrations/001_initial.sql packages/infrastructure/src/sqlite-task-repository.ts packages/infrastructure/src/sqlite-schedule-repository.ts packages/infrastructure/src/sqlite-metrics-repository.ts packages/infrastructure/tests/sqlite-repositories.test.ts
git commit -m "feat: upgrade scheduling application flow"
```

## Task 3: Make The Web UI Human-Usable And End-To-End Functional

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/inbox/page.tsx`
- Modify: `apps/web/app/week/page.tsx`
- Modify: `apps/web/app/proposals/page.tsx`
- Modify: `apps/web/app/api/tasks/route.ts`
- Modify: `apps/web/app/api/tasks/[taskId]/route.ts`
- Modify: `apps/web/app/api/tasks/[taskId]/log-work/route.ts`
- Modify: `apps/web/app/api/capacity/route.ts`
- Modify: `apps/web/app/api/schedules/proposals/route.ts`
- Modify: `apps/web/app/api/schedules/proposals/[proposalId]/approve/route.ts`
- Modify: `apps/web/app/api/schedules/proposals/[proposalId]/reject/route.ts`
- Modify: `apps/web/lib/task-platform.ts`
- Test: `apps/web/tests/ui.test.tsx`
- Test: `apps/web/tests/flows.test.tsx`

- [ ] **Step 1: Write failing UI tests for the missing workflow pieces**

Add tests for:

- inbox form contains `dueDate`, `urgency`, `taskType`, `energy`
- week page renders editable capacity inputs or forms
- today page renders a work-log form
- proposals page renders unscheduled task and pressure details

- [ ] **Step 2: Run the UI tests and verify they fail**

Run: `pnpm test -- apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx`

Expected: FAIL because the current pages are mostly read-only and minimally styled.

- [ ] **Step 3: Expand the task-platform adapter**

Update `apps/web/lib/task-platform.ts` so the adapter exposes data needed by the richer UI:

- task list with `taskType` and `energy`
- proposal detail with summary
- week-range capacities
- metrics range helpers

- [ ] **Step 4: Upgrade the Inbox page**

Implement:

- a styled form with `title`, `remainingMinutes`, `dueDate`, `urgency`, `taskType`, `energy`, `notes`
- lightweight edit controls for existing tasks
- clear inbox/active/done visual states

- [ ] **Step 5: Upgrade the Week page**

Implement:

- a one-week capacity view
- editable `availableMinutes` and `bufferMinutes` forms
- visible metrics and pressure summary

- [ ] **Step 6: Upgrade the Today page**

Implement:

- styled task slices
- a work-log form per task or per slice
- remaining estimate update entry
- visible relationship to the approved proposal

- [ ] **Step 7: Upgrade the Proposals page**

Implement:

- pending proposal list
- detail block showing `riskFlags`
- unscheduled tasks section
- day-by-day capacity pressure section
- approve and reject actions

- [ ] **Step 8: Make the UI intentionally styled**

Update `apps/web/app/layout.tsx` and page markup to provide:

- consistent typography
- spacing rhythm
- card-based layout
- clear primary/secondary information hierarchy
- mobile-friendly stacking

Avoid raw default browser rendering. Keep styling lightweight and local to the app if no existing design system exists.

- [ ] **Step 9: Re-run the UI tests and verify they pass**

Run: `pnpm test -- apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx`

Expected: PASS

- [ ] **Step 10: Run a production build to verify Next.js integration**

Run: `timeout 60s pnpm --filter web build`

Expected: PASS with the main routes and API routes building successfully.

- [ ] **Step 11: Commit the Web UI upgrade**

```bash
git add apps/web/app/layout.tsx apps/web/app/page.tsx apps/web/app/inbox/page.tsx apps/web/app/week/page.tsx apps/web/app/proposals/page.tsx apps/web/app/api/tasks/route.ts apps/web/app/api/tasks/[taskId]/route.ts apps/web/app/api/tasks/[taskId]/log-work/route.ts apps/web/app/api/capacity/route.ts apps/web/app/api/schedules/proposals/route.ts apps/web/app/api/schedules/proposals/[proposalId]/approve/route.ts apps/web/app/api/schedules/proposals/[proposalId]/reject/route.ts apps/web/lib/task-platform.ts apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx
git commit -m "feat: deliver web-first planning workflow"
```

## Task 4: Extend The MCP Surface And Metrics Usage

**Files:**
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/mcp/tests/server.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/infrastructure/src/sqlite-metrics-repository.ts`

- [ ] **Step 1: Write failing MCP tests for richer task attributes and proposal summaries**

Add tests asserting that the registered tools accept or expose:

- `taskType`
- `energy`
- richer proposal summaries

- [ ] **Step 2: Run the MCP tests and verify they fail**

Run: `pnpm test -- apps/mcp/tests/server.test.ts`

Expected: FAIL because the current tool schemas do not fully cover the richer model.

- [ ] **Step 3: Extend MCP input and output handling**

Update `apps/mcp/src/server.ts` so:

- `task_create` accepts `taskType` and `energy`
- `task_update` accepts `taskType` and `energy`
- proposal-returning tools expose the richer summary cleanly

- [ ] **Step 4: Keep metrics agent-friendly**

If needed, refine `sqlite-metrics-repository.ts` so the returned range summary remains stable and useful for daily/weekly commentary without overcomplicating the schema.

- [ ] **Step 5: Re-run the MCP tests and build**

Run:

```bash
pnpm test -- apps/mcp/tests/server.test.ts
pnpm --filter mcp build
```

Expected: PASS

- [ ] **Step 6: Commit the MCP upgrade**

```bash
git add apps/mcp/src/server.ts apps/mcp/tests/server.test.ts packages/contracts/src/index.ts packages/infrastructure/src/sqlite-metrics-repository.ts
git commit -m "feat: extend MCP planning interface"
```

## Task 5: Clean Public Documentation And Local History

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Search for leaked local paths in public-facing files**

Run:

```bash
rg -n "<local-path-patterns>" README.md docs apps packages
```

Expected: either no matches, or only the lines you are about to remove.

- [ ] **Step 2: Remove any absolute-path links from README or docs**

Use relative repository links only. Do not leave clickable absolute local paths in public documentation.

- [ ] **Step 3: Verify the search is clean**

Re-run:

```bash
rg -n "<local-path-patterns>" README.md docs apps packages
```

Expected: no matches

- [ ] **Step 4: Rewrite local branch history if a leaked path still exists in unpublished branch-local commits**

If the current working branch still contains leaked-path commits above `origin/main`, rewrite them with rebase/amend and use `git push --force-with-lease` for the branch only.

- [ ] **Step 5: Repair local `main` as well if its local-only history still contains the leaked commit**

Rewrite the local `main` ref if needed so the local repository no longer carries the leaked path in normal branch history. Do not rewrite remote `main` if it already points to a clean merge commit and does not require it.

- [ ] **Step 6: Commit any remaining documentation cleanup**

```bash
git add README.md
git commit -m "docs: clean public documentation links"
```

Only do this if a normal commit is still appropriate after the history rewrite work.

## Task 6: Final Verification

**Files:**
- Verify the whole repository state after the implementation above

- [ ] **Step 1: Run focused tests for domain, application, infrastructure, web, and mcp**

Run:

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 2: Run production builds**

Run:

```bash
pnpm --filter mcp build
timeout 60s pnpm --filter web build
```

Expected: PASS

- [ ] **Step 3: Re-run leaked-path search**

Run:

```bash
rg -n "<local-path-patterns>" README.md docs apps packages
```

Expected: no matches

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: clean or only intentionally ignored local artifacts such as `.codex`

- [ ] **Step 5: Commit any final integration fixes**

```bash
git add -A
git commit -m "fix: finalize task platform upgrade"
```

Only do this if verification uncovered a final small integration fix.

## Task 7: Add Planning-Health Warnings In The Application Layer

**Files:**
- Modify: `packages/application/src/index.ts`
- Modify: `packages/application/src/ports.ts`
- Create: `packages/application/src/use-cases/get-planning-health.ts`
- Modify: `packages/application/tests/use-cases.test.ts`
- Modify: `packages/infrastructure/src/sqlite-metrics-repository.ts`
- Test: `packages/infrastructure/tests/sqlite-repositories.test.ts`

- [ ] **Step 1: Write failing tests for planning-health warnings**

Add use-case tests covering:

```ts
it("reports missing capacity dates within the next 7 days", async () => {
  const result = await getPlanningHealthUseCase(
    {
      capacityRepository: {
        listBetween: async () => [
          createDayCapacity({ date: "2026-04-28", availableMinutes: 180, bufferMinutes: 30 }),
          createDayCapacity({ date: "2026-04-30", availableMinutes: 120, bufferMinutes: 20 }),
        ],
      },
      clock: { now: () => "2026-04-28T00:00:00.000Z", today: () => "2026-04-28" },
    },
    {},
  );

  expect(result.missingCapacityDatesWithin7Days).toEqual([
    "2026-04-29",
    "2026-05-01",
    "2026-05-02",
    "2026-05-03",
    "2026-05-04",
  ]);
  expect(result.warningCount).toBe(5);
});
```

```ts
it("returns no planning-health warnings when all 7 days are configured", async () => {
  const result = await getPlanningHealthUseCase(
    {
      capacityRepository: {
        listBetween: async () =>
          Array.from({ length: 7 }, (_, offset) =>
            createDayCapacity({
              date: addDays("2026-04-28", offset),
              availableMinutes: 120,
              bufferMinutes: 20,
            }),
          ),
      },
      clock: { now: () => "2026-04-28T00:00:00.000Z", today: () => "2026-04-28" },
    },
    {},
  );

  expect(result.missingCapacityDatesWithin7Days).toEqual([]);
  expect(result.warningCount).toBe(0);
});
```

- [ ] **Step 2: Run the application tests and verify they fail**

Run: `pnpm test -- packages/application/tests/use-cases.test.ts`

Expected: FAIL because planning-health use cases and types do not exist yet.

- [ ] **Step 3: Implement planning-health calculation**

Add `packages/application/src/use-cases/get-planning-health.ts` with:

- a 7-day window from `clock.today()`
- a `listBetween(today, today+6)` read
- a return shape:

```ts
{
  missingCapacityDatesWithin7Days: string[];
  warningCount: number;
}
```

Export it from `packages/application/src/index.ts`.

- [ ] **Step 4: Wire repository typings and repository verification**

Update `packages/application/src/ports.ts` and infrastructure-facing tests as needed so the use case can read capacities without depending on Web-specific logic.

If the infrastructure test suite already covers `listBetween`, extend it only enough to prove missing dates remain absent from the repository result and are derived in the use case, not synthesized by storage.

- [ ] **Step 5: Re-run the focused tests and verify they pass**

Run:

```bash
pnpm test -- packages/application/tests/use-cases.test.ts packages/infrastructure/tests/sqlite-repositories.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the planning-health application layer**

```bash
git add packages/application/src/index.ts packages/application/src/ports.ts packages/application/src/use-cases/get-planning-health.ts packages/application/tests/use-cases.test.ts packages/infrastructure/src/sqlite-metrics-repository.ts packages/infrastructure/tests/sqlite-repositories.test.ts
git commit -m "feat: add planning health warnings"
```

## Task 8: Refine The Web UI Around Daily Execution And Arbitrary-Date Planning

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/week/page.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/lib/task-platform.ts`
- Modify: `apps/web/tests/ui.test.tsx`
- Modify: `apps/web/tests/flows.test.tsx`

- [ ] **Step 1: Write failing Web tests for daily filtering and planning-health warnings**

Add tests covering:

- Today only renders slices whose `date` equals today
- Today renders a warning banner when planning health reports missing dates
- Week accepts a `referenceDate` search param
- Week renders navigation for `previous`, `today`, `next`
- Week renders an arbitrary-date jump input
- Week renders missing-capacity warnings for the next 7 days

Use a focused page-level test shape such as:

```ts
it("shows only today's slices on the Today page", async () => {
  render(await HomePage());
  expect(screen.getByText("Today")).toBeInTheDocument();
  expect(screen.queryByText(/2026-05-01/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Web tests and verify they fail**

Run: `pnpm test -- apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx`

Expected: FAIL because Today currently renders all approved slices and Week is fixed to the current 7-day window.

- [ ] **Step 3: Extend the task-platform adapter for planning health**

Update `apps/web/lib/task-platform.ts` so it exposes:

- `getPlanningHealth()`
- `getCurrentSchedule()` returning enough detail for Today filtering
- helper methods needed by a `referenceDate`-driven Week page

- [ ] **Step 4: Make Today a real daily execution surface**

Update `apps/web/app/page.tsx` so it:

- filters approved slices to `slice.date === today`
- keeps work-log forms attached to each visible slice
- shows a compact planning-health warning card when `warningCount > 0`
- keeps the information hierarchy focused on today's execution

- [ ] **Step 5: Turn Week into an arbitrary-date planning surface**

Update `apps/web/app/week/page.tsx` so it:

- reads `referenceDate` from the query string
- defaults to `today` when absent
- renders a 7-day window starting from `referenceDate`
- provides `previous`, `today`, and `next` navigation links
- provides an arbitrary-date jump form
- shows a warning banner listing `missingCapacityDatesWithin7Days` when present
- preserves editable `availableMinutes` and `bufferMinutes` forms per visible day

- [ ] **Step 6: Improve UX polish for daily use**

Refine `apps/web/app/layout.tsx` and page structure so:

- warnings are visible but not visually noisy
- the Today page feels lighter and more focused than planning pages
- Week navigation and date-jump controls are easy to reach on mobile
- planning cards remain readable on desktop without collapsing into a dense table

- [ ] **Step 7: Re-run the focused Web tests and verify they pass**

Run: `pnpm test -- apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx`

Expected: PASS

- [ ] **Step 8: Run a production build to verify the refined UI**

Run: `timeout 60s pnpm --filter web build`

Expected: PASS

- [ ] **Step 9: Commit the Web UX refinement**

```bash
git add apps/web/app/page.tsx apps/web/app/week/page.tsx apps/web/app/layout.tsx apps/web/lib/task-platform.ts apps/web/tests/ui.test.tsx apps/web/tests/flows.test.tsx
git commit -m "feat: refine daily planning experience"
```

## Task 9: Expose Planning Health Through MCP And Finalize The PR Branch

**Files:**
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/mcp/tests/server.test.ts`
- Modify: `apps/web/app/api/schedules/proposals/route.ts`
- Modify: `docs/superpowers/plans/2026-04-27-task-platform-mvp.md`

- [ ] **Step 1: Write failing MCP tests for planning-health access**

Add tests asserting that:

- a `planning_health_get` tool is registered
- the tool accepts an empty input object
- the tool can return a shape containing `missingCapacityDatesWithin7Days` and `warningCount`

- [ ] **Step 2: Run the MCP tests and verify they fail**

Run: `pnpm test -- apps/mcp/tests/server.test.ts`

Expected: FAIL because the MCP surface does not yet expose planning health.

- [ ] **Step 3: Implement MCP planning-health access**

Update `apps/mcp/src/server.ts` so the server deps include:

- `getPlanningHealth(): Promise<unknown>`

Register:

```ts
server.registerTool(
  "planning_health_get",
  {
    description: "Read planning-health warnings such as missing near-term capacity dates.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify(await deps.getPlanningHealth()) }],
  }),
);
```

- [ ] **Step 4: Keep Web and MCP parity**

If needed, make a small adapter update so the same planning-health use case powers both the Web app and MCP server rather than duplicating logic.

- [ ] **Step 5: Re-run MCP tests and full verification**

Run:

```bash
pnpm test -- apps/mcp/tests/server.test.ts
pnpm test
pnpm --filter mcp build
timeout 60s pnpm --filter web build
```

Expected: PASS

- [ ] **Step 6: Commit the planning-health integration**

```bash
git add apps/mcp/src/server.ts apps/mcp/tests/server.test.ts apps/web/app/api/schedules/proposals/route.ts docs/superpowers/plans/2026-04-27-task-platform-mvp.md
git commit -m "feat: expose planning health to agents"
```

## Self-Review

Spec coverage check:

- weekly horizon scheduling: covered by Task 1 and Task 2
- task work-shape attributes: covered by Task 1, Task 2, and Task 4
- Web-only routine operation: covered by Task 3
- proposal detail and risk visibility: covered by Task 1, Task 2, and Task 3
- MCP parity with richer model: covered by Task 4
- planning-health warnings in Web and MCP: covered by Task 7, Task 8, and Task 9
- arbitrary-date capacity planning UX: covered by Task 8
- Today-only daily execution surface: covered by Task 8
- public-doc and history cleanup: covered by Task 5
- final verification: covered by Task 6

Placeholder scan:

- no `TODO` / `TBD`
- each task names exact files and commands
- each testing step states expected failure or pass condition

Type consistency check:

- `taskType` and `energy` are used consistently across contracts, domain, application, Web, and MCP
- proposal summary uses `riskFlags`, `unscheduledTaskIds`, and `capacityPressureByDate` consistently
