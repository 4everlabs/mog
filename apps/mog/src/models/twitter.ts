export interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  createdAt: string;
  url: string;
  metrics?: TweetMetrics;
}

export interface TweetMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
}

export interface TwitterUser {
  username: string;
  displayName: string;
  bio?: string;
  followerCount?: number;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface TwitterFeed {
  user: TwitterUser;
  tweets: Tweet[];
  lastUpdated: Date;
  nextRefresh?: Date;
}

export interface PooledToolConfig {
  id: string;
  twitterHandle: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}
