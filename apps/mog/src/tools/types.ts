import type { ZodTypeAny } from "zod";
import type {
  TwitterGetFeedInput,
  TwitterGetFeedResult,
  TwitterGetTweetsInput,
  TwitterGetTweetsResult,
  TwitterRefreshFeedInput,
  TwitterRefreshFeedResult,
  TwitterListAccountsInput,
  TwitterListAccountsResult,
  TwitterRegisterAccountInput,
  TwitterRegisterAccountResult,
} from "../schema/tools.ts";

export interface TwitterToolServices {
  getFeed(input: TwitterGetFeedInput): Promise<TwitterGetFeedResult>;
  getTweets(input: TwitterGetTweetsInput): Promise<TwitterGetTweetsResult>;
  refreshFeed(input: TwitterRefreshFeedInput): Promise<TwitterRefreshFeedResult>;
  listAccounts(input: TwitterListAccountsInput): Promise<TwitterListAccountsResult>;
  registerAccount(input: TwitterRegisterAccountInput): Promise<TwitterRegisterAccountResult>;
}

export interface IntegrationCapabilitySnapshot {
  twitter?: {
    enabled: boolean;
    autoRefresh?: boolean;
    refreshIntervalMs?: number;
    defaultLimit?: number;
  };
  runtime?: Record<string, unknown>;
  shell?: {
    enabled?: boolean;
    execute?: boolean;
  };
}

export interface RegisteredTool<TInputSchema extends ZodTypeAny = ZodTypeAny, TOutputSchema extends ZodTypeAny = ZodTypeAny> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly integration: "twitter" | "runtime" | "shell";
  readonly approvalRequired: boolean;
  readonly implemented: boolean;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
  isEnabled(capabilities: IntegrationCapabilitySnapshot): boolean;
  execute?(services: { twitter: TwitterToolServices | null }, input: unknown): Promise<unknown>;
}

export type AnyRegisteredTool = RegisteredTool<ZodTypeAny, ZodTypeAny>;

export interface ToolExecutionServices {
  readonly twitter: TwitterToolServices | null;
  readonly runtime: Record<string, unknown> | null;
  readonly shell: { execute: (cmd: string) => { output: string } } | null;
}
