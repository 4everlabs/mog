import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Stagehand, type AgentInstance } from "@browserbasehq/stagehand";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../../../../");

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
  navigationMethod: "agent" | "comments-link";
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

type HackerNewsPage = NonNullable<ReturnType<Stagehand["context"]["pages"]>[0]>;

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

function getAgentModelConfig(cfg: HackerNewsScrapeConfig) {
  return {
    modelName: cfg.model,
    apiKey: requireOpenRouterApiKey(),
    ...(cfg.apiBaseURL ? { baseURL: cfg.apiBaseURL } : {}),
  };
}

const HN_AGENT_IDENTITY_PROMPT = [
  "You are collecting practice data from Hacker News.",
  "Your only job is navigation inside news.ycombinator.com so the scraper can read page content afterward.",
].join(" ");

const HN_AGENT_BOUNDARIES_PROMPT = [
  "Stay on news.ycombinator.com unless a click briefly opens a story page before the comments page is reached.",
  "Prefer the comments link for the requested story instead of the story title link.",
  "Do not sign in, do not search, do not open unrelated stories, and do not keep exploring after the target comments page is visible.",
].join(" ");

const HN_AGENT_SUCCESS_PROMPT = [
  "Success means the browser is on the requested story's Hacker News comments page.",
  "Once there, stop immediately.",
  "If the exact story cannot be matched confidently, do nothing risky and report that clearly.",
].join(" ");

function buildHackerNewsAgentSystemPrompt(
  cfg: HackerNewsScrapeConfig,
): string {
  return (
    cfg.systemPrompt ??
    [
      HN_AGENT_IDENTITY_PROMPT,
      HN_AGENT_BOUNDARIES_PROMPT,
      HN_AGENT_SUCCESS_PROMPT,
    ].join("\n\n")
  );
}

function buildOpenCommentsInstruction(title: string): string {
  return [
    `Open the Hacker News comments page for the story titled "${title}".`,
    "Match the title exactly or as closely as possible on the current front page.",
    "Click the story's comments link, not the story title.",
    "Stop as soon as the comments page for that story is open and visible.",
  ].join(" ");
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
    model: getAgentModelConfig(cfg),
  });
}

function createHackerNewsAgent(
  stagehand: Stagehand,
  cfg: HackerNewsScrapeConfig,
): AgentInstance {
  return stagehand.agent({
    mode: "cua",
    model: getAgentModelConfig(cfg),
    systemPrompt: buildHackerNewsAgentSystemPrompt(cfg),
  });
}

function resolveHackerNewsOutputPath(cfg: HackerNewsScrapeConfig): string {
  return resolve(
    monorepoRoot,
    cfg.outputPath ?? "test-output/hacker-news-top-stories.json",
  );
}

function sanitizeAgentMessage(message: string): string {
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
  useAgent: boolean,
): Promise<{
  navigationMethod: "agent" | "comments-link";
  result: Awaited<ReturnType<AgentInstance["execute"]>>;
}> {
  if (!useAgent) {
    if (!story.commentsPageUrl) {
      return {
        navigationMethod: "comments-link",
        result: {
          success: false,
          completed: false,
          message: "Skipped agent because a prior agent call failed with the current endpoint.",
          actions: [],
        },
      };
    }

    await page.goto(story.commentsPageUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: 60_000,
    });

    return {
      navigationMethod: "comments-link",
      result: {
        success: false,
        completed: false,
        message: "Skipped agent because a prior agent call failed with the current endpoint.",
        actions: [],
      },
    };
  }

  const agent = createHackerNewsAgent(stagehand, cfg);
  const result = await agent.execute({
    instruction: buildOpenCommentsInstruction(story.title),
    maxSteps: cfg.maxAgentSteps ?? 8,
    page,
  });

  if (isHnCommentsPage(page.url())) {
    return { navigationMethod: "agent", result };
  }

  if (!story.commentsPageUrl) {
    return { navigationMethod: "agent", result };
  }

  await page.goto(story.commentsPageUrl, {
    waitUntil: "domcontentloaded",
    timeoutMs: 60_000,
  });

  return { navigationMethod: "comments-link", result };
}

async function readFrontPageStories(
  page: HackerNewsPage,
  storyLimit: number,
): Promise<HackerNewsFrontPageStory[]> {
  return await page.evaluate(
    ({ storyLimit }) => {
      const rows = Array.from(document.querySelectorAll("tr.athing")).slice(
        0,
        storyLimit,
      );

      return rows.map((row, index) => {
        const next = row.nextElementSibling as HTMLElement | null;
        const titleLink = row.querySelector(".titleline a") as HTMLAnchorElement | null;
        const scoreText = next?.querySelector(".score")?.textContent ?? null;
        const commentLink = Array.from(next?.querySelectorAll("a") ?? []).find((a) =>
          /comment|discuss/i.test(a.textContent ?? ""),
        ) as HTMLAnchorElement | undefined;

        const toAbsolute = (href: string | null | undefined): string | null => {
          if (!href) return null;
          return new URL(href, document.location.href).href;
        };

        const pointsMatch = scoreText?.match(/\d+/);
        const commentsMatch = (commentLink?.textContent ?? "").match(/\d+/);

        return {
          rank: index + 1,
          title: titleLink?.textContent?.trim() ?? `Story ${index + 1}`,
          storyUrl: toAbsolute(titleLink?.getAttribute("href")),
          commentsPageUrl: toAbsolute(commentLink?.getAttribute("href")),
          points: pointsMatch ? Number(pointsMatch[0]) : null,
          author: next?.querySelector(".hnuser")?.textContent?.trim() ?? null,
          age: next?.querySelector(".age")?.textContent?.trim() ?? null,
          commentCount: commentsMatch ? Number(commentsMatch[0]) : null,
        };
      });
    },
    { storyLimit },
  );
}

async function readCommentsFromPage(
  page: HackerNewsPage,
): Promise<HackerNewsComment[]> {
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
  useAgent: boolean,
): Promise<HackerNewsStoryResult> {
  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("No active page available after stagehand.init().");
  }

  await page.goto(cfg.siteURL ?? "https://news.ycombinator.com/", {
    waitUntil: "domcontentloaded",
    timeoutMs: 60_000,
  });

  const { navigationMethod, result } = await openStoryCommentsPage(
    cfg,
    stagehand,
    page,
    story,
    useAgent,
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
      message: sanitizeAgentMessage(result.message),
      actionCount: result.actions.length,
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
    const page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error("No active page available after stagehand.init().");
    }

    await page.goto(cfg.siteURL ?? "https://news.ycombinator.com/", {
      waitUntil: "domcontentloaded",
      timeoutMs: 60_000,
    });

    const topStories = await readFrontPageStories(page, cfg.storyLimit ?? 3);
    const stories: HackerNewsStoryResult[] = [];
    let useAgent = true;

    for (const story of topStories) {
      console.log(`Opening comments for #${story.rank}: ${story.title}`);
      const storyResult = await scrapeStoryComments(cfg, stagehand, story, useAgent);
      stories.push(storyResult);
      if (
        useAgent &&
        storyResult.navigationMethod === "comments-link" &&
        storyResult.agent.message.includes("HTML error response")
      ) {
        useAgent = false;
      }
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