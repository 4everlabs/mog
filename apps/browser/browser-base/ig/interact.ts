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
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

type InstagramInteractConfig = {
  env: "LOCAL";
  model: string;
  siteURL: string;
  profilesFile?: string;
  accountsToInteract?: string[];
  maxProfilesToProcess: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: {
    afterNavigation: [number, number];
    afterStoryOpen: [number, number];
    betweenActions: [number, number];
    betweenProfiles: [number, number];
  };
};

type InstagramInteractProfileResult = {
  username: string;
  profileUrl: string;
  storyPresent: boolean;
  storyLiked: boolean;
  firstPostFound: boolean;
  firstPostLiked: boolean;
  followRequested: boolean;
  skippedReason: string | null;
  error: string | null;
};

export type InstagramInteractOutput = {
  actedAt: string;
  siteURL: string;
  model: string;
  profilesRequested: number;
  results: InstagramInteractProfileResult[];
};

function readInstagramInteractConfig(): InstagramInteractConfig {
  return JSON.parse(
    readFileSync(resolve(here, "interact.config.json"), "utf8"),
  ) as InstagramInteractConfig;
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

function isValidDelayRange([min, max]: [number, number]): boolean {
  return min >= 0 && max >= min;
}

function normalizeInstagramHandle(raw: string): string | null {
  const t = raw.trim().replace(/^@+/, "");
  return t && HANDLE.test(t) ? t : null;
}

function readHandlesFromFile(filePath: string): string[] {
  if (!existsSync(filePath)) {
    throw new Error(`Profiles file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8");
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const handle = normalizeInstagramHandle(line);
    if (!handle || line.trim().startsWith("#")) continue;
    if (!out.includes(handle)) out.push(handle);
  }
  return out;
}

function readHandlesFromConfig(cfg: InstagramInteractConfig): string[] {
  const inline = Array.isArray(cfg.accountsToInteract)
    ? cfg.accountsToInteract.map((value) => normalizeInstagramHandle(String(value))).filter(Boolean)
    : [];

  const fileHandles = cfg.profilesFile
    ? readHandlesFromFile(resolve(here, cfg.profilesFile))
    : [];

  const out: string[] = [];
  for (const handle of [...inline, ...fileHandles]) {
    if (handle && !out.includes(handle)) out.push(handle);
  }
  return out;
}

async function gotoProfile(
  page: Page,
  profileUrl: string,
  cfg: InstagramInteractConfig,
): Promise<void> {
  await page.goto(profileUrl, {
    waitUntil: "domcontentloaded",
    timeoutMs: cfg.gotoTimeoutMs,
  });
  await waitRandomMs(cfg.delays.afterNavigation);
}

async function domCheckIsPrivate(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.body.textContent?.includes("This Account is Private") ?? false;
  });
}

async function domClickStoryRing(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return false;
    
    // Canvas indicates an active story ring
    const canvas = header.querySelector("canvas");
    if (canvas) {
      const btn = canvas.closest("button, [role='button'], a, [tabindex='0']");
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
}

async function domClickFirstPost(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const links = Array.from(main.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    if (links.length > 0) {
      (links[0] as HTMLElement).click();
      return true;
    }
    return false;
  });
}

async function domClickFollowButton(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button, [role='button'], a"));
    const followBtn = btns.find((b) => {
      const t = b.textContent?.trim().toLowerCase();
      return t === "follow" || t === "follow back";
    });
    if (followBtn) {
      (followBtn as HTMLElement).click();
      return true;
    }
    return false;
  });
}

async function domLike(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll("svg[aria-label='Like'], svg[aria-label='Unlike']"));
    const isVisible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden';
    };
    
    const visibleSvgs = svgs.filter(isVisible);
    if (visibleSvgs.length === 0) return false;
    
    // The first visible heart is usually the main post/story action
    const targetSvg = visibleSvgs[0];
    if (!targetSvg) return false;
    const label = targetSvg.getAttribute("aria-label");
    
    if (label === "Like") {
      const clickable = targetSvg.closest("button, [role='button'], a") || targetSvg.parentElement;
      if (clickable) {
        (clickable as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
}

export async function runInstagramInteract(): Promise<InstagramInteractOutput> {
  const cfg = readInstagramInteractConfig();
  if (!Number.isInteger(cfg.maxProfilesToProcess) || cfg.maxProfilesToProcess < 1) {
    throw new Error("maxProfilesToProcess must be a positive integer");
  }

  const handles = readHandlesFromConfig(cfg).slice(0, cfg.maxProfilesToProcess);
  if (handles.length === 0) {
    throw new Error("No valid handles found in interact.config.json");
  }

  if (
    !isValidDelayRange(cfg.delays.afterNavigation) ||
    !isValidDelayRange(cfg.delays.afterStoryOpen) ||
    !isValidDelayRange(cfg.delays.betweenActions) ||
    !isValidDelayRange(cfg.delays.betweenProfiles)
  ) {
    throw new Error("All interact delay ranges must be [min,max] with 0 <= min <= max");
  }

  // We still use Stagehand for the robust browser session handling & stealth
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

  const results: InstagramInteractProfileResult[] = [];

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

    for (const username of handles) {
      const profileUrl = new URL(`/${username}/`, cfg.siteURL).href;
      const result: InstagramInteractProfileResult = {
        username,
        profileUrl,
        storyPresent: false,
        storyLiked: false,
        firstPostFound: false,
        firstPostLiked: false,
        followRequested: false,
        skippedReason: null,
        error: null,
      };

      try {
        console.log(`\n→ ${profileUrl}`);
        await gotoProfile(page, profileUrl, cfg);

        const isPrivate = await domCheckIsPrivate(page);
        
        // Handle Private accounts by following them
        if (isPrivate) {
          const followClicked = await domClickFollowButton(page);
          if (followClicked) {
            result.followRequested = true;
            await waitRandomMs(cfg.delays.betweenActions);
          }
          result.skippedReason = "private_or_hidden_profile";
          results.push(result);
          await waitRandomMs(cfg.delays.betweenProfiles);
          continue;
        }

        // Story Interaction
        const storyOpened = await domClickStoryRing(page);
        if (storyOpened) {
          await waitRandomMs(cfg.delays.afterStoryOpen);
          const currentUrl = page.url();
          if (currentUrl.includes("/stories/")) {
            result.storyPresent = true;
            result.storyLiked = await domLike(page);
            await waitRandomMs(cfg.delays.betweenActions);
            await gotoProfile(page, profileUrl, cfg); // Safe reset to profile page
          }
        }

        // Post Interaction
        const postOpened = await domClickFirstPost(page);
        if (postOpened) {
          result.firstPostFound = true;
          await waitRandomMs(cfg.delays.betweenActions);
          result.firstPostLiked = await domLike(page);
        } else if (!result.skippedReason) {
          result.skippedReason = "no_visible_posts";
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
      }

      results.push(result);
      await waitRandomMs(cfg.delays.betweenProfiles);
    }

    const output: InstagramInteractOutput = {
      actedAt: new Date().toISOString(),
      siteURL: cfg.siteURL,
      model: cfg.model,
      profilesRequested: handles.length,
      results,
    };

    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${results.length} interaction result(s) → ${outPath}`);
    return output;
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runInstagramInteract().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
