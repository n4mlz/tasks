# Task Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user TypeScript task platform MVP with a proposal-based scheduler, MCP server, and Web UI that share one application core.

**Architecture:** Use a pnpm-workspace modular monolith. Keep scheduling logic pure in `packages/domain`, use cases in `packages/application`, SQLite repositories in `packages/infrastructure`, MCP tool adapters in `apps/mcp`, and the user-facing UI in `apps/web`. All schedule changes create pending proposals first; only explicit approval updates the active schedule snapshot.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js App Router, Vitest, zod, better-sqlite3, `@modelcontextprotocol/sdk`

---

## File Structure

Create and maintain the following structure during implementation:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `vitest.workspace.ts`
- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
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
- `apps/mcp/package.json`
- `apps/mcp/src/server.ts`
- `packages/contracts/package.json`
- `packages/contracts/src/index.ts`
- `packages/domain/package.json`
- `packages/domain/src/index.ts`
- `packages/domain/src/task.ts`
- `packages/domain/src/capacity.ts`
- `packages/domain/src/schedule.ts`
- `packages/domain/src/metrics.ts`
- `packages/domain/tests/task.test.ts`
- `packages/domain/tests/schedule.test.ts`
- `packages/application/package.json`
- `packages/application/src/index.ts`
- `packages/application/src/ports.ts`
- `packages/application/src/use-cases/create-task.ts`
- `packages/application/src/use-cases/update-task.ts`
- `packages/application/src/use-cases/log-work.ts`
- `packages/application/src/use-cases/set-capacity.ts`
- `packages/application/src/use-cases/generate-schedule-proposal.ts`
- `packages/application/src/use-cases/approve-proposal.ts`
- `packages/application/src/use-cases/reject-proposal.ts`
- `packages/application/src/use-cases/get-metrics.ts`
- `packages/application/tests/*.test.ts`
- `packages/infrastructure/package.json`
- `packages/infrastructure/src/index.ts`
- `packages/infrastructure/src/db.ts`
- `packages/infrastructure/src/migrate.ts`
- `packages/infrastructure/src/sqlite-task-repository.ts`
- `packages/infrastructure/src/sqlite-capacity-repository.ts`
- `packages/infrastructure/src/sqlite-schedule-repository.ts`
- `packages/infrastructure/src/sqlite-worklog-repository.ts`
- `packages/infrastructure/src/sqlite-metrics-repository.ts`
- `packages/infrastructure/migrations/001_initial.sql`
- `packages/infrastructure/tests/sqlite-repositories.test.ts`
- `packages/scheduler/package.json`
- `packages/scheduler/src/index.ts`
- `packages/scheduler/src/trigger.ts`
- `packages/scheduler/tests/trigger.test.ts`

Implementation should keep files focused. Do not merge domain logic into transport layers.

### Task 1: Bootstrap The Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `apps/web/package.json`
- Create: `apps/mcp/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/domain/package.json`
- Create: `packages/application/package.json`
- Create: `packages/infrastructure/package.json`
- Create: `packages/scheduler/package.json`
- Create: `packages/domain/src/index.ts`
- Create: `packages/domain/tests/smoke.test.ts`

- [ ] **Step 1: Create the root workspace files**

```json
{
  "name": "task-platform",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest --run",
    "test:domain": "vitest --run packages/domain/tests",
    "lint": "tsc -b --pretty false",
    "dev:web": "pnpm --filter web dev",
    "dev:mcp": "pnpm --filter mcp dev"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*",
  "apps/*",
]);
```

- [ ] **Step 2: Create package manifests for each workspace**

```json
{
  "name": "@task-platform/domain",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "@task-platform/application",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "@task-platform/infrastructure",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "@task-platform/contracts",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "@task-platform/scheduler",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest --run"
  }
}
```

```json
{
  "name": "mcp",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest --run"
  }
}
```

- [ ] **Step 3: Write the first failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { createTask } from "../src/index";

describe("domain smoke test", () => {
  it("creates an inbox task by default", () => {
    const task = createTask({
      id: "task_1",
      title: "Prepare seminar slides",
      remainingMinutes: 180,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    expect(task.status).toBe("inbox");
    expect(task.urgency).toBe("normal");
  });
});
```

- [ ] **Step 4: Run the smoke test and verify it fails**

Run: `pnpm test:domain`

Expected: FAIL with a module export or symbol error because `createTask` does not exist yet.

- [ ] **Step 5: Add the minimal domain entry point to pass the smoke test**

```ts
export type TaskStatus = "inbox" | "active" | "done" | "archived";
export type TaskUrgency = "today" | "soon" | "normal";

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  remainingMinutes: number;
  dueDate: string | null;
  urgency: TaskUrgency;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  id: string;
  title: string;
  remainingMinutes: number;
  createdAt: string;
  dueDate?: string | null;
  notes?: string;
  urgency?: TaskUrgency;
  status?: TaskStatus;
}

export function createTask(input: CreateTaskInput): Task {
  return {
    id: input.id,
    title: input.title.trim(),
    notes: input.notes ?? "",
    status: input.status ?? "inbox",
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate ?? null,
    urgency: input.urgency ?? "normal",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}
```

- [ ] **Step 6: Re-run the smoke test**

Run: `pnpm test:domain`

Expected: PASS with `1 passed`.

- [ ] **Step 7: Install the initial dependencies**

Run: `pnpm install`

Expected: the workspace lockfile is created and all packages resolve successfully.

- [ ] **Step 8: Commit the bootstrap**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts apps packages
git commit -m "chore: bootstrap task platform workspace"
```

### Task 2: Define Domain Types And Validation Rules

**Files:**
- Create: `packages/domain/src/task.ts`
- Create: `packages/domain/src/capacity.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/tests/task.test.ts`

- [ ] **Step 1: Write the failing task validation tests**

```ts
import { describe, expect, it } from "vitest";
import { createTask, updateTaskEstimate } from "../src/index";

describe("task validation", () => {
  it("rejects non-positive remaining minutes", () => {
    expect(() =>
      createTask({
        id: "task_2",
        title: "Bad task",
        remainingMinutes: 0,
        createdAt: "2026-04-27T00:00:00.000Z",
      }),
    ).toThrow("remainingMinutes must be positive");
  });

  it("updates the remaining estimate and timestamp", () => {
    const task = createTask({
      id: "task_3",
      title: "Write report",
      remainingMinutes: 120,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const updated = updateTaskEstimate(task, {
      remainingMinutes: 45,
      updatedAt: "2026-04-27T02:00:00.000Z",
    });

    expect(updated.remainingMinutes).toBe(45);
    expect(updated.updatedAt).toBe("2026-04-27T02:00:00.000Z");
  });

  it("allows a task to reach zero remaining minutes after work is logged", () => {
    const task = createTask({
      id: "task_4",
      title: "Send reply",
      remainingMinutes: 15,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    const updated = updateTaskEstimate(task, {
      remainingMinutes: 0,
      updatedAt: "2026-04-27T00:30:00.000Z",
    });

    expect(updated.remainingMinutes).toBe(0);
  });
});
```

- [ ] **Step 2: Run the task validation tests**

Run: `pnpm vitest --run packages/domain/tests/task.test.ts`

Expected: FAIL because `updateTaskEstimate` does not exist and validation is not implemented.

- [ ] **Step 3: Implement task validation helpers**

```ts
export function assertPositiveMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("remainingMinutes must be positive");
  }
}

export function assertNonNegativeMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("remainingMinutes must be zero or positive");
  }
}

export function updateTaskEstimate(
  task: Task,
  input: { remainingMinutes: number; updatedAt: string },
): Task {
  assertNonNegativeMinutes(input.remainingMinutes);

  return {
    ...task,
    remainingMinutes: input.remainingMinutes,
    updatedAt: input.updatedAt,
  };
}
```

```ts
export interface DayCapacity {
  date: string;
  availableMinutes: number;
  bufferMinutes: number;
}

export function createDayCapacity(input: {
  date: string;
  availableMinutes: number;
  bufferMinutes?: number;
}): DayCapacity {
  if (!Number.isInteger(input.availableMinutes) || input.availableMinutes < 0) {
    throw new Error("availableMinutes must be zero or positive");
  }

  const bufferMinutes =
    input.bufferMinutes ?? Math.round(input.availableMinutes * 0.2);

  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
    throw new Error("bufferMinutes must be zero or positive");
  }

  return {
    date: input.date,
    availableMinutes: input.availableMinutes,
    bufferMinutes,
  };
}
```

- [ ] **Step 4: Export the new task and capacity functions**

```ts
export * from "./task";
export * from "./capacity";
```

- [ ] **Step 5: Re-run the task validation tests**

Run: `pnpm vitest --run packages/domain/tests/task.test.ts`

Expected: PASS with `3 passed`.

- [ ] **Step 6: Add a capacity test before extending further**

```ts
import { describe, expect, it } from "vitest";
import { createDayCapacity } from "../src/index";

describe("day capacity defaults", () => {
  it("creates a 20 percent buffer by default", () => {
    const capacity = createDayCapacity({
      date: "2026-04-27",
      availableMinutes: 300,
    });

    expect(capacity.bufferMinutes).toBe(60);
  });
});
```

- [ ] **Step 7: Run the full domain suite**

Run: `pnpm test:domain`

Expected: PASS with all current domain tests green.

- [ ] **Step 8: Commit the domain primitives**

```bash
git add packages/domain
git commit -m "feat: add core task and capacity domain rules"
```

### Task 3: Build The Scheduling Engine

**Files:**
- Create: `packages/domain/src/schedule.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/tests/schedule.test.ts`

- [ ] **Step 1: Write the failing scheduling tests**

```ts
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
});
```

- [ ] **Step 2: Run the scheduling tests**

Run: `pnpm vitest --run packages/domain/tests/schedule.test.ts`

Expected: FAIL because `buildScheduleProposal` does not exist.

- [ ] **Step 3: Implement the pure schedule proposal builder**

```ts
export interface ScheduledSlice {
  taskId: string;
  date: string;
  plannedMinutes: number;
  kind: "focus" | "buffer_fill";
}

export interface DomainScheduleProposal {
  horizonStart: string;
  horizonEnd: string;
  slices: ScheduledSlice[];
  riskFlags: string[];
}

export function usableMinutesForDay(capacity: DayCapacity): number {
  return Math.max(capacity.availableMinutes - capacity.bufferMinutes, 0);
}

export function buildScheduleProposal(input: {
  today: string;
  tasks: Task[];
  capacities: DayCapacity[];
}): DomainScheduleProposal {
  const sortedTasks = [...input.tasks].sort((left, right) => {
    if (left.urgency === "today" && right.urgency !== "today") return -1;
    if (left.urgency !== "today" && right.urgency === "today") return 1;
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return left.createdAt.localeCompare(right.createdAt);
  });

  const dayBudgets = new Map(
    input.capacities.map((capacity) => [capacity.date, usableMinutesForDay(capacity)]),
  );

  const slices: ScheduledSlice[] = [];
  const riskFlags: string[] = [];

  for (const task of sortedTasks) {
    let remaining = task.remainingMinutes;
    const candidateDays = input.capacities
      .map((capacity) => capacity.date)
      .filter((date) => (task.dueDate ? date < task.dueDate : true));

    for (const date of candidateDays) {
      const budget = dayBudgets.get(date) ?? 0;
      if (budget <= 0 || remaining <= 0) continue;

      const plannedMinutes = Math.min(budget, remaining);
      slices.push({
        taskId: task.id,
        date,
        plannedMinutes,
        kind: "focus",
      });
      dayBudgets.set(date, budget - plannedMinutes);
      remaining -= plannedMinutes;
    }

    if (remaining > 0 && task.dueDate) {
      riskFlags.push(`${task.id}:insufficient_capacity_before_due_date`);
    }
  }

  return {
    horizonStart: input.capacities[0]?.date ?? input.today,
    horizonEnd: input.capacities.at(-1)?.date ?? input.today,
    slices,
    riskFlags,
  };
}
```

- [ ] **Step 4: Add a minimum-slice regression test**

```ts
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
```

- [ ] **Step 5: Re-run the scheduling tests**

Run: `pnpm vitest --run packages/domain/tests/schedule.test.ts`

Expected: PASS with all scheduling tests green.

- [ ] **Step 6: Run the full domain suite**

Run: `pnpm test:domain`

Expected: PASS with the smoke, task, and schedule tests all green.

- [ ] **Step 7: Commit the scheduling engine**

```bash
git add packages/domain
git commit -m "feat: implement domain schedule proposal engine"
```

### Task 4: Add Shared Contracts And Repository Ports

**Files:**
- Create: `packages/contracts/src/index.ts`
- Create: `packages/application/src/ports.ts`
- Create: `packages/application/src/index.ts`
- Create: `packages/application/tests/ports-smoke.test.ts`

- [ ] **Step 1: Write the failing contracts smoke test**

```ts
import { describe, expect, it } from "vitest";
import { createTaskInputSchema } from "@task-platform/contracts";

describe("contracts smoke test", () => {
  it("parses a task creation payload", () => {
    const parsed = createTaskInputSchema.parse({
      title: "Draft essay",
      remainingMinutes: 90,
      dueDate: "2026-04-30",
      urgency: "soon",
    });

    expect(parsed.title).toBe("Draft essay");
  });
});
```

- [ ] **Step 2: Run the contracts smoke test**

Run: `pnpm vitest --run packages/application/tests/ports-smoke.test.ts`

Expected: FAIL because the shared contracts package does not exist yet.

- [ ] **Step 3: Add the zod contracts**

```ts
import { z } from "zod";

export const taskUrgencySchema = z.enum(["today", "soon", "normal"]);
export const taskStatusSchema = z.enum(["inbox", "active", "done", "archived"]);

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  remainingMinutes: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  urgency: taskUrgencySchema.optional(),
  notes: z.string().optional(),
});

export const setCapacityInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availableMinutes: z.number().int().min(0),
  bufferMinutes: z.number().int().min(0).optional(),
});

export const logWorkInputSchema = z.object({
  taskId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  spentMinutes: z.number().int().positive(),
  remainingMinutesAfter: z.number().int().min(0),
  note: z.string().optional(),
});
```

- [ ] **Step 4: Define the application ports**

```ts
import type {
  DayCapacity,
  DomainScheduleProposal,
  Task,
} from "@task-platform/domain";

export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(taskId: string): Promise<Task | null>;
  listSchedulable(): Promise<Task[]>;
  listAll(): Promise<Task[]>;
}

export interface CapacityRepository {
  upsert(capacity: DayCapacity): Promise<void>;
  listBetween(dateFrom: string, dateTo: string): Promise<DayCapacity[]>;
}

export interface ScheduleRepository {
  savePendingProposal(proposal: DomainScheduleProposal & {
    id: string;
    reason: string;
    generatedAt: string;
  }): Promise<void>;
  findById(proposalId: string): Promise<unknown | null>;
  listByStatus(status?: string): Promise<unknown[]>;
  getCurrentSchedule(): Promise<unknown>;
  approveProposal(proposalId: string, approvedAt: string): Promise<void>;
  rejectProposal(proposalId: string): Promise<void>;
}

export interface WorkLogRepository {
  append(entry: {
    id: string;
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note: string;
  }): Promise<void>;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface Clock {
  now(): string;
  today(): string;
}
```

- [ ] **Step 5: Export the ports and contracts**

```ts
export * from "./ports";
```

- [ ] **Step 6: Re-run the contracts smoke test**

Run: `pnpm vitest --run packages/application/tests/ports-smoke.test.ts`

Expected: PASS once `zod` is installed and exports resolve.

- [ ] **Step 7: Install the shared runtime dependencies**

Run: `pnpm add -w zod better-sqlite3 @modelcontextprotocol/sdk next react react-dom`

Expected: dependencies are added to the workspace root and linked into package graphs as needed.

- [ ] **Step 8: Commit the contracts and ports**

```bash
git add packages/contracts packages/application package.json pnpm-lock.yaml
git commit -m "feat: add shared contracts and application ports"
```

### Task 5: Implement Core Application Use Cases

**Files:**
- Create: `packages/application/src/use-cases/create-task.ts`
- Create: `packages/application/src/use-cases/update-task.ts`
- Create: `packages/application/src/use-cases/log-work.ts`
- Create: `packages/application/src/use-cases/set-capacity.ts`
- Create: `packages/application/src/use-cases/generate-schedule-proposal.ts`
- Create: `packages/application/src/use-cases/approve-proposal.ts`
- Create: `packages/application/src/use-cases/reject-proposal.ts`
- Create: `packages/application/src/use-cases/get-metrics.ts`
- Modify: `packages/application/src/index.ts`
- Create: `packages/application/tests/use-cases.test.ts`

- [ ] **Step 1: Write the failing create-task application test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createTaskUseCase } from "../src/index";

describe("createTaskUseCase", () => {
  it("stores a task and generates a pending proposal", async () => {
    const taskRepository = {
      save: vi.fn().mockResolvedValue(undefined),
    };

    const scheduleRepository = {
      savePendingProposal: vi.fn().mockResolvedValue(undefined),
    };

    const clock = {
      now: () => "2026-04-27T09:00:00.000Z",
      today: () => "2026-04-27",
    };

    const idGenerator = {
      next: (prefix: string) => `${prefix}_1`,
    };

    await createTaskUseCase(
      {
        taskRepository,
        scheduleRepository,
        capacityRepository: { listBetween: vi.fn().mockResolvedValue([]) },
        clock,
        idGenerator,
      },
      {
        title: "Prepare application essay",
        remainingMinutes: 180,
      },
    );

    expect(taskRepository.save).toHaveBeenCalledTimes(1);
    expect(scheduleRepository.savePendingProposal).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the create-task application test**

Run: `pnpm vitest --run packages/application/tests/use-cases.test.ts`

Expected: FAIL because `createTaskUseCase` does not exist.

- [ ] **Step 3: Implement `createTaskUseCase`**

```ts
import {
  buildScheduleProposal,
  createTask,
} from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";

export async function createTaskUseCase(
  deps: {
    taskRepository: TaskRepository;
    capacityRepository: CapacityRepository;
    scheduleRepository: ScheduleRepository;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    title: string;
    remainingMinutes: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    notes?: string;
  },
): Promise<void> {
  const createdAt = deps.clock.now();
  const task = createTask({
    id: deps.idGenerator.next("task"),
    title: input.title,
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate,
    urgency: input.urgency,
    notes: input.notes,
    createdAt,
  });

  await deps.taskRepository.save(task);

  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    deps.clock.today(),
  );

  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks: [task],
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "task_created",
    generatedAt: createdAt,
  });
}
```

- [ ] **Step 4: Add failing tests for `logWorkUseCase` and `setCapacityUseCase`**

```ts
it("logs work and stores the updated remaining estimate", async () => {
  const existingTask = {
    id: "task_1",
    title: "Draft report",
    notes: "",
    status: "active",
    remainingMinutes: 120,
    dueDate: null,
    urgency: "normal",
    createdAt: "2026-04-27T00:00:00.000Z",
    updatedAt: "2026-04-27T00:00:00.000Z",
  };

  const taskRepository = {
    findById: vi.fn().mockResolvedValue(existingTask),
    save: vi.fn().mockResolvedValue(undefined),
    listSchedulable: vi.fn().mockResolvedValue([existingTask]),
  };

  const workLogRepository = {
    append: vi.fn().mockResolvedValue(undefined),
  };

  await expect(
    logWorkUseCase(
      {
        taskRepository,
        workLogRepository,
        capacityRepository: { listBetween: vi.fn().mockResolvedValue([]) },
        scheduleRepository: { savePendingProposal: vi.fn().mockResolvedValue(undefined) },
        clock: { now: () => "2026-04-27T12:00:00.000Z", today: () => "2026-04-27" },
        idGenerator: { next: (prefix: string) => `${prefix}_1` },
      },
      {
        taskId: "task_1",
        date: "2026-04-27",
        spentMinutes: 45,
        remainingMinutesAfter: 60,
      },
    ),
  ).resolves.toBeUndefined();
});
```

```ts
it("stores day capacity and generates a proposal", async () => {
  const capacityRepository = {
    upsert: vi.fn().mockResolvedValue(undefined),
    listBetween: vi.fn().mockResolvedValue([]),
  };

  await setCapacityUseCase(
    {
      capacityRepository,
      taskRepository: { listSchedulable: vi.fn().mockResolvedValue([]) },
      scheduleRepository: { savePendingProposal: vi.fn().mockResolvedValue(undefined) },
      clock: { now: () => "2026-04-27T10:00:00.000Z", today: () => "2026-04-27" },
      idGenerator: { next: (prefix: string) => `${prefix}_1` },
    },
    {
      date: "2026-04-28",
      availableMinutes: 240,
      bufferMinutes: 60,
    },
  );

  expect(capacityRepository.upsert).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 5: Implement the remaining use cases and exports**

```ts
export { createTaskUseCase } from "./use-cases/create-task";
export { updateTaskUseCase } from "./use-cases/update-task";
export { logWorkUseCase } from "./use-cases/log-work";
export { setCapacityUseCase } from "./use-cases/set-capacity";
export { generateScheduleProposalUseCase } from "./use-cases/generate-schedule-proposal";
export { approveProposalUseCase } from "./use-cases/approve-proposal";
export { rejectProposalUseCase } from "./use-cases/reject-proposal";
export { getMetricsUseCase } from "./use-cases/get-metrics";
```

```ts
import {
  buildScheduleProposal,
  updateTaskEstimate,
} from "@task-platform/domain";

export async function logWorkUseCase(
  deps: {
    taskRepository: TaskRepository;
    workLogRepository: WorkLogRepository;
    capacityRepository: CapacityRepository;
    scheduleRepository: ScheduleRepository;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
  taskId: string;
  date: string;
  spentMinutes: number;
  remainingMinutesAfter: number;
  note?: string;
}): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const updatedTask = updateTaskEstimate(task, {
    remainingMinutes: input.remainingMinutesAfter,
    updatedAt: deps.clock.now(),
  });

  await deps.workLogRepository.append({
    id: deps.idGenerator.next("worklog"),
    taskId: input.taskId,
    date: input.date,
    spentMinutes: input.spentMinutes,
    remainingMinutesAfter: input.remainingMinutesAfter,
    note: input.note ?? "",
  });

  await deps.taskRepository.save(updatedTask);

  const tasks = await deps.taskRepository.listSchedulable();
  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    deps.clock.today(),
  );
  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks,
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "work_logged",
    generatedAt: deps.clock.now(),
  });
}
```

```ts
import {
  buildScheduleProposal,
  createDayCapacity,
} from "@task-platform/domain";

export async function setCapacityUseCase(
  deps: {
    capacityRepository: CapacityRepository;
    taskRepository: TaskRepository;
    scheduleRepository: ScheduleRepository;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
  date: string;
  availableMinutes: number;
  bufferMinutes?: number;
}): Promise<void> {
  const capacity = createDayCapacity(input);
  await deps.capacityRepository.upsert(capacity);

  const tasks = await deps.taskRepository.listSchedulable();
  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    input.date,
  );
  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks,
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "capacity_updated",
    generatedAt: deps.clock.now(),
  });
}
```

- [ ] **Step 6: Re-run the application tests**

Run: `pnpm vitest --run packages/application/tests/use-cases.test.ts`

Expected: PASS with the task creation, log work, and capacity tests green.

- [ ] **Step 7: Add tests for proposal approval and rejection**

```ts
it("approves a proposal and updates the schedule snapshot", async () => {
  const scheduleRepository = {
    approveProposal: vi.fn().mockResolvedValue(undefined),
  };

  await approveProposalUseCase(
    {
      scheduleRepository,
      clock: { now: () => "2026-04-27T14:00:00.000Z", today: () => "2026-04-27" },
    },
    { proposalId: "proposal_1" },
  );

  expect(scheduleRepository.approveProposal).toHaveBeenCalledWith(
    "proposal_1",
    "2026-04-27T14:00:00.000Z",
  );
});
```

- [ ] **Step 8: Run the full application suite**

Run: `pnpm vitest --run packages/application/tests`

Expected: PASS with all use-case tests green.

- [ ] **Step 9: Commit the application layer**

```bash
git add packages/application
git commit -m "feat: implement task and scheduling use cases"
```

### Task 6: Implement SQLite Infrastructure And Migrations

**Files:**
- Create: `packages/infrastructure/src/db.ts`
- Create: `packages/infrastructure/src/migrate.ts`
- Create: `packages/infrastructure/src/sqlite-task-repository.ts`
- Create: `packages/infrastructure/src/sqlite-capacity-repository.ts`
- Create: `packages/infrastructure/src/sqlite-schedule-repository.ts`
- Create: `packages/infrastructure/src/sqlite-worklog-repository.ts`
- Create: `packages/infrastructure/src/sqlite-metrics-repository.ts`
- Create: `packages/infrastructure/src/index.ts`
- Create: `packages/infrastructure/migrations/001_initial.sql`
- Create: `packages/infrastructure/tests/sqlite-repositories.test.ts`

- [ ] **Step 1: Write the failing repository integration test**

```ts
import { describe, expect, it } from "vitest";
import {
  createDatabase,
  migrate,
  SqliteTaskRepository,
} from "../src/index";
import { createTask } from "@task-platform/domain";

describe("SQLite task repository", () => {
  it("persists and reloads a task", async () => {
    const db = createDatabase(":memory:");
    migrate(db);

    const repository = new SqliteTaskRepository(db);
    const task = createTask({
      id: "task_repo",
      title: "Book train ticket",
      remainingMinutes: 15,
      createdAt: "2026-04-27T00:00:00.000Z",
    });

    await repository.save(task);
    const loaded = await repository.findById("task_repo");

    expect(loaded?.title).toBe("Book train ticket");
  });
});
```

- [ ] **Step 2: Run the repository integration test**

Run: `pnpm vitest --run packages/infrastructure/tests/sqlite-repositories.test.ts`

Expected: FAIL because the database layer does not exist yet.

- [ ] **Step 3: Add the initial SQLite migration**

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL,
  status TEXT NOT NULL,
  remaining_minutes INTEGER NOT NULL,
  due_date TEXT,
  urgency TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE task_work_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  date TEXT NOT NULL,
  spent_minutes INTEGER NOT NULL,
  remaining_minutes_after INTEGER NOT NULL,
  note TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE day_capacities (
  date TEXT PRIMARY KEY,
  available_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER NOT NULL
);

CREATE TABLE schedule_proposals (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  horizon_start TEXT NOT NULL,
  horizon_end TEXT NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE scheduled_task_slices (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  date TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  kind TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES schedule_proposals(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE schedule_snapshots (
  id TEXT PRIMARY KEY,
  active_proposal_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 4: Implement database creation and migration helpers**

```ts
import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function createDatabase(filename: string): SqliteDatabase {
  return new Database(filename);
}
```

```ts
import fs from "node:fs";
import path from "node:path";
import type { SqliteDatabase } from "./db";

export function migrate(db: SqliteDatabase): void {
  const migration = fs.readFileSync(
    path.resolve("packages/infrastructure/migrations/001_initial.sql"),
    "utf8",
  );
  db.exec(migration);
}
```

- [ ] **Step 5: Implement the task and capacity repositories**

```ts
export class SqliteTaskRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(task: Task): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO tasks (
            id, title, notes, status, remaining_minutes, due_date, urgency, created_at, updated_at
          ) VALUES (
            @id, @title, @notes, @status, @remainingMinutes, @dueDate, @urgency, @createdAt, @updatedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            notes = excluded.notes,
            status = excluded.status,
            remaining_minutes = excluded.remaining_minutes,
            due_date = excluded.due_date,
            urgency = excluded.urgency,
            updated_at = excluded.updated_at
        `,
      )
      .run(task);
  }

  async findById(taskId: string): Promise<Task | null> {
    const row = this.db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(taskId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: String(row.id),
      title: String(row.title),
      notes: String(row.notes),
      status: row.status as Task["status"],
      remainingMinutes: Number(row.remaining_minutes),
      dueDate: row.due_date ? String(row.due_date) : null,
      urgency: row.urgency as Task["urgency"],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
```

```ts
export class SqliteCapacityRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async upsert(capacity: DayCapacity): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO day_capacities (date, available_minutes, buffer_minutes)
          VALUES (@date, @availableMinutes, @bufferMinutes)
          ON CONFLICT(date) DO UPDATE SET
            available_minutes = excluded.available_minutes,
            buffer_minutes = excluded.buffer_minutes
        `,
      )
      .run(capacity);
  }
}
```

- [ ] **Step 6: Implement proposal and worklog repositories**

```ts
export class SqliteScheduleRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async savePendingProposal(proposal: {
    id: string;
    reason: string;
    generatedAt: string;
    horizonStart: string;
    horizonEnd: string;
    slices: Array<{ taskId: string; date: string; plannedMinutes: number; kind: string }>;
    riskFlags: string[];
  }): Promise<void> {
    const summaryJson = JSON.stringify({ riskFlags: proposal.riskFlags });
    this.db
      .prepare(
        `
          INSERT INTO schedule_proposals (
            id, status, reason, generated_at, horizon_start, horizon_end, summary_json
          ) VALUES (?, 'pending', ?, ?, ?, ?, ?)
        `,
      )
      .run(
        proposal.id,
        proposal.reason,
        proposal.generatedAt,
        proposal.horizonStart,
        proposal.horizonEnd,
        summaryJson,
      );
  }

  async findById(proposalId: string): Promise<Record<string, unknown> | null> {
    const row = this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE id = ?`)
      .get(proposalId) as Record<string, unknown> | undefined;

    return row ?? null;
  }

  async listByStatus(status = "pending"): Promise<Record<string, unknown>[]> {
    return this.db
      .prepare(`SELECT * FROM schedule_proposals WHERE status = ? ORDER BY generated_at DESC`)
      .all(status) as Record<string, unknown>[];
  }

  async getCurrentSchedule(): Promise<{
    activeProposalId: string | null;
    slices: Array<Record<string, unknown>>;
  }> {
    const snapshot = this.db
      .prepare(
        `
          SELECT active_proposal_id
          FROM schedule_snapshots
          ORDER BY updated_at DESC
          LIMIT 1
        `,
      )
      .get() as { active_proposal_id?: string } | undefined;

    if (!snapshot?.active_proposal_id) {
      return { activeProposalId: null, slices: [] };
    }

    const slices = this.db
      .prepare(
        `
          SELECT proposal_id, task_id, date, planned_minutes, kind
          FROM scheduled_task_slices
          WHERE proposal_id = ?
          ORDER BY date ASC
        `,
      )
      .all(snapshot.active_proposal_id) as Array<Record<string, unknown>>;

    return {
      activeProposalId: snapshot.active_proposal_id,
      slices,
    };
  }
}
```

```ts
export class SqliteWorkLogRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async append(entry: {
    id: string;
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note: string;
  }): Promise<void> {
    this.db
      .prepare(
        `
          INSERT INTO task_work_logs (
            id, task_id, date, spent_minutes, remaining_minutes_after, note
          ) VALUES (
            @id, @taskId, @date, @spentMinutes, @remainingMinutesAfter, @note
          )
        `,
      )
      .run(entry);
  }
}
```

- [ ] **Step 7: Re-run the repository tests**

Run: `pnpm vitest --run packages/infrastructure/tests/sqlite-repositories.test.ts`

Expected: PASS with the repository persistence test green.

- [ ] **Step 8: Run all current tests**

Run: `pnpm test`

Expected: PASS across domain, application, and infrastructure suites.

- [ ] **Step 9: Commit the infrastructure layer**

```bash
git add packages/infrastructure
git commit -m "feat: add sqlite persistence and migrations"
```

### Task 7: Add Scheduler Triggering And Metrics

**Files:**
- Create: `packages/scheduler/src/trigger.ts`
- Create: `packages/scheduler/src/index.ts`
- Create: `packages/scheduler/tests/trigger.test.ts`
- Modify: `packages/application/src/use-cases/get-metrics.ts`

- [ ] **Step 1: Write the failing scheduler trigger test**

```ts
import { describe, expect, it, vi } from "vitest";
import { scheduleAfterTaskMutation } from "../src/index";

describe("scheduleAfterTaskMutation", () => {
  it("invokes proposal generation with the supplied reason", async () => {
    const generate = vi.fn().mockResolvedValue(undefined);

    await scheduleAfterTaskMutation(generate, "task_updated");

    expect(generate).toHaveBeenCalledWith("task_updated");
  });
});
```

- [ ] **Step 2: Run the scheduler test**

Run: `pnpm vitest --run packages/scheduler/tests/trigger.test.ts`

Expected: FAIL because the trigger function does not exist.

- [ ] **Step 3: Implement the trigger wrapper**

```ts
export async function scheduleAfterTaskMutation(
  generate: (reason: string) => Promise<void>,
  reason: "task_created" | "task_updated" | "work_logged" | "capacity_updated" | "manual",
): Promise<void> {
  await generate(reason);
}
```

- [ ] **Step 4: Add a failing metrics use-case test**

```ts
it("returns basic progress metrics", async () => {
  const metricsRepository = {
    getRangeSummary: vi.fn().mockResolvedValue({
      plannedMinutes: 300,
      actualMinutes: 240,
      completedMinutes: 180,
      atRiskTaskCount: 2,
      pendingProposalCount: 1,
    }),
  };

  const result = await getMetricsUseCase(
    { metricsRepository },
    { dateFrom: "2026-04-21", dateTo: "2026-04-27" },
  );

  expect(result.actualMinutes).toBe(240);
});
```

- [ ] **Step 5: Implement the metrics use case**

```ts
export async function getMetricsUseCase(
  deps: {
    metricsRepository: {
      getRangeSummary(range: { dateFrom: string; dateTo: string }): Promise<{
        plannedMinutes: number;
        actualMinutes: number;
        completedMinutes: number;
        atRiskTaskCount: number;
        pendingProposalCount: number;
      }>;
    };
  },
  range: { dateFrom: string; dateTo: string },
) {
  return deps.metricsRepository.getRangeSummary(range);
}
```

- [ ] **Step 6: Re-run scheduler and metrics tests**

Run: `pnpm vitest --run packages/scheduler/tests/trigger.test.ts packages/application/tests/use-cases.test.ts`

Expected: PASS with scheduler and metrics tests green.

- [ ] **Step 7: Commit scheduler orchestration and metrics**

```bash
git add packages/scheduler packages/application
git commit -m "feat: add scheduler triggers and metrics use case"
```

### Task 8: Implement The MCP Server

**Files:**
- Create: `apps/mcp/src/server.ts`
- Create: `apps/mcp/tsconfig.json`
- Create: `apps/mcp/tests/server.test.ts`

- [ ] **Step 1: Write the failing MCP tool registration test**

```ts
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server";

describe("createMcpServer", () => {
  it("registers task and schedule tools", () => {
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

    const toolNames = server.listTools().map((tool) => tool.name);

    expect(toolNames).toContain("task_create");
    expect(toolNames).toContain("schedule_approve");
  });
});
```

- [ ] **Step 2: Run the MCP server test**

Run: `pnpm vitest --run apps/mcp/tests/server.test.ts`

Expected: FAIL because the MCP server file does not exist.

- [ ] **Step 3: Implement the MCP server factory**

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import {
  createTaskInputSchema,
  logWorkInputSchema,
  setCapacityInputSchema,
} from "@task-platform/contracts";

export function createMcpServer(deps: {
  listTasks(input?: { status?: string; dueBefore?: string; scheduledOn?: string }): Promise<unknown[]>;
  createTask(input: z.infer<typeof createTaskInputSchema>): Promise<void>;
  updateTask(input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    status?: "inbox" | "active" | "done" | "archived";
    notes?: string;
  }): Promise<void>;
  logWork(input: z.infer<typeof logWorkInputSchema>): Promise<void>;
  getCapacity(input: { dateFrom: string; dateTo: string }): Promise<unknown[]>;
  setCapacity(input: z.infer<typeof setCapacityInputSchema>): Promise<void>;
  generateSchedule(input: { reason: string }): Promise<void>;
  getCurrentSchedule(): Promise<unknown>;
  listProposals(input?: { status?: string }): Promise<unknown[]>;
  getProposal(input: { proposalId: string }): Promise<unknown>;
  approveProposal(input: { proposalId: string }): Promise<void>;
  rejectProposal(input: { proposalId: string; reason?: string }): Promise<void>;
  getMetrics(input: { dateFrom?: string; dateTo?: string }): Promise<unknown>;
}) {
  const server = new Server(
    { name: "task-platform-mcp", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.tool("task_create", createTaskInputSchema.shape, async (input) => {
    await deps.createTask(createTaskInputSchema.parse(input));
    return {
      content: [{ type: "text", text: "task created" }],
    };
  });

  server.tool(
    "tasks_list",
    {
      status: z.enum(["inbox", "active", "done", "archived"]).optional(),
      dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    async (input) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await deps.listTasks(input)),
        },
      ],
    }),
  );

  server.tool("task_log_work", logWorkInputSchema.shape, async (input) => {
    await deps.logWork(logWorkInputSchema.parse(input));
    return {
      content: [{ type: "text", text: "work logged" }],
    };
  });

  server.tool(
    "task_update",
    {
      taskId: z.string().min(1),
      title: z.string().min(1).optional(),
      remainingMinutes: z.number().int().min(0).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      urgency: z.enum(["today", "soon", "normal"]).optional(),
      status: z.enum(["inbox", "active", "done", "archived"]).optional(),
      notes: z.string().optional(),
    },
    async (input) => {
      await deps.updateTask(input);
      return {
        content: [{ type: "text", text: "task updated" }],
      };
    },
  );

  server.tool("capacity_set", setCapacityInputSchema.shape, async (input) => {
    await deps.setCapacity(setCapacityInputSchema.parse(input));
    return {
      content: [{ type: "text", text: "capacity updated" }],
    };
  });

  server.tool(
    "capacity_get",
    {
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    },
    async (input) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await deps.getCapacity(input)),
        },
      ],
    }),
  );

  server.tool(
    "schedule_generate",
    { reason: z.string().min(1) },
    async (input) => {
      await deps.generateSchedule(input);
      return {
        content: [{ type: "text", text: "schedule generated" }],
      };
    },
  );

  server.tool("schedule_get_current", {}, async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await deps.getCurrentSchedule()),
      },
    ],
  }));

  server.tool(
    "schedule_list_proposals",
    { status: z.enum(["pending", "approved", "rejected", "superseded"]).optional() },
    async (input) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await deps.listProposals(input)),
        },
      ],
    }),
  );

  server.tool(
    "schedule_get_proposal",
    { proposalId: z.string().min(1) },
    async (input) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await deps.getProposal(input)),
        },
      ],
    }),
  );

  server.tool(
    "schedule_approve",
    { proposalId: z.string().min(1) },
    async (input) => {
      await deps.approveProposal({ proposalId: input.proposalId });
      return {
        content: [{ type: "text", text: "proposal approved" }],
      };
    },
  );

  server.tool(
    "schedule_reject",
    { proposalId: z.string().min(1), reason: z.string().optional() },
    async (input) => {
      await deps.rejectProposal(input);
      return {
        content: [{ type: "text", text: "proposal rejected" }],
      };
    },
  );

  server.tool(
    "metrics_get",
    {
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    async (input) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await deps.getMetrics(input)),
        },
      ],
    }),
  );

  return server;
}
```

- [ ] **Step 4: Extend the MCP registration test to cover the full MVP tool surface**

```ts
expect(toolNames).toContain("tasks_list");
expect(toolNames).toContain("task_update");
expect(toolNames).toContain("capacity_get");
expect(toolNames).toContain("capacity_set");
expect(toolNames).toContain("schedule_generate");
expect(toolNames).toContain("schedule_get_current");
expect(toolNames).toContain("schedule_list_proposals");
expect(toolNames).toContain("schedule_get_proposal");
expect(toolNames).toContain("schedule_reject");
expect(toolNames).toContain("metrics_get");
```

- [ ] **Step 5: Re-run the MCP test**

Run: `pnpm vitest --run apps/mcp/tests/server.test.ts`

Expected: PASS with the required tool names present.

- [ ] **Step 6: Smoke-test the MCP process**

Run: `pnpm --filter mcp build`

Expected: the TypeScript build succeeds and emits the MCP server bundle.

- [ ] **Step 7: Commit the MCP server**

```bash
git add apps/mcp
git commit -m "feat: add task platform MCP server"
```

### Task 9: Build The Web API And UI Shell

**Files:**
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/inbox/page.tsx`
- Create: `apps/web/app/week/page.tsx`
- Create: `apps/web/app/proposals/page.tsx`
- Create: `apps/web/app/api/tasks/route.ts`
- Create: `apps/web/app/api/tasks/[taskId]/route.ts`
- Create: `apps/web/app/api/tasks/[taskId]/log-work/route.ts`
- Create: `apps/web/app/api/capacity/route.ts`
- Create: `apps/web/app/api/schedules/proposals/route.ts`
- Create: `apps/web/app/api/schedules/proposals/[proposalId]/approve/route.ts`
- Create: `apps/web/app/api/schedules/proposals/[proposalId]/reject/route.ts`
- Create: `apps/web/lib/task-platform.ts`
- Create: `apps/web/tests/ui.test.tsx`

