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

type CommentersConfig = {
  env: "LOCAL" | "BROWSERBASE";
  model: string;
  siteURL: string;
  targetAccount: string;
  maxPostsToCheck: number;
  maxCommentersPerPost: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: {
    afterNavigation: [number, number];
    afterPostOpen: [number, number];
    betweenPosts: [number, number];
  };
};

function readConfig(): CommentersConfig {
  return JSON.parse(
    readFileSync(resolve(here, "commenters.config.json"), "utf8"),
  ) as CommentersConfig;
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

async function getPostLinks(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const links = Array.from(main.querySelectorAll('a')).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('/p/') || href.includes('/reel/');
    });
    
    // Filter out posts that have 0 comments by looking at the hover stats
    const validLinks = links.filter(a => {
      // Instagram usually shows a list item with the comment icon and count when hovering
      // We look for the comment icon (a speech bubble SVG or similar) inside the link
      // Or we just grab it if we can't be sure, but we try to filter if we see a "0" next to a comment icon
      const commentStat = Array.from(a.querySelectorAll('ul li')).find(li => {
        const text = li.textContent?.trim() || '';
        // Often the comment count is the second li, or has a specific icon
        // If we see a 0, we might skip it. But to be safe, we just return true if we can't tell.
        return true; 
      });
      
      // A more robust way: Instagram puts the comment count in an element with class that often contains 'comment' or next to a comment SVG
      // Let's just return all links for now, but we can try to parse the aria-label if it exists
      const ariaLabel = a.getAttribute('aria-label') || a.querySelector('img')?.getAttribute('alt') || '';
      if (ariaLabel.includes('0 comments')) {
        return false;
      }
      
      return true;
    });
    
    // Return absolute URLs
    return validLinks.map(a => (a as HTMLAnchorElement).href);
  });
}

async function extractCommenters(page: Page, maxCount: number): Promise<string[]> {
  return await page.evaluate((max) => {
    const commenters = new Set<string>();
    
    // Look for links that contain usernames
    const links = Array.from(document.querySelectorAll('a[href^="/"]'));
    for (const a of links) {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/') && href.split('/').length === 3) {
        const username = href.replace(/\//g, '');
        // Ignore common non-user links
        if (!['p', 'reel', 'explore', 'direct', 'stories', 'reels', 'about', 'help', 'press', 'api', 'jobs', 'privacy', 'terms', 'locations', 'directory', 'profiles'].includes(username)) {
          // Check if the link text matches the username or is inside a comment block
          const text = a.textContent?.trim();
          if (text === username || a.closest('ul') || a.closest('article') || a.closest('div[role="button"]')) {
            commenters.add(username);
          }
        }
      }
      if (commenters.size >= max) break;
    }
    
    return Array.from(commenters);
  }, maxCount);
}

async function simulateHumanBehavior(page: Page): Promise<void> {
  // Simulate some random scrolling and mouse movements
  await page.evaluate(async () => {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Scroll down a bit
    window.scrollBy({ top: randomInt(100, 400), behavior: 'smooth' });
    await sleep(randomInt(500, 1500));
    
    // Look for "View replies" buttons to expand nested comments
    // Instagram often uses text like "View replies (X)" or "View more replies" or "Load more comments"
    const expandButtons = Array.from(document.querySelectorAll('button, span, div[role="button"]')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('view replies') || 
             text.includes('view more replies') || 
             text.includes('load more comments') || 
             text.includes('view hidden replies') ||
             text.includes('see all comments') ||
             text.includes('view all comments');
    });
    
    // Click up to 10 expansion buttons per post
    for (const btn of expandButtons.slice(0, 10)) {
      try {
        (btn as HTMLElement).click();
        await sleep(randomInt(800, 1500));
      } catch (e) {}
    }
    
    // Look for SVG icons that might be "load more" buttons
    const loadMoreSvgs = Array.from(document.querySelectorAll('svg[aria-label="Load more comments"], svg[aria-label="View replies"]')).map(el => el.closest('button') || el.closest('[role="button"]'));
    for (const btn of loadMoreSvgs) {
      if (btn) {
        try {
          (btn as HTMLElement).click();
          await sleep(randomInt(1000, 2000));
        } catch (e) {}
      }
    }
    
    // Scroll up a bit
    window.scrollBy({ top: -randomInt(50, 200), behavior: 'smooth' });
    await sleep(randomInt(500, 1000));
  });
}

export async function runCommentersScrape() {
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

  const allCommenters = new Set<string>();

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

    const profileUrl = new URL(`/${cfg.targetAccount}/`, cfg.siteURL).href;
    console.log(`\n→ Going to profile: ${profileUrl}`);
    await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: cfg.gotoTimeoutMs,
    });
    
    await waitRandomMs(cfg.delays.afterNavigation);
    await closeLoginModalIfPresent(page, cfg.gotoTimeoutMs);
    await simulateHumanBehavior(page);

    // Get post links
    const postLinks = await getPostLinks(page);
    // Deduplicate
    let uniquePostLinks = Array.from(new Set(postLinks));
    
    // If we didn't find enough posts, try scrolling down to load more
    if (uniquePostLinks.length < cfg.maxPostsToCheck) {
      console.log(`Only found ${uniquePostLinks.length} posts initially, scrolling to load more...`);
      await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 2000));
        window.scrollBy(0, document.body.scrollHeight);
      });
      await waitRandomMs([2000, 4000]);
      const moreLinks = await getPostLinks(page);
      uniquePostLinks = Array.from(new Set([...uniquePostLinks, ...moreLinks]));
    }
    
    uniquePostLinks = uniquePostLinks.slice(0, cfg.maxPostsToCheck);
    console.log(`Found ${uniquePostLinks.length} posts to check.`);

    for (const postUrl of uniquePostLinks) {
      console.log(`\n→ Opening post: ${postUrl}`);
      await page.goto(postUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: cfg.gotoTimeoutMs,
      });
      
      await waitRandomMs(cfg.delays.afterPostOpen);
      await closeLoginModalIfPresent(page, cfg.gotoTimeoutMs);
      await simulateHumanBehavior(page);

      // Extract commenters
      const commenters = await extractCommenters(page, cfg.maxCommentersPerPost);
      console.log(`Extracted ${commenters.length} commenters from post.`);
      
      for (const c of commenters) {
        // Exclude the target account itself
        if (c.toLowerCase() !== cfg.targetAccount.toLowerCase()) {
          allCommenters.add(c);
        }
      }

      await waitRandomMs(cfg.delays.betweenPosts);
    }

    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    
    // Write as a simple text list
    const outputText = Array.from(allCommenters).join('\n');
    await writeFile(outPath, outputText + '\n', "utf8");
    
    console.log(`\n✅ Wrote ${allCommenters.size} unique commenters to ${outPath}`);
    
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runCommentersScrape().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
