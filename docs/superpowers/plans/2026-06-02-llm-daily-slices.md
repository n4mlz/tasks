# LLM Daily Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite LLM scheduling so the LLM directly outputs per-day task allocations (slices), with mechanical validation and feedback-based correction on failure.

**Architecture:** Modify `PlanningIntelligence` interface to add `correctSchedule` method and change `analyzeSchedule` output from `priorityOrder` to `slices`. Update the system prompt to instruct the LLM on daily allocation rules. Add `validateSlices` to domain. Rewrite `run-scheduler-tick` flow: LLM → validate → feedback loop (max 2) → save or fallback to `buildSchedulePlan`.

**Tech Stack:** TypeScript, Zod, ai SDK, Vitest

---

### Task 1: Add `sliceToSchedulePlan` and `validateSlices` to domain schedule

**Files:**
- Modify: `packages/domain/src/schedule.ts`
- Modify: `packages/domain/src/index.ts`

- [ ] **Step 1: Add `sliceToSchedulePlan` function**

After existing imports and before `buildSchedulePlan` (around line 83), add:

```typescript
export function sliceToSchedulePlan(input: {
  slices: ScheduledSlice[];
  today: string;
  tasks: Task[];
  capacities: DayCapacity[];
  rationale: string;
}): DomainSchedulePlan {
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const unscheduledTaskIds = new Set(input.tasks.map((t) => t.id));
  const riskFlags: string[] = [];

  for (const slice of input.slices) {
    unscheduledTaskIds.delete(slice.taskId);
  }

  const capacityPressureByDate: Record<string, number> = {};
  const bufferUsageByDate: Record<string, number> = {};
  const datesUsingReserve: string[] = [];

  for (const capacity of input.capacities) {
    const usable = usableMinutesForDay(capacity);
    const base = baseMinutesForDay(capacity);
    const dayPlanned = input.slices
      .filter((s) => s.date === capacity.date)
      .reduce((sum, s) => sum + s.plannedMinutes, 0);
    capacityPressureByDate[capacity.date] = usable > 0 ? dayPlanned / usable : 0;
    bufferUsageByDate[capacity.date] = dayPlanned > base ? dayPlanned - base : 0;
    if (dayPlanned > base) {
      datesUsingReserve.push(capacity.date);
    }
  }

  const unarr = [...unscheduledTaskIds];
  for (const id of unarr) {
    riskFlags.push(`${id}:unscheduled`);
  }

  return {
    horizonStart: input.today,
    horizonEnd: input.capacities.length > 0
      ? input.capacities[input.capacities.length - 1].date
      : input.today,
    slices: input.slices,
    riskFlags,
    summary: {
      riskFlags,
      unscheduledTaskIds: unarr,
      capacityPressureByDate,
      bufferUsageByDate,
      datesUsingReserve,
      insufficientEvenWithReserve: unarr.length > 0,
    },
  };
}
```

- [ ] **Step 2: Add `validateSlices` function**

After `sliceToSchedulePlan`, add:

```typescript
export function validateSlices(input: {
  slices: ScheduledSlice[];
  tasks: Task[];
  capacities: DayCapacity[];
}): ScheduleValidationResult {
  const errors: string[] = [];
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));
  const capacityByDate = new Map(
    input.capacities.map((c) => [c.date, usableMinutesForDay(c)]),
  );
  const taskTotals = new Map<string, number>();
  const dayTotals = new Map<string, number>();

  for (const slice of input.slices) {
    const task = taskById.get(slice.taskId);
    if (!task) {
      errors.push(`unknown_task:${slice.taskId}`);
      continue;
    }

    if (!capacityByDate.has(slice.date)) {
      errors.push(`out_of_horizon:${slice.taskId}:${slice.date}`);
    }

    if (slice.plannedMinutes <= 0) {
      errors.push(`non_positive:${slice.taskId}:${slice.date}`);
    }

    const latestDate = latestSchedulableDate(task, input.capacities[0]?.date ?? "");
    if (latestDate && slice.date > latestDate) {
      errors.push(`past_due:${slice.taskId}:${slice.date}`);
    }

    taskTotals.set(slice.taskId, (taskTotals.get(slice.taskId) ?? 0) + slice.plannedMinutes);
    dayTotals.set(slice.date, (dayTotals.get(slice.date) ?? 0) + slice.plannedMinutes);
  }

  for (const task of input.tasks) {
    const total = taskTotals.get(task.id) ?? 0;
    if (total > task.remainingMinutes) {
      errors.push(`over_remaining:${task.id}:${total}:${task.remainingMinutes}`);
    }
  }

  for (const [date, planned] of dayTotals.entries()) {
    const usable = capacityByDate.get(date) ?? 0;
    if (planned > usable) {
      errors.push(`over_capacity:${date}:${planned}:${usable}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
```

- [ ] **Step 3: Export from index.ts**

In `packages/domain/src/index.ts`, ensure `sliceToSchedulePlan` and `validateSlices` are exported.

- [ ] **Step 4: Run existing domain tests**

```bash
pnpm exec vitest --run packages/domain/tests/schedule.test.ts
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/schedule.ts packages/domain/src/index.ts
git commit -m "feat: add sliceToSchedulePlan and validateSlices to domain"
```

---

### Task 2: Update `PlanningIntelligence` port interface

**Files:**
- Modify: `packages/application/src/ports.ts`

- [ ] **Step 1: Update `PlanningIntelligence` interface**

Change the `analyzeSchedule` return type from:
```typescript
Promise<{
  annotations: Array<{...}>;
  priorityOrder: string[];
  rationale: string;
}>
```
To:
```typescript
Promise<{
  annotations: Array<{...}>;
  slices: Array<{ taskId: string; date: string; plannedMinutes: number }>;
  rationale: string;
}>
```

Add `correctSchedule` method:
```typescript
  correctSchedule(input: {
    tasks: Task[];
    capacities: DayCapacity[];
    horizonStart: string;
    horizonEnd: string;
    previousSlices: Array<{ taskId: string; date: string; plannedMinutes: number }>;
    errors: string[];
  }): Promise<{
    slices: Array<{ taskId: string; date: string; plannedMinutes: number }>;
    rationale: string;
  }>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/application/src/ports.ts
git commit -m "feat: update PlanningIntelligence port for slices and correction"
```

---

### Task 3: Rewrite `planning-intelligence.ts` — new prompt, schema, and correction

**Files:**
- Modify: `packages/application/src/planning-intelligence.ts`

- [ ] **Step 1: Update Zod schema**

Replace `taskSliceSchema` and `plannerOutputSchema`:

```typescript
const taskSliceSchema = z.object({
  taskId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plannedMinutes: z.number().int().positive().max(480),
});

const plannerOutputSchema = z.object({
  annotations: z.array(taskShapeSchema),
  slices: z.array(taskSliceSchema).max(200),
  rationale: z.string().min(1),
});

