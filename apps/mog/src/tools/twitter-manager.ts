import { TwitterFeedTool } from './twitter-feed.ts';
import { ToolRegistry } from './pool.ts';
import type { TwitterFeed, Tweet, PooledToolConfig } from '../models/twitter.ts';

export function createTwitterFeedRegistry(maxPoolSize = 10): ToolRegistry {
  return new ToolRegistry((poolId) => new TwitterFeedTool({ id: poolId, twitterHandle: poolId }), maxPoolSize);
}

export class TwitterFeedManager {
  private registry: ToolRegistry;

  constructor(maxPoolSize = 10) {
    this.registry = createTwitterFeedRegistry(maxPoolSize);
  }

  register(handle: string, options?: { autoRefresh?: boolean; refreshIntervalMs?: number }): void {
    this.registry.createPooledTool(handle);
  }

  async getFeed(handle: string): Promise<TwitterFeed> {
    const tool = this.registry.acquire(handle);
    if (!tool) {
      throw new Error(`No tool registered for @${handle}`);
    }
    const twitterTool = tool as unknown as TwitterFeedTool;
    try {
      return await twitterTool.getFeed();
    } finally {
      this.registry.release(handle);
    }
  }

  async getTweets(handle: string): Promise<Tweet[]> {
    const tool = this.registry.acquire(handle);
    if (!tool) {
      throw new Error(`No tool registered for @${handle}`);
    }
    const twitterTool = tool as unknown as TwitterFeedTool;
    try {
      return await twitterTool.getTweets();
    } finally {
      this.registry.release(handle);
    }
  }

  async updateFeed(handle: string): Promise<void> {
    const tool = this.registry.acquire(handle);
    if (!tool) {
      throw new Error(`No tool registered for @${handle}`);
    }
    try {
      await tool.update?.();
    } finally {
      this.registry.release(handle);
    }
  }

  async updateAll(): Promise<void> {
    await this.registry.updateAll();
  }

  getStats() {
    return this.registry.getStats();
  }

  getRegisteredHandles(): string[] {
    return this.registry.getPool().getAllIds();
  }
}
