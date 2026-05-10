import fs from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { PlanningIntelligence } from "../../../packages/application/src/index";

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

const plannerOutputSchema = z.object({
  annotations: z.array(taskShapeSchema),
  priorityOrder: z.array(z.string().min(1)),
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
      fallbackReason:
        "TASK_PLATFORM_LLM_MODEL が未設定です。",
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
      fallbackReason:
        "TASK_PLATFORM_LLM_BASE_URL が未設定です。",
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
    };
  }
  const resolvedModel = model;

  return {
    async analyzeSchedule(input) {
      const system = [
        "あなたは個人の task planning assistant です。",
        "与えられた全 task を分類し、各 task の taskType / cognitiveLoad / energy / tags を返してください。",
        "priorityOrder は scheduling の優先順です。締切、残り時間、負荷の偏りを見て並べてください。",
        "高負荷 task を同じ日に詰め込みすぎない意図で優先順を作ってください。",
        "tags は人が読める日本語にしてください。",
      ].join("\n");
      const payload = {
        today: input.today,
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
          priorityOrder: ["taskId"],
          rationale: "string",
        }),
        "Input JSON:",
        JSON.stringify(payload, null, 2),
      ].join("\n");

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
          priorityOrder: output.priorityOrder,
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
              priorityOrder: output.priorityOrder,
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

        throw new Error(
          error instanceof Error
            ? `LLM 推論に失敗しました: ${message}`
            : "LLM 推論に失敗しました。",
        );
      }
    },
  };
}
