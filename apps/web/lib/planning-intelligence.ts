import fs from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { PlanningIntelligence } from "../../../packages/application/src/index";
import type {
  TaskCognitiveLoad,
  TaskEnergy,
  TaskType,
} from "../../../packages/domain/src/task";

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

function inferHeuristically(task: {
  id: string;
  title: string;
  notes: string;
  remainingMinutes: number;
}): {
  taskId: string;
  taskType: TaskType;
  cognitiveLoad: TaskCognitiveLoad;
  energy: TaskEnergy;
  tags: string[];
} {
  const text = `${task.title} ${task.notes}`.toLowerCase();
  const taskType: TaskType =
    text.includes("調べ") || text.includes("research")
      ? "research"
      : text.includes("書") || text.includes("essay") || text.includes("記事")
        ? "writing"
        : text.includes("返信") || text.includes("mail") || text.includes("連絡")
          ? "communication"
          : text.includes("暗記") || text.includes("memor")
            ? "memorization"
            : text.includes("デザイン")
              ? "design"
              : text.includes("実装") || text.includes("code")
                ? "implementation"
                : text.includes("申請") || text.includes("事務") || text.includes("admin")
                  ? "admin"
                  : "other";
  const cognitiveLoad: TaskCognitiveLoad =
    taskType === "research" || taskType === "implementation" || taskType === "writing"
      ? "high"
      : taskType === "memorization" || taskType === "design"
        ? "medium"
        : "low";
  const energy: TaskEnergy =
    task.remainingMinutes >= 180 ? "high" : task.remainingMinutes >= 60 ? "medium" : "low";

  return {
    taskId: task.id,
    taskType,
    cognitiveLoad,
    energy,
    tags: [
      cognitiveLoad === "high" ? "頭使う" : "軽作業寄り",
      energy === "high" ? "体力使う" : "着手しやすい",
      `${taskType}系`,
    ],
  };
}

function heuristicPlanner(reason: string): PlanningIntelligence {
  return {
    async analyzeSchedule(input) {
      const annotations = input.tasks.map((task) =>
        inferHeuristically({
          id: task.id,
          title: task.title,
          notes: task.notes,
          remainingMinutes: task.remainingMinutes,
        }),
      );

      const priorityOrder = [...input.tasks]
        .sort((left, right) => {
          if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
          if (left.dueDate) return -1;
          if (right.dueDate) return 1;
          return right.remainingMinutes - left.remainingMinutes;
        })
        .map((task) => task.id);

      return {
        annotations,
        priorityOrder,
        rationale: reason,
      };
    },
  };
}

function resolveModel() {
  loadWorkspaceEnv();

  const provider = process.env.TASK_PLATFORM_LLM_PROVIDER ?? "openai-compatible";
  const modelId = process.env.TASK_PLATFORM_LLM_MODEL?.trim();

  if (!modelId) {
    return {
      model: null,
      fallbackReason:
        "TASK_PLATFORM_LLM_MODEL が未設定のため、タイトルと必要時間から簡易推定しました。",
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
        "TASK_PLATFORM_LLM_BASE_URL が未設定のため、タイトルと必要時間から簡易推定しました。",
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

export function createPlanningIntelligence(): PlanningIntelligence {
  const { model, fallbackReason } = resolveModel();
  if (!model) {
    return heuristicPlanner(
      fallbackReason ?? "ローカルの互換 LLM が未設定のため、簡易推定でスケジューリングしました。",
    );
  }

  return {
    async analyzeSchedule(input) {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: plannerOutputSchema }),
        system: [
          "あなたは個人の task planning assistant です。",
          "与えられた全 task を分類し、各 task の taskType / cognitiveLoad / energy / tags を返してください。",
          "priorityOrder は scheduling の優先順です。締切、残り時間、負荷の偏りを見て並べてください。",
          "高負荷 task を同じ日に詰め込みすぎない意図で優先順を作ってください。",
          "tags は人が読める日本語にしてください。",
        ].join("\n"),
        prompt: JSON.stringify(
          {
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
          },
          null,
          2,
        ),
      });

      return {
        annotations: output.annotations,
        priorityOrder: output.priorityOrder,
        rationale: output.rationale,
      };
    },
  };
}
