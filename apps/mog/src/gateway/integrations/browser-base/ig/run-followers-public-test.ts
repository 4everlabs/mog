/**
 * Isolated entrypoint: no login, max 5 followers, JSON written to monorepo `test-output/`.
 * Not wired into mog bootstrap or CLI — run only via package script.
 *
 *   cd apps/mog && bun run ig:public-test
 *
 * Override: IG_MAX_FOLLOWERS, TARGET_IG_USERNAME, IG_OUTPUT_DIR
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../../../../");
for (const name of [".env", ".env.local"] as const) {
  const p = resolve(monorepoRoot, name);
  if (existsSync(p)) {
    config({ path: p, override: name === ".env.local" });
  }
}

console.log("✅ Loaded .env from monorepo root:", monorepoRoot);
console.log("BROWSERBASE_API_KEY present:", !!process.env.BROWSERBASE_API_KEY);
console.log("OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);
console.log("BROWSERBASE_PROJECT_ID present:", !!process.env.BROWSERBASE_PROJECT_ID);

const defaultOut = join(monorepoRoot, "test-output");

process.env.IG_MAX_FOLLOWERS ??= "5";
process.env.IG_SKIP_LOGIN ??= "1";
process.env.IG_OUTPUT_DIR ??= defaultOut;

const { runFollowersResearch } = await import("./run-followers-research.js");

runFollowersResearch().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
