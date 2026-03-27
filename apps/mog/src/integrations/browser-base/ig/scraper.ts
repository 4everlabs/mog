import type { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { config } from "./config.js";
import { createStagehand, getActivePage } from "./stagehand-factory.js";
import type { Profile, FollowerRef, ScraperState } from "./types.js";
import { ProfileSchema, FollowerRefSchema } from "./types.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ProfileScraper {
  private stagehand: Stagehand;
  private state: ScraperState;

  constructor(stagehand?: Stagehand) {
    this.stagehand = stagehand ?? createStagehand();
    this.state = {
      startProfile: null,
      followers: [],
      scrapedProfiles: [],
      errors: [],
    };
  }

  async init() {
    await this.stagehand.init();
    console.log("✅ Stagehand initialized");
  }

  async close() {
    await this.stagehand.close();
    console.log("✅ Stagehand closed");
  }

  /**
   * Scrape a single profile using AI extraction
   */
  async scrapeProfile(profileUrl: string): Promise<Profile | null> {
    const page = getActivePage(this.stagehand);

    try {
      await page.goto(profileUrl);
      await page.waitForLoadState("domcontentloaded");

      // Use Stagehand's AI extraction
      const profile = await this.stagehand.extract(
        "Extract the profile information from this page",
        ProfileSchema
      );

      return profile;
    } catch (error) {
      console.error(`❌ Failed to scrape ${profileUrl}:`, error);
      this.state.errors.push({
        url: profileUrl,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Scroll to load more followers (infinite scroll handling)
   */
  private async scrollToLoadFollowers(maxScrolls = config.maxScrollAttempts): Promise<void> {
    getActivePage(this.stagehand);

    for (let i = 0; i < maxScrolls; i++) {
      // Use act to scroll
      await this.stagehand.act("scroll down in the followers list");

      // Wait for new content to load
      await delay(1500);

      // Check if we've loaded enough
      const currentFollowers = await this.stagehand.extract(
        "count how many followers are currently visible in the list",
        z.object({ count: z.number() })
      );

      if (currentFollowers.count >= config.maxFollowersToScrape) {
        console.log(`📊 Loaded ${currentFollowers.count} followers`);
        break;
      }
    }
  }

  /**
   * Extract followers list from a profile
   */
  async scrapeFollowersList(profileUrl: string): Promise<FollowerRef[]> {
    const page = getActivePage(this.stagehand);

    try {
      await page.goto(profileUrl);

      // Open followers modal/list using AI action
      await this.stagehand.act("click on the followers count or followers tab to open the followers list");
      await delay(1000);

      // Scroll to load more followers
      await this.scrollToLoadFollowers();

      // Extract all visible followers
      const followers = await this.stagehand.extract(
        "extract all follower profiles from the list - get their username and profile URL",
        z.object({
          followers: z.array(FollowerRefSchema),
        })
      );

      return followers.followers.slice(0, config.maxFollowersToScrape);
    } catch (error) {
      console.error(`❌ Failed to scrape followers from ${profileUrl}:`, error);
      return [];
    }
  }

  /**
   * Process followers in batches with rate limiting
   */
  private async processBatches(urls: string[]): Promise<Profile[]> {
    const results: Profile[] = [];
    const batches = this.chunkArray(urls, config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (!batch) continue;
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} profiles)`);

      for (const url of batch) {
        // Skip if we've reached max
        if (results.length >= config.maxProfilesToScrape) break;

        console.log(`  🔍 Scraping: ${url}`);
        const profile = await this.scrapeProfile(url);

        if (profile) {
          results.push(profile);
          this.state.scrapedProfiles.push(profile);
        }

        // Rate limiting between profiles
        await this.delay(config.delayBetweenProfiles);
      }

      // Rate limiting between batches
      if (i < batches.length - 1) {
        console.log(`  ⏳ Cooling down before next batch...`);
        await this.delay(config.delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * Main workflow: scrape starting profile → get followers → scrape each follower
   */
  async run(startProfileUrl: string): Promise<ScraperState> {
    console.log(`\n🚀 Starting scrape from: ${startProfileUrl}\n`);

    // Step 1: Scrape the initial profile
    console.log("📋 Step 1: Scraping initial profile...");
    const startProfile = await this.scrapeProfile(startProfileUrl);

    if (!startProfile) {
      throw new Error("Failed to scrape initial profile");
    }

    this.state.startProfile = startProfile;
    console.log(`  ✅ Got profile: @${startProfile.username}`);

    // Step 2: Get followers list
    console.log("\n📋 Step 2: Scraping followers list...");
    const followers = await this.scrapeFollowersList(startProfileUrl);
    this.state.followers = followers;
    console.log(`  ✅ Found ${followers.length} followers`);

    // Step 3: Scrape each follower's profile
    console.log("\n📋 Step 3: Scraping follower profiles...");
    const followerUrls = followers
      .map((f) => f.profileUrl)
      .filter((url): url is string => !!url);

    await this.processBatches(followerUrls);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 SCRAPE COMPLETE");
    console.log("=".repeat(50));
    console.log(`  Initial profile: @${startProfile.username}`);
    console.log(`  Followers found: ${followers.length}`);
    console.log(`  Profiles scraped: ${this.state.scrapedProfiles.length}`);
    console.log(`  Errors: ${this.state.errors.length}`);

    return this.state;
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return delay(ms);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}