/**
 * Public blog/news page → Stagehand `extract()` → JSON on stdout.
 * No file write; meant for a quick “this really works” check.
 *
 *   cd apps/mog && bun run scrape:blog
 *
 * Optional: BLOG_SCRAPE_URL (default: SQLite news — plain, stable, very public)
 */
import "./load-mog-env.js";
import { createStagehand, getActivePage } from "./ig/stagehand-factory.js";
import { z } from "zod";

const DEFAULT_URL = "https://www.sqlite.org/news.html";
const url = (process.env.BLOG_SCRAPE_URL ?? DEFAULT_URL).trim() || DEFAULT_URL;

const BlogSnippetSchema = z.object({
  headline: z
    .string()
    .describe("Title or first line of the top / most recent item on the page"),
  detail: z
    .string()
    .optional()
    .describe("Short subtitle, date, or first sentence if clearly associated with that item"),
});

async function main(): Promise<void> {
  const stagehand = createStagehand({ verbose: 0 });
  await stagehand.init();
  try {
    const page = getActivePage(stagehand);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const scraped = await stagehand.extract(
      "This is a news or blog listing. Extract the headline (title) of the single most recent or top entry. If a date or one-line summary is shown next to it, include that in detail.",
      BlogSnippetSchema,
    );

    const out = {
      ok: true as const,
      url,
      scraped,
      at: new Date().toISOString(),
    };
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await stagehand.close();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify({ ok: false, url, error: message }, null, 2));
  process.exitCode = 1;
});
