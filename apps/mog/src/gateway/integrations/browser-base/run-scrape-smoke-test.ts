/**
 * End-to-end smoke test: Browserbase session + Stagehand `extract()` on a site meant for scraping practice.
 * Does not use Instagram (login/429 noise). Validates LLM + browser wiring.
 *
 *   cd apps/mog && bun run scrape:smoke
 *
 * Optional: SCRAPE_SMOKE_URL (default https://quotes.toscrape.com/)
 */
import "./load-mog-env.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createStagehand, getActivePage } from "./ig/stagehand-factory.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../../../../../");

const DEFAULT_URL = "https://quotes.toscrape.com/";
const SMOKE_URL = (process.env.SCRAPE_SMOKE_URL ?? DEFAULT_URL).trim() || DEFAULT_URL;

const FirstQuoteSchema = z.object({
  firstQuoteText: z
    .string()
    .describe("Full text of the first quote on the page, as shown"),
  firstQuoteAuthor: z
    .string()
    .describe("Author name for that quote, as shown"),
});

export async function runScrapeSmokeTest(): Promise<void> {
  const outPath = resolve(monorepoRoot, "test-output", "smoke-scrape.json");

  const stagehand = createStagehand({ verbose: 1 });
  try {
    await stagehand.init();
    const page = getActivePage(stagehand);
    await page.goto(SMOKE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const extracted = await stagehand.extract(
      "On this page there is a list of quotes. Extract the complete text of the first quote and the author name exactly as displayed.",
      FirstQuoteSchema,
    );

    const textOk = extracted.firstQuoteText.trim().length >= 8;
    const authorOk = extracted.firstQuoteAuthor.trim().length >= 1;
    if (!textOk || !authorOk) {
      throw new Error(
        `Smoke extract looked empty (textLen=${extracted.firstQuoteText.length}, authorLen=${extracted.firstQuoteAuthor.length})`,
      );
    }

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      `${JSON.stringify(
        {
          ok: true,
          url: SMOKE_URL,
          extracted,
          at: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log("✅ Scrape smoke test passed.");
    console.log("   Output:", outPath);
    console.log("   Author:", extracted.firstQuoteAuthor);
    console.log(
      "   Quote:",
      extracted.firstQuoteText.length > 100
        ? `${extracted.firstQuoteText.slice(0, 100)}…`
        : extracted.firstQuoteText,
    );
  } finally {
    await stagehand.close();
  }
}

runScrapeSmokeTest().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
