import type {
  ResearchListSourcesInput,
  ResearchListSourcesResult,
  ResearchReadSourceInput,
  ResearchReadSourceResult,
  ResearchRefreshSourceInput,
  ResearchRefreshSourceResult,
  ResearchRegisterSourceInput,
  ResearchRegisterSourceResult,
} from "../../tools/research/schema.ts";
import type { ResearchSourceConfig, RssResearchSource } from "../../research/types.ts";
import { parseRssResearchFeed } from "./parser.ts";
import { RssResearchStorage } from "./storage.ts";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; Mog RSS Feed Parser/1.0)";

export class RssResearchProvider {
  readonly provider = "rss" as const;
  private storage: RssResearchStorage;
  private configuredSources = new Map<string, Extract<ResearchSourceConfig, { provider: "rss" }>>();

  constructor(
    storagePath?: string,
    private defaultLimit: number = 20,
    configuredSources: Array<Extract<ResearchSourceConfig, { provider: "rss" }>> = [],
  ) {
    this.storage = new RssResearchStorage(storagePath);

    for (const source of configuredSources) {
      this.configuredSources.set(source.id, source);
    }
  }

  async hasSource(sourceId: string): Promise<boolean> {
    return this.configuredSources.has(sourceId) || (await this.storage.getSourceMeta(sourceId)) !== null;
  }

  private async resolveSourceConfig(
    sourceId: string,
    override?: Partial<Extract<ResearchSourceConfig, { provider: "rss" }>>,
  ): Promise<Extract<ResearchSourceConfig, { provider: "rss" }> | null> {
    const configured = this.configuredSources.get(sourceId);
    const stored = await this.storage.getSourceMeta(sourceId);
    const base = configured
      ?? (stored
        ? {
            id: stored.source.id,
            provider: "rss" as const,
            url: stored.source.sourceUrl,
            title: stored.source.title,
            tags: stored.source.tags,
          }
        : null);

    if (!base && !override?.url) {
      return null;
    }

    return {
      id: sourceId,
      provider: "rss",
      url: override?.url ?? base?.url ?? "",
      title: override?.title ?? base?.title,
      tags: override?.tags ?? base?.tags,
      autoRefresh: override?.autoRefresh ?? configured?.autoRefresh,
      refreshIntervalMs: override?.refreshIntervalMs ?? configured?.refreshIntervalMs,
    };
  }

  private async fetchFeed(config: Extract<ResearchSourceConfig, { provider: "rss" }>) {
    const response = await fetch(config.url, {
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain",
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    return parseRssResearchFeed(config, await response.text());
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

      sources.push({
        id: sourceId,
        provider: "rss",
        title: meta?.source.title ?? configured?.title ?? sourceId,
        sourceUrl: meta?.source.sourceUrl ?? configured?.url ?? "",
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
        await this.storage.saveSourceMeta(sourceId, cached.source as RssResearchSource);
        await this.storage.saveEntries(sourceId, cached.entries);
      } catch {
        return {
          success: false,
          source: {
            id: sourceId,
            provider: "rss",
            title: config.title ?? sourceId,
            sourceUrl: config.url,
            kind: "atom",
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
      source: cached.source as RssResearchSource,
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
      await this.storage.saveSourceMeta(sourceId, feed.source as RssResearchSource);
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
    if (input.provider !== "rss") {
      return null;
    }

    const config: Extract<ResearchSourceConfig, { provider: "rss" }> = {
      id: input.sourceId,
      provider: "rss",
      url: input.feedUrl!,
      title: input.title,
      tags: input.tags,
      autoRefresh: input.autoRefresh,
    };

    this.configuredSources.set(config.id, config);

    const existing = await this.storage.getSourceMeta(config.id);
    const alreadyRegistered = !!existing && existing.source.sourceUrl === config.url;

    if (!alreadyRegistered) {
      try {
        const feed = await this.fetchFeed(config);
        await this.storage.saveSourceMeta(config.id, feed.source as RssResearchSource);
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
}
