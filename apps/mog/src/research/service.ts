import type {
  ResearchListSourcesInput,
  ResearchListSourcesResult,
  ResearchReadSourceInput,
  ResearchReadSourceResult,
  ResearchRefreshSourceInput,
  ResearchRefreshSourceResult,
  ResearchRegisterSourceInput,
  ResearchRegisterSourceResult,
} from "../tools/research/schema.ts";
import type { ResearchToolServices } from "../tools/research/types.ts";
import type { ResearchSource, ResearchSourceProvider } from "./types.ts";
import { RssResearchProvider } from "../integrations/rss/provider.ts";
import { TwitterResearchProvider } from "../integrations/twitter/provider.ts";

interface ResearchProviderAdapter {
  readonly provider: ResearchSourceProvider;
  hasSource(sourceId: string): Promise<boolean>;
  listSources(input: ResearchListSourcesInput): Promise<ResearchListSourcesResult["sources"]>;
  readSource(input: ResearchReadSourceInput): Promise<ResearchReadSourceResult | null>;
  refreshSource(input: ResearchRefreshSourceInput): Promise<ResearchRefreshSourceResult | null>;
  registerSource(input: ResearchRegisterSourceInput): Promise<ResearchRegisterSourceResult | null>;
}

export interface ResearchServiceConfig {
  rssProvider?: RssResearchProvider | null;
  twitterProvider?: TwitterResearchProvider | null;
}

export class ResearchService implements ResearchToolServices {
  private providers: ResearchProviderAdapter[];

  constructor(config: ResearchServiceConfig) {
    const providers: ResearchProviderAdapter[] = [];

    if (config.rssProvider) {
      providers.push(config.rssProvider);
    }

    if (config.twitterProvider) {
      providers.push(config.twitterProvider);
    }

    this.providers = providers;
  }

  async listSources(input: ResearchListSourcesInput): Promise<ResearchListSourcesResult> {
    const sources = (await Promise.all(this.providers.map((provider) => provider.listSources(input))))
      .flat()
      .sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));

    return {
      sources,
      totalSources: sources.length,
    };
  }

  async readSource(input: ResearchReadSourceInput): Promise<ResearchReadSourceResult> {
    for (const provider of this.providers) {
      if (!(await provider.hasSource(input.sourceId))) {
        continue;
      }

      const result = await provider.readSource(input);
      if (result) {
        return result;
      }
    }

    return {
      success: false,
      source: this.getFallbackSource(input.sourceId),
      entries: [],
      entryCount: 0,
      cached: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  async refreshSource(input: ResearchRefreshSourceInput): Promise<ResearchRefreshSourceResult> {
    for (const provider of this.providers) {
      if (!(await provider.hasSource(input.sourceId))) {
        continue;
      }

      const result = await provider.refreshSource(input);
      if (result) {
        return result;
      }
    }

    return {
      success: false,
      sourceId: input.sourceId,
      newEntriesFound: 0,
      totalCached: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  async registerSource(input: ResearchRegisterSourceInput): Promise<ResearchRegisterSourceResult> {
    const provider = this.providers.find((candidate) => candidate.provider === input.provider);
    if (!provider) {
      return {
        success: false,
        sourceId: input.sourceId,
        registered: false,
        message: `No provider is enabled for ${input.provider}`,
      };
    }

    return (await provider.registerSource(input)) ?? {
      success: false,
      sourceId: input.sourceId,
      registered: false,
      message: `Failed to register research source ${input.sourceId}`,
    };
  }

  private getFallbackSource(sourceId: string): ResearchSource {
    return {
      id: sourceId,
      provider: "rss",
      title: sourceId,
      sourceUrl: "",
      kind: "atom",
    };
  }
}
