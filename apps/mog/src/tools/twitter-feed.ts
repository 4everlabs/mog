import type { Tweet, TwitterFeed, TwitterUser, PooledToolConfig } from '../models/twitter.ts';
import type { PoolableTool } from '../interfaces/tool.ts';

const TIMELINE_API = 'https://syndication.twitter.com/srv/timeline-profile/screen-name';
const OEMBED_API = 'https://publish.twitter.com/oembed';

interface TwitterTimelineResponse {
  items?: Array<{
    tweet: {
      id: string;
      text: string;
      created_at: string;
      user: {
        results: {
          id: string;
          name: string;
          screen_name: string;
          profile_image_url_https: string;
          followers_count?: number;
        };
      };
    };
  }>;
}

export class TwitterFeedTool implements PoolableTool {
  readonly poolId: string;
  readonly name = 'twitter-feed';
  readonly description = 'Fetches and manages a headless Twitter feed for a given profile';

  private twitterHandle: string;
  private feed: TwitterFeed | null = null;
  private autoRefresh: boolean;
  private refreshIntervalMs: number;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private _isAcquired = false;
  private lastFetchTime = 0;
  private cacheDurationMs = 60000;

  get isAcquired(): boolean {
    return this._isAcquired;
  }

  setCacheDuration(ms: number): void {
    this.cacheDurationMs = ms;
  }

  constructor(poolConfig: PooledToolConfig) {
    this.poolId = poolConfig.id;
    this.twitterHandle = poolConfig.twitterHandle;
    this.autoRefresh = poolConfig.autoRefresh ?? false;
    this.refreshIntervalMs = poolConfig.refreshIntervalMs ?? 60000;
  }

