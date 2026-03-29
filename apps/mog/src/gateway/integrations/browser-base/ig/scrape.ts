import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../../../../../../");

for (const name of [".env", ".env.local"] as const) {
  const path = resolve(monorepoRoot, name);
  if (existsSync(path)) {
    loadDotenv({ path, override: name === ".env.local", quiet: true });
  }
}

type InstagramScrapeConfig = {
  env: "LOCAL";
  model: string;
  apiBaseURL: string;
  siteURL: string;
  accountsToScrape: string[];
  maxAgentSteps: number;
  gotoTimeoutMs: number;
  verbose: 0 | 1 | 2;
  outputPath: string;
  instagramSessionId?: string;
};

type InstagramFollowerProfile = {
  username: string;
  profileUrl: string;
  fullName: string | null;
  bio: string | null;
  isPrivate: boolean;
  followerCount: string | null;
  followingCount: string | null;
  email: string | null;
};

type InstagramScrapeOutput = {
  scrapedAt: string;
  siteURL: string;
  model: string;
  followers: InstagramFollowerProfile[];
};

function readInstagramScrapeConfig(): InstagramScrapeConfig {
  return JSON.parse(
    readFileSync(resolve(here, "scrape.config.json"), "utf8"),
  ) as InstagramScrapeConfig;
}

function requireOpenRouterApiKey(): string {
  const value = process.env.OPENROUTER_API_KEY?.trim();
  if (!value) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }
  return value;
}

function getAgentModelConfig(cfg: InstagramScrapeConfig) {
  return {
    modelName: cfg.model,
    apiKey: requireOpenRouterApiKey(),
    ...(cfg.apiBaseURL ? { baseURL: cfg.apiBaseURL } : {}),
  };
}

function createInstagramStagehand(cfg: InstagramScrapeConfig): Stagehand {
  return new Stagehand({
    env: cfg.env,
    experimental: true,
    verbose: cfg.verbose,
    selfHeal: true,
    serverCache: false,
    model: getAgentModelConfig(cfg),
  });
}

function resolveInstagramOutputPath(cfg: InstagramScrapeConfig): string {
  return resolve(monorepoRoot, cfg.outputPath);
}

export async function runInstagramScrape(): Promise<InstagramScrapeOutput> {
  const cfg = readInstagramScrapeConfig();
  const stagehand = createInstagramStagehand(cfg);

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];
    if (!page) {
      throw new Error("No active page available after stagehand.init().");
    }

    if (cfg.instagramSessionId) {
      console.log("Injecting Instagram session cookie...");
      await page.context().addCookies([
        {
          name: "sessionid",
          value: cfg.instagramSessionId,
          domain: ".instagram.com",
          path: "/",
          httpOnly: true,
          secure: true,
        },
      ]);
    }

    const followers: InstagramFollowerProfile[] = [];

    for (const accountUsername of cfg.accountsToScrape) {
      console.log(`\nNavigating to profile: ${accountUsername}...`);
      const profileUrl = new URL(`/${accountUsername}/`, cfg.siteURL).href;
      
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: cfg.gotoTimeoutMs,
      });

      // Close login modal if it pops up
      const loginModals = await stagehand.observe("Find the 'X' or 'Close' button on the 'Sign in' or 'Sign up' modal");
      if (loginModals.length > 0) {
        console.log("Found login modal, closing it...");
        await stagehand.act(loginModals[0]);
      }

      console.log(`Extracting profile information for ${accountUsername}...`);
      
      const profileData = await stagehand.extract(
        `Extract the profile information for the Instagram user. If the account is private, note it. Look for full name, bio, follower count, following count, and any email address mentioned in the bio.`,
        z.object({
          fullName: z.string().nullable().describe("The user's full name, usually displayed prominently on the profile. Null if not found."),
          bio: z.string().nullable().describe("The text description or biography of the user. Null if not found."),
          isPrivate: z.boolean().describe("True if the profile indicates it is private (e.g., 'This account is private'), false otherwise."),
          followerCount: z.string().nullable().describe("The number of followers the user has (e.g., '10K', '1.2M', '500'). Null if not found."),
          followingCount: z.string().nullable().describe("The number of accounts the user is following. Null if not found."),
          email: z.string().nullable().describe("Any email address found within the user's bio text. Null if no email is found.")
        })
      );

      console.log("Extracted data:", profileData);

      followers.push({
        username: accountUsername,
        profileUrl,
        ...profileData
      });
      
      // Random human-like delay between profile scrapes (e.g. 2 to 5 seconds)
      const delay = 2000 + Math.floor(Math.random() * 3000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const output: InstagramScrapeOutput = {
      scrapedAt: new Date().toISOString(),
      siteURL: cfg.siteURL,
      model: cfg.model,
      followers,
    };

    const outputPath = resolveInstagramOutputPath(cfg);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    console.log(`Wrote scrape output to: ${outputPath}`);

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
