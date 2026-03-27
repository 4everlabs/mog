/**
 * STRICT OpenRouter adapter wiring for Vercel AI SDK v6.
 * Only StepFun 3.5 Flash free is allowed here.
 */
import { AISdkClient } from "@browserbasehq/stagehand/lib/v3/external_clients/aisdk.js";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const STAGEHAND_OPENROUTER_MODEL = "stepfun/step-3.5-flash:free";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createStagehandLanguageModel() {
  const openrouter = createOpenRouter({
    apiKey: requireEnv("OPENROUTER_API_KEY"),
    baseURL: OPENROUTER_BASE_URL,
    compatibility: "strict",
  });

  return openrouter.chat(STAGEHAND_OPENROUTER_MODEL);
}

export function createStagehandLlmClient(): AISdkClient {
  const model = createStagehandLanguageModel();
  return new AISdkClient({
    model: model as ConstructorParameters<typeof AISdkClient>[0]["model"],
  });
}

export function getStagehandAgentModelString(): string {
  return STAGEHAND_OPENROUTER_MODEL;
}
