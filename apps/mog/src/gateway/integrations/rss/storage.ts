import { readdir } from "node:fs/promises";
import { resolveResearchProviderStoragePath } from "../../../runtime/paths.ts";
import type { ResearchEntry, ResearchFeed, ResearchSource } from "../../../research/types.ts";

export interface RssSourceMeta {
  source: Extract<ResearchSource, { provider: "rss" }>;
  lastFetched: string;
}

export interface RssJsonlEntry {
  id: string;
  sourceId: string;
  entry: ResearchEntry;
  fetchedAt: string;
}

export class RssResearchStorage {
  constructor(private basePath: string = resolveResearchProviderStoragePath("rss")) {}

  private coerceEntry(row: unknown): RssJsonlEntry | null {
    if (!row || typeof row !== "object") {
      return null;
    }

    const candidate = row as Partial<RssJsonlEntry> & {
      item?: Partial<ResearchEntry>;
      feedId?: string;
      fetchedAt?: string;
    };

    if (candidate.entry && typeof candidate.entry === "object") {
      return candidate as RssJsonlEntry;
    }

    if (!candidate.item || typeof candidate.item !== "object") {
      return null;
    }

    const sourceId = typeof candidate.sourceId === "string"
      ? candidate.sourceId
      : typeof candidate.feedId === "string"
        ? candidate.feedId
        : "";

    if (!sourceId || typeof candidate.id !== "string") {
      return null;
    }

    const item = candidate.item;
    const entry: ResearchEntry = {
      id: typeof item.id === "string" ? item.id : candidate.id,
      sourceId,
      provider: "rss",
      title: typeof item.title === "string" ? item.title : "",
      summary: typeof item.summary === "string" ? item.summary : undefined,
      content: typeof item.content === "string" ? item.content : undefined,
      authorName: typeof item.authorName === "string" ? item.authorName : undefined,
      publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
      url: typeof item.url === "string" ? item.url : "",
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
    };

    return {
      id: entry.id,
      sourceId,
      entry,
      fetchedAt: typeof candidate.fetchedAt === "string" ? candidate.fetchedAt : new Date().toISOString(),
    };
  }

  private coerceSourceMeta(meta: unknown): RssSourceMeta | null {
    if (!meta || typeof meta !== "object") {
      return null;
    }

    const candidate = meta as {
      source?: RssSourceMeta["source"];
      feed?: {
        id?: string;
        title?: string;
        url?: string;
        feedTitle?: string;
        siteUrl?: string;
        kind?: "atom" | "rss";
        tags?: string[];
      };
      lastFetched?: string;
    };

    if (candidate.source) {
      return {
        source: candidate.source,
        lastFetched: typeof candidate.lastFetched === "string" ? candidate.lastFetched : new Date().toISOString(),
      };
    }

    if (!candidate.feed?.id || !candidate.feed.url || !candidate.feed.kind) {
      return null;
    }

    return {
      source: {
        id: candidate.feed.id,
        provider: "rss",
        title: candidate.feed.title ?? candidate.feed.id,
        sourceUrl: candidate.feed.url,
        feedTitle: candidate.feed.feedTitle,
        siteUrl: candidate.feed.siteUrl,
        kind: candidate.feed.kind,
        tags: candidate.feed.tags,
      },
      lastFetched: typeof candidate.lastFetched === "string" ? candidate.lastFetched : new Date().toISOString(),
    };
  }

  private sanitizeSourceId(sourceId: string): string {
    return sourceId.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "source";
  }

  private getEntriesPath(sourceId: string): string {
    return `${this.basePath}/${this.sanitizeSourceId(sourceId)}.jsonl`;
  }

  private getMetaPath(sourceId: string): string {
    return `${this.basePath}/${this.sanitizeSourceId(sourceId)}.meta.json`;
  }

  private getIndexPath(sourceId: string): string {
    return `${this.basePath}/${this.sanitizeSourceId(sourceId)}.index.json`;
  }

  async saveEntries(sourceId: string, entries: ResearchEntry[]): Promise<void> {
    const filePath = this.getEntriesPath(sourceId);
    const existingIds = await this.getEntryIds(sourceId);
    const newEntries = entries.filter((entry) => !existingIds.has(entry.id));

    if (newEntries.length === 0) {
      await this.updateIndex(sourceId, entries);
      return;
    }

    const fetchedAt = new Date().toISOString();
    const lines = newEntries
      .map((entry) => {
        const payload: RssJsonlEntry = {
          id: entry.id,
          sourceId,
          entry,
          fetchedAt,
        };
        return JSON.stringify(payload);
      })
      .join("\n") + "\n";

    await Bun.write(filePath, lines, { createPath: true });
    await this.updateIndex(sourceId, entries);
  }

  async getEntryIds(sourceId: string): Promise<Set<string>> {
    const filePath = this.getEntriesPath(sourceId);
    const ids = new Set<string>();

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry = this.coerceEntry(JSON.parse(line));
          if (entry) {
            ids.add(entry.id);
          }
        } catch {
        }
      }
    } catch {
    }

    return ids;
  }

  async getEntries(sourceId: string, limit?: number): Promise<ResearchEntry[]> {
    const filePath = this.getEntriesPath(sourceId);
    const rows: RssJsonlEntry[] = [];

    try {
      const content = await Bun.file(filePath).text();
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry = this.coerceEntry(JSON.parse(line));
          if (entry) {
            rows.push(entry);
          }
        } catch {
        }
      }
    } catch {
    }

    rows.sort((left, right) => {
      const leftTimestamp = Date.parse(right.entry.publishedAt || right.fetchedAt);
      const rightTimestamp = Date.parse(left.entry.publishedAt || left.fetchedAt);
      return leftTimestamp - rightTimestamp;
    });

    const entries = rows.map((row) => row.entry);
    return typeof limit === "number" ? entries.slice(0, limit) : entries;
  }

  private async updateIndex(sourceId: string, entries: ResearchEntry[]): Promise<void> {
    const indexPath = this.getIndexPath(sourceId);
    const index: Record<string, string> = {};

    for (const entry of entries) {
      index[entry.id] = entry.publishedAt;
    }

    await Bun.write(indexPath, JSON.stringify(index, null, 2));
  }

  async saveSourceMeta(sourceId: string, source: Extract<ResearchSource, { provider: "rss" }>): Promise<void> {
    const payload: RssSourceMeta = {
      source,
      lastFetched: new Date().toISOString(),
    };

    await Bun.write(this.getMetaPath(sourceId), JSON.stringify(payload, null, 2), { createPath: true });
  }

  async getSourceMeta(sourceId: string): Promise<RssSourceMeta | null> {
    try {
      const content = await Bun.file(this.getMetaPath(sourceId)).text();
      return this.coerceSourceMeta(JSON.parse(content));
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
    try {
      const entries = await readdir(this.basePath, { withFileTypes: true });
      const sourceIds: string[] = [];

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".meta.json")) {
          continue;
        }

        try {
          const content = await Bun.file(`${this.basePath}/${entry.name}`).text();
          const meta = this.coerceSourceMeta(JSON.parse(content));
          if (meta?.source.id) {
            sourceIds.push(meta.source.id);
          }
        } catch {
        }
      }

      return sourceIds;
    } catch {
      return [];
    }
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