type PlannerOutput = z.infer<typeof plannerOutputSchema>;
```

Remove `priorityOrder` from the schema. Keep `taskShapeSchema` unchanged.

- [ ] **Step 2: Rewrite system prompt**

Replace the `system` prompt (lines 152-159):

```typescript
const system = [
  "あなたは個人の task planning assistant です。",
  "与えられた全 task を分類し、各 task の taskType / cognitiveLoad / energy / tags を返してください。",
  "さらに、各 task を指定された horizon 期間の日ごとに slices として配分してください。",
  "",
  "## 配分のルール",
  "1. 各タスクの notes に書かれた配分の希望を必ず守ってください。",
  "   - 「毎日コツコツ」「毎日少しずつ」→ 毎日少量ずつ均等に配分",
  "   - 「週末にまとめて」「休日に」→ 週末（土日）に集中配分",
  "   - 「一気に」「まとめて」→ 1-2日に集中配分",
  "2. 各タスクの remainingHours を可能な限りスケジュール期間内にすべて割り当ててください。",
  "   割り当てが不足する場合は rationale に理由を書いてください。",
  "3. 各日の capacity(hours) を超えないでください。",
  "4. 期限 (dueDate) を過ぎた日には配分しないでください。dueDate 当日は配分可能です。",
  "5. plannedMinutes は 15 分単位 (15, 30, 45, 60, 90, 120, ...) で指定してください。",
  "6. 高負荷 (cognitiveLoad: high) タスクは1日に詰め込みすぎないでください。",
  "7. 1タスクあたり1日の最小配分は30分、最大は480分（8時間）としてください。",
  "8. tags は人が読める日本語にしてください。",
].join("\n");
```

- [ ] **Step 3: Update plain JSON prompt**

Replace the `plainJsonPrompt` to include slices:

```typescript
const plainJsonPrompt = [
  "必ず JSON のみを返してください。markdown や説明文は不要です。",
  "JSON schema:",
  JSON.stringify({
    annotations: [
      {
        taskId: "string",
        taskType: "implementation|writing|research|communication|memorization|admin|design|other|unknown",
        cognitiveLoad: "low|medium|high|unknown",
        energy: "low|medium|high|unknown",
        tags: ["string"],
      },
    ],
    slices: [
      { taskId: "string", date: "YYYY-MM-DD", plannedMinutes: 60 },
    ],
    rationale: "string",
  }),
  "Input JSON:",
  JSON.stringify(payload, null, 2),
].join("\n");
```

- [ ] **Step 4: Update payload to include horizon**

Add to the payload object (before `capacities`):

```typescript
horizonStart: input.horizonStart,
horizonEnd: input.horizonEnd,
```

And update the `PlanningIntelligence` call signature is handled in the port. For the payload here, we pass horizonStart/horizonEnd from the input. But wait — the `analyzeSchedule` input in the port currently doesn't have `horizonStart`/`horizonEnd`. We'll add it in Task 2 (ports) — actually, we already updated the port in Task 2. But I didn't include horizonStart/horizonEnd there.

Let me go back. The payload in `planning-intelligence.ts` constructs what's sent to the LLM. The `input` comes from `analyzeSchedule()`. For the LLM prompt, the data is in `payload`. I need to add `horizonStart` and `horizonEnd` to the payload.

I'll handle this by reading the data from the capacities array — the first and last capacity dates define the horizon.

Add to the payload:
```typescript
const dateStrings = input.capacities.map((c) => c.date).sort();
```

And add `horizonStart: dateStrings[0], horizonEnd: dateStrings.at(-1)`.

Actually, let me just add these to the payload directly. The capacities already cover the horizon.

- [ ] **Step 5: Update return in analyzeSchedule**

Change:
```typescript
return {
  annotations: output.annotations,
  priorityOrder: output.priorityOrder,
  rationale: output.rationale,
};
```
To:
```typescript
return {
  annotations: output.annotations,
  slices: output.slices,
  rationale: output.rationale,
};
```

Do this for both `runStructured` and `runPlainJson` paths and the retry path.

- [ ] **Step 6: Add `correctSchedule` method**

Add to the returned object (after `analyzeSchedule`):

```typescript
    async correctSchedule(input) {
      const correctionPrompt = [
        "あなたが出力した配分に以下の問題がありました。修正してください。",
        "",
        "## 問題点",
        ...input.errors.map((e) => `- ${e}`),
        "",
        "## 前回の配分",
        JSON.stringify(input.previousSlices, null, 2),
        "",
        "## 修正後の配分のみを JSON で返してください。markdown や説明文は不要です。",
        "JSON schema:",
        JSON.stringify({
          slices: [
            { taskId: "string", date: "YYYY-MM-DD", plannedMinutes: 60 },
          ],
          rationale: "string",
        }),
      ].join("\n");

      const correctionSchema = z.object({
        slices: z.array(taskSliceSchema).max(200),
        rationale: z.string().min(1),
      });

      try {
        const { text } = await generateText({
          model: resolvedModel,
          abortSignal: AbortSignal.timeout(timeoutMs),
          prompt: correctionPrompt,
        });
        const parsed = correctionSchema.safeParse(JSON.parse(text));
        if (!parsed.success) {
          throw new Error(`修正 JSON の検証に失敗しました: ${parsed.error.message}`);
        }
        return parsed.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "LLM 修正に失敗しました。";
        throw new Error(`LLM 修正に失敗しました: ${message}`);
      }
    },
