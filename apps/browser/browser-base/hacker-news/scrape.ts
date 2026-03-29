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
  const path = resolve(monorepoRoot, name);
  if (existsSync(path)) {
    loadDotenv({ path, override: name === ".env.local", quiet: true });
  }
}

type HackerNewsScrapeConfig = {
  env?: "LOCAL";
  model: string;
  apiBaseURL?: string;
  siteURL?: string;
  storyLimit?: number;
  maxAgentSteps?: number;
  gotoTimeoutMs?: number;
  observeTimeoutMs?: number;
  extractTimeoutMs?: number;
  verbose?: 0 | 1 | 2;
  outputPath?: string;
  systemPrompt?: string;
};

type HackerNewsFrontPageStory = {
  rank: number;
  title: string;
  storyUrl: string | null;
  commentsPageUrl: string | null;
  points: number | null;
  author: string | null;
  age: string | null;
  commentCount: number | null;
};

type HackerNewsComment = {
  id: string;
  user: string | null;
  age: string | null;
  text: string;
  depth: number;
  email: string | null;
};

type HackerNewsCommenterProfile = {
  user: string;
  profileUrl: string;
  email: string | null;
};

type HackerNewsStoryResult = HackerNewsFrontPageStory & {
  resolvedCommentsPageUrl: string;
  // Retained for compatibility with existing output consumers.
  navigationMethod: "agent" | "comments-link";
  // Retained for compatibility with existing output consumers.
  agent: {
    success: boolean;
    completed: boolean;
    message: string;
    actionCount: number;
  };
  comments: HackerNewsComment[];
  commenters: string[];
  commenterProfiles: HackerNewsCommenterProfile[];
};

type HackerNewsScrapeOutput = {
  scrapedAt: string;
  siteURL: string;
  storyLimit: number;
  model: string;
  stories: HackerNewsStoryResult[];
};

type HackerNewsPage = Page;

const hackerNewsFrontPageStorySchema = z.object({
  rank: z.number().int().positive().describe("Displayed Hacker News rank for the story."),
  title: z.string().min(1).describe("Exact visible story title text."),
  storyUrl: z
    .string()
    .nullable()
    .describe("Absolute URL of the story title link. Null if unavailable."),
  commentsPageUrl: z
    .string()
    .nullable()
    .describe("Absolute Hacker News comments/discuss URL for this story. Null if unavailable."),
  points: z.number().int().nullable().describe("Visible points count as an integer, or null."),
  author: z.string().nullable().describe("Hacker News username, or null if unavailable."),
  age: z.string().nullable().describe("Visible age text such as '2 hours ago', or null."),
  commentCount: z
    .number()
    .int()
    .nullable()
    .describe("Visible comment count as an integer, or null when the page only shows 'discuss'."),
});

const hackerNewsFrontPageStoriesSchema = z.object({
  stories: z
    .array(hackerNewsFrontPageStorySchema)
    .describe("Top Hacker News stories in visible top-to-bottom order."),
});

function readHackerNewsScrapeConfig(): HackerNewsScrapeConfig {
  const raw = JSON.parse(
    readFileSync(resolve(here, "scrape.config.json"), "utf8"),
  ) as HackerNewsScrapeConfig;

  return {
    env: "LOCAL",
    apiBaseURL: "https://openrouter.ai/api/v1",
    siteURL: "https://news.ycombinator.com/",
    storyLimit: 3,
    maxAgentSteps: 8,
    gotoTimeoutMs: 60_000,
    observeTimeoutMs: 25_000,
    extractTimeoutMs: 45_000,
    verbose: 1,
    outputPath: "test-output/hacker-news-top-stories.json",
    ...raw,
  };
}

function requireOpenRouterApiKey(): string {
  const value = process.env.OPENROUTER_API_KEY?.trim();
  if (!value) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }
  return value;
}

function getStagehandModelConfig(cfg: HackerNewsScrapeConfig) {
  return {
    modelName: cfg.model,
    apiKey: requireOpenRouterApiKey(),
    ...(cfg.apiBaseURL ? { baseURL: cfg.apiBaseURL } : {}),
  };
}

function createHackerNewsStagehand(
  cfg: HackerNewsScrapeConfig,
): Stagehand {
  return new Stagehand({
    env: cfg.env ?? "LOCAL",
    experimental: true,
    verbose: cfg.verbose ?? 1,
    selfHeal: true,
    serverCache: false,
    model: getStagehandModelConfig(cfg),
  });
}

function resolveHackerNewsOutputPath(cfg: HackerNewsScrapeConfig): string {
  return resolve(
    monorepoRoot,
    cfg.outputPath ?? "test-output/hacker-news-top-stories.json",
  );
}

function sanitizeStagehandMessage(message: string): string {
  if (!message) return "";
  if (message.includes("<!DOCTYPE html>")) {
    return "Agent call failed with an HTML error response from the model endpoint.";
  }
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function isHnCommentsPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "news.ycombinator.com" && parsed.pathname === "/item";
  } catch {
    return false;
  }
}

