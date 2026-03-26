import { TwitterFeedTool } from './twitter-feed.ts';
import { TwitterFeedStorage } from './twitter-storage.ts';
import { ToolRegistry } from './pool.ts';
import type { TwitterFeed, Tweet } from '../models/twitter.ts';

export const DEFAULT_RUNTIME_PATH = '.runtime/workspace/storage/twitter';
export const DEFAULT_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function createTwitterFeedRegistry(
  maxPoolSize = 10
): ToolRegistry {
  return new ToolRegistry(
    (poolId) => new TwitterFeedTool({ id: poolId, twitterHandle: poolId }),
    maxPoolSize
  );
}

export class TwitterFeedManager {
  private registry: ToolRegistry;
  private storage: TwitterFeedStorage;
  private checkIntervalMs: number;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    maxPoolSize = 10,
    storagePath = DEFAULT_RUNTIME_PATH,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS
  ) {
    this.storage = new TwitterFeedStorage(storagePath);
    this.registry = createTwitterFeedRegistry(maxPoolSize);
    this.checkIntervalMs = checkIntervalMs;
  }

  register(handle: string, options?: { autoRefresh?: boolean; refreshIntervalMs?: number }): void {
    this.registry.createPooledTool(handle);
  }

  async bootstrap(handle: string): Promise<TwitterFeed> {
    let cached = await this.storage.buildFeed(handle);
    if (cached) {
      return cached;
    }

    const tool = this.registry.acquire(handle);
    if (!tool) {
      throw new Error(`No tool registered for @${handle}`);
    }
    const twitterTool = tool as unknown as TwitterFeedTool;

    try {
      const feed = await twitterTool.getFeed();
      await this.storage.saveFeedData(handle, feed.user);
      await this.storage.saveTweets(handle, feed.tweets);
      return feed;
    } finally {
      this.registry.release(handle);
    }
  }

  async getFeed(handle: string): Promise<TwitterFeed> {
    const cached = await this.storage.buildFeed(handle);
    if (cached) {
      return cached;
    }

    return this.bootstrap(handle);
  }

  async getTweets(handle: string, limit?: number): Promise<Tweet[]> {
    const cached = await this.storage.getTweets(handle, limit);
    if (cached.length > 0) {
      return cached;
    }

    const feed = await this.bootstrap(handle);
    return feed.tweets;
  }

  async refresh(handle: string): Promise<TwitterFeed> {
    const tool = this.registry.acquire(handle);
    if (!tool) {
      throw new Error(`No tool registered for @${handle}`);
    }
    const twitterTool = tool as unknown as TwitterFeedTool;

    try {
      const feed = await twitterTool.refreshFeed();
      await this.storage.saveFeedData(handle, feed.user);
      await this.storage.saveTweets(handle, feed.tweets);
      return feed;
    } finally {
      this.registry.release(handle);
    }
  }

  async refreshAll(): Promise<void> {
    const handles = this.registry.getPool().getAllIds();
    const results = await Promise.allSettled(handles.map((h) => this.refresh(h)));

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`Failed to refresh ${failed.length} feeds`);
    }
  }

  startAutoCheck(): void {
    this.stopAutoCheck();
    this.checkTimer = setInterval(() => {
      this.refreshAll().catch(() => {});
    }, this.checkIntervalMs);
  }

  stopAutoCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  async getStats() {
    return {
      registry: this.registry.getStats(),
      storage: {
        feeds: await this.storage.getAllUsernames(),
        total: (await this.storage.getAllUsernames()).length,
      },
    };
  }

  getRegisteredHandles(): string[] {
    return this.registry.getPool().getAllIds();
  }
}
