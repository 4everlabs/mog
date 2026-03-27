/**
 * STRICT: Only StepFun 3.5 Flash free from OpenRouter.
 * No fallbacks. Uses custom llmClient to bypass Stagehand's provider list.
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { Stagehand, V3Options } from "@browserbasehq/stagehand";

const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "stepfun/step-3.5-flash:free";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/** Create the exact model we want */
export function createStagehandLanguageModel() {
  const openrouter = createOpenAI({
    apiKey: requireEnv("OPENROUTER_API_KEY"),
    baseURL: BASE_URL,
  });
  return openrouter(MODEL);
}

/** Stagehand options with custom llmClient */
export function getStagehandV3Options(): Partial<V3Options> {
  const model = createStagehandLanguageModel();
  return {
    env: "BROWSERBASE" as const,
    apiKey: requireEnv("BROWSERBASE_API_KEY"),
    projectId: requireEnv("BROWSERBASE_PROJECT_ID"),
    llmClient: { model },
    verbose: 2,
    selfHeal: true,
    serverCache: true,
  };
}

export function getStagehandAgentModelString(): string {
  return MODEL;
}
