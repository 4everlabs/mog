import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Stagehand, type Page } from "@browserbasehq/stagehand";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../");

for (const name of [".env", ".env.local"] as const) {
  const p = resolve(monorepoRoot, name);
  if (existsSync(p)) loadDotenv({ path: p, override: name === ".env.local", quiet: true });
}

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

type InstagramLikeConfig = {
  env: "LOCAL";
  model: string;
  siteURL: string;
  maxLikes: number;
  maxScrollsWithoutLike: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: {
    afterNavigation: [number, number];
    afterLike: [number, number];
    afterScroll: [number, number];
  };
};

export type InstagramLikeOutput = {
  actedAt: string;
  siteURL: string;
  model: string;
  likesRequested: number;
  likesAchieved: number;
  error: string | null;
};

function readInstagramLikeConfig(): InstagramLikeConfig {
  return JSON.parse(
    readFileSync(resolve(here, "like.config.json"), "utf8"),
  ) as InstagramLikeConfig;
}

function openRouterKey(): string {
  const k = process.env.OPENROUTER_API_KEY?.trim();
  if (!k) throw new Error("Missing OPENROUTER_API_KEY.");
  return k;
}

function openRouterModelForStagehand(openRouterModelId: string): string {
  const m = openRouterModelId.trim();
  if (m.startsWith("openai/")) return m;
  return `openai/${m}`;
}

function waitRandomMs([min, max]: [number, number]): Promise<void> {
  const ms = max <= min ? min : min + Math.floor(Math.random() * (max - min));
  return new Promise((r) => setTimeout(r, ms));
}

function isValidDelayRange([min, max]: [number, number]): boolean {
  return min >= 0 && max >= min;
}

async function gotoFeed(
  page: Page,
  cfg: InstagramLikeConfig,
): Promise<void> {
  await page.goto(cfg.siteURL, {
    waitUntil: "domcontentloaded",
    timeoutMs: cfg.gotoTimeoutMs,
  });
  await waitRandomMs(cfg.delays.afterNavigation);
}

async function domLikeNextFeedPostAndScroll(page: Page): Promise<{ liked: boolean; scrolled: boolean }> {
  return await page.evaluate(() => {
    // Check if we are inside a dialog/modal (like notification dialogs)
    const modals = document.querySelectorAll('[role="dialog"]');
    if (modals.length > 0) {
      // Find a Not Now or Cancel button to close the modal
      const btns = Array.from(document.querySelectorAll("button"));
      const closeBtn = btns.find(b => b.textContent?.toLowerCase().includes("not now") || b.textContent?.toLowerCase().includes("cancel"));
      if (closeBtn) {
        closeBtn.click();
        return { liked: false, scrolled: false }; // Handled modal, don't do anything else this iteration
      }
    }

    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0;
    };

    const articles = Array.from(document.querySelectorAll("article"));
    
    for (const article of articles) {
      const svgs = Array.from(article.querySelectorAll("svg[aria-label='Like'], svg[aria-label='Unlike']"));
      const visibleSvgs = svgs.filter(isVisible);

      if (visibleSvgs.length === 0) continue;

      const targetSvg = visibleSvgs[0];
      const label = targetSvg.getAttribute("aria-label");

      // Skip already liked
      if (label === "Unlike") continue;

      if (label === "Like") {
        const clickable = targetSvg.closest("button, [role='button'], a") || targetSvg.parentElement;
        if (clickable) {
          (clickable as HTMLElement).click();
          return { liked: true, scrolled: false };
        }
      }
    }
    
    // Didn't find any un-liked post in viewport, let's scroll
    window.scrollBy({ top: window.innerHeight * 0.7, behavior: "smooth" });
    return { liked: false, scrolled: true };
  });
}

export async function runInstagramLike(): Promise<InstagramLikeOutput> {
  const cfg = readInstagramLikeConfig();
  if (!Number.isInteger(cfg.maxLikes) || cfg.maxLikes < 1) {
    throw new Error("maxLikes must be a positive integer");
  }

  if (
    !isValidDelayRange(cfg.delays.afterNavigation) ||
    !isValidDelayRange(cfg.delays.afterLike) ||
    !isValidDelayRange(cfg.delays.afterScroll)
  ) {
    throw new Error("All like delay ranges must be [min,max] with 0 <= min <= max");
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

  const output: InstagramLikeOutput = {
    actedAt: new Date().toISOString(),
    siteURL: cfg.siteURL,
    model: cfg.model,
    likesRequested: cfg.maxLikes,
    likesAchieved: 0,
    error: null,
  };

  try {
    await stagehand.init();
    const ctx = stagehand.context;
    const page = ctx.activePage() ?? ctx.pages().at(-1);
    if (!page) throw new Error("No page after init");

    const sid = process.env.INSTAGRAM_SESSION_ID?.trim();
    if (!sid) {
      console.warn("No INSTAGRAM_SESSION_ID in .env — expect login modals / limited interaction.");
    } else {
      await ctx.addCookies([
        {
          name: "sessionid",
          value: sid,
          domain: ".instagram.com",
          path: "/",
          httpOnly: true,
          secure: true,
        },
      ]);
    }

    console.log(`\n→ Loading home feed: ${cfg.siteURL}`);
    await gotoFeed(page, cfg);

    let scrollsWithoutLike = 0;
    
    while (output.likesAchieved < cfg.maxLikes && scrollsWithoutLike < cfg.maxScrollsWithoutLike) {
      try {
        const { liked, scrolled } = await domLikeNextFeedPostAndScroll(page);
        
        if (liked) {
          output.likesAchieved++;
          scrollsWithoutLike = 0;
          console.log(`Liked post ${output.likesAchieved}/${cfg.maxLikes}`);
          await waitRandomMs(cfg.delays.afterLike);
        } else if (scrolled) {
          scrollsWithoutLike++;
          console.log(`Scrolled down (No visible un-liked posts) [${scrollsWithoutLike}/${cfg.maxScrollsWithoutLike}]`);
          await waitRandomMs(cfg.delays.afterScroll);
        } else {
          // Handled a modal or something else, wait a bit
          console.log("Handled modal or overlay");
          await waitRandomMs(cfg.delays.afterScroll);
        }
      } catch (loopError) {
        console.warn("Error during like/scroll loop:", loopError);
        scrollsWithoutLike++;
        await waitRandomMs(cfg.delays.afterScroll);
      }
    }

    if (scrollsWithoutLike >= cfg.maxScrollsWithoutLike) {
      console.log(`\nStopped: Exceeded max scrolls without finding new un-liked posts (${cfg.maxScrollsWithoutLike})`);
    } else {
      console.log(`\nStopped: Achieved requested likes (${cfg.maxLikes})`);
    }

    output.actedAt = new Date().toISOString();
    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`Wrote like results → ${outPath}`);
    return output;
  } catch (err) {
    output.error = err instanceof Error ? err.message : String(err);
    console.error("Fatal error:", err);
    return output;
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runInstagramLike().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
