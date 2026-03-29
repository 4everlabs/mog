import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Stagehand, type Action, type Page } from "@browserbasehq/stagehand";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../");

for (const name of [".env", ".env.local"] as const) {
  const p = resolve(monorepoRoot, name);
  if (existsSync(p)) loadDotenv({ path: p, override: name === ".env.local", quiet: true });
}

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const POST_DIALOG = 'div[role="dialog"]';

const profileStateSchema = z.object({
  hasActiveStory: z
    .boolean()
    .describe(
      "True only if the profile avatar/header currently shows an active Instagram story ring and tapping it should open a story.",
    ),
  hasTopLeftGridPost: z
    .boolean()
    .describe("True only if the profile grid is visible and the top-left tile can be opened as a post/reel."),
  isPrivate: z.boolean().describe("True if the account is private or its posts grid is hidden."),
  followButtonState: z
    .enum(["Follow", "Following", "Requested", "Unknown"])
    .describe("The text on the main follow button (e.g. 'Follow', 'Following', 'Requested', or 'Unknown' if not found)."),
});

const likeStateSchema = z.object({
  isAlreadyLiked: z
    .boolean()
    .describe(
      "True only if the visible main Instagram heart button is already active and clicking it would unlike the current story/post.",
    ),
});

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

type LikeSurface = "story" | "post";
type LikeProbeResult = {
  state: "like" | "unlike" | "not_found";
  clicked: boolean;
};