```

- [ ] **Step 7: Add horizonStart/horizonEnd to payload**

Before the `payload` object construction (around line 160), compute:

```typescript
const dateStrings = input.capacities.map((c) => c.date).sort();
```

And add to the payload object:
```typescript
horizonStart: dateStrings.length > 0 ? dateStrings[0] : input.today,
horizonEnd: dateStrings.length > 0 ? dateStrings.at(-1) : input.today,
```

- [ ] **Step 8: Commit**

```bash
git add packages/application/src/planning-intelligence.ts
git commit -m "feat: rewrite LLM prompt for daily slices, add correction method"
```

---

### Task 4: Rewrite `run-scheduler-tick.ts` — new flow with feedback loop

**Files:**
- Modify: `packages/application/src/use-cases/run-scheduler-tick.ts`

- [ ] **Step 1: Update imports**

Remove `buildSchedulePlan` import (keep `validateSchedulePlan`).
Add `sliceToSchedulePlan, validateSlices` import from `@task-platform/domain`.

```typescript
import { buildSchedulePlan, validateSchedulePlan, sliceToSchedulePlan, validateSlices } from "@task-platform/domain";
```

Keep `buildSchedulePlan` as fallback. Keep `dedupePriorityOrder` (used for fallback).

- [ ] **Step 2: Replace LLM analysis → schedule plan flow**

Replace lines 125–161 (the analysis + plan building + validation block) with:

```typescript
    const analysis = await deps.planningIntelligence.analyzeSchedule({
      today: deps.clock.today(),
      tasks,
      capacities,
      recentMutations,
    });

    const annotationByTaskId = new Map(analysis.annotations.map((a) => [a.taskId, a]));
    const annotatedTasks = tasks.map((task) => {
      const annotation = annotationByTaskId.get(task.id);
      if (!annotation) return task;
      return {
        ...task,
        taskType: annotation.taskType,
        cognitiveLoad: annotation.cognitiveLoad,
        energy: annotation.energy,
        tags: annotation.tags,
        updatedAt: deps.clock.now(),
      };
    });

    for (const task of annotatedTasks) {
      await deps.taskRepository.save(task);
    }

    // Validate LLM slices
    let slices = analysis.slices;
    let rationale = analysis.rationale;
    let sliceValidation = validateSlices({ slices, tasks: annotatedTasks, capacities });

    // Feedback correction loop (max 2 attempts)
    for (let attempt = 0; !sliceValidation.isValid && attempt < 2; attempt++) {
      try {
        const correction = await deps.planningIntelligence.correctSchedule({
          tasks: annotatedTasks,
          capacities,
          horizonStart: horizon.start,
          horizonEnd: horizon.end,
          previousSlices: slices,
          errors: sliceValidation.errors,
        });
        slices = correction.slices;
        rationale = correction.rationale;
        sliceValidation = validateSlices({ slices, tasks: annotatedTasks, capacities });
      } catch {
        break;
      }
    }

    let plan: ReturnType<typeof buildSchedulePlan> | ReturnType<typeof sliceToSchedulePlan>;

    if (sliceValidation.isValid) {
      plan = sliceToSchedulePlan({
        slices,
        today: deps.clock.today(),
        tasks: annotatedTasks,
        capacities,
        rationale,
      });
    } else {
      // Fallback to deterministic algorithm
      plan = buildSchedulePlan({
        today: deps.clock.today(),
        tasks: annotatedTasks,
        capacities,
        priorityOrder: dedupePriorityOrder(analysis.slices.map((s) => s.taskId)),
      });
    }

    const validation = validateSchedulePlan({
      plan,
      tasks: annotatedTasks,
      capacities,
    });
