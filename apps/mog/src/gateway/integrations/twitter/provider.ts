import type {
  ResearchListSourcesInput,
  ResearchListSourcesResult,
  ResearchReadSourceInput,
  ResearchReadSourceResult,
  ResearchRefreshSourceInput,
  ResearchRefreshSourceResult,
  ResearchRegisterSourceInput,
  ResearchRegisterSourceResult,
} from "../../../tools/research/schema.ts";
import type {
  ResearchEntry,
  ResearchFeed,
  ResearchSourceConfig,
  TwitterResearchSource,
} from "../../../research/types.ts";
import { TwitterResearchStorage } from "./storage.ts";

const TIMELINE_API = "https://syndication.twitter.com/srv/timeline-profile/screen-name";
const OEMBED_API = "https://publish.twitter.com/oembed";

interface TwitterTimelineResponse {
  items?: Array<{
    tweet: {
      id: string;
      text: string;
      created_at: string;
      user: {
        results: {
          name: string;
          screen_name: string;
          profile_image_url_https: string;
        };
      };
    };
  }>;
}

interface TwitterUserProfile {
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
}

export class TwitterResearchProvider {
  readonly provider = "twitter" as const;
  private storage: TwitterResearchStorage;
  private configuredSources = new Map<string, Extract<ResearchSourceConfig, { provider: "twitter" }>>();

  constructor(
    storagePath?: string,
    private defaultLimit: number = 20,
    configuredSources: Array<Extract<ResearchSourceConfig, { provider: "twitter" }>> = [],
  ) {
    this.storage = new TwitterResearchStorage(storagePath);

    for (const source of configuredSources) {
      this.configuredSources.set(source.id, source);
    }
  }

  async hasSource(sourceId: string): Promise<boolean> {
    return this.configuredSources.has(sourceId) || (await this.storage.getSourceMeta(sourceId)) !== null;
  }

  private normalizeAccount(account: string): string {
    return account.replace(/^@/, "");
  }

  private async resolveSourceConfig(
    sourceId: string,
    override?: Partial<Extract<ResearchSourceConfig, { provider: "twitter" }>>,
  ): Promise<Extract<ResearchSourceConfig, { provider: "twitter" }> | null> {
    const configured = this.configuredSources.get(sourceId);
    const stored = await this.storage.getSourceMeta(sourceId);
    const base = configured
      ?? (stored
        ? {
            id: stored.source.id,
            provider: "twitter" as const,
            account: stored.source.account,
            title: stored.source.title,
            tags: stored.source.tags,
          }
        : null);

    if (!base && !override?.account) {
      return null;
    }

    return {
      id: sourceId,
      provider: "twitter",
      account: this.normalizeAccount(override?.account ?? base?.account ?? ""),
      title: override?.title ?? base?.title,
      tags: override?.tags ?? base?.tags,
      autoRefresh: override?.autoRefresh ?? configured?.autoRefresh,
      refreshIntervalMs: override?.refreshIntervalMs ?? configured?.refreshIntervalMs,
    };
  }

  async listSources(input: ResearchListSourcesInput): Promise<ResearchListSourcesResult["sources"]> {
    const { activeOnly } = input;
    const knownIds = new Set<string>([
      ...this.configuredSources.keys(),
      ...(await this.storage.getAllSourceIds()),
    ]);
    const sources: ResearchListSourcesResult["sources"] = [];

    for (const sourceId of knownIds) {
      const meta = await this.storage.getSourceMeta(sourceId);
      const entries = await this.storage.getEntries(sourceId);
      const configured = this.configuredSources.get(sourceId);
      const hasCachedData = entries.length > 0;

      if (activeOnly && !hasCachedData) {
        continue;
      }

      const account = meta?.source.account ?? configured?.account ?? sourceId;
      sources.push({
        id: sourceId,
        provider: "twitter",
        title: meta?.source.title ?? configured?.title ?? account,
        sourceUrl: meta?.source.sourceUrl ?? `https://twitter.com/${account}`,
        hasCachedData,
        entryCount: entries.length,
        lastUpdated: meta ? meta.lastFetched : undefined,
        tags: meta?.source.tags ?? configured?.tags,
      });
    }

    return sources;
  }

