import { TwitterFeedStorage } from "../../tools/twitter-storage.ts";
import { TwitterFeedTool } from "../../tools/twitter-feed.ts";
import type { TwitterToolServices } from "../../tools/types.ts";
import type {
  TwitterGetFeedInput,
  TwitterGetFeedResult,
  TwitterGetTweetsInput,
  TwitterGetTweetsResult,
  TwitterRefreshFeedInput,
  TwitterRefreshFeedResult,
  TwitterListAccountsInput,
  TwitterListAccountsResult,
  TwitterRegisterAccountInput,
  TwitterRegisterAccountResult,
} from "../../schema/tools.ts";

export class TwitterIntegrationClient implements TwitterToolServices {
  private storage: TwitterFeedStorage;
  private feeds: Map<string, TwitterFeedTool> = new Map();
  private defaultLimit: number;

  constructor(
    storagePath: string = ".runtime/workspace/storage/twitter",
    defaultLimit: number = 20
  ) {
    this.storage = new TwitterFeedStorage(storagePath);
    this.defaultLimit = defaultLimit;
  }

  private getOrCreateFeed(username: string): TwitterFeedTool {
    let feed = this.feeds.get(username);
    if (!feed) {
      feed = new TwitterFeedTool({ id: username, twitterHandle: username });
      this.feeds.set(username, feed);
    }
    return feed;
  }

  async getFeed(input: TwitterGetFeedInput): Promise<TwitterGetFeedResult> {
    const { account, limit } = input;
    const username = account.replace("@", "");

    let cached = await this.storage.buildFeed(username);
    const isCached = !!cached;

    if (!cached) {
      const feedTool = this.getOrCreateFeed(username);
      try {
        cached = await feedTool.getFeed();
        await this.storage.saveFeedData(username, cached.user);
        await this.storage.saveTweets(username, cached.tweets);
      } catch (error) {
        return {
          success: false,
          account: username,
          user: {
            username,
            displayName: username,
          },
          tweets: [],
          tweetCount: 0,
          cached: false,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    const tweets = cached.tweets.slice(0, limit ?? this.defaultLimit);

    return {
      success: true,
      account: username,
      user: {
        username: cached.user.username,
        displayName: cached.user.displayName,
        bio: cached.user.bio,
        avatarUrl: cached.user.avatarUrl,
      },
      tweets: tweets.map((t) => ({
        id: t.id,
        text: t.text,
        authorName: t.authorName,
        authorUsername: t.authorUsername,
        authorAvatar: t.authorAvatar,
        createdAt: t.createdAt,
        url: t.url,
      })),
      tweetCount: tweets.length,
      cached: isCached,
      lastUpdated: cached.lastUpdated.toISOString(),
    };
  }

  async getTweets(input: TwitterGetTweetsInput): Promise<TwitterGetTweetsResult> {
    const { account, limit, sinceId } = input;
    const username = account.replace("@", "");

    let tweets = await this.storage.getTweets(username);

    if (sinceId) {
      const sinceIndex = tweets.findIndex((t) => t.id === sinceId);
      if (sinceIndex >= 0) {
        tweets = tweets.slice(0, sinceIndex);
      }
    }

    tweets = tweets.slice(0, limit ?? this.defaultLimit);

    return {
      success: true,
      account: username,
      tweets: tweets.map((t) => ({
        id: t.id,
        text: t.text,
        authorName: t.authorName,
        authorUsername: t.authorUsername,
        createdAt: t.createdAt,
        url: t.url,
      })),
      tweetCount: tweets.length,
    };
  }

  async refreshFeed(input: TwitterRefreshFeedInput): Promise<TwitterRefreshFeedResult> {
    const { account, force } = input;
    const username = account.replace("@", "");

    const previousIds = await this.storage.getTweetIds(username);
    const previousCount = previousIds.size;

    const feedTool = this.getOrCreateFeed(username);
    feedTool.setCacheDuration(force ? 0 : 60000);

    try {
      const feed = await feedTool.getFeed();
      await this.storage.saveFeedData(username, feed.user);
      await this.storage.saveTweets(username, feed.tweets);

      const newIds = await this.storage.getTweetIds(username);
      const newTweetsFound = newIds.size - previousCount;

      return {
        success: true,
        account: username,
        newTweetsFound: Math.max(0, newTweetsFound),
        totalCached: newIds.size,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        account: username,
        newTweetsFound: 0,
        totalCached: previousCount,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async listAccounts(input: TwitterListAccountsInput): Promise<TwitterListAccountsResult> {
    const { activeOnly } = input;
    const allUsernames = await this.storage.getAllUsernames();
    const accounts: Array<{
      username: string;
      hasCachedData: boolean;
      tweetCount: number;
      lastUpdated?: string;
    }> = [];

    for (const username of allUsernames) {
      const feedData = await this.storage.getFeedData(username);
      const tweets = await this.storage.getTweets(username);
      const hasCachedData = tweets.length > 0;

      if (activeOnly && !hasCachedData) {
        continue;
      }

      accounts.push({
        username,
        hasCachedData,
        tweetCount: tweets.length,
        lastUpdated: feedData?.lastFetched,
      });
    }

    return {
      accounts,
      totalAccounts: accounts.length,
    };
  }

  async registerAccount(input: TwitterRegisterAccountInput): Promise<TwitterRegisterAccountResult> {
    const { account, autoRefresh } = input;
    const username = account.replace("@", "");

    this.getOrCreateFeed(username);

    const feedData = await this.storage.getFeedData(username);
    const alreadyRegistered = !!feedData;

    if (!alreadyRegistered) {
      const feedTool = this.getOrCreateFeed(username);
      try {
        const feed = await feedTool.getFeed();
        await this.storage.saveFeedData(username, feed.user);
        await this.storage.saveTweets(username, feed.tweets);
      } catch {
        return {
          success: false,
          account: username,
          registered: false,
          message: `Failed to fetch initial data for @${username}`,
        };
      }
    }

    return {
      success: true,
      account: username,
      registered: !alreadyRegistered,
      message: alreadyRegistered
        ? `@${username} was already registered`
        : `Successfully registered @${username}`,
    };
  }
}
