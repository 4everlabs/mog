import { Browserbase } from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

const searchResponse = await bb.search.web({
  query: "a web browser for ai agents",
  numResults: 10,
});