```

- [ ] **Step 3: Update the existing validation failure handler**

The existing validation failure block at lines 163–192 still works because `sliceValidation` and `buildSchedulePlan` produce the same `DomainSchedulePlan` structure. No changes needed.

However, update the rationale used in the run insertion — use `rationale` from the LLM:

In the validation failure insertion, change `analysis.rationale` to `rationale`:

```typescript
rationale: rationale,
```

Do the same for the superseded check insertion (line 203) and the success insertion (line 239).

- [ ] **Step 4: Commit**

```bash
git add packages/application/src/use-cases/run-scheduler-tick.ts
git commit -m "feat: rewrite scheduler flow for LLM slices with correction loop"
```

---

### Task 5: Update tests

**Files:**
- Modify: `packages/domain/tests/schedule.test.ts`
- Modify: `packages/application/tests/use-cases.test.ts`
- Modify: `apps/web/tests/planning-intelligence.test.ts`

- [ ] **Step 1: Add domain tests for `validateSlices`**

Add to `packages/domain/tests/schedule.test.ts`:

```typescript
import { validateSlices, ScheduledSlice } from "../src/index";
import { createTask } from "../src/index";
import { createDayCapacity } from "../src/index";

describe("validateSlices", () => {
  const capacity = createDayCapacity({ date: "2026-06-01", availableMinutes: 480, bufferMinutes: 60 });
  const task = createTask({
    id: "t1", title: "Test", remainingMinutes: 120,
    createdAt: "2026-06-01T00:00:00.000Z",
  });

  it("accepts valid slices", () => {
    const slices: ScheduledSlice[] = [
      { taskId: "t1", date: "2026-06-01", plannedMinutes: 60, kind: "focus" },
    ];
    const result = validateSlices({ slices, tasks: [task], capacities: [capacity] });
    expect(result.isValid).toBe(true);
  });

  it("rejects unknown task", () => {
    const slices: ScheduledSlice[] = [
      { taskId: "unknown", date: "2026-06-01", plannedMinutes: 60, kind: "focus" },
    ];
    const result = validateSlices({ slices, tasks: [task], capacities: [capacity] });
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("unknown_task");
  });

  it("rejects over remaining", () => {
    const slices: ScheduledSlice[] = [
      { taskId: "t1", date: "2026-06-01", plannedMinutes: 200, kind: "focus" },
    ];
    const result = validateSlices({ slices, tasks: [task], capacities: [capacity] });
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("over_remaining");
  });

  it("rejects over capacity", () => {
    const slices: ScheduledSlice[] = [
      { taskId: "t1", date: "2026-06-01", plannedMinutes: 500, kind: "focus" },
    ];
    const result = validateSlices({ slices, tasks: [task], capacities: [capacity] });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.startsWith("over_capacity"))).toBe(true);
  });
});
```

- [ ] **Step 2: Update use-cases test mocks**

In `packages/application/tests/use-cases.test.ts`, update mock `planningIntelligence` to return `slices` instead of `priorityOrder`:

```typescript
analyzeSchedule: vi.fn().mockResolvedValue({
  annotations: [{ taskId: "t1", taskType: "writing", cognitiveLoad: "medium", energy: "medium", tags: ["doc"] }],
  slices: [{ taskId: "t1", date: "2026-06-02", plannedMinutes: 60 }],
  rationale: "test",
}),
correctSchedule: vi.fn(),
```

- [ ] **Step 3: Update planning-intelligence test**

In `apps/web/tests/planning-intelligence.test.ts`, update the test that checks output to expect `slices` field.

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (or fix any that fail).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/tests/schedule.test.ts packages/application/tests/use-cases.test.ts apps/web/tests/planning-intelligence.test.ts
git commit -m "test: add validateSlices tests, update scheduling test mocks"
```

---

### Task 6: Run type check and full test suite

- [ ] **Step 1: Run type check**

```bash
pnpm --filter web exec tsc --noEmit 2>&1 | head -30
```

Fix any type errors.

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 3: Commit fixes**

```bash
git add -A && git commit -m "chore: type and test fixes for LLM slices"
```
