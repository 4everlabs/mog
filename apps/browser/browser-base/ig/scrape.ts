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

const profileExtractSchema = z.object({
  screenName: z
    .string()
    .nullable()
    .describe("@handle shown in the profile header (no @ prefix). Null if unclear."),
  fullName: z
    .string()
    .nullable()
    .describe("Display name under the avatar. Null if not shown."),
  bio: z
    .string()
    .nullable()
    .describe("Full biography / description text. Null if empty or private."),
  email: z
    .string()
    .nullable()
    .describe("Any email visible in bio or contact area. Null if none."),
  phone: z
    .string()
    .nullable()
    .describe("Phone number if visible in bio, contact, or action buttons. Null if none."),
  bioLink: z
    .string()
    .nullable()
    .describe("External website / link field URL as shown. Null if none."),
  location: z
    .string()
    .nullable()
    .describe("Location line if shown (city, region, business address). Null if none."),
  followerCount: z.string().nullable().describe("Followers count text, e.g. 1.2K. Null if hidden/private."),
  followingCount: z.string().nullable().describe("Following count text. Null if hidden/private."),
  postsCount: z.string().nullable().describe("Posts count text if visible. Null if not."),
  isPrivate: z.boolean().describe("True if this account is private or content is blocked."),
  businessCategory: z
    .string()
    .nullable()
    .describe("Business or creator category label if Instagram shows one. Null if none."),
});

type InstagramScrapeConfig = {
  env: "LOCAL";
  model: string;
  siteURL: string;
  /** File next to this script listing one handle per line (empty lines and # comments ok) */
  followersFile: string;
  /** Number of profiles to skip from the top of the file */
  offset?: number;
  /** Cap how many lines from the file to scrape (e.g. 5 for a test run) */
  maxProfilesToScrape: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  delays: { betweenProfiles: [number, number] };
};

export type InstagramFollowerProfile = {
  username: string;
  profileUrl: string;
  screenName: string | null;
  fullName: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  bioLink: string | null;
  location: string | null;
  followerCount: string | null;
  followingCount: string | null;
  postsCount: string | null;
  isPrivate: boolean;
  businessCategory: string | null;
};

export type InstagramScrapeOutput = {
  scrapedAt: string;
  siteURL: string;
  model: string;
  followersFile: string;
  profilesRequested: number;
  followers: InstagramFollowerProfile[];
};

function readInstagramScrapeConfig(): InstagramScrapeConfig {
  return JSON.parse(
    readFileSync(resolve(here, "scrape.config.json"), "utf8"),
  ) as InstagramScrapeConfig;
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

function readFollowersFromFile(filePath: string): string[] {
  if (!existsSync(filePath)) {
    throw new Error(`Followers file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8");
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim().replace(/^@+/, "");
    if (!t || t.startsWith("#")) continue;
    if (!HANDLE.test(t)) {
      console.warn(`Skipping invalid handle line: ${line.slice(0, 80)}`);
      continue;
    }
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

async function actFirstObserved(
  stagehand: Stagehand,
  page: Page,
  candidates: Action[],
  label: string,
): Promise<void> {
  const action = candidates[0];
  if (!action) return;
  const result = await stagehand.act(action, { page });
  if (!result.success) {
    throw new Error(`act failed (${label}): ${result.message || result.actionDescription}`);
  }
}

export async function runInstagramScrape(): Promise<InstagramScrapeOutput> {
  const cfg = readInstagramScrapeConfig();
  if (!Number.isInteger(cfg.maxProfilesToScrape) || cfg.maxProfilesToScrape < 1) {
    throw new Error("maxProfilesToScrape must be a positive integer");
  }
  const [d0, d1] = cfg.delays.betweenProfiles;
  if (d0 < 0 || d1 < d0) {
    throw new Error("delays.betweenProfiles must be [min,max] with 0 <= min <= max");
  }

  const followersPath = resolve(here, cfg.followersFile);
  const allHandles = readFollowersFromFile(followersPath);
  const offset = cfg.offset || 0;
  const handles = allHandles.slice(offset, offset + cfg.maxProfilesToScrape);
  if (handles.length === 0) {
    throw new Error(`No valid handles in ${followersPath} (after offset ${offset})`);
  }
  console.log(`Scraping ${handles.length} profile(s) from ${cfg.followersFile} (offset ${offset}, cap ${cfg.maxProfilesToScrape})`);

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

  const tExtract = Math.min(Math.max(cfg.gotoTimeoutMs, 30_000), 180_000);
  const followers: InstagramFollowerProfile[] = [];

  try {
    await stagehand.init();
    const ctx = stagehand.context;
    const page = ctx.activePage() ?? ctx.pages().at(-1);
    if (!page) throw new Error("No page after init");

    const sid = readInstagramSessionIdFromEnv();
    if (!sid) {
      console.warn("Missing INSTAGRAM_SESSION_ID — expect login modals or limited data.");
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
      console.log(`\n→ ${profileUrl}`);
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: cfg.gotoTimeoutMs,
      });

      try {
        const login = await stagehand.observe(
          "Close button (X) on Instagram sign-in or sign-up modal, top-right of that overlay only.",
          { page, timeout: cfg.gotoTimeoutMs },
        );
        await actFirstObserved(stagehand, page, login, "close login modal");

        let data: z.infer<typeof profileExtractSchema>;
        try {
          data = await stagehand.extract(
            `Extract everything visible on this Instagram profile page for @${username}: name, bio, link, counts, contact hints, location, category. If the account is private, set isPrivate true and leave unavailable fields null.`,
            profileExtractSchema,
            { page, timeout: tExtract },
          );
        } catch (e) {
          console.error(`extract failed for ${username}:`, e instanceof Error ? e.message : e);
          data = {
            screenName: null,
            fullName: null,
            bio: null,
            email: null,
            phone: null,
            bioLink: null,
            location: null,
            followerCount: null,
            followingCount: null,
            postsCount: null,
            isPrivate: false,
            businessCategory: null,
          };
        }

        followers.push({
          username,
          profileUrl,
          screenName: data.screenName,
          fullName: data.fullName,
          bio: data.bio,
          email: data.email,
          phone: data.phone,
          bioLink: data.bioLink,
          location: data.location,
          followerCount: data.followerCount,
          followingCount: data.followingCount,
          postsCount: data.postsCount,
          isPrivate: data.isPrivate,
          businessCategory: data.businessCategory,
        });

      } catch (err) {
        console.error(`\nFatal error during processing of ${username}:`, err instanceof Error ? err.message : err);
        console.log("Stopping scrape early to save progress...");
        break; // Break the loop and proceed to save what we have
      }

      await waitRandomMs(cfg.delays.betweenProfiles);
    }

    const output: InstagramScrapeOutput = {
      scrapedAt: new Date().toISOString(),
      siteURL: cfg.siteURL,
      model: cfg.model,
      followersFile: cfg.followersFile,
      profilesRequested: handles.length,
      followers,
    };

    const outPath = resolve(monorepoRoot, cfg.outputPath);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${followers.length} profile(s) → ${outPath}`);
    return output;
  } finally {
    await stagehand.close();
  }
}

if (import.meta.main) {
  runInstagramScrape().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