  async readSource(input: ResearchReadSourceInput): Promise<ResearchReadSourceResult | null> {
    const { sourceId, limit, sinceId } = input;
    const config = await this.resolveSourceConfig(sourceId);
    if (!config) {
      return null;
    }

    let cached = await this.storage.buildFeed(sourceId);
    const isCached = !!cached;

    if (!cached) {
      try {
        cached = await this.fetchFeed(config);
        await this.storage.saveSourceMeta(sourceId, cached.source as TwitterResearchSource);
        await this.storage.saveEntries(sourceId, cached.entries);
      } catch {
        return {
          success: false,
          source: {
            id: sourceId,
            provider: "twitter",
            title: config.title ?? config.account,
            sourceUrl: `https://twitter.com/${config.account}`,
            account: config.account,
            tags: config.tags,
          },
          entries: [],
          entryCount: 0,
          cached: false,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    let entries = cached.entries;
    if (sinceId) {
      const sinceIndex = entries.findIndex((entry) => entry.id === sinceId);
      if (sinceIndex >= 0) {
        entries = entries.slice(0, sinceIndex);
      }
    }

    entries = entries.slice(0, limit ?? this.defaultLimit);

    return {
      success: true,
      source: cached.source as TwitterResearchSource,
      entries,
      entryCount: entries.length,
      cached: isCached,
      lastUpdated: cached.lastUpdated.toISOString(),
    };
  }

  async refreshSource(input: ResearchRefreshSourceInput): Promise<ResearchRefreshSourceResult | null> {
    const { sourceId } = input;
    const config = await this.resolveSourceConfig(sourceId);
    if (!config) {
      return null;
    }

    const previousIds = await this.storage.getEntryIds(sourceId);

    try {
      const feed = await this.fetchFeed(config);
      await this.storage.saveSourceMeta(sourceId, feed.source as TwitterResearchSource);
      await this.storage.saveEntries(sourceId, feed.entries);

      const currentIds = await this.storage.getEntryIds(sourceId);
      return {
        success: true,
        sourceId,
        newEntriesFound: Math.max(0, currentIds.size - previousIds.size),
        totalCached: currentIds.size,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        sourceId,
        newEntriesFound: 0,
        totalCached: previousIds.size,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async registerSource(input: ResearchRegisterSourceInput): Promise<ResearchRegisterSourceResult | null> {
    if (input.provider !== "twitter") {
      return null;
    }

    const config: Extract<ResearchSourceConfig, { provider: "twitter" }> = {
      id: input.sourceId,
      provider: "twitter",
      account: this.normalizeAccount(input.account!),
      title: input.title,
      tags: input.tags,
      autoRefresh: input.autoRefresh,
    };

    this.configuredSources.set(config.id, config);

    const existing = await this.storage.getSourceMeta(config.id);
    const alreadyRegistered = !!existing && existing.source.account === config.account;

    if (!alreadyRegistered) {
      try {
        const feed = await this.fetchFeed(config);
        await this.storage.saveSourceMeta(config.id, feed.source as TwitterResearchSource);
        await this.storage.saveEntries(config.id, feed.entries);
      } catch {
        return {
          success: false,
          sourceId: config.id,
          registered: false,
          message: `Failed to fetch initial data for research source ${config.id}`,
        };
      }
    }

    return {
      success: true,
      sourceId: config.id,
      registered: !alreadyRegistered,
      message: alreadyRegistered
        ? `Research source ${config.id} was already registered`
        : `Successfully registered research source ${config.id}`,
    };
  }

  private async fetchFeed(config: Extract<ResearchSourceConfig, { provider: "twitter" }>): Promise<ResearchFeed> {
    const account = this.normalizeAccount(config.account);
    const user = await this.getUser(account);
    const entries = await this.fetchEntries(config.id, account);

    const source: TwitterResearchSource = {
      id: config.id,
      provider: "twitter",
      title: config.title ?? user.displayName ?? account,
      sourceUrl: `https://twitter.com/${account}`,
      siteUrl: `https://twitter.com/${account}`,
      account,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      tags: config.tags,
    };

    return {
      source,
      entries,
      lastUpdated: new Date(),
    };
  }

  private async getUser(account: string): Promise<TwitterUserProfile> {
    try {
      const oembedUrl = `${OEMBED_API}?url=https://twitter.com/${account}`;
      const response = await fetch(oembedUrl);
      const data = await response.json() as { html?: string };

      if (data.html) {
        const screenNameMatch = data.html.match(/data-screen-name="([^"]+)"/);
        return {
          displayName: account,
          username: screenNameMatch?.[1] ?? account,
        };
      }
    } catch {
    }

    return {
      displayName: account,
      username: account,
    };
  }

  private async fetchEntries(sourceId: string, account: string, maxResults = 20): Promise<ResearchEntry[]> {
    const url = `${TIMELINE_API}/${account}?limit=${maxResults}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json, text/html",
          "User-Agent": "Mozilla/5.0 (compatible; Mog Twitter Research Parser/1.0)",
        },
      });

      if (response.status === 429) {
        const cached = await this.storage.getEntries(sourceId);
        if (cached.length > 0) {
          return cached;
        }
        throw new Error("Twitter rate limit exceeded. Try again later.");
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Twitter timeline: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || contentType.includes("text/plain")) {
        return this.parseTimelineJson(sourceId, account, await response.text());
      }

      return this.parseTimelineHtml(sourceId, account, await response.text());
    } catch (error) {
      const cached = await this.storage.getEntries(sourceId);
      if (cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }

  private parseTimelineJson(sourceId: string, account: string, text: string): ResearchEntry[] {
    try {
      const data = JSON.parse(text) as TwitterTimelineResponse;
      const entries: ResearchEntry[] = [];

      for (const item of data.items ?? []) {
        const tweet = item.tweet;
        const user = tweet.user?.results;
        entries.push(this.createEntry(sourceId, account, {
          id: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          authorName: user?.name ?? account,
          authorUsername: user?.screen_name ?? account,
          authorAvatar: user?.profile_image_url_https,
        }));
      }

      return entries;
    } catch {
      return [];
    }
  }

  private parseTimelineHtml(sourceId: string, account: string, html: string): ResearchEntry[] {
    const entries: ResearchEntry[] = [];
    const entryRegex = /"entryId"\s*:\s*"tweet-(\d+)"/g;
    const textRegex = /"full_text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    const matches = new Map<string, { text?: string }>();

    let match: RegExpExecArray | null;
    while ((match = entryRegex.exec(html)) !== null) {
      const id = match[1];
      if (id) {
        matches.set(id, {});
      }
    }

    while ((match = textRegex.exec(html)) !== null) {
      const id = Array.from(matches.keys())[0];
      const text = match[1];
      if (id && text) {
        matches.set(id, { text: this.decodeHtml(text) });
      }
    }

    const rows = html.match(/\{[^{}]*"entryId"[^{}]*"tweetId"[^{}]*\}/g) ?? [];
    for (const row of rows) {
      const idMatch = row.match(/"tweetId"\s*:\s*"(\d+)"/) ?? row.match(/tweet-(\d+)/);
      const textMatch = row.match(/"full_text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const timeMatch = row.match(/"created_at"\s*:\s*"([^"]+)"/);
      const nameMatch = row.match(/"name"\s*:\s*"([^"]+)"/);
      const usernameMatch = row.match(/"screen_name"\s*:\s*"([^"]+)"/);
      const avatarMatch = row.match(/"profile_image_url_https"\s*:\s*"([^"]+)"/);

      if (!idMatch?.[1] || !textMatch?.[1]) {
        continue;
      }

      entries.push(this.createEntry(sourceId, account, {
        id: idMatch[1],
        text: this.decodeHtml(textMatch[1]),
        createdAt: timeMatch?.[1] ?? new Date().toISOString(),
        authorName: nameMatch?.[1] ? this.decodeHtml(nameMatch[1]) : account,
        authorUsername: usernameMatch?.[1] ?? account,
        authorAvatar: avatarMatch?.[1],
      }));
    }

    return entries;
  }

  private createEntry(
    sourceId: string,
    account: string,
    tweet: {
      id: string;
      text: string;
      createdAt: string;
      authorName: string;
      authorUsername: string;
      authorAvatar?: string;
    },
  ): ResearchEntry {
    const normalizedText = tweet.text.trim();
    const title = normalizedText.length > 80 ? `${normalizedText.slice(0, 77)}...` : normalizedText;

    return {
      id: tweet.id,
      sourceId,
      provider: "twitter",
      title: title || `Tweet from @${account}`,
      summary: normalizedText,
      content: normalizedText,
      authorName: tweet.authorName,
      authorUsername: tweet.authorUsername,
      authorAvatar: tweet.authorAvatar,
      publishedAt: tweet.createdAt,
      updatedAt: tweet.createdAt,
      url: `https://twitter.com/${account}/status/${tweet.id}`,
      sourceUrl: `https://twitter.com/${account}`,
    };
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16)))
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }
}
