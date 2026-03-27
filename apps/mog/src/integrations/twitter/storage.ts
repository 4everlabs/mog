import { mkdir, readdir } from "node:fs/promises";
import { resolveResearchProviderStoragePath } from "../../runtime/paths.ts";
import type { ResearchEntry, ResearchFeed, TwitterResearchSource } from "../../research/types.ts";

export interface TwitterSourceMeta {
  source: TwitterResearchSource;
  lastFetched: string;
}

export interface TwitterJsonlEntry {
  id: string;
  sourceId: string;
  entry: ResearchEntry;
  fetchedAt: string;
}

export class TwitterResearchStorage {
  constructor(private basePath: string = resolveResearchProviderStoragePath("twitter")) {}

  private coerceRow(row: unknown): TwitterJsonlEntry | null {
    if (!row || typeof row !== "object") {
      return null;
    }

    const candidate = row as Partial<TwitterJsonlEntry> & {
      tweet?: {
        id?: string;
        text?: string;
        authorName?: string;
        authorUsername?: string;
        authorAvatar?: string;
        createdAt?: string;
        url?: string;
      };
      username?: string;
      fetchedAt?: string;
    };

    if (candidate.entry && typeof candidate.entry === "object") {
      return candidate as TwitterJsonlEntry;
    }

    if (!candidate.tweet || typeof candidate.tweet !== "object") {
      return null;
    }

    const sourceId = typeof candidate.sourceId === "string"
      ? candidate.sourceId
      : typeof candidate.username === "string"
        ? candidate.username
        : "";

    if (!sourceId || typeof candidate.id !== "string") {
      return null;
    }

    const tweet = candidate.tweet;
    const text = typeof tweet.text === "string" ? tweet.text : "";
    const entry: ResearchEntry = {
      id: typeof tweet.id === "string" ? tweet.id : candidate.id,
      sourceId,
      provider: "twitter",
      title: text.length > 80 ? `${text.slice(0, 77)}...` : text,
      summary: text || undefined,
      content: text || undefined,
      authorName: typeof tweet.authorName === "string" ? tweet.authorName : undefined,
      authorUsername: typeof tweet.authorUsername === "string" ? tweet.authorUsername : undefined,
      authorAvatar: typeof tweet.authorAvatar === "string" ? tweet.authorAvatar : undefined,
      publishedAt: typeof tweet.createdAt === "string" ? tweet.createdAt : new Date().toISOString(),
      updatedAt: typeof tweet.createdAt === "string" ? tweet.createdAt : undefined,
      url: typeof tweet.url === "string" ? tweet.url : `https://twitter.com/${sourceId}`,
      sourceUrl: `https://twitter.com/${sourceId}`,
    };

    return {
      id: entry.id,
      sourceId,
      entry,
      fetchedAt: typeof candidate.fetchedAt === "string" ? candidate.fetchedAt : new Date().toISOString(),
    };
  }

  private coerceSourceMeta(meta: unknown, sourceId: string): TwitterSourceMeta | null {
    if (!meta || typeof meta !== "object") {
      return null;
    }

    const candidate = meta as {
      source?: TwitterResearchSource;
      user?: {
        username?: string;
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
      };
      lastFetched?: string;
    };

    if (candidate.source) {
      return {
        source: candidate.source,
        lastFetched: typeof candidate.lastFetched === "string" ? candidate.lastFetched : new Date().toISOString(),
      };
    }

    if (!candidate.user?.username) {
      return null;
    }

    return {
      source: {
        id: sourceId,
        provider: "twitter",
        title: candidate.user.displayName ?? candidate.user.username,
        sourceUrl: `https://twitter.com/${candidate.user.username}`,
        siteUrl: `https://twitter.com/${candidate.user.username}`,
        account: candidate.user.username,
        displayName: candidate.user.displayName,
        bio: candidate.user.bio,
        avatarUrl: candidate.user.avatarUrl,
      },
      lastFetched: typeof candidate.lastFetched === "string" ? candidate.lastFetched : new Date().toISOString(),
    };
  }

  private getEntriesPath(sourceId: string): string {
    return `${this.basePath}/${sourceId}.jsonl`;
  }

  private getMetaPath(sourceId: string): string {
    return `${this.basePath}/${sourceId}.meta.json`;
  }

  private getIndexPath(sourceId: string): string {
    return `${this.basePath}/${sourceId}.index.json`;
  }

