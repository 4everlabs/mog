import type { Tweet, TwitterFeed, TwitterUser } from '../models/twitter.ts';

export interface TwitterFeedData {
  user: TwitterUser;
  lastFetched: string;
}

export interface TwitterJsonlEntry {
  id: string;
  username: string;
  tweet: Tweet;
  fetchedAt: string;
}

export class TwitterFeedStorage {
  private basePath: string;

  constructor(basePath: string = '.runtime/workspace/storage/twitter') {
    this.basePath = basePath;
  }

  private getFeedPath(username: string): string {
    return `${this.basePath}/${username}.jsonl`;
  }

  private getMetaPath(username: string): string {
    return `${this.basePath}/${username}.meta.json`;
  }

  private getFeedIndexPath(username: string): string {
    return `${this.basePath}/${username}.index.json`;
  }

  async saveTweet(username: string, tweet: Tweet): Promise<void> {
    const filePath = this.getFeedPath(username);
    const entry: TwitterJsonlEntry = {
      id: tweet.id,
      username,
      tweet,
      fetchedAt: new Date().toISOString(),
    };

    const line = JSON.stringify(entry) + '\n';
    await Bun.write(filePath, line, { createPath: true });
  }

  async saveTweets(username: string, tweets: Tweet[]): Promise<void> {
    const filePath = this.getFeedPath(username);
    const existingIds = await this.getTweetIds(username);
    const newTweets = tweets.filter((t) => !existingIds.has(t.id));

    if (newTweets.length === 0) {
      return;
    }

    const lines = newTweets
      .map((tweet) => {
        const entry: TwitterJsonlEntry = {
          id: tweet.id,
          username,
          tweet,
          fetchedAt: new Date().toISOString(),
        };
        return JSON.stringify(entry);
      })
      .join('\n') + '\n';

    await Bun.write(filePath, lines, { createPath: true });
    await this.updateIndex(username, tweets);
  }

  async getTweetIds(username: string): Promise<Set<string>> {
    const filePath = this.getFeedPath(username);
    const ids = new Set<string>();

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as TwitterJsonlEntry;
          ids.add(entry.id);
        } catch {
        }
      }
    } catch {
    }

    return ids;
  }

  async getTweets(username: string, limit?: number): Promise<Tweet[]> {
    const filePath = this.getFeedPath(username);
    const tweets: Tweet[] = [];

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split('\n').filter((l) => l.trim());

      const reversed = lines.reverse();
      const max = limit ?? reversed.length;

      for (let i = 0; i < max && i < reversed.length; i++) {
        try {
          const entry = JSON.parse(reversed[i]) as TwitterJsonlEntry;
          tweets.push(entry.tweet);
        } catch {
        }
      }
    } catch {
    }

    return tweets;
  }

  async getLatestTweet(username: string): Promise<Tweet | null> {
    const tweets = await this.getTweets(username, 1);
    return tweets[0] ?? null;
  }

  async getLatestTweetId(username: string): Promise<string | null> {
    const latest = await this.getLatestTweet(username);
    return latest?.id ?? null;
  }

  private async updateIndex(username: string, tweets: Tweet[]): Promise<void> {
    const indexPath = this.getFeedIndexPath(username);
    const index: Record<string, string> = {};

    for (const tweet of tweets) {
      index[tweet.id] = tweet.createdAt;
    }

    await Bun.write(indexPath, JSON.stringify(index, null, 2));
  }

  async saveFeedData(username: string, user: TwitterUser): Promise<void> {
    const meta: TwitterFeedData = {
      user,
      lastFetched: new Date().toISOString(),
    };

    const metaPath = this.getMetaPath(username);
    await Bun.write(metaPath, JSON.stringify(meta, null, 2));
  }

  async getFeedData(username: string): Promise<TwitterFeedData | null> {
    const metaPath = this.getMetaPath(username);

    try {
      const content = await Bun.file(metaPath).text();
      return JSON.parse(content) as TwitterFeedData;
    } catch {
      return null;
    }
  }

  async buildFeed(username: string): Promise<TwitterFeed | null> {
    const feedData = await this.getFeedData(username);
    if (!feedData) {
      return null;
    }

    const tweets = await this.getTweets(username);
    return {
      user: feedData.user,
      tweets,
      lastUpdated: new Date(feedData.lastFetched),
    };
  }

  async hasFeed(username: string): Promise<boolean> {
    const metaPath = this.getMetaPath(username);
    return await Bun.file(metaPath).exists();
  }

  async getAllUsernames(): Promise<string[]> {
    const entries = await Bun.fs.readdir(this.basePath);
    const usernames: string[] = [];

    for (const entry of entries) {
      if (entry.kind === 'file' && entry.name.endsWith('.meta.json')) {
        usernames.push(entry.name.replace('.meta.json', ''));
      }
    }

    return usernames;
  }

  async clearFeed(username: string): Promise<void> {
    const feedPath = this.getFeedPath(username);
    const metaPath = this.getMetaPath(username);
    const indexPath = this.getFeedIndexPath(username);

    try {
      await Bun.file(feedPath).delete();
    } catch {
    }
    try {
      await Bun.file(metaPath).delete();
    } catch {
    }
    try {
      await Bun.file(indexPath).delete();
    } catch {
    }
  }
}
