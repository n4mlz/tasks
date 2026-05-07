import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.unmock("ai");
  vi.unmock("@ai-sdk/openai-compatible");
  vi.unmock("@ai-sdk/openai");
  vi.unmock("@ai-sdk/anthropic");
});

describe("createPlanningIntelligence", () => {
  it("throws when no local LLM is configured instead of falling back heuristically", async () => {
    process.env.TASK_PLATFORM_LLM_PROVIDER = "openai-compatible";
    process.env.TASK_PLATFORM_LLM_MODEL = "";
    process.env.TASK_PLATFORM_LLM_BASE_URL = "";

    const { createPlanningIntelligence } = await import("../lib/planning-intelligence");
    const planningIntelligence = createPlanningIntelligence();

    await expect(
      planningIntelligence.analyzeSchedule({
        today: "2026-04-27",
        tasks: [],
        capacities: [],
        recentMutations: [],
      }),
    ).rejects.toThrow(/TASK_PLATFORM_LLM_MODEL|TASK_PLATFORM_LLM_BASE_URL|LLM/);
  });

  it("uses plain JSON mode when structured outputs are disabled", async () => {
    const generateText = vi
      .fn()
      .mockResolvedValue({
        text: JSON.stringify({
          annotations: [],
          priorityOrder: [],
          rationale: "plain json",
        }),
      });

    vi.doMock("ai", () => ({
      generateText,
      Output: {
        object: vi.fn(() => ({ kind: "object-output" })),
      },
    }));
    vi.doMock("@ai-sdk/openai-compatible", () => ({
      createOpenAICompatible: () => (_modelId: string) => ({ provider: "mock-model" }),
    }));
    vi.doMock("@ai-sdk/openai", () => ({ openai: vi.fn() }));
    vi.doMock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn() }));

    process.env.TASK_PLATFORM_LLM_PROVIDER = "openai-compatible";
    process.env.TASK_PLATFORM_LLM_MODEL = "deepseek";
    process.env.TASK_PLATFORM_LLM_BASE_URL = "http://127.0.0.1:1234/v1";
    process.env.TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS = "false";

    const { createPlanningIntelligence } = await import("../lib/planning-intelligence");
    const planningIntelligence = createPlanningIntelligence();

    const result = await planningIntelligence.analyzeSchedule({
      today: "2026-04-27",
      tasks: [],
      capacities: [],
      recentMutations: [],
    });

    expect(result.rationale).toBe("plain json");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0]?.[0]).not.toHaveProperty("output");
    expect(String(generateText.mock.calls[0]?.[0]?.prompt ?? "")).toMatch(/JSON/i);
  });

  it("retries with plain JSON when structured output mode is unavailable", async () => {
    const generateText = vi
      .fn()
      .mockRejectedValueOnce(new Error("This response_format type is unavailable now"))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          annotations: [],
          priorityOrder: [],
          rationale: "retry plain json",
        }),
      });

    vi.doMock("ai", () => ({
      generateText,
      Output: {
        object: vi.fn(() => ({ kind: "object-output" })),
      },
    }));
    vi.doMock("@ai-sdk/openai-compatible", () => ({
      createOpenAICompatible: () => (_modelId: string) => ({ provider: "mock-model" }),
    }));
    vi.doMock("@ai-sdk/openai", () => ({ openai: vi.fn() }));
    vi.doMock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn() }));

    process.env.TASK_PLATFORM_LLM_PROVIDER = "openai-compatible";
    process.env.TASK_PLATFORM_LLM_MODEL = "deepseek";
    process.env.TASK_PLATFORM_LLM_BASE_URL = "http://127.0.0.1:1234/v1";
    process.env.TASK_PLATFORM_LLM_SUPPORTS_STRUCTURED_OUTPUTS = "true";

    const { createPlanningIntelligence } = await import("../lib/planning-intelligence");
    const planningIntelligence = createPlanningIntelligence();

    const result = await planningIntelligence.analyzeSchedule({
      today: "2026-04-27",
      tasks: [],
      capacities: [],
      recentMutations: [],
    });

    expect(result.rationale).toBe("retry plain json");
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[0]?.[0]).toHaveProperty("output");
    expect(generateText.mock.calls[1]?.[0]).not.toHaveProperty("output");
  });
});
