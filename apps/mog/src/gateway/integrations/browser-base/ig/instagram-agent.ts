import type { Stagehand } from "@browserbasehq/stagehand";
import { getStagehandAgentModelString } from "./stagehand-llm.js";

/**
 * Multi-step “agent” mode (DOM tools: act, observe, etc. inside one LLM loop).
 * For follower harvesting, `run-followers-research.ts` (act + extract) is usually easier to debug.
 *
 * @example
 * ```ts
 * const stagehand = createStagehand();
 * await stagehand.init();
 * const agent = createInstagramDomAgent(stagehand);
 * const result = await agent.execute({
 *   instruction: "On Instagram, open the followers list for the current profile and describe what you see.",
 *   maxSteps: 15,
 * });
 * console.log(result.message, result.actions);
 * ```
 */
export function createInstagramDomAgent(stagehand: Stagehand) {
  return stagehand.agent({
    mode: "dom",
    model: getStagehandAgentModelString(),
  });
}
