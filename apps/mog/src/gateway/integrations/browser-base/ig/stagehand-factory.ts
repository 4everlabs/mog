import "../load-mog-env.js";
import type { Stagehand, V3Options } from "@browserbasehq/stagehand";
import { Stagehand as StagehandCtor } from "@browserbasehq/stagehand";
import { getStagehandV3Options as getLLMConfig } from "./stagehand-llm.js";

export function getStagehandV3Options(overrides?: Partial<V3Options>): V3Options {
  const config = getLLMConfig();
  console.log("🔧 Using model:", config.model?.modelName ?? "(unset)");

  const base: V3Options = {
    env: "BROWSERBASE",
    apiKey: config.apiKey!,
    projectId: config.projectId!,
    experimental: config.experimental,
    model: config.model,
    verbose: 2,
    selfHeal: true,
    serverCache: true,
  };

  if (!overrides) return base;
  return { ...base, ...overrides } as V3Options;
}

export function createStagehand(overrides?: Partial<V3Options>): Stagehand {
  return new StagehandCtor(getStagehandV3Options(overrides));
}

export function getActivePage(stagehand: Stagehand): NonNullable<
  ReturnType<Stagehand["context"]["pages"]>[0]
> {
  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("No browser page in Stagehand context; call init() first.");
  }
  return page;
}