function normalizePotentialEmailText(text: string): string {
  return text
    .replace(/\[-at-\]|\(-at-\)|\{-at-\}/gi, "@")
    .replace(/\[-dot-\]|\(-dot-\)|\{-dot-\}/gi, ".")
    .replace(/\(\s*at\s*\)|\[\s*at\s*\]|\{\s*at\s*\}/gi, "@")
    .replace(/\(\s*dot\s*\)|\[\s*dot\s*\]|\{\s*dot\s*\}/gi, ".")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s+/g, " ");
}

function extractEmailFromText(text: string): string | null {
  const normalized = normalizePotentialEmailText(text);
  const match = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function getActivePage(stagehand: Stagehand): HackerNewsPage | null {
  return stagehand.context.activePage() ?? stagehand.context.pages().at(-1) ?? null;
}

function toAbsoluteUrlOrNull(
  href: string | null | undefined,
  baseUrl: string,
): string | null {
  const value = href?.trim();
  if (!value) return null;

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

async function actFirstObserved(
  stagehand: Stagehand,
  page: HackerNewsPage,
  candidates: Action[],
  label: string,
  timeout: number,
): Promise<{
  success: boolean;
  completed: boolean;
  message: string;
  actionCount: number;
}> {
  const action = candidates.find((candidate) => candidate.method === "click") ?? candidates[0];
  if (!action) {
    return {
      success: false,
      completed: false,
      message: `observe: no action for ${label}`,
      actionCount: 0,
    };
  }

  const result = await stagehand.act(action, { page, timeout });

  return {
    success: result.success,
    completed: result.success,
    message: sanitizeStagehandMessage(result.message || result.actionDescription || label),
    actionCount: result.actions.length,
  };
}

function buildFindCommentsLinkInstruction(title: string): string {
  return [
    `Find the Hacker News comments or discuss link for the story titled "${title}".`,
    "Match the title as closely as possible on the current front page.",
    "Return the comments link action only, not the story title link.",
  ].join(" ");
}

async function fetchCommenterProfiles(
  usernames: string[],
): Promise<Record<string, HackerNewsCommenterProfile>> {
  const uniqueUsers = Array.from(new Set(usernames.filter(Boolean)));
  const profiles = new Map<string, HackerNewsCommenterProfile>();
  const batchSize = 12;

  for (let i = 0; i < uniqueUsers.length; i += batchSize) {
    const batch = uniqueUsers.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (user) => {
        const profileUrl = `https://news.ycombinator.com/user?id=${encodeURIComponent(user)}`;

        try {
          const response = await fetch(profileUrl);
          const html = await response.text();
          const mailtoMatch = html.match(/mailto:([^"'>\s]+)/i);
          const stripped = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&#64;|&commat;/gi, "@")
            .replace(/&period;/gi, ".")
            .replace(/\s+/g, " ")
            .trim();

          return {
            user,
            profileUrl,
            email: mailtoMatch
              ? decodeURIComponent(mailtoMatch[1] ?? "")
              : extractEmailFromText(stripped),
          };
        } catch {
          return {
            user,
            profileUrl,
            email: null,
          };
        }
      }),
    );

    for (const profile of results) {
      profiles.set(profile.user, profile);
    }
  }

  return Object.fromEntries(profiles);
}

async function openStoryCommentsPage(
  cfg: HackerNewsScrapeConfig,
  stagehand: Stagehand,
  page: HackerNewsPage,
  story: HackerNewsFrontPageStory,
): Promise<{
  navigationMethod: "agent" | "comments-link";
  result: {
    success: boolean;
    completed: boolean;
    message: string;
    actionCount: number;
  };
}> {
  const observed = await stagehand.observe(buildFindCommentsLinkInstruction(story.title), {
    page,
    timeout: cfg.observeTimeoutMs ?? 25_000,
  });
  const result = await actFirstObserved(
    stagehand,
    page,
    observed,
    `open comments for "${story.title}"`,
    cfg.observeTimeoutMs ?? 25_000,
  );

  await page.waitForLoadState("domcontentloaded");

  if (isHnCommentsPage(page.url())) {
    return { navigationMethod: "agent", result };
  }

  if (!story.commentsPageUrl) {
    return { navigationMethod: "agent", result };
  }

  await page.goto(story.commentsPageUrl, {
    waitUntil: "domcontentloaded",
    timeoutMs: cfg.gotoTimeoutMs ?? 60_000,
  });

  return {
    navigationMethod: "comments-link",
    result: {
      ...result,
      completed: isHnCommentsPage(page.url()),
      message:
        result.message ||
        "Fell back to the extracted comments URL after observe/act did not land on the comments page.",
    },
  };
}

async function readFrontPageStories(
  stagehand: Stagehand,
  page: HackerNewsPage,
  cfg: HackerNewsScrapeConfig,
  storyLimit: number,
): Promise<HackerNewsFrontPageStory[]> {
  const extracted = await stagehand.extract(
    [
      `Extract the first ${storyLimit} visible stories from the Hacker News front page in top-to-bottom order.`,
      "For each story include the displayed rank, exact title text, absolute story URL, absolute Hacker News comments/discuss URL, visible points, author username, age text, and visible comment count.",
      "If the comments link only says 'discuss', set commentCount to null.",
      `Return only the first ${storyLimit} stories.`,
    ].join(" "),
    hackerNewsFrontPageStoriesSchema,
    {
      page,
      timeout: cfg.extractTimeoutMs ?? 45_000,
    },
  );

  const baseUrl = cfg.siteURL ?? "https://news.ycombinator.com/";

  return extracted.stories.slice(0, storyLimit).map((story, index) => ({
    rank: story.rank || index + 1,
    title: story.title.trim() || `Story ${index + 1}`,
    storyUrl: toAbsoluteUrlOrNull(story.storyUrl, baseUrl),
    commentsPageUrl: toAbsoluteUrlOrNull(story.commentsPageUrl, baseUrl),
    points: story.points,
    author: story.author?.trim() || null,
    age: story.age?.trim() || null,
    commentCount: story.commentCount,
  }));
}

async function readCommentsFromPage(
  page: HackerNewsPage,
): Promise<HackerNewsComment[]> {
  // Keep the bulk comment read deterministic and cheap; Stagehand is used for
  // page discovery/navigation above, while the DOM parser preserves every row.
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll("tr.athing.comtr")).map((row) => {
      const depthWidth = Number(
        row.querySelector(".ind img")?.getAttribute("width") ?? "0",
      );
      const commText = row.querySelector(".commtext");

      return {
        id: row.getAttribute("id") ?? "",
        user: row.querySelector(".hnuser")?.textContent?.trim() ?? null,
        age: row.querySelector(".age")?.textContent?.trim() ?? null,
        text: commText?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        depth: Number.isFinite(depthWidth) ? Math.floor(depthWidth / 40) : 0,
        email: null,
      };
    });
  });
}