  private async ensureBasePath(): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
  }

  private toEntry(sourceId: string, entry: ResearchEntry, fetchedAt: string): TwitterJsonlEntry {
    return {
      id: entry.id,
      sourceId,
      entry,
      fetchedAt,
    };
  }

  private getEntryTimestamp(entry: ResearchEntry): number {
    const timestamp = new Date(entry.publishedAt).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private async readRows(sourceId: string): Promise<TwitterJsonlEntry[]> {
    const filePath = this.getEntriesPath(sourceId);

    try {
      const content = await Bun.file(filePath).text();
      return content
        .split("\n")
        .filter((line) => line.trim())
        .flatMap((line) => {
          try {
            const row = this.coerceRow(JSON.parse(line));
            return row ? [row] : [];
          } catch {
            return [];
          }
        });
    } catch {
      return [];
    }
  }

  async saveEntries(sourceId: string, entries: ResearchEntry[]): Promise<void> {
    await this.ensureBasePath();
    const filePath = this.getEntriesPath(sourceId);
    const existingRows = await this.readRows(sourceId);
    const fetchedAt = new Date().toISOString();
    const mergedRows = new Map<string, TwitterJsonlEntry>();

    for (const row of existingRows) {
      mergedRows.set(row.id, row);
    }

    for (const entry of entries) {
      mergedRows.set(entry.id, this.toEntry(sourceId, entry, fetchedAt));
    }

    const orderedRows = Array.from(mergedRows.values()).sort(
      (left, right) => this.getEntryTimestamp(left.entry) - this.getEntryTimestamp(right.entry),
    );

    if (orderedRows.length === 0) {
      return;
    }

    const lines = orderedRows.map((row) => JSON.stringify(row)).join("\n") + "\n";
    await Bun.write(filePath, lines);
    await this.updateIndex(sourceId, orderedRows.map((row) => row.entry));
  }

  async getEntryIds(sourceId: string): Promise<Set<string>> {
    const ids = new Set<string>();

    for (const row of await this.readRows(sourceId)) {
      ids.add(row.id);
    }

    return ids;
  }

  async getEntries(sourceId: string, limit?: number): Promise<ResearchEntry[]> {
    const reversedRows = (await this.readRows(sourceId)).reverse();
    const max = limit ?? reversedRows.length;
    return reversedRows.slice(0, max).map((row) => row.entry);
  }

  private async updateIndex(sourceId: string, entries: ResearchEntry[]): Promise<void> {
    const indexPath = this.getIndexPath(sourceId);
    const index: Record<string, string> = {};

    for (const entry of entries) {
      index[entry.id] = entry.publishedAt;
    }

    await Bun.write(indexPath, JSON.stringify(index, null, 2));
  }

  async saveSourceMeta(sourceId: string, source: TwitterResearchSource): Promise<void> {
    const payload: TwitterSourceMeta = {
      source,
      lastFetched: new Date().toISOString(),
    };

    await this.ensureBasePath();
    await Bun.write(this.getMetaPath(sourceId), JSON.stringify(payload, null, 2));
  }

  async getSourceMeta(sourceId: string): Promise<TwitterSourceMeta | null> {
    try {
      const content = await Bun.file(this.getMetaPath(sourceId)).text();
      return this.coerceSourceMeta(JSON.parse(content), sourceId);
    } catch {
      return null;
    }
  }

  async buildFeed(sourceId: string): Promise<ResearchFeed | null> {
    const meta = await this.getSourceMeta(sourceId);
    if (!meta) {
      return null;
    }

    const entries = await this.getEntries(sourceId);
    return {
      source: meta.source,
      entries,
      lastUpdated: new Date(meta.lastFetched),
    };
  }

  async getAllSourceIds(): Promise<string[]> {
    let entries;

    try {
      entries = await readdir(this.basePath, { withFileTypes: true, encoding: "utf8" });
    } catch {
      return [];
    }

    const sourceIds: string[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".meta.json")) {
        sourceIds.push(entry.name.replace(".meta.json", ""));
      }
    }

    return sourceIds;
  }

  async clearSource(sourceId: string): Promise<void> {
    for (const path of [
      this.getEntriesPath(sourceId),
      this.getMetaPath(sourceId),
      this.getIndexPath(sourceId),
    ]) {
      try {
        await Bun.file(path).delete();
      } catch {
      }
    }
  }
}