  acquire(): void {
    this._isAcquired = true;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  release(): void {
    this._isAcquired = false;
    this.stopAutoRefresh();
  }

  async execute(params: Record<string, unknown>): Promise<TwitterFeed | Tweet[]> {
    const action = params.action as string ?? 'getFeed';

    switch (action) {
      case 'getFeed':
        return this.getFeed();
      case 'getTweets':
        return this.getTweets();
      case 'getLatest':
        return this.getLatestTweets(params.maxResults as number);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async update(): Promise<void> {
    await this.fetchFeed();
  }

  async refreshFeed(): Promise<TwitterFeed> {
    this.cacheDurationMs = 0;
    await this.fetchFeed();
    this.cacheDurationMs = 60000;
    return this.feed!;
  }

  async getFeed(): Promise<TwitterFeed> {
    const now = Date.now();
    if (!this.feed || now - this.lastFetchTime > this.cacheDurationMs) {
      await this.fetchFeed();
    }
    return this.feed!;
  }

  async getTweets(): Promise<Tweet[]> {
    const feed = await this.getFeed();
    return feed.tweets;
  }

  async getLatestTweets(maxResults = 10): Promise<Tweet[]> {
    const feed = await this.getFeed();
    return feed.tweets.slice(0, maxResults);
  }

  private async fetchFeed(): Promise<void> {
    const user = await this.getUser();
    const tweets = await this.fetchTweets();

    this.feed = {
      user,
      tweets,
      lastUpdated: new Date(),
    };
    this.lastFetchTime = Date.now();
  }

  private async getUser(): Promise<TwitterUser> {
    try {
      const oembedUrl = `${OEMBED_API}?url=https://twitter.com/${this.twitterHandle}`;
      const response = await fetch(oembedUrl);
      const data = await response.json() as { html?: string };

      if (data.html) {
        const nameMatch = data.html.match(/data-screen-name="([^"]+)"/);
        return {
          displayName: this.twitterHandle,
          username: nameMatch?.[1] ?? this.twitterHandle,
        };
      }
    } catch {
    }

    return {
      displayName: this.twitterHandle,
      username: this.twitterHandle,
    };
  }

  private async fetchTweets(maxResults = 20): Promise<Tweet[]> {
    const url = `${TIMELINE_API}/${this.twitterHandle}?limit=${maxResults}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; Twitter Feed Parser/1.0)',
        },
      });

      if (response.status === 429) {
        if (this.feed) {
          return this.feed.tweets;
        }
        throw new Error('Twitter rate limit exceeded. Try again later or provide a widget ID.');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Twitter timeline: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      
      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        const text = await response.text();
        return this.parseTimelineJson(text);
      }

      const html = await response.text();
      return this.parseTimelineHtml(html);
    } catch (error) {
      if (this.feed) {
        return this.feed.tweets;
      }
      throw error;
    }
  }

  private parseTimelineJson(text: string): Tweet[] {
    try {
      const data = JSON.parse(text) as TwitterTimelineResponse;
      const tweets: Tweet[] = [];

      if (data.items) {
        for (const item of data.items) {
          const tweet = item.tweet;
          const user = tweet.user?.results;

          tweets.push({
            id: tweet.id,
            text: tweet.text,
            authorName: user?.name ?? this.twitterHandle,
            authorUsername: user?.screen_name ?? this.twitterHandle,
            authorAvatar: user?.profile_image_url_https,
            createdAt: tweet.created_at,
            url: `https://twitter.com/${this.twitterHandle}/status/${tweet.id}`,
          });
        }
      }

      return tweets;
    } catch {
      return [];
    }
  }

  private parseTimelineHtml(html: string): Tweet[] {
    const tweets: Tweet[] = [];

    const entryRegex = /"entryId"\s*:\s*"tweet-(\d+)"/g;
    const textRegex = /"full_text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    const timeRegex = /"created_at"\s*:\s*"([^"]+)"/g;
    const nameRegex = /"name"\s*:\s*"([^"]+)"/g;
    const usernameRegex = /"screen_name"\s*:\s*"([^"]+)"/g;
    const avatarRegex = /"profile_image_url_https"\s*:\s*"([^"]+)"/g;

    const matches: Map<string, {
      text?: string;
      time?: string;
      name?: string;
      username?: string;
      avatar?: string;
    }> = new Map();

    let match;
    while ((match = entryRegex.exec(html)) !== null) {
      const id = match[1];
      if (!id) {
        continue;
      }
      matches.set(id, {});
    }

    while ((match = textRegex.exec(html)) !== null) {
      const id = Array.from(matches.keys())[0];
      if (id) {
        const existing = matches.get(id) ?? {};
        existing.text = this.decodeHtml(match[1] ?? "");
        matches.set(id, existing);
      }
    }

    const entries = html.match(/\{[^{}]*"entryId"[^{}]*"tweetId"[^{}]*\}/g) ?? [];

    for (const entry of entries) {
      const idMatch = entry.match(/"tweetId"\s*:\s*"(\d+)"/) ?? entry.match(/tweet-(\d+)/);
      const textMatch = entry.match(/"full_text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const timeMatch = entry.match(/"created_at"\s*:\s*"([^"]+)"/);
      const nameMatch = entry.match(/"name"\s*:\s*"([^"]+)"/);
      const usernameMatch = entry.match(/"screen_name"\s*:\s*"([^"]+)"/);
      const avatarMatch = entry.match(/"profile_image_url_https"\s*:\s*"([^"]+)"/);

      if (idMatch && textMatch) {
        const tweetId = idMatch[1];
        const tweetText = textMatch[1];
        if (!tweetId || !tweetText) {
          continue;
        }

        tweets.push({
          id: tweetId,
          text: this.decodeHtml(tweetText),
          authorName: nameMatch?.[1] ? this.decodeHtml(nameMatch[1]) : this.twitterHandle,
          authorUsername: usernameMatch?.[1] ?? this.twitterHandle,
          authorAvatar: avatarMatch?.[1],
          createdAt: timeMatch?.[1] ?? new Date().toISOString(),
          url: `https://twitter.com/${this.twitterHandle}/status/${tweetId}`,
        });
      }
    }

    return tweets;
  }

  private decodeHtml(str: string): string {
    return str
      .replace(/\\u[\dA-F]{4}/gi, (m) => String.fromCharCode(parseInt(m.replace(/\\u/g, ''), 16)))
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.update().catch(() => {});
    }, this.refreshIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
