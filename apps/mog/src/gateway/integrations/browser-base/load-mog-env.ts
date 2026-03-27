import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// browser-base -> …/apps/mog -> …/apps -> monorepo root (6 levels up)
const monorepoRoot = resolve(__dirname, "../../../../../../");

function loadIfExists(path: string, override: boolean): void {
  if (!existsSync(path)) return;
  config({ path, override });
  console.log(`[dotenv] loaded ${path}`);
}

/**
 * Load `.env` from monorepo root for gateway scripts.
 */
export function loadMogIntegrationEnv(): void {
  loadIfExists(resolve(monorepoRoot, ".env"), false);
  loadIfExists(resolve(monorepoRoot, ".env.local"), true);
}

loadMogIntegrationEnv();
