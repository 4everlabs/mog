import "../load-mog-env.js";
import type { Stagehand, V3Options } from "@browserbasehq/stagehand";
import { Stagehand as StagehandCtor } from "@browserbasehq/stagehand";
import { getStagehandV3Options } from "./stagehand-llm.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/**
 * Browserbase + LLM for Stagehand v3.
 * LLM: OpenRouter only — `stepfun/step-3.5-flash:free` (`OPENROUTER_API_KEY`). See `stagehand-llm.ts`.
 */
export function getStagehandV3Options(overrides?: Partial<V3Options>): V3Options {
  const base = getStagehandV3Options();
  console.log("🔧 Using STRICT StepFun 3.5 Flash free from OpenRouter");

  if (!overrides) return base as V3Options;
  return { ...base, ...overrides } as V3Options;
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
