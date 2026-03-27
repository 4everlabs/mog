import { z } from "zod";
import type { ZodTypeAny } from "zod";
import {
  TwitterGetFeedInputSchema,
  TwitterGetFeedResultSchema,
  TwitterGetTweetsInputSchema,
  TwitterGetTweetsResultSchema,
  TwitterRefreshFeedInputSchema,
  TwitterRefreshFeedResultSchema,
  TwitterListAccountsInputSchema,
  TwitterListAccountsResultSchema,
  TwitterRegisterAccountInputSchema,
  TwitterRegisterAccountResultSchema,
} from "../../schema/tools.ts";
import type { TwitterToolServices, RegisteredTool, IntegrationCapabilitySnapshot } from "../types.ts";

export const twitterTools = [
  {
    name: "twitter_get_feed",
    title: "Twitter Get Feed",
    description: "Get Twitter feed for an account. Returns user profile and tweets from local cache. Any Twitter handle can be queried - no authentication needed.",
    integration: "twitter" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: TwitterGetFeedInputSchema,
    outputSchema: TwitterGetFeedResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.twitter?.enabled ?? false;
    },
    execute(services: { twitter: TwitterToolServices | null }, input: z.infer<typeof TwitterGetFeedInputSchema>) {
      if (!services.twitter) {
        throw new Error("Twitter services are unavailable");
      }
      return services.twitter.getFeed(input);
    },
  },
  {
    name: "twitter_get_tweets",
    title: "Twitter Get Tweets",
    description: "Get tweets for a Twitter account from local cache. Returns only tweets without user profile info.",
    integration: "twitter" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: TwitterGetTweetsInputSchema,
    outputSchema: TwitterGetTweetsResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.twitter?.enabled ?? false;
    },
    execute(services: { twitter: TwitterToolServices | null }, input: z.infer<typeof TwitterGetTweetsInputSchema>) {
      if (!services.twitter) {
        throw new Error("Twitter services are unavailable");
      }
      return services.twitter.getTweets(input);
    },
  },
  {
    name: "twitter_refresh_feed",
    title: "Twitter Refresh Feed",
    description: "Refresh Twitter feed by fetching latest tweets from the public timeline. New tweets are cached locally.",
    integration: "twitter" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: TwitterRefreshFeedInputSchema,
    outputSchema: TwitterRefreshFeedResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.twitter?.enabled ?? false;
    },
    execute(services: { twitter: TwitterToolServices | null }, input: z.infer<typeof TwitterRefreshFeedInputSchema>) {
      if (!services.twitter) {
        throw new Error("Twitter services are unavailable");
      }
      return services.twitter.refreshFeed(input);
    },
  },
  {
    name: "twitter_list_accounts",
    title: "Twitter List Accounts",
    description: "List all Twitter accounts that have been registered and cached locally.",
    integration: "twitter" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: TwitterListAccountsInputSchema,
    outputSchema: TwitterListAccountsResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.twitter?.enabled ?? false;
    },
    execute(services: { twitter: TwitterToolServices | null }, input: z.infer<typeof TwitterListAccountsInputSchema>) {
      if (!services.twitter) {
        throw new Error("Twitter services are unavailable");
      }
      return services.twitter.listAccounts(input);
    },
  },
  {
    name: "twitter_register_account",
    title: "Twitter Register Account",
    description: "Register a Twitter account to be tracked and cached locally. The account will be fetched on next refresh cycle.",
    integration: "twitter" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: TwitterRegisterAccountInputSchema,
    outputSchema: TwitterRegisterAccountResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.twitter?.enabled ?? false;
    },
    execute(services: { twitter: TwitterToolServices | null }, input: z.infer<typeof TwitterRegisterAccountInputSchema>) {
      if (!services.twitter) {
        throw new Error("Twitter services are unavailable");
      }
      return services.twitter.registerAccount(input);
    },
  },
] as const satisfies readonly RegisteredTool<ZodTypeAny, ZodTypeAny>[];
