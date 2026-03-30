import { Browserbase } from "@browserbasehq/sdk";
import { z } from "zod";

const browserbaseApiKeySchema = z
  .string()
  .trim()
  .min(1, "BROWSERBASE_API_KEY is required to use Browserbase web search");

export const BrowserbaseWebSearchInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(200, "Search query must be 200 characters or fewer"),
  numResults: z
    .number()
    .int("numResults must be an integer")
    .min(1, "numResults must be at least 1")
    .max(25, "numResults must be at most 25")
    .default(10),
}).strict();

export type BrowserbaseWebSearchInput = z.input<typeof BrowserbaseWebSearchInputSchema>;

export const BrowserbaseFetchInputSchema = z.object({
  url: z.string().url("A valid URL is required"),
  proxies: z.boolean().default(true),
  allowRedirects: z.boolean().default(true),
  allowInsecureSsl: z.boolean().optional(),
}).strict();

export type BrowserbaseFetchInput = z.input<typeof BrowserbaseFetchInputSchema>;

let browserbaseClient: Browserbase | null = null;

const getBrowserbaseClient = (): Browserbase => {
  if (browserbaseClient) {
    return browserbaseClient;
  }

  const apiKey = browserbaseApiKeySchema.parse(process.env["BROWSERBASE_API_KEY"]);
  browserbaseClient = new Browserbase({ apiKey });

  return browserbaseClient;
};

export const isBrowserbaseConfigured = (): boolean =>
  browserbaseApiKeySchema.safeParse(process.env["BROWSERBASE_API_KEY"]).success;

export const searchWeb = async (
  input: BrowserbaseWebSearchInput,
): Promise<Browserbase.SearchWebResponse> => {
  const { query, numResults } = BrowserbaseWebSearchInputSchema.parse(input);
  return getBrowserbaseClient().search.web({
    query,
    numResults,
  });
};

export const fetchWebPage = async (
  input: BrowserbaseFetchInput,
): Promise<Browserbase.FetchAPICreateResponse> => {
  const request = BrowserbaseFetchInputSchema.parse(input);
  return getBrowserbaseClient().fetchAPI.create(request);
};
