#!/usr/bin/env bun
/**
 * STDIO MCP launcher: loads repo `.env` then runs the official Browserbase MCP server.
 * Cursor spawns this process; stdin/stdout carry MCP. No keys in mcp.json.
 *
 * Env (from .env): BROWSERBASE_API_KEY, OPENROUTER_API_KEY
 * Optional: BROWSERBASE_MCP_MODEL_NAME (default openai/stepfun/step-3.5-flash:free)
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env", ".env.local"] as const) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    config({ path: p, override: name === ".env.local", quiet: true });
  }
}

if (!process.env.BROWSERBASE_API_KEY?.trim()) {
  console.error("[browserbase-mcp-launch] Missing BROWSERBASE_API_KEY in .env");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY?.trim()) {
  console.error("[browserbase-mcp-launch] Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

const modelName =
  process.env.BROWSERBASE_MCP_MODEL_NAME?.trim() ||
  "openai/stepfun/step-3.5-flash:free";

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "-y",
    "@browserbasehq/mcp-server-browserbase",
    "--modelName",
    modelName,
    "--modelApiKey",
    process.env.OPENROUTER_API_KEY.trim(),
  ],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

child.on("error", (err) => {
  console.error("[browserbase-mcp-launch]", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
