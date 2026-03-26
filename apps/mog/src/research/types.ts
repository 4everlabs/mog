export type FeedKind = "atom" | "rss";
export type ResearchSourceProvider = "rss" | "twitter";

export interface ResearchEntry {
  id: string;
  sourceId: string;
  provider: ResearchSourceProvider;
  title: string;
  summary?: string;
  content?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  publishedAt: string;
  updatedAt?: string;
  url: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

interface BaseResearchSource {
  id: string;
  provider: ResearchSourceProvider;
  title: string;
  sourceUrl: string;
  tags?: string[];
}

export interface RssResearchSource extends BaseResearchSource {
  provider: "rss";
  feedTitle?: string;
  siteUrl?: string;
  kind: FeedKind;
}

export interface TwitterResearchSource extends BaseResearchSource {
  provider: "twitter";
  account: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  siteUrl?: string;
}

export type ResearchSource = RssResearchSource | TwitterResearchSource;

export interface ResearchFeed {
  source: ResearchSource;
  entries: ResearchEntry[];
  lastUpdated: Date;
  nextRefresh?: Date;
}

export interface ResearchSourceListing {
  id: string;
  provider: ResearchSourceProvider;
  title: string;
  sourceUrl: string;
  hasCachedData: boolean;
  entryCount: number;
  lastUpdated?: string;
  tags?: string[];
}

interface BaseResearchSourceConfig {
  id: string;
  title?: string;
  tags?: string[];
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface RssResearchSourceConfig extends BaseResearchSourceConfig {
  provider: "rss";
  url: string;
}

export interface TwitterResearchSourceConfig extends BaseResearchSourceConfig {
  provider: "twitter";
  account: string;
}

export type ResearchSourceConfig = RssResearchSourceConfig | TwitterResearchSourceConfig;
