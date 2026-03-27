/**
 * Scraper tuning (rate limits, batching, caps).
 * Instagram’s UI and policies change often — treat these as safe defaults for research runs.
 */
export const config = {
  delayBetweenProfiles: Math.floor(Math.random() * 10000) + 4000, // 4-14 seconds
  delayBetweenBatches: Math.floor(Math.random() * 10000) + 20000, // 20-30 seconds
  batchSize: 10,

  maxFollowersToScrape: 10,
  maxProfilesToScrape: 10,
  maxScrollAttempts: 15,

  baseUrl: "https://www.instagram.com",
};
