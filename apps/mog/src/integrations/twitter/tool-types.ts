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
} from "./tool-schema.ts";
import type { IntegrationCapabilitySnapshot, RegisteredTool, ToolExecutionServices } from "../../tools/research/types.ts";

export interface TwitterToolServices {
  getFeed(input: TwitterGetFeedInput): Promise<TwitterGetFeedResult>;
  getTweets(input: TwitterGetTweetsInput): Promise<TwitterGetTweetsResult>;
  refreshFeed(input: TwitterRefreshFeedInput): Promise<TwitterRefreshFeedResult>;
  listAccounts(input: TwitterListAccountsInput): Promise<TwitterListAccountsResult>;
  registerAccount(input: TwitterRegisterAccountInput): Promise<TwitterRegisterAccountResult>;
}

export type TwitterRegisteredTool<
  TInputSchema extends ZodTypeAny = ZodTypeAny,
  TOutputSchema extends ZodTypeAny = ZodTypeAny,
> = RegisteredTool<TInputSchema, TOutputSchema>;

export type TwitterToolCapabilitySnapshot = IntegrationCapabilitySnapshot;
export type TwitterToolExecutionServices = ToolExecutionServices & {
  readonly twitter: TwitterToolServices | null;
};
