import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
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

type GetFollowersConfig = {
  env: "LOCAL" | "BROWSERBASE";
  model: string;
  siteURL: string;
  targetAccounts: string[];
  maxFollowersPerAccount: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: {
    afterNavigation: [number, number];
    afterModalOpen: [number, number];
    betweenScrolls: [number, number];
    betweenAccounts: [number, number];
  };
};

function readConfig(): GetFollowersConfig {
  return JSON.parse(
    readFileSync(resolve(here, "get-followers.config.json"), "utf8"),
  ) as GetFollowersConfig;
}

function openRouterKey(): string {
  const k = process.env.OPENROUTER_API_KEY?.trim();
  if (!k) throw new Error("Missing OPENROUTER_API_KEY.");
  return k;
}

function readInstagramSessionIdFromEnv(): string | undefined {
  return process.env.INSTAGRAM_SESSION_ID?.trim() || undefined;
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

async function closeLoginModalIfPresent(page: Page, timeout: number): Promise<void> {
  try {
    await page.evaluate(() => {
      const closeBtns = Array.from(document.querySelectorAll('div[role="dialog"] button, svg[aria-label="Close"]'));
      for (const btn of closeBtns) {
        if (btn.closest('div[role="dialog"]')) {
          (btn.closest('button') || btn as HTMLElement).click();
        }
      }
    });
  } catch (err) {
    // Ignore errors
  }
}

async function simulateHumanBehavior(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    window.scrollBy({ top: randomInt(100, 400), behavior: 'smooth' });
    await sleep(randomInt(500, 1500));
    window.scrollBy({ top: -randomInt(50, 200), behavior: 'smooth' });
    await sleep(randomInt(500, 1000));
  });
}

async function openFollowersModal(page: Page, username: string): Promise<boolean> {
  return await page.evaluate((user) => {
    const links = Array.from(document.querySelectorAll('a'));
    const followersLink = links.find(a => {
      const href = a.getAttribute('href');
      // Instagram sometimes adds query params or trailing slashes, so we check if it includes the path
      return href && href.includes(`/${user}/followers`);
    });
    
    if (followersLink) {
      (followersLink as HTMLElement).click();
      return true;
    }
    return false;
  }, username);
}

async function extractFollowersFromModal(page: Page, maxCount: number, delayRange: [number, number]): Promise<string[]> {
  return await page.evaluate(async ({ max, minDelay, maxDelay }) => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const followers = new Set<string>();
    
    // Find the dialog
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const dialog = dialogs[dialogs.length - 1]; // Usually the last one opened
    if (!dialog) return [];
    
    // Find the scrollable area inside the dialog
    let scrollable: Element | null = null;
    const elements = Array.from(dialog.querySelectorAll('div'));
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        scrollable = el;
        break;
      }
    }
    
    if (!scrollable) {
      // Fallback
      scrollable = dialog.querySelector('div:nth-child(2)') || dialog;
    }
    
    let lastSize = 0;
    let noChangeCount = 0;
    
    while (followers.size < max) {
      // Extract current visible followers
      const links = Array.from(dialog.querySelectorAll('a[href^="/"]'));
      for (const a of links) {
        const href = a.getAttribute('href');
        if (href && href.startsWith('/') && href.split('/').length === 3) {
          const username = href.replace(/\//g, '');
          if (!['p', 'reel', 'explore', 'direct', 'stories', 'reels', 'about', 'help', 'press', 'api', 'jobs', 'privacy', 'terms', 'locations', 'directory', 'profiles'].includes(username)) {
            followers.add(username);
          }
        }
      }
      
      if (followers.size >= max) break;
      
      if (followers.size === lastSize) {
        noChangeCount++;
        if (noChangeCount > 5) break; // Give up if no new followers after 5 scrolls
      } else {
        noChangeCount = 0;
        lastSize = followers.size;
      }
      
      // Scroll down
      scrollable.scrollTop = scrollable.scrollHeight;
      
      // Wait for load
      await sleep(randomInt(minDelay, maxDelay));
    }
    
    // Close the modal
    const closeBtn = dialog.querySelector('svg[aria-label="Close"]')?.closest('button');
    if (closeBtn) {
      (closeBtn as HTMLElement).click();
    }
    
    return Array.from(followers).slice(0, max);
  }, { max: maxCount, minDelay: delayRange[0], maxDelay: delayRange[1] });
}

export async function runGetFollowers() {
  const cfg = readConfig();
  
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

    const sid = readInstagramSessionIdFromEnv();
    if (!sid) {
      console.warn("Missing INSTAGRAM_SESSION_ID — expect login modals / limited interaction.");
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

    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    
    // Clear the output file at the start
    await writeFile(outPath, "", "utf8");

    for (const account of cfg.targetAccounts) {
      const profileUrl = new URL(`/${account}/`, cfg.siteURL).href;
      console.log(`\n→ Going to profile: ${profileUrl}`);
      
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: cfg.gotoTimeoutMs,
      });
      
      await waitRandomMs(cfg.delays.afterNavigation);
      await closeLoginModalIfPresent(page, cfg.gotoTimeoutMs);
      await simulateHumanBehavior(page);

      console.log(`Attempting to open followers modal for ${account}...`);
      const opened = await openFollowersModal(page, account);
      
      if (!opened) {
        console.log(`Could not find or click followers link for ${account}. Might be private or zero followers.`);
        await waitRandomMs(cfg.delays.betweenAccounts);
        continue;
      }
      
      await waitRandomMs(cfg.delays.afterModalOpen);
      
      console.log(`Extracting up to ${cfg.maxFollowersPerAccount} followers...`);
      const followers = await extractFollowersFromModal(page, cfg.maxFollowersPerAccount, cfg.delays.betweenScrolls);
      
      console.log(`Extracted ${followers.length} followers for ${account}.`);
      
      if (followers.length > 0) {
        const outputText = `${account} followers\n\n` + followers.join('\n') + '\n\n';
        await appendFile(outPath, outputText, "utf8");
      }
      
      await waitRandomMs(cfg.delays.betweenAccounts);
    }
    
    console.log(`\n✅ Finished scraping followers. Results saved to ${outPath}`);
    
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runGetFollowers().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
