import fs from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { PlanningIntelligence } from "./ports";

const taskShapeSchema = z.object({
  taskId: z.string().min(1),
  taskType: z.enum([
    "implementation",
    "writing",
    "research",
    "communication",
    "memorization",
    "admin",
    "design",
    "other",
    "unknown",
  ]),
  cognitiveLoad: z.enum(["low", "medium", "high", "unknown"]),
  energy: z.enum(["low", "medium", "high", "unknown"]),
  tags: z.array(z.string().min(1)).max(6),
});

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

function resolveWorkspaceRootFromCwd(): string {
  let currentDir = process.cwd();

  while (true) {
    const packageJsonPath = path.resolve(currentDir, "package.json");
    const workspaceFilePath = path.resolve(currentDir, "pnpm-workspace.yaml");

    if (fs.existsSync(packageJsonPath) && fs.existsSync(workspaceFilePath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return process.cwd();
    }

    currentDir = parentDir;
  }
}

function loadWorkspaceEnv(): void {
  const workspaceRoot = resolveWorkspaceRootFromCwd();
  const envPaths = [
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".env.local"),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) continue;
      const rawValue = line.slice(separatorIndex + 1).trim();
      const normalizedValue =
        rawValue.startsWith("\"") && rawValue.endsWith("\"")
          ? rawValue.slice(1, -1)
          : rawValue.startsWith("'") && rawValue.endsWith("'")
            ? rawValue.slice(1, -1)
            : rawValue;
      process.env[key] = normalizedValue;
    }
  }
}

function resolveModel() {
  loadWorkspaceEnv();

  const provider = process.env.TASK_PLATFORM_LLM_PROVIDER ?? "openai-compatible";
  const modelId = process.env.TASK_PLATFORM_LLM_MODEL?.trim();

  if (!modelId) {
    return {
      model: null,
      fallbackReason: "TASK_PLATFORM_LLM_MODEL が未設定です。",
    };
  }
  if (provider === "openai") {
    return { model: openai(modelId), fallbackReason: null };
  }
  if (provider === "anthropic") {
    return { model: anthropic(modelId), fallbackReason: null };
  }

  const baseURL = process.env.TASK_PLATFORM_LLM_BASE_URL?.trim();
  if (!baseURL) {
    return {
      model: null,
      fallbackReason: "TASK_PLATFORM_LLM_BASE_URL が未設定です。",
    };
  }

  const compatibleProvider = createOpenAICompatible({
    name: "task-platform-local",
    baseURL,
    apiKey: process.env.TASK_PLATFORM_LLM_API_KEY ?? "local",
    supportsStructuredOutputs:
      process.env.TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS === "true",
  });

  return {
    model: compatibleProvider(modelId),
    fallbackReason: null,
  };
}

function supportsStructuredOutputs(): boolean {
  loadWorkspaceEnv();
  return process.env.TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS === "true";
}

function resolveTimeoutMs(): number {
  loadWorkspaceEnv();
  const raw = Number(process.env.TASK_PLATFORM_LLM_TIMEOUT_MS ?? "20000");
  return Number.isFinite(raw) && raw > 0 ? raw : 20_000;
}

