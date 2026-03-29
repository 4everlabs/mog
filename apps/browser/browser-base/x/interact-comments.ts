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

type XInteractCommentsConfig = {
  env: "LOCAL";
  model: string;
  postURL: string;
  maxCommentsToProcess: number;
  maxScrollsWithoutNewComments: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: {
    afterNavigation: [number, number];
    afterAction: [number, number];
    afterScroll: [number, number];
  };
};

export type XInteractCommentsOutput = {
  actedAt: string;
  postURL: string;
  commentsProcessed: number;
  results: Array<{
    tweetUrl: string;
    authorUrl: string;
    commentLiked: boolean;
    profileFollowed: boolean;
    profileFirstTweetLiked: boolean;
  }>;
  error: string | null;
};

function readConfig(): XInteractCommentsConfig {
  return JSON.parse(
    readFileSync(resolve(here, "interact-comments.config.json"), "utf8"),
  ) as XInteractCommentsConfig;
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

async function gotoUrl(page: Page, url: string, timeout: number, delay: [number, number]) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeoutMs: timeout });
  await waitRandomMs(delay);
}

async function processNextComment(page: Page, postUrl: string, processedUrls: Set<string>) {
  return await page.evaluate(({ postUrl, processedUrlsArr }) => {
    const processed = new Set(processedUrlsArr);
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    
    for (const article of articles) {
      // Find the tweet URL (typically the timestamp link)
      const timeLink = article.querySelector('a[href*="/status/"]');
      if (!timeLink) continue;
      
      const tweetUrl = (timeLink as HTMLAnchorElement).href;
      
      // Check if it's the main post
      if (tweetUrl === postUrl || tweetUrl.split('?')[0] === postUrl.split('?')[0]) continue;
      
      if (processed.has(tweetUrl)) continue;
      
      // We found a comment!
      // Like it
      const likeBtn = article.querySelector('[data-testid="like"]');
      const unlikeBtn = article.querySelector('[data-testid="unlike"]');
      let liked = false;
      
      if (likeBtn) {
        (likeBtn as HTMLElement).click();
        liked = true;
      } else if (unlikeBtn) {
        liked = true; // Already liked
      }
      
      // Get author profile URL. The first link in an article is usually the avatar, leading to /username
      const authorLink = article.querySelector('a[role="link"][href^="/"]');
      let authorUrl = "";
      if (authorLink) {
        authorUrl = (authorLink as HTMLAnchorElement).href; // absolute URL
      }
      
      return {
        tweetUrl,
        authorUrl,
        liked
      };
    }
    
    // If no unprocessed comment found, scroll down
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    return null;
  }, { postUrl, processedUrlsArr: Array.from(processedUrls) });
}

async function processProfile(page: Page) {
  return await page.evaluate(() => {
    let followed = false;
    let likedFirstTweet = false;
    
    // 1. Click follow button
    const btns = Array.from(document.querySelectorAll('button[role="button"]'));
    const followBtn = btns.find(b => {
      const text = b.textContent?.trim();
      if (text === "Follow" || text === "Follow back") return true;
      const aria = b.getAttribute('aria-label') || "";
      if (aria.startsWith("Follow @")) return true;
      return false;
    });
    
    if (followBtn) {
      (followBtn as HTMLElement).click();
      followed = true;
    }
    
    // 2. Like first tweet
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    if (articles.length > 0) {
      const firstArticle = articles[0];
      const likeBtn = firstArticle.querySelector('[data-testid="like"]');
      if (likeBtn) {
        (likeBtn as HTMLElement).click();
        likedFirstTweet = true;
      } else if (firstArticle.querySelector('[data-testid="unlike"]')) {
        likedFirstTweet = true; // Already liked
      }
    }
    
    return { followed, likedFirstTweet };
  });
}

export async function runXInteractComments(): Promise<XInteractCommentsOutput> {
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

  const output: XInteractCommentsOutput = {
    actedAt: new Date().toISOString(),
    postURL: cfg.postURL,
    commentsProcessed: 0,
    results: [],
    error: null,
  };

  try {
    await stagehand.init();
    const ctx = stagehand.context;
    const page = ctx.activePage() ?? ctx.pages().at(-1);
    if (!page) throw new Error("No page after init");

    const sid = process.env.X_AUTH_TOKEN?.trim();
    if (!sid) {
      console.warn("No X_AUTH_TOKEN in .env — expect login modals / limited interaction. (X uses 'auth_token' cookie)");
    } else {
      await ctx.addCookies([
        {
          name: "auth_token",
          value: sid,
          domain: ".x.com",
          path: "/",
          httpOnly: true,
          secure: true,
        },
      ]);
    }

    console.log(`\n→ Loading post: ${cfg.postURL}`);
    await gotoUrl(page, cfg.postURL, cfg.gotoTimeoutMs, cfg.delays.afterNavigation);

    const processedUrls = new Set<string>();
    let scrollsWithoutNew = 0;
    
    while (output.commentsProcessed < cfg.maxCommentsToProcess && scrollsWithoutNew < cfg.maxScrollsWithoutNewComments) {
      const result = await processNextComment(page, cfg.postURL, processedUrls);
      
      if (result) {
        scrollsWithoutNew = 0;
        processedUrls.add(result.tweetUrl);
        output.commentsProcessed++;
        
        console.log(`\nFound Comment ${output.commentsProcessed}/${cfg.maxCommentsToProcess}`);
        console.log(`→ Tweet: ${result.tweetUrl}`);
        console.log(`→ Author: ${result.authorUrl || "Unknown"}`);
        
        let profileFollowed = false;
        let profileFirstTweetLiked = false;

        await waitRandomMs(cfg.delays.afterAction);

        if (result.authorUrl) {
          // Open profile in a new tab so we don't lose our scroll position on the main post
          const profilePage = await ctx.newPage();
          try {
            console.log(`  Navigating to profile...`);
            await gotoUrl(profilePage, result.authorUrl, cfg.gotoTimeoutMs, cfg.delays.afterNavigation);
            
            const pRes = await processProfile(profilePage);
            profileFollowed = pRes.followed;
            profileFirstTweetLiked = pRes.likedFirstTweet;
            
            if (profileFollowed) console.log(`  Followed user.`);
            if (profileFirstTweetLiked) console.log(`  Liked their first tweet.`);
            
            await waitRandomMs(cfg.delays.afterAction);
          } catch (e) {
            console.error(`  Failed processing profile: ${e}`);
          } finally {
            await profilePage.close();
          }
        }

        output.results.push({
          tweetUrl: result.tweetUrl,
          authorUrl: result.authorUrl,
          commentLiked: result.liked,
          profileFollowed,
          profileFirstTweetLiked
        });

      } else {
        scrollsWithoutNew++;
        console.log(`Scrolled down (No new comments found) [${scrollsWithoutNew}/${cfg.maxScrollsWithoutNewComments}]`);
        await waitRandomMs(cfg.delays.afterScroll);
      }
    }

    if (scrollsWithoutNew >= cfg.maxScrollsWithoutNewComments) {
      console.log(`\nStopped: Exceeded max scrolls without finding new comments (${cfg.maxScrollsWithoutNewComments})`);
    } else {
      console.log(`\nStopped: Achieved requested comments processed (${cfg.maxCommentsToProcess})`);
    }

    output.actedAt = new Date().toISOString();
    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`Wrote comment interaction results → ${outPath}`);
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
  runXInteractComments().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
