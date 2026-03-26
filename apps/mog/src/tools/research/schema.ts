import { z } from "zod";

export const ResearchToolsConfigSchema = z.object({
  twitter: z.object({
    enabled: z.boolean().optional(),
    autoRefresh: z.boolean().optional(),
    refreshIntervalMs: z.number().optional(),
    defaultLimit: z.number().optional(),
  }).strict().optional(),
  rss: z.object({
    enabled: z.boolean().optional(),
    autoRefresh: z.boolean().optional(),
    refreshIntervalMs: z.number().optional(),
    defaultLimit: z.number().optional(),
  }).strict().optional(),
}).strict();

export type ResearchToolsConfig = z.infer<typeof ResearchToolsConfigSchema>;

export const NormalizedResearchToolsConfigSchema = z.object({
  twitter: z.object({
    enabled: z.boolean(),
    autoRefresh: z.boolean(),
    refreshIntervalMs: z.number(),
    defaultLimit: z.number(),
  }).strict(),
  rss: z.object({
    enabled: z.boolean(),
    autoRefresh: z.boolean(),
    refreshIntervalMs: z.number(),
    defaultLimit: z.number(),
  }).strict(),
}).strict();

export type NormalizedResearchToolsConfig = z.infer<typeof NormalizedResearchToolsConfigSchema>;

export const ToolFamilySchema = z.enum(["research", "runtime", "shell"]);
export type ToolFamily = z.infer<typeof ToolFamilySchema>;

export const ResearchProviderSchema = z.enum(["rss", "twitter"]);
export type ResearchProvider = z.infer<typeof ResearchProviderSchema>;

export const FeedKindSchema = z.enum(["atom", "rss"]);
export type FeedKind = z.infer<typeof FeedKindSchema>;

export const AgentToolNameSchema = z.enum([
  "research_list_sources",
  "research_read_source",
  "research_refresh_source",
  "research_register_source",
]);
export type AgentToolName = z.infer<typeof AgentToolNameSchema>;

export const ResearchSourceSchema = z.object({
  id: z.string(),
  provider: ResearchProviderSchema,
  title: z.string(),
  sourceUrl: z.string(),
  feedTitle: z.string().optional(),
  siteUrl: z.string().optional(),
  kind: FeedKindSchema.optional(),
  account: z.string().optional(),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const ResearchEntrySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  provider: ResearchProviderSchema,
  title: z.string(),
  summary: z.string().optional(),
  content: z.string().optional(),
  authorName: z.string().optional(),
  authorUsername: z.string().optional(),
  authorAvatar: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  url: z.string(),
  sourceUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ResearchEntry = z.infer<typeof ResearchEntrySchema>;

export const ResearchListSourcesInputSchema = z.object({
  activeOnly: z.boolean().optional().describe("Only list sources with cached research entries"),
});
export type ResearchListSourcesInput = z.infer<typeof ResearchListSourcesInputSchema>;

export const ResearchListSourcesResultSchema = z.object({
  sources: z.array(z.object({
    id: z.string(),
    provider: ResearchProviderSchema,
    title: z.string(),
    sourceUrl: z.string(),
    hasCachedData: z.boolean(),
    entryCount: z.number(),
    lastUpdated: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })),
  totalSources: z.number(),
});
export type ResearchListSourcesResult = z.infer<typeof ResearchListSourcesResultSchema>;

export const ResearchReadSourceInputSchema = z.object({
  sourceId: z.string().describe("Registered research source identifier"),
  limit: z.number().optional().describe("Maximum number of research entries to return"),
  sinceId: z.string().optional().describe("Only return entries newer than this entry ID"),
});
export type ResearchReadSourceInput = z.infer<typeof ResearchReadSourceInputSchema>;

export const ResearchReadSourceResultSchema = z.object({
  success: z.boolean(),
  source: ResearchSourceSchema,
  entries: z.array(ResearchEntrySchema),
  entryCount: z.number(),
  cached: z.boolean(),
  lastUpdated: z.string(),
});
export type ResearchReadSourceResult = z.infer<typeof ResearchReadSourceResultSchema>;

export const ResearchRefreshSourceInputSchema = z.object({
  sourceId: z.string().describe("Registered research source identifier to refresh"),
  force: z.boolean().optional().describe("Force refresh even if recently fetched"),
});
export type ResearchRefreshSourceInput = z.infer<typeof ResearchRefreshSourceInputSchema>;

export const ResearchRefreshSourceResultSchema = z.object({
  success: z.boolean(),
  sourceId: z.string(),
  newEntriesFound: z.number(),
  totalCached: z.number(),
  lastUpdated: z.string(),
});
export type ResearchRefreshSourceResult = z.infer<typeof ResearchRefreshSourceResultSchema>;

export const ResearchRegisterSourceInputSchema = z.object({
  sourceId: z.string().describe("Stable identifier for this research source"),
  provider: ResearchProviderSchema.describe("Underlying provider that fetches this source"),
  title: z.string().optional().describe("Human-readable label for this source"),
  tags: z.array(z.string()).optional().describe("Optional tags for grouping research sources"),
  feedUrl: z.string().url().optional().describe("RSS/Atom feed URL when provider is rss"),
  account: z.string().optional().describe("Twitter/X account handle when provider is twitter"),
  autoRefresh: z.boolean().optional().describe("Enable auto-refresh for this source"),
}).superRefine((input, ctx) => {
  if (input.provider === "rss" && !input.feedUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "feedUrl is required when provider is rss",
      path: ["feedUrl"],
    });
  }

  if (input.provider === "twitter" && !input.account) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "account is required when provider is twitter",
      path: ["account"],
    });
  }
});
export type ResearchRegisterSourceInput = z.infer<typeof ResearchRegisterSourceInputSchema>;

export const ResearchRegisterSourceResultSchema = z.object({
  success: z.boolean(),
  sourceId: z.string(),
  registered: z.boolean(),
  message: z.string(),
});
export type ResearchRegisterSourceResult = z.infer<typeof ResearchRegisterSourceResultSchema>;
