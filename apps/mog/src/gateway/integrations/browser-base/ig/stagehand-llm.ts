/**
 * STRICT: ONLY StepFun 3.5 Flash free from OpenRouter.
 * No GPT. No fallbacks.
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { V3Options } from "@browserbasehq/stagehand";

const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_SLUG = "stepfun/step-3.5-flash:free";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export function createStagehandLanguageModel() {
  return createOpenAI({
    apiKey: requireEnv("OPENROUTER_API_KEY"),
    baseURL: BASE_URL,
  })(MODEL_SLUG);
}

export function getStagehandV3Options(): Partial<V3Options> {
  return {
    env: "BROWSERBASE" as const,
    apiKey: requireEnv("BROWSERBASE_API_KEY"),
    projectId: requireEnv("BROWSERBASE_PROJECT_ID"),
    model: {
      modelName: `openai/${MODEL_SLUG}`,
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      baseURL: BASE_URL,
    },
    verbose: 2,
    selfHeal: true,
    serverCache: true,
  };
}

export function getStagehandAgentModelString(): string {
  return `openai/${MODEL_SLUG}`;
}
