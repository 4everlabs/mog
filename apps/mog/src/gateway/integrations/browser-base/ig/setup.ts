import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Stagehand, type Action, type Page } from "@browserbasehq/stagehand";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../../../../");

for (const name of [".env", ".env.local"] as const) {
  const p = resolve(monorepoRoot, name);
  if (existsSync(p)) loadDotenv({ path: p, override: name === ".env.local", quiet: true });
}

const followerUsernamesSchema = z.object({
  usernames: z
    .array(z.string().describe("Instagram handle only, no @ symbol"))
    .describe("Usernames visible in the followers modal"),
});
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const DIALOG = 'div[role="dialog"]';

/** This script only talks to OpenRouter (no other LLM base URLs). */
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

type InstagramSetupConfig = {
  env: "LOCAL";
  instagramSessionId?: string;
  /** OpenRouter model id, e.g. `google/gemini-3-flash-preview` */
  model: string;
  siteURL: string;
  targetUsername: string;
  targetFollowersCount: number;
  maxScrollAttempts: number;
  /** Random wait in ms, each [min, max) */
  delays: { initialWait: [number, number]; scroll: [number, number] };
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
};

export type InstagramSetupOutput = {
  scrapedAt: string;
  targetUsername: string;
  requestedFollowersCount: number;
  success: boolean;
  extractedFollowers: string[];
};

function readInstagramSetupConfig(): InstagramSetupConfig {
  return JSON.parse(
    readFileSync(resolve(here, "setup.config.json"), "utf8"),
  ) as InstagramSetupConfig;
}

function openRouterKey(): string {
  const k = process.env.OPENROUTER_API_KEY?.trim();
  if (!k) throw new Error("Missing OPENROUTER_API_KEY.");
  return k;
}

