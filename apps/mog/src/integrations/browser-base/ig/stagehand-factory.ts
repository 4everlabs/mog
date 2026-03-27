import "../load-mog-env.js";
import type { Stagehand, V3Options } from "@browserbasehq/stagehand";
import { Stagehand as StagehandCtor } from "@browserbasehq/stagehand";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/**
 * Browserbase + LLM options for Stagehand v3.
 * Set `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, and an API key for your chosen model provider.
 */
export function getStagehandV3Options(overrides?: Partial<V3Options>): V3Options {
  const base: V3Options = {
    env: "BROWSERBASE",
    apiKey: requireEnv("BROWSERBASE_API_KEY"),
    projectId: requireEnv("BROWSERBASE_PROJECT_ID"),
    model: {
      modelName: "gpt-4o",
      apiKey: requireEnv("OPENAI_API_KEY"),
    },
    verbose: 1,
    selfHeal: true,
    serverCache: true,
  };
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/** Construct and return a Stagehand instance (call `init()` before use). */
export function createStagehand(overrides?: Partial<V3Options>): Stagehand {
  return new StagehandCtor(getStagehandV3Options(overrides));
}

/** First tab after `init()` — throws if none (should not happen on Browserbase). */
export function getActivePage(stagehand: Stagehand): NonNullable<
  ReturnType<Stagehand["context"]["pages"]>[0]
> {
  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("No browser page in Stagehand context; call init() first.");
  }
  return page;
}
