import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** `apps/mog` package root (`…/browser-base` → `integrations` → `src` → `mog`) */
const mogAppRoot = resolve(__dirname, "../../..");
/** Monorepo root (parent of `apps/`) */
const monorepoRoot = resolve(__dirname, "../../../../..");

function loadIfExists(path: string, override: boolean): void {
  if (!existsSync(path)) return;
  config({ path, override });
}

/**
 * Load `.env` files so Browserbase / Stagehand work when you run scripts from `apps/mog`
 * while secrets live in the monorepo root `.env`.
 *
 * Precedence (last wins): repo `.env` → repo `.env.local` → `apps/mog/.env` → `apps/mog/.env.local`
 */
export function loadMogIntegrationEnv(): void {
  loadIfExists(resolve(monorepoRoot, ".env"), false);
  loadIfExists(resolve(monorepoRoot, ".env.local"), true);
  loadIfExists(resolve(mogAppRoot, ".env"), true);
  loadIfExists(resolve(mogAppRoot, ".env.local"), true);
}

loadMogIntegrationEnv();
