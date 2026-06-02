# LLM Schedule Output: Daily Slices + Feedback Correction

## Overview

Rewrite the LLM scheduling flow so the LLM directly outputs per-day task allocations (slices) instead of just priority order. Add mechanical validation with feedback-based correction on failure. The existing `buildSchedulePlan()` algorithm becomes a fallback only.

## 1. LLM Output Schema Change

**Before:**
```json
{
  "annotations": [{ "taskId", "taskType", "cognitiveLoad", "energy", "tags" }],
  "priorityOrder": ["id1", "id2"],
  "rationale": "..."
}
```

**After:**
```json
{
  "annotations": [{ "taskId", "taskType", "cognitiveLoad", "energy", "tags" }],
  "slices": [{ "taskId", "date", "plannedMinutes" }],
  "rationale": "..."
}
```

- `annotations`: Kept as-is (task classification). LLM may update existing values.
- `slices`: New. Per-day planned minutes for each task within the horizon.
- `priorityOrder`: Removed. Replaced by slices which implicitly define ordering.
- `rationale`: Kept, now expected to explain any shortfalls.

## 2. System Prompt Rewrite

Replace the current system prompt (planning-intelligence.ts line 152-159) with a comprehensive instruction:

```
あなたは個人の task planning assistant です。
与えられた全 task を分類し、各 task の taskType / cognitiveLoad / energy / tags を返してください。
さらに、各 task を horizon 期間内の日ごとに配分してください (slices)。

## 配分のルール
1. 各タスクの notes に書かれた配分の希望を必ず守ってください。
   - 例: 「毎日コツコツ」→ 毎日少量ずつ配分
   - 例: 「週末にまとめて」→ 週末に集中配分
   - 例: 「午前中に」→ 特に指定がなければ考慮不要（時間帯指定は無視）
2. 各タスクの remainingHours を可能な限りスケジュール期間内に割り当ててください。
   割り当てが不足する場合は rationale に理由を書いてください。
3. 各日の capacity(hours) を超えないでください。
4. 期限 (dueDate) を過ぎた日には配分しないでください。dueDate 当日は配分可能です。
5. plannedMinutes は 15 分単位 (15, 30, 45, 60, ...) で指定してください。
6. 高負荷 (cognitiveLoad: high) タスクは1日に詰め込みすぎないでください。
7. 1タスクあたりの1日最小配分は30分、最大は480分（8時間）を目安としてください。

## 出力形式
- annotations: 各タスクの分類を taskId とともに返す
- slices: 各配分を taskId, date (YYYY-MM-DD), plannedMinutes で返す
- rationale: 配分の理由や不足がある場合の説明
- tags は人が読める日本語にしてください
```

## 3. Input Payload Enhancement

Add the following fields to the LLM input per task:
- `notes`: Already sent (keep)
- `remainingHours`: Already sent (keep)
- `horizonStart` / `horizonEnd`: New. Explicitly tell the LLM the scheduling window.

```json
{
  "today": "2026-06-02",
  "horizonStart": "2026-06-02",
  "horizonEnd": "2026-06-08",
  "tasks": [...],
  "capacities": [...],
  "recentMutations": [...]
}
```

## 4. Zod Schema Update

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
```

## 5. Mechanical Validation

New function `validateSlices(slices, tasks, capacities)` in `schedule.ts`:

| Check | Error |
|-------|-------|
| Unknown taskId | `unknown_task:{taskId}` |
| Date outside horizon | `out_of_horizon:{taskId}:{date}` |
| Date past due date | `past_due:{taskId}:{date}` |
| Non-positive minutes | `non_positive:{taskId}:{date}` |
| Day capacity exceeded | `over_capacity:{date}:{planned}:{capacity}` |
| Task total exceeds remaining | `over_remaining:{taskId}:{planned}:{remaining}` |
| Task total < 90% of remaining (and no rationale) | `under_allocated:{taskId}:{planned}:{remaining}` |

Validation result type:
```typescript
type SliceValidation = {
  valid: boolean;
  errors: string[];
};
```

## 6. Feedback-Based Correction

In `planning-intelligence.ts`, add `correctSchedule()`:

```typescript
correctSchedule(input: {
  tasks, capacities, horizon,
  previousSlices, validationErrors
}): Promise<{ slices, rationale }>
```

System prompt for correction:
```
あなたが出力した配分に以下の問題がありました。修正してください:
{errors}

前回の配分:
{slices}

修正後の slices のみを返してください。
```

Maximum 2 correction attempts. After 2 failures, fall back to deterministic `buildSchedulePlan()`.

## 7. Flow Changes in `run-scheduler-tick.ts`

```
1. Call LLM analyzeSchedule() → get annotations + slices + rationale
2. Apply annotations to tasks (save back)
3. Validate slices mechanically
4. If invalid:
   a. Call LLM correctSchedule() with errors
   b. Validate again
   c. If still invalid, retry once more
   d. If still invalid after 2 corrections, fall back to buildSchedulePlan()
5. If valid, wrap slices in DomainSchedulePlan (with risk flags, summary)
6. Pass through existing validateSchedulePlan() as safety net
7. Save schedule
```

## 8. No DB Changes

Tables untouched. Only application logic changes.

## 9. Files Affected

| File | Action |
|------|--------|
| `packages/application/src/planning-intelligence.ts` | Rewrite prompt, add `correctSchedule`, update Zod schema |
| `packages/domain/src/schedule.ts` | Add `validateSlices()`, update or bypass `buildSchedulePlan()` |
| `packages/application/src/ports.ts` | Update `PlanningIntelligence` interface |
| `packages/application/src/use-cases/run-scheduler-tick.ts` | Rewrite scheduling flow |
| `packages/application/tests/planning-intelligence.test.ts` | Update tests |
| `packages/domain/tests/schedule.test.ts` | Add validation tests |
| `packages/application/tests/use-cases.test.ts` | Update flow tests |
