/**
 * Scraper tuning (rate limits, batching, caps).
 * Instagram’s UI and policies change often — treat these as safe defaults for research runs.
 */
export const config = {
  delayBetweenProfiles: 2000,
  delayBetweenBatches: 25_000,
  batchSize: 10,

  maxFollowersToScrape: 10,
  maxProfilesToScrape: 50,
  maxScrollAttempts: 25,

  baseUrl: "https://www.instagram.com",
};
