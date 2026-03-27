/**
 * Educational / research runner: Instagram followers modal → structured extract loop.
 * Uses Stagehand v3 on Browserbase. Comply with Instagram’s Terms and applicable law.
 *
 * Env: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, OPENAI_API_KEY
 * Optional: TARGET_IG_USERNAME (or IG_TARGET), IG_MAX_FOLLOWERS,
 *   IG_SKIP_LOGIN=1 — no credential or manual login; go straight to the profile (anonymous session).
 *   INSTAGRAM_USER + INSTAGRAM_PASS — scripted login
 *   IG_MANUAL_LOGIN_MS — wait for manual login in live view (ignored if IG_SKIP_LOGIN)
 *   IG_OUTPUT_DIR — if set, writes JSON results under that directory
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createStagehand, getActivePage } from "./stagehand-factory.js";
import { FollowerListExtractSchema } from "./types.js";

export type FollowersResearchResult = {
  targetAccount: string;
  collectedAt: string;
  followerCount: number;
  followers: Array<{
    username: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    bio?: string;
    bioLink?: string;
    isVerified?: boolean;
    isPrivate?: boolean;
  }>;
};

function envBool(name: string): boolean {
  const v = process.env[name]?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const TARGET =
  process.env.TARGET_IG_USERNAME?.trim() ||
  process.env.IG_TARGET?.trim() ||
  "laylamarigold";
const MAX = Math.max(1, Number(process.env.IG_MAX_FOLLOWERS ?? "10") || 10);
const INSTA_USER = process.env.INSTAGRAM_USER ?? "";
const INSTA_PASS = process.env.INSTAGRAM_PASS ?? "";
const SKIP_LOGIN = envBool("IG_SKIP_LOGIN");
const MANUAL_LOGIN_MS_RAW = process.env.IG_MANUAL_LOGIN_MS;
const MANUAL_LOGIN_MS =
  MANUAL_LOGIN_MS_RAW === undefined || MANUAL_LOGIN_MS_RAW === ""
    ? 30_000
    : Math.max(0, Number(MANUAL_LOGIN_MS_RAW) || 0);

const OUTPUT_DIR = process.env.IG_OUTPUT_DIR?.trim() ?? "";

async function waitRandom(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise<void>((r) => setTimeout(r, ms));
}

export async function runFollowersResearch(): Promise<FollowersResearchResult> {
  const stagehand = createStagehand();
  await stagehand.init();

  const page = getActivePage(stagehand);
  const sessionId = stagehand.browserbaseSessionId ?? stagehand.browserbaseSessionID;
  if (sessionId) {
    console.log(`Session: https://browserbase.com/sessions/${sessionId}`);
  }

  if (SKIP_LOGIN) {
    console.log("IG_SKIP_LOGIN: skipping login; using anonymous Browserbase session.");
    console.log(`Going to @${TARGET} (no instagram.com landing)...`);
    await page.goto(`https://www.instagram.com/${TARGET}/`);
    await waitRandom(2000, 4000);
  } else {
    await page.goto("https://www.instagram.com");
    await waitRandom(3000, 5000);

    if (INSTA_USER && INSTA_PASS) {
      console.log("Logging in with INSTAGRAM_USER / INSTAGRAM_PASS...");
      await stagehand.act(
        `Click on the username or email input field and type exactly: ${INSTA_USER}`
      );
      await waitRandom(500, 1000);

      await stagehand.act("Click on the password input field");
      await page.locator('input[type="password"]').fill(INSTA_PASS);
      await waitRandom(500, 1000);

      await stagehand.act("Click the Log In button");
      await waitRandom(5000, 8000);

      try {
        await stagehand.act(
          "Click 'Not Now' if there is a 'Save Login Info' or similar dialog"
        );
        await waitRandom(1000, 2000);
      } catch {
        /* optional dialog */
      }
      try {
        await stagehand.act(
          "Click 'Not Now' if there is a notifications permission dialog"
        );
        await waitRandom(1000, 2000);
      } catch {
        /* optional dialog */
      }
      console.log("Login flow finished (verify in live view if needed).");
    } else {
      console.log("");
      console.log("=====================================");
      console.log("MANUAL LOGIN (optional)");
      console.log("=====================================");
      console.log("Use the Browserbase live view if you need to sign in.");
      console.log(`Waiting ${MANUAL_LOGIN_MS} ms (set IG_MANUAL_LOGIN_MS=0 to skip)...`);
      console.log("=====================================");
      console.log("");
      if (MANUAL_LOGIN_MS > 0) {
        await waitRandom(MANUAL_LOGIN_MS, MANUAL_LOGIN_MS + 5000);
      }
      console.log("Continuing...");
    }

    console.log(`Going to @${TARGET}...`);
    await page.goto(`https://www.instagram.com/${TARGET}/`);
    await waitRandom(3000, 6000);
  }

  console.log("Opening followers modal...");
  await stagehand.act(
    "Click on the followers count or link that opens the followers list modal"
  );
  await waitRandom(3000, 5000);

  const results: FollowersResearchResult["followers"] = [];

  let scrolls = 0;
  const maxScrolls = 60;

  while (results.length < MAX && scrolls < maxScrolls) {
    await waitRandom(2000, 4000);

    const data = await stagehand.extract(
      "From the visible followers list/modal, extract each follower row: username (required), display name if shown, and if the row shows verified or private indicators set isVerified/isPrivate. Email, phone, bio, bioLink are rarely visible in the list — omit unless clearly present.",
      FollowerListExtractSchema
    );

    for (const f of data.followers) {
      const exists = results.some((r) => r.username === f.username);
      if (!exists && results.length < MAX) {
        results.push(f);
        console.log(`Added: @${f.username}`);
      }
    }

    console.log(`Total: ${results.length}/${MAX}`);

    if (results.length >= MAX) break;

    await stagehand.act("Scroll down inside the followers modal to load more rows");
    await waitRandom(2500, 4500);
    scrolls += 1;
  }

  const out: FollowersResearchResult = {
    targetAccount: TARGET,
    collectedAt: new Date().toISOString(),
    followerCount: results.length,
    followers: results,
  };

  console.log("");
  console.log("DONE");
  console.log(JSON.stringify(out, null, 2));

  if (OUTPUT_DIR) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    const safeTarget = TARGET.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const fileName = `ig-followers-${safeTarget}-${out.collectedAt.replace(/[:.]/g, "-")}.json`;
    const filePath = join(OUTPUT_DIR, fileName);
    await writeFile(filePath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    console.log(`Wrote: ${filePath}`);
  }

  await stagehand.close();
  return out;
}

if (import.meta.main) {
  runFollowersResearch().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
