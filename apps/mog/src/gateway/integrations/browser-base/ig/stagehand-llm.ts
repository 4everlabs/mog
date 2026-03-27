/**
 * OpenRouter: StepFun 3.5 Flash (free) only.
 * Stagehand splits `modelName` on the *first* `/` → provider + rest. Use
 * `openai/stepfun/step-3.5-flash:free` so provider is `openai` (Stagehand-supported) while
 * the request model id stays `stepfun/step-3.5-flash:free` for OpenRouter.
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { V3Options } from "@browserbasehq/stagehand";

const BASE_URL = "https://openrouter.ai/api/v1";
/** OpenRouter model id (sent in API `model` field). */
export const OPENROUTER_MODEL_ID = "stepfun/step-3.5-flash:free";
/** Stagehand `provider/model` string (first segment must be a supported provider). */
export const STAGEHAND_MODEL_NAME = `openai/${OPENROUTER_MODEL_ID}`;

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
  })(OPENROUTER_MODEL_ID);
}

export function getStagehandV3Options(): Partial<V3Options> {
  return {
    env: "BROWSERBASE" as const,
    apiKey: requireEnv("BROWSERBASE_API_KEY"),
    projectId: requireEnv("BROWSERBASE_PROJECT_ID"),
    /** Hosted Stagehand API routes `openai/*` to OpenAI; OpenRouter keys must call OpenRouter locally. */
    experimental: true,
    model: {
      modelName: STAGEHAND_MODEL_NAME,
      apiKey: requireEnv("OPENROUTER_API_KEY"),
      baseURL: BASE_URL,
    },
    verbose: 2,
    selfHeal: true,
    serverCache: true,
  };
}

export function getStagehandAgentModelString(): string {
  return STAGEHAND_MODEL_NAME;
}
