/**
 * Build the Browserbase **hosted MCP** URL for Cursor (Streamable HTTP — current default in their docs).
 * Uses the same model id string as `stagehand-llm.ts`: OpenRouter key + `openai/stepfun/step-3.5-flash:free`.
 *
 *   cd apps/mog && bun run mcp:browserbase-cursor
 *
 * Paste the printed JSON into Cursor → Settings → MCP (or merge into your global mcp config).
 * The full URL contains secrets — do not commit it; clear shell history if needed.
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../..");

for (const name of [".env", ".env.local"] as const) {
  const p = resolve(monorepoRoot, name);
  if (existsSync(p)) {
    config({ path: p, override: name === ".env.local", quiet: true });
  }
}

const browserbaseApiKey = process.env.BROWSERBASE_API_KEY?.trim();
const modelApiKey = process.env.OPENROUTER_API_KEY?.trim();
/** Must match Stagehand split: provider `openai`, rest is the OpenRouter model id. */
const modelName =
  process.env.BROWSERBASE_MCP_MODEL_NAME?.trim() ||
  "openai/stepfun/step-3.5-flash:free";

if (!browserbaseApiKey) {
  console.error("Missing BROWSERBASE_API_KEY in repo .env");
  process.exit(1);
}
if (!modelApiKey) {
  console.error("Missing OPENROUTER_API_KEY in repo .env (used as modelApiKey for hosted MCP)");
  process.exit(1);
}

const base = "https://mcp.browserbase.com/mcp";
const q = new URLSearchParams({
  browserbaseApiKey,
  modelName,
  modelApiKey,
});

const url = `${base}?${q.toString()}`;

const cursorBlock = {
  mcpServers: {
    browserbase: { url },
  },
};

console.error(
  "Below: paste into Cursor MCP config. URL embeds keys — keep local only.\n",
);
console.log(JSON.stringify(cursorBlock, null, 2));