function readInstagramInteractConfig(): InstagramInteractConfig {
  return JSON.parse(
    readFileSync(resolve(here, "interact-post.config copy.json"), "utf8"),
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

async function actFirstObserved(
  stagehand: Stagehand,
  page: Page,
  candidates: Action[],
  label: string,
): Promise<boolean> {
  const action = candidates[0];
  if (!action) return false;
  const result = await stagehand.act(action, { page });
  if (!result.success) {
    throw new Error(`act failed (${label}): ${result.message || result.actionDescription}`);
  }
  return true;
}

async function safeObserve(
  stagehand: Stagehand,
  instruction: string,
  options: { page: Page; timeout: number; selector?: string },
): Promise<Action[]> {
  try {
    return await stagehand.observe(instruction, options);
  } catch (error) {
    console.warn(`observe failed: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function closeLoginModalIfPresent(stagehand: Stagehand, page: Page, timeout: number): Promise<void> {
  const login = await safeObserve(
    stagehand,
    "Close button (X) on Instagram sign-in or sign-up modal overlay, top-right of that dialog only.",
    { page, timeout },
  );
  if (login[0]) await actFirstObserved(stagehand, page, login, "close login modal");
}

async function gotoProfile(
  stagehand: Stagehand,
  page: Page,
  profileUrl: string,
  cfg: InstagramInteractConfig,
): Promise<void> {
  await page.goto(profileUrl, {
    waitUntil: "domcontentloaded",
    timeoutMs: cfg.gotoTimeoutMs,
  });
  await closeLoginModalIfPresent(stagehand, page, cfg.gotoTimeoutMs);
  await waitRandomMs(cfg.delays.afterNavigation);
}

async function domClickStoryRing(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return false;
    
    // Canvas typically indicates an active story ring on desktop
    const canvas = header.querySelector("canvas");
    if (canvas) {
      const btn = canvas.closest("button, [role='button'], a, [tabindex='0']");
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    
    // Fallback: just click the avatar image wrapper
    const img = header.querySelector("img");
    if (img) {
      const btn = img.closest("button, [role='button'], a, [tabindex='0']");
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
    const links = Array.from(main.querySelectorAll('a')).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('/p/') || href.includes('/reel/');
    });
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

async function extractProfileState(
  stagehand: Stagehand,
  page: Page,
  username: string,
  timeout: number,
): Promise<z.infer<typeof profileStateSchema>> {
  try {
    return await stagehand.extract(
      `Instagram profile page for @${username}. Determine only these UI facts: whether the avatar currently has an active story ring, whether the top-left post tile is available in the main grid, whether the account is private, and the text on the follow button.`,
      profileStateSchema,
      { page, timeout },
    );
  } catch (error) {
    console.warn(`profile extract failed for ${username}: ${error instanceof Error ? error.message : String(error)}`);
    return {
      hasActiveStory: false,
      hasTopLeftGridPost: false,
      isPrivate: false,
      followButtonState: "Unknown",
    };
  }
}

async function clickMainLikeButtonByDom(
  page: Page,
  surface: LikeSurface,
  scopeSelector?: string,
): Promise<LikeProbeResult> {
  return await page.evaluate(
    ({ surface, scopeSelector }) => {
      const root = (scopeSelector ? document.querySelector(scopeSelector) : null) ?? document;
      if (!root) return { state: "not_found", clicked: false } as LikeProbeResult;

      const normalize = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();
      const isVisible = (element: Element): element is HTMLElement => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const matches = Array.from(root.querySelectorAll("button, [role='button']"))
        .filter(isVisible)
        .map((button) => {
          const labels = [
            button.getAttribute("aria-label"),
            button.getAttribute("title"),
            button.textContent,
            button.querySelector("svg")?.getAttribute("aria-label"),
            button.querySelector("svg title")?.textContent,
            button.querySelector("title")?.textContent,
          ]
            .map(normalize)
            .filter(Boolean);

          const kind = labels.some((label) => label.includes("unlike"))
            ? "unlike"
            : labels.some(
                (label) =>
                  label === "like" ||
                  label.startsWith("like ") ||
                  label.endsWith(" like") ||
                  label.includes(" like "),
              )
              ? "like"
              : null;

          if (!kind) return null;
          const rect = button.getBoundingClientRect();
          const score = surface === "story" ? rect.y * 2 + rect.x : rect.y * 2 - rect.x;
          return { button, kind, score };
        })
        .filter((candidate): candidate is { button: HTMLElement; kind: "like" | "unlike"; score: number } => !!candidate)
        .sort((a, b) => b.score - a.score);

      const candidate = matches[0];
      if (!candidate) return { state: "not_found", clicked: false } as LikeProbeResult;
      if (candidate.kind === "like") {
        candidate.button.click();
        return { state: "like", clicked: true } as LikeProbeResult;
      }
      return { state: "unlike", clicked: false } as LikeProbeResult;
    },
    { surface, scopeSelector },
  );
}

async function extractAlreadyLiked(
  stagehand: Stagehand,
  page: Page,
  prompt: string,
  timeout: number,
  selector?: string,
): Promise<boolean | null> {
  try {
    const result = await stagehand.extract(prompt, likeStateSchema, {
      page,
      timeout,
      selector,
    });
    return result.isAlreadyLiked;
  } catch (error) {
    console.warn(`like-state extract failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function likeStoryIfNeeded(
  stagehand: Stagehand,
  page: Page,
  username: string,
  timeout: number,
): Promise<boolean> {
  const domProbe = await clickMainLikeButtonByDom(page, "story");
  if (domProbe.clicked) return true;
  if (domProbe.state === "unlike") return false;

  const alreadyLiked = await extractAlreadyLiked(
    stagehand,
    page,
    `Instagram story viewer for @${username}. Determine whether the main story heart button at the bottom-right is already liked. True only if clicking it would unlike the story.`,
    timeout,
  );
  if (alreadyLiked === true) return false;

  const actions = await safeObserve(
    stagehand,
    `Instagram story is open for @${username}. Find the main heart button at the bottom-right of the story overlay and return it only if clicking it will like the current story. Do not return reply, close, pause, audio, or next-story controls.`,
    { page, timeout },
  );
  return await actFirstObserved(stagehand, page, actions, "like story");
}

async function likeOpenPostIfNeeded(
  stagehand: Stagehand,
  page: Page,
  username: string,
  timeout: number,
): Promise<boolean> {
  const domProbe = await clickMainLikeButtonByDom(page, "post", POST_DIALOG);
  if (domProbe.clicked) return true;
  if (domProbe.state === "unlike") return false;

  const alreadyLiked = await extractAlreadyLiked(
    stagehand,
    page,
    `Instagram post viewer dialog for @${username}. Determine whether the main post heart button beside the comment and share icons is already liked. True only if clicking it would unlike the open post.`,
    timeout,
    POST_DIALOG,
  );
  if (alreadyLiked === true) return false;

  const actions = await safeObserve(
    stagehand,
    `Instagram post viewer dialog is open for @${username}. Find the main post heart button beside the comment and share icons near the lower part of the dialog, and return it only if clicking it will like the post. Do not return comment-like hearts inside replies.`,
    { page, selector: POST_DIALOG, timeout },
  );
  return await actFirstObserved(stagehand, page, actions, "like first post");
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
  const tExtract = Math.min(Math.max(cfg.gotoTimeoutMs, 30_000), 180_000);

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
        await gotoProfile(stagehand, page, profileUrl, cfg);

        const profileState = await extractProfileState(stagehand, page, username, tExtract);
        
        // Handle Private accounts by following them
        if (profileState.isPrivate) {
          if (profileState.followButtonState === "Follow" || profileState.followButtonState === "Unknown") {
            const followClicked = await domClickFollowButton(page);
            if (followClicked) {
              result.followRequested = true;
              await waitRandomMs(cfg.delays.betweenActions);
            }
          }
          result.skippedReason = "private_or_hidden_profile";
          results.push(result);
          await waitRandomMs(cfg.delays.betweenProfiles);
          continue;
        }

        // Post Interaction (like their first post)
        const postOpened = await domClickFirstPost(page);
        if (postOpened) {
          result.firstPostFound = true;
          await waitRandomMs(cfg.delays.betweenActions);
          result.firstPostLiked = await likeOpenPostIfNeeded(stagehand, page, username, tExtract);
          await waitRandomMs(cfg.delays.betweenActions);
          
          // Go back to profile to follow them
          await gotoProfile(stagehand, page, profileUrl, cfg);
        } else if (!result.skippedReason) {
          result.skippedReason = "no_visible_posts";
        }

        // Follow them if public
        if (profileState.followButtonState === "Follow" || profileState.followButtonState === "Unknown") {
          const followClicked = await domClickFollowButton(page);
          if (followClicked) {
            result.followRequested = true;
            await waitRandomMs(cfg.delays.betweenActions);
          }
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
