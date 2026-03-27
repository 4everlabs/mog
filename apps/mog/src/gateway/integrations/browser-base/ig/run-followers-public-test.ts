/**
 * Isolated entrypoint: no login, max 5 followers, JSON written to monorepo `test-output/`.
 * Not wired into mog bootstrap or CLI — run only via package script.
 *
 *   cd apps/mog && bun run ig:public-test
 *
 * Override: IG_MAX_FOLLOWERS, TARGET_IG_USERNAME, IG_OUTPUT_DIR
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Load environment variables from monorepo root
import "../../../load-mog-env.js";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(here, "../../../../../../");
const defaultOut = join(monorepoRoot, "test-output");

process.env.IG_MAX_FOLLOWERS ??= "5";
process.env.IG_SKIP_LOGIN ??= "1";
process.env.IG_OUTPUT_DIR ??= defaultOut;

const { runFollowersResearch } = await import("./run-followers-research.js");

runFollowersResearch().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