async function scrapeStoryComments(
  cfg: HackerNewsScrapeConfig,
  stagehand: Stagehand,
  story: HackerNewsFrontPageStory,
): Promise<HackerNewsStoryResult> {
  const page = getActivePage(stagehand);
  if (!page) {
    throw new Error("No active page available after stagehand.init().");
  }

  await page.goto(cfg.siteURL ?? "https://news.ycombinator.com/", {
    waitUntil: "domcontentloaded",
    timeoutMs: cfg.gotoTimeoutMs ?? 60_000,
  });

  const { navigationMethod, result } = await openStoryCommentsPage(
    cfg,
    stagehand,
    page,
    story,
  );

  const resolvedCommentsPageUrl = page.url();
  const rawComments = await readCommentsFromPage(page);
  const commenters = Array.from(
    new Set(rawComments.map((comment) => comment.user).filter(Boolean)),
  ) as string[];
  const commenterProfileMap = await fetchCommenterProfiles(commenters);
  const commenterProfiles = commenters.map(
    (user) =>
      commenterProfileMap[user] ?? {
        user,
        profileUrl: `https://news.ycombinator.com/user?id=${encodeURIComponent(user)}`,
        email: null,
      },
  );
  const comments = rawComments.map((comment) => ({
    ...comment,
    email: comment.user ? commenterProfileMap[comment.user]?.email ?? null : null,
  }));

  return {
    ...story,
    resolvedCommentsPageUrl,
    navigationMethod,
    agent: {
      success: result.success,
      completed: result.completed,
      message: sanitizeStagehandMessage(result.message),
      actionCount: result.actionCount,
    },
    comments,
    commenters,
    commenterProfiles,
  };
}

export async function runHackerNewsScrape(): Promise<HackerNewsScrapeOutput> {
  const cfg = readHackerNewsScrapeConfig();
  const stagehand = createHackerNewsStagehand(cfg);

  try {
    await stagehand.init();
    const page = getActivePage(stagehand);
    if (!page) {
      throw new Error("No active page available after stagehand.init().");
    }

    await page.goto(cfg.siteURL ?? "https://news.ycombinator.com/", {
      waitUntil: "domcontentloaded",
      timeoutMs: cfg.gotoTimeoutMs ?? 60_000,
    });

    const topStories = await readFrontPageStories(
      stagehand,
      page,
      cfg,
      cfg.storyLimit ?? 3,
    );
    const stories: HackerNewsStoryResult[] = [];

    for (const story of topStories) {
      console.log(`Opening comments for #${story.rank}: ${story.title}`);
      stories.push(await scrapeStoryComments(cfg, stagehand, story));
    }

    const output: HackerNewsScrapeOutput = {
      scrapedAt: new Date().toISOString(),
      siteURL: cfg.siteURL ?? "https://news.ycombinator.com/",
      storyLimit: cfg.storyLimit ?? 3,
      model: cfg.model,
      stories,
    };

    const outputPath = resolveHackerNewsOutputPath(cfg);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(output, null, 2));
    console.log(`Wrote: ${outputPath}`);

    return output;
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runHackerNewsScrape().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}