import { z } from "zod";

export const TwitterToolsConfigSchema = z.object({
  twitter: z.object({
    enabled: z.boolean().optional(),
    autoRefresh: z.boolean().optional(),
    refreshIntervalMs: z.number().optional(),
    defaultLimit: z.number().optional(),
  }).strict().optional(),
}).strict();

export type TwitterToolsConfig = z.infer<typeof TwitterToolsConfigSchema>;

export const NormalizedTwitterToolsConfigSchema = z.object({
  twitter: z.object({
    enabled: z.boolean(),
    autoRefresh: z.boolean(),
    refreshIntervalMs: z.number(),
    defaultLimit: z.number(),
  }).strict(),
}).strict();

export type NormalizedTwitterToolsConfig = z.infer<typeof NormalizedTwitterToolsConfigSchema>;

export const TwitterToolFamilySchema = z.enum(["twitter", "runtime", "shell"]);
export type TwitterToolFamily = z.infer<typeof TwitterToolFamilySchema>;

export const TwitterAgentToolNameSchema = z.enum([
  "twitter_get_feed",
  "twitter_get_tweets",
  "twitter_refresh_feed",
  "twitter_list_accounts",
  "twitter_register_account",
]);

export type TwitterAgentToolName = z.infer<typeof TwitterAgentToolNameSchema>;

export const TwitterGetFeedInputSchema = z.object({
  account: z.string().describe("Twitter handle/username to fetch feed for"),
  limit: z.number().optional().describe("Maximum number of tweets to return"),
});
export type TwitterGetFeedInput = z.infer<typeof TwitterGetFeedInputSchema>;

export const TwitterGetFeedResultSchema = z.object({
  success: z.boolean(),
  account: z.string(),
  user: z.object({
    username: z.string(),
    displayName: z.string(),
    bio: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
  tweets: z.array(z.object({
    id: z.string(),
    text: z.string(),
    authorName: z.string(),
    authorUsername: z.string(),
    authorAvatar: z.string().optional(),
    createdAt: z.string(),
    url: z.string(),
  })),
  tweetCount: z.number(),
  cached: z.boolean(),
  lastUpdated: z.string(),
});
export type TwitterGetFeedResult = z.infer<typeof TwitterGetFeedResultSchema>;

export const TwitterGetTweetsInputSchema = z.object({
  account: z.string().describe("Twitter handle/username"),
  limit: z.number().optional().describe("Maximum number of tweets"),
  sinceId: z.string().optional().describe("Only return tweets after this ID"),
});
export type TwitterGetTweetsInput = z.infer<typeof TwitterGetTweetsInputSchema>;

export const TwitterGetTweetsResultSchema = z.object({
  success: z.boolean(),
  account: z.string(),
  tweets: z.array(z.object({
    id: z.string(),
    text: z.string(),
    authorName: z.string(),
    authorUsername: z.string(),
    createdAt: z.string(),
    url: z.string(),
  })),
  tweetCount: z.number(),
});
export type TwitterGetTweetsResult = z.infer<typeof TwitterGetTweetsResultSchema>;

export const TwitterRefreshFeedInputSchema = z.object({
  account: z.string().describe("Twitter handle/username to refresh"),
  force: z.boolean().optional().describe("Force refresh even if recently fetched"),
});
export type TwitterRefreshFeedInput = z.infer<typeof TwitterRefreshFeedInputSchema>;

export const TwitterRefreshFeedResultSchema = z.object({
  success: z.boolean(),
  account: z.string(),
  newTweetsFound: z.number(),
  totalCached: z.number(),
  lastUpdated: z.string(),
});
export type TwitterRefreshFeedResult = z.infer<typeof TwitterRefreshFeedResultSchema>;

export const TwitterListAccountsInputSchema = z.object({
  activeOnly: z.boolean().optional().describe("Only list accounts with cached data"),
});
export type TwitterListAccountsInput = z.infer<typeof TwitterListAccountsInputSchema>;

export const TwitterListAccountsResultSchema = z.object({
  accounts: z.array(z.object({
    username: z.string(),
    hasCachedData: z.boolean(),
    tweetCount: z.number(),
    lastUpdated: z.string().optional(),
  })),
  totalAccounts: z.number(),
});
export type TwitterListAccountsResult = z.infer<typeof TwitterListAccountsResultSchema>;

export const TwitterRegisterAccountInputSchema = z.object({
  account: z.string().describe("Twitter handle/username to register"),
  autoRefresh: z.boolean().optional().describe("Enable auto-refresh for this account"),
  priority: z.number().optional().describe("Priority for refresh order (lower = higher priority)"),
});
export type TwitterRegisterAccountInput = z.infer<typeof TwitterRegisterAccountInputSchema>;

export const TwitterRegisterAccountResultSchema = z.object({
  success: z.boolean(),
  account: z.string(),
  registered: z.boolean(),
  message: z.string(),
});
export type TwitterRegisterAccountResult = z.infer<typeof TwitterRegisterAccountResultSchema>;