- [ ] **Step 1: Write the failing Today page test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";

describe("Today page", () => {
  it("renders the daily execution heading", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Today" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the UI test**

Run: `pnpm vitest --run apps/web/tests/ui.test.tsx`

Expected: FAIL because the Next.js app files do not exist yet.

- [ ] **Step 3: Implement the app shell and Today page**

```tsx
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">Today</a>
          <a href="/inbox">Inbox</a>
          <a href="/week">Week</a>
          <a href="/proposals">Proposals</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

```tsx
export default function HomePage() {
  return (
    <section>
      <h1>Today</h1>
      <p>Execute the current approved slices here.</p>
    </section>
  );
}
```

- [ ] **Step 4: Add the Inbox, Week, and Proposals pages**

```tsx
export default function InboxPage() {
  return (
    <section>
      <h1>Inbox</h1>
      <p>Create and edit schedulable tasks.</p>
    </section>
  );
}
```

```tsx
export default function WeekPage() {
  return (
    <section>
      <h1>Week</h1>
      <p>Adjust daily capacity and inspect near-term load.</p>
    </section>
  );
}
```

```tsx
export default function ProposalsPage() {
  return (
    <section>
      <h1>Proposals</h1>
      <p>Review pending schedule changes before approval.</p>
    </section>
  );
}
```

- [ ] **Step 5: Add a failing API route test for task creation**

```ts
import { describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/tasks/route";

describe("POST /api/tasks", () => {
  it("parses task creation input", async () => {
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Submit expense form",
        remainingMinutes: 20,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

- [ ] **Step 6: Implement the first API routes**

```ts
import { createTaskInputSchema } from "@task-platform/contracts";
import { NextResponse } from "next/server";
import { taskPlatform } from "@/lib/task-platform";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = createTaskInputSchema.parse(json);

  await taskPlatform.createTask(parsed);

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

```ts
import { logWorkInputSchema } from "@task-platform/contracts";
import { NextResponse } from "next/server";
import { taskPlatform } from "@/lib/task-platform";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const json = await request.json();
  const parsed = logWorkInputSchema.parse({
    ...json,
    taskId: params.taskId,
  });

  await taskPlatform.logWork(parsed);

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

```ts
import {
  createTaskUseCase,
  logWorkUseCase,
} from "@task-platform/application";
import {
  createDatabase,
  migrate,
  SqliteCapacityRepository,
  SqliteScheduleRepository,
  SqliteTaskRepository,
  SqliteWorkLogRepository,
} from "@task-platform/infrastructure";

const db = createDatabase(process.env.TASK_PLATFORM_DB ?? "task-platform.db");
migrate(db);

const taskRepository = new SqliteTaskRepository(db);
const capacityRepository = new SqliteCapacityRepository(db);
const scheduleRepository = new SqliteScheduleRepository(db);
const workLogRepository = new SqliteWorkLogRepository(db);

const clock = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().slice(0, 10),
};

const idGenerator = {
  next: (prefix: string) => `${prefix}_${crypto.randomUUID()}`,
};

export const taskPlatform = {
  async createTask(input: {
    title: string;
    remainingMinutes: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    notes?: string;
  }) {
    return createTaskUseCase(
      {
        taskRepository,
        capacityRepository,
        scheduleRepository,
        clock,
        idGenerator,
      },
      input,
    );
  },
  async logWork(input: {
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note?: string;
  }) {
    return logWorkUseCase(
      {
        taskRepository,
        workLogRepository,
        capacityRepository,
        scheduleRepository,
        clock,
        idGenerator,
      },
      input,
    );
  },
  async listTasks() {
    return taskRepository.listAll();
  },
  async getCapacities(dateFrom: string, dateTo: string) {
    return capacityRepository.listBetween(dateFrom, dateTo);
  },
  async listProposals(status?: string) {
    return scheduleRepository.listByStatus(status);
  },
  async getCurrentSchedule() {
    return scheduleRepository.getCurrentSchedule();
  },
};
```

- [ ] **Step 7: Re-run the UI and API tests**

Run: `pnpm vitest --run apps/web/tests/ui.test.tsx`

Expected: PASS with the basic shell and route tests green.

- [ ] **Step 8: Build the web app**

Run: `pnpm --filter web build`

Expected: the Next.js production build succeeds.

- [ ] **Step 9: Commit the web shell**

```bash
git add apps/web
git commit -m "feat: add web ui shell and api routes"
```

### Task 10: Connect Real Screens To Real Data

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/inbox/page.tsx`
- Modify: `apps/web/app/week/page.tsx`
- Modify: `apps/web/app/proposals/page.tsx`
- Modify: `apps/web/app/api/*.ts`
- Modify: `packages/infrastructure/src/index.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `apps/mcp/src/server.ts`
- Create: `apps/web/tests/flows.test.tsx`

- [ ] **Step 1: Write the failing Inbox flow test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InboxPage from "../app/inbox/page";

describe("Inbox flow", () => {
  it("renders task fields for title and remaining estimate", () => {
    render(<InboxPage />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining minutes")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the Inbox flow test**

Run: `pnpm vitest --run apps/web/tests/flows.test.tsx`

Expected: FAIL because the page still contains placeholder content.

- [ ] **Step 3: Implement the Inbox form and pending-proposal summary**

```tsx
export default async function InboxPage() {
  const tasks = await taskPlatform.listTasks();
  const proposals = await taskPlatform.listProposals("pending");

  return (
    <section>
      <h1>Inbox</h1>
      <form action="/api/tasks" method="post">
        <label>
          Title
          <input name="title" />
        </label>
        <label>
          Remaining minutes
          <input name="remainingMinutes" type="number" min="1" />
        </label>
        <button type="submit">Add task</button>
      </form>

      <p>Pending proposals: {proposals.length}</p>

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} - {task.remainingMinutes} min
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Add the Today and Week data-bound views**

```tsx
export default async function HomePage() {
  const schedule = await taskPlatform.getCurrentSchedule();

  return (
    <section>
      <h1>Today</h1>
      <ul>
        {schedule.slices.map((slice) => (
          <li key={`${slice.taskId}-${slice.date}`}>
            {slice.date} - {slice.taskId} - {slice.plannedMinutes} min
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
export default async function WeekPage() {
  const capacities = await taskPlatform.getCapacities("2026-04-27", "2026-05-03");

  return (
    <section>
      <h1>Week</h1>
      <ul>
        {capacities.map((capacity) => (
          <li key={capacity.date}>
            {capacity.date}: {capacity.availableMinutes} available / {capacity.bufferMinutes} buffer
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Add the Proposals approval UI**

```tsx
export default async function ProposalsPage() {
  const proposals = await taskPlatform.listProposals("pending");

  return (
    <section>
      <h1>Proposals</h1>
      <ul>
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            <p>{proposal.reason}</p>
            <form action={`/api/schedules/proposals/${proposal.id}/approve`} method="post">
              <button type="submit">Approve</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Re-run the full test suite**

Run: `pnpm test`

Expected: PASS across domain, application, infrastructure, MCP, and Web tests.

- [ ] **Step 7: Run production builds**

Run: `pnpm build`

Expected: all workspace packages and both apps build successfully.

- [ ] **Step 8: Commit the end-to-end MVP**

```bash
git add apps packages
git commit -m "feat: deliver task platform MVP"
```

## Self-Review

Spec coverage check:

- inbox capture: covered by Tasks 5, 9, and 10
- capacity input and buffer: covered by Tasks 2, 5, 6, and 10
- proposal-based scheduling: covered by Tasks 3, 5, 6, 7, 8, and 10
- MCP support for Hermes and other agents: covered by Task 8
- Today / Week / Proposals Web UI: covered by Tasks 9 and 10
- metrics: covered by Task 7

Placeholder scan:

- no `TODO`, `TBD`, or omitted dependency placeholders should remain in checked-off steps
- keep `apps/web/lib/task-platform.ts` as the only Web-to-application adapter instead of calling repositories from route handlers or pages directly

Type consistency check:

- keep task status as `inbox | active | done | archived`
- keep urgency as `today | soon | normal`
- keep proposal status as `pending | approved | rejected | superseded`
- keep all date-only values as `YYYY-MM-DD` strings
- keep all timestamps as ISO datetime strings