function waitRandomMs([min, max]: [number, number]): Promise<void> {
  const ms = max <= min ? min : min + Math.floor(Math.random() * (max - min));
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stagehand must use the OpenAI-compatible client against OpenRouter; the request body
 * still uses the full OpenRouter id (e.g. `google/gemini-3-flash-preview`).
 */
function openRouterModelForStagehand(openRouterModelId: string): string {
  const m = openRouterModelId.trim();
  if (m.startsWith("openai/")) return m;
  return `openai/${m}`;
}

function normalizeInstagramHandle(raw: string): string | null {
  const t = raw.trim().replace(/^@+/, "");
  return t && HANDLE.test(t) ? t : null;
}

/** v3: pass the same `page` you used in `observe` so `act` targets the right tab. */
async function actFirstObserved(
  stagehand: Stagehand,
  page: Page,
  candidates: Action[],
  label: string,
): Promise<void> {
  const action = candidates[0];
  if (!action) throw new Error(`observe: no action for: ${label}`);
  const result = await stagehand.act(action, { page });
  if (!result.success) {
    throw new Error(`act failed (${label}): ${result.message || result.actionDescription}`);
  }
}

async function syncScrapeConfig(handles: string[]): Promise<void> {
  const p = resolve(here, "scrape.config.json");
  if (!existsSync(p)) {
    console.warn("No scrape.config.json next to setup — skipped sync.");
    return;
  }
  try {
    const o = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
    if (!o || typeof o !== "object") throw new Error("not an object");
    o.accountsToScrape = handles;
    await writeFile(p, `${JSON.stringify(o, null, 2)}\n`, "utf8");
    console.log(`Synced ${handles.length} handle(s) → scrape.config.json accountsToScrape`);
  } catch (e) {
    console.warn("Sync scrape.config.json failed:", e instanceof Error ? e.message : e);
  }
}

export async function runInstagramSetup(): Promise<InstagramSetupOutput> {
  const cfg = readInstagramSetupConfig();
  const user = cfg.targetUsername?.trim();
  if (!user || !HANDLE.test(user)) throw new Error("Invalid targetUsername in setup.config.json");
  if (!Number.isInteger(cfg.targetFollowersCount) || cfg.targetFollowersCount < 1) {
    throw new Error("targetFollowersCount must be a positive integer");
  }
  if (!Number.isInteger(cfg.maxScrollAttempts) || cfg.maxScrollAttempts < 1) {
    throw new Error("maxScrollAttempts must be a positive integer");
  }
  const [w0, w1] = cfg.delays.initialWait;
  const [s0, s1] = cfg.delays.scroll;
  if (w0 < 0 || w1 < w0 || s0 < 0 || s1 < s0) {
    throw new Error("delays.initialWait and delays.scroll must be [min,max] with 0 <= min <= max");
  }

  const stagehand = new Stagehand({
    env: cfg.env,
    experimental: true,
    verbose: cfg.verbose,
    selfHeal: true,
    serverCache: false,
    model: {
      modelName: openRouterModelForStagehand(cfg.model),
      apiKey: openRouterKey(),
      baseURL: OPENROUTER_API_BASE,
    },
  });

  try {
    await stagehand.init();
    const ctx = stagehand.context;
    const page = ctx.activePage() ?? ctx.pages().at(-1);
    if (!page) throw new Error("No page after init");

    const sid = cfg.instagramSessionId?.trim();
    if (!sid) {
      console.warn("No instagramSessionId — expect login modals / limited access.");
    } else {
      await ctx.addCookies([
        { name: "sessionid", value: sid, domain: ".instagram.com", path: "/", httpOnly: true, secure: true },
      ]);
    }

    const url = new URL(`/${user}/`, cfg.siteURL).href;
    console.log("Goto", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeoutMs: cfg.gotoTimeoutMs });

    const login = await stagehand.observe(
      "Close button (X) on Instagram sign-in or sign-up modal overlay, top-right of that dialog only.",
      { page, timeout: cfg.gotoTimeoutMs },
    );
    if (login[0]) {
      await actFirstObserved(stagehand, page, login, "close login modal");
    }

    const followers = await stagehand.observe(
      `Clickable followers count / "followers" link on @${user} profile header.`,
      { page, timeout: cfg.gotoTimeoutMs },
    );
    await actFirstObserved(stagehand, page, followers, "open followers");

    const out: string[] = [];
    let scrolls = 0;
    let extractN = 0;
    let stagnant = 0;
    const tExtract = Math.min(Math.max(cfg.gotoTimeoutMs, 30_000), 180_000);

    await waitRandomMs(cfg.delays.initialWait);

    while (out.length < cfg.targetFollowersCount && scrolls < cfg.maxScrollAttempts) {
      extractN += 1;
      let batch: { usernames: string[] };
      try {
        batch = await stagehand.extract(
          "Followers modal: each row's Instagram username (no @). Skip suggested/non-follower blocks if obvious.",
          followerUsernamesSchema,
          { page, selector: DIALOG, timeout: tExtract },
        );
      } catch (e) {
        console.error("extract:", e instanceof Error ? e.message : e);
        batch = { usernames: [] };
      }

      const before = out.length;
      for (const raw of batch.usernames) {
        const h = normalizeInstagramHandle(raw);
        if (h && !out.includes(h) && h.toLowerCase() !== user.toLowerCase()) out.push(h);
      }
      stagnant = out.length === before ? stagnant + 1 : 0;
      console.log(`Followers ${out.length}/${cfg.targetFollowersCount}`);

      if (out.length >= cfg.targetFollowersCount) break;
      if (stagnant >= 2) {
        console.warn("No new names twice in a row — stopping.");
        break;
      }

      await page.evaluate(() => {
        const d = document.querySelector('div[role="dialog"]');
        if (!d) return;
        const a = Array.from(d.querySelectorAll("a[href]")).at(-1);
        a?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
      await waitRandomMs(cfg.delays.scroll);
      scrolls += 1;
    }

    out.length = Math.min(out.length, cfg.targetFollowersCount);

    const result: InstagramSetupOutput = {
      scrapedAt: new Date().toISOString(),
      targetUsername: user,
      requestedFollowersCount: cfg.targetFollowersCount,
      success: out.length >= cfg.targetFollowersCount,
      extractedFollowers: out,
    };

    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    await syncScrapeConfig(out);

    console.log(
      result.success
        ? `OK → ${out.length} saved (${outPath})`
        : `Partial ${out.length}/${cfg.targetFollowersCount} (${extractN} extracts, ${scrolls} scrolls)`,
    );
    return result;
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runInstagramSetup()
    .then((o) => {
      if (!o.success) process.exitCode = 1;
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}