export function createPlanningIntelligence(): PlanningIntelligence {
  const { model, fallbackReason } = resolveModel();
  const timeoutMs = resolveTimeoutMs();
  if (!model) {
    return {
      async analyzeSchedule() {
        throw new Error(fallbackReason ?? "ローカル LLM が未設定です。");
      },
      async correctSchedule() {
        throw new Error(fallbackReason ?? "ローカル LLM が未設定です。");
      },
    };
  }
  const resolvedModel = model;

  return {
    async analyzeSchedule(input) {
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
      const dateStrings = input.capacities.map((c) => c.date).sort();
      const payload = {
        today: input.today,
        horizonStart: dateStrings.length > 0 ? dateStrings[0] : input.today,
        horizonEnd: dateStrings.length > 0 ? dateStrings.at(-1) : input.today,
        tasks: input.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          notes: task.notes,
          dueDate: task.dueDate,
          remainingHours: Number((task.remainingMinutes / 60).toFixed(2)),
          currentTaskType: task.taskType,
          currentCognitiveLoad: task.cognitiveLoad,
          currentEnergy: task.energy,
          currentTags: task.tags,
        })),
        capacities: input.capacities.map((capacity) => ({
          date: capacity.date,
          hours: Number((capacity.availableMinutes / 60).toFixed(2)),
        })),
        recentMutations: input.recentMutations,
      };

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

      const promptLength = JSON.stringify(payload).length;
      const taskCount = input.tasks.length;
      const capacityDayCount = input.capacities.length;
      console.log(`[scheduler] LLM request: ${taskCount} tasks, ${capacityDayCount} capacity days, prompt ~${Math.round(promptLength / 1024)}KB, timeout ${timeoutMs}ms`);

      async function runStructured(): Promise<PlannerOutput> {
        const { output } = await generateText({
          model: resolvedModel,
          abortSignal: AbortSignal.timeout(timeoutMs),
          output: Output.object({ schema: plannerOutputSchema }),
          system,
          prompt: JSON.stringify(payload, null, 2),
        });

        return output;
      }

      async function runPlainJson(): Promise<PlannerOutput> {
        const { text } = await generateText({
          model: resolvedModel,
          abortSignal: AbortSignal.timeout(timeoutMs),
          system,
          prompt: plainJsonPrompt,
        });

        const parsed = plannerOutputSchema.safeParse(JSON.parse(text));
        if (!parsed.success) {
          throw new Error(`LLM JSON の検証に失敗しました: ${parsed.error.message}`);
        }
        return parsed.data;
      }

      try {
        const output = supportsStructuredOutputs()
          ? await runStructured()
          : await runPlainJson();
        return {
          annotations: output.annotations,
          slices: output.slices,
          rationale: output.rationale,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "LLM 推論に失敗しました。";
        const shouldRetryPlainJson =
          supportsStructuredOutputs() &&
          /response_format|json_object|structured output|unavailable/i.test(message);

        if (shouldRetryPlainJson) {
          try {
            const output = await runPlainJson();
            return {
              annotations: output.annotations,
              slices: output.slices,
              rationale: output.rationale,
            };
          } catch (retryError) {
            throw new Error(
              retryError instanceof Error
                ? `LLM 推論に失敗しました: ${retryError.message}`
                : "LLM 推論に失敗しました。",
            );
          }
        }

        throw new Error(`LLM 推論に失敗しました: ${message}`);
      }
    },
    async correctSchedule(input) {
      function translateError(e: string): string {
        const parts = e.split(":");
        const code = parts[0];
        switch (code) {
          case "unknown_task":
            return `タスクID「${parts[1]}」は存在しません。削除してください。`;
          case "out_of_horizon":
            return `タスク「${parts[1]}」の日付 ${parts[2]} はスケジュール期間外です。期間内の日付に変更してください。`;
          case "non_positive":
            return `タスク「${parts[1]}」の ${parts[2]} の配分時間が 0 以下です。正の値にしてください。`;
          case "past_due":
            return `タスク「${parts[1]}」の日付 ${parts[2]} は期限切れです。期限前の日付に変更してください。`;
          case "over_remaining":
            return `タスク「${parts[1]}」の合計配分時間 ${parts[2]} 分が残り時間 ${parts[3]} 分を超えています。残り時間以内に収めてください。`;
          case "over_capacity":
            return `日付 ${parts[1]} の配分合計 ${parts[2]} 分が利用可能時間 ${parts[3]} 分を超えています。収まるように減らしてください。`;
          default:
            return e;
        }
      }
      const correctionPrompt = [
        "あなたが出力した配分に以下の問題がありました。修正してください。",
        "",
        "## 問題点",
        ...input.errors.map((e) => `- ${translateError(e)}`),
        "",
        "## 前回の配分",
        JSON.stringify(input.previousSlices, null, 2),
        "",
        "## コンテキスト",
        JSON.stringify({
          horizonStart: input.horizonStart,
          horizonEnd: input.horizonEnd,
          capacities: input.capacities.map((c) => ({
            date: c.date,
            hours: Number((c.availableMinutes / 60).toFixed(2)),
          })),
        }, null, 2),
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
  };
}
