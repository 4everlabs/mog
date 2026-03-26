import type { RssResearchSourceConfig, TwitterResearchSourceConfig } from "../research/types.ts";
import type { ResearchToolsConfig } from "../tools/research/schema.ts";
import {
  getInstanceId,
  resolveInstanceStoragePath,
  resolveInstanceWorkspacePath,
  resolveRuntimePath,
} from "./paths.ts";

interface ProviderRuntimeSettings {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  defaultLimit?: number;
}

export interface NotionRuntimeConfig {
  token?: string;
  todoDataSourceId?: string;
  todoSearchTitle: string;
  todoPageUrl?: string;
  requestTimeoutMs: number;
}

export interface MogSettings {
  twitter?: ProviderRuntimeSettings & {
    accounts?: string[];
  };
  rss?: ProviderRuntimeSettings & {
    feeds?: Array<{
      id: string;
      url: string;
      title?: string;
      tags?: string[];
    }>;
  };
}

export interface MogToolsConfig extends ResearchToolsConfig {}

export interface MogEnvironment {
  appName: string;
  port: number;
  instanceId: string;
  workspacePath: string;
  executionMode: "observe" | "propose" | "execute";
  channels: string[];
  storagePath: string;
  researchEnabled: boolean;
  twitter: {
    enabled: boolean;
    autoRefresh: boolean;
    refreshIntervalMs: number;
    defaultLimit: number;
    accounts: string[];
    sources: TwitterResearchSourceConfig[];
  };
  rss: {
    enabled: boolean;
    autoRefresh: boolean;
    refreshIntervalMs: number;
    defaultLimit: number;
    feeds: Array<{
      id: string;
      url: string;
      title?: string;
      tags?: string[];
    }>;
    sources: RssResearchSourceConfig[];
  };
  telegram: {
    botToken?: string;
    operatorChatId?: string;
    userName?: string;
  };
  tools: MogToolsConfig;
}

const loadJsonFile = async <T>(path: string): Promise<T | null> => {
  try {
    return await Bun.file(path).json() as T;
  } catch {
    return null;
  }
};

export const loadSettings = async (instanceId: string): Promise<MogSettings> =>
  (await loadJsonFile<MogSettings>(resolveRuntimePath("instances", instanceId, "read-only", "settings.json"))) ?? {};

export const loadToolsConfig = async (instanceId: string): Promise<MogToolsConfig> =>
  (await loadJsonFile<MogToolsConfig>(resolveRuntimePath("instances", instanceId, "read-only", "tools.json"))) ?? {};

export const loadEnvironment = async (): Promise<MogEnvironment> => {
  const instanceId = getInstanceId();
  const settings = await loadSettings(instanceId);
  const toolsConfig = await loadToolsConfig(instanceId);
  const workspacePath = process.env["MOG_WORKSPACE_PATH"] ?? resolveInstanceWorkspacePath(instanceId);
  const twitterAccounts = settings.twitter?.accounts ?? [];
  const rssFeeds = settings.rss?.feeds ?? [];

  const twitterSources: TwitterResearchSourceConfig[] = twitterAccounts.map((account) => ({
    id: account.replace(/^@/, ""),
    provider: "twitter",
    account: account.replace(/^@/, ""),
  }));

  const rssSources: RssResearchSourceConfig[] = rssFeeds.map((feed) => ({
    id: feed.id,
    provider: "rss",
    url: feed.url,
    title: feed.title,
    tags: feed.tags,
  }));

  const twitterEnabled = toolsConfig.twitter?.enabled ?? settings.twitter?.enabled ?? false;
  const rssEnabled = toolsConfig.rss?.enabled ?? settings.rss?.enabled ?? false;

  return {
    appName: process.env["MOG_APP_NAME"] ?? "mog",
    port: parseInt(process.env["MOG_PORT"] ?? "3000", 10),
    instanceId,
    workspacePath,
    executionMode: (process.env["MOG_EXECUTION_MODE"] as MogEnvironment["executionMode"]) ?? "propose",
    channels: (process.env["MOG_CHANNELS"] ?? "cli").split(",").map((channel) => channel.trim()),
    storagePath: process.env["MOG_STORAGE_PATH"] ?? resolveInstanceStoragePath(instanceId),
    researchEnabled: twitterEnabled || rssEnabled,
    twitter: {
      enabled: twitterEnabled,
      autoRefresh: settings.twitter?.autoRefresh ?? true,
      refreshIntervalMs: settings.twitter?.refreshIntervalMs ?? 3600000,
      defaultLimit: settings.twitter?.defaultLimit ?? 20,
      accounts: twitterAccounts,
      sources: twitterSources,
    },
    rss: {
      enabled: rssEnabled,
      autoRefresh: settings.rss?.autoRefresh ?? true,
      refreshIntervalMs: settings.rss?.refreshIntervalMs ?? 3600000,
      defaultLimit: settings.rss?.defaultLimit ?? 20,
      feeds: rssFeeds,
      sources: rssSources,
    },
    telegram: {
      botToken: process.env["TELEGRAM_BOT_TOKEN"],
      operatorChatId: process.env["TELEGRAM_OPERATOR_CHAT_ID"],
      userName: process.env["TELEGRAM_BOT_USERNAME"],
    },
    tools: toolsConfig,
  };
};
