import { z } from "zod";

// Profile data schema
export const ProfileSchema = z.object({
  username: z.string().describe("The username/handle of the profile"),
  displayName: z.string().optional().describe("Display name"),
  bio: z.string().optional().describe("Bio or description"),
  followersCount: z.number().optional().describe("Number of followers"),
  followingCount: z.number().optional().describe("Number following"),
  postsCount: z.number().optional().describe("Number of posts"),
  verified: z.boolean().optional().describe("Is the account verified"),
  profileUrl: z.string().describe("URL to the profile"),
  avatarUrl: z.string().optional().describe("Avatar image URL"),
});

export type Profile = z.infer<typeof ProfileSchema>;

// Follower reference schema
export const FollowerRefSchema = z.object({
  username: z.string().describe("Username of the follower"),
  profileUrl: z.string().describe("URL to the follower's profile"),
});

export type FollowerRef = z.infer<typeof FollowerRefSchema>;

/** Rich follower row (modal list) — best-effort; many fields are often absent in the list UI. */
export const FollowerDetailSchema = z.object({
  username: z.string(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  bioLink: z.string().optional(),
  isVerified: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
});

export const FollowerListExtractSchema = z.object({
  followers: z.array(FollowerDetailSchema),
});

export type FollowerDetail = z.infer<typeof FollowerDetailSchema>;

// Scraper state
export interface ScraperState {
  startProfile: Profile | null;
  followers: FollowerRef[];
  scrapedProfiles: Profile[];
  errors: Array<{ url: string; error: string }>;
}