import type { ResearchEntry, ResearchFeed, ResearchSourceConfig } from "../../../research/types.ts";

interface AtomParseConfig {
  id: string;
  url: string;
  title?: string;
  tags?: string[];
}

export const parseRssResearchFeed = (
  config: Extract<ResearchSourceConfig, { provider: "rss" }>,
  xml: string,
): ResearchFeed => {
  const normalizedXml = xml.replace(/\r\n/g, "\n");

  if (/<feed\b/i.test(normalizedXml) && /<entry\b/i.test(normalizedXml)) {
    return parseAtomFeed(config, normalizedXml);
  }

  if (/<rss\b/i.test(normalizedXml) || /<channel\b/i.test(normalizedXml) || /<rdf:RDF\b/i.test(normalizedXml)) {
    return parseClassicRssFeed(config, normalizedXml);
  }

  throw new Error(`Unsupported feed format for ${config.id}`);
};

const parseAtomFeed = (config: AtomParseConfig, xml: string): ResearchFeed => {
  const header = getHeaderBlock(xml, "entry");
  const feedTitle = cleanText(getFirstTagValue(header, "title")) || config.title || config.id;
  const updated = normalizeDate(getFirstTagValue(header, "updated"));
  const siteUrl = getAtomLink(header) ?? config.url;
  const entries = getBlocks(xml, "entry")
    .map((entry, index) => parseAtomEntry(config, entry, index))
    .filter((item): item is ResearchEntry => item !== null);

  return {
    source: {
      id: config.id,
      provider: "rss",
      title: config.title ?? feedTitle,
      sourceUrl: config.url,
      feedTitle,
      siteUrl,
      kind: "atom",
      tags: config.tags,
    },
    entries,
    lastUpdated: new Date(updated),
  };
};

const parseAtomEntry = (
  config: AtomParseConfig,
  entry: string,
  index: number,
): ResearchEntry | null => {
  const rawTitle = getFirstTagValue(entry, "title");
  const rawContent = getFirstTagValue(entry, "content") ?? getFirstTagValue(entry, "summary");
  const rawLink = getAtomLink(entry);
  const normalizedSourceUrl = rawLink ? normalizeGoogleAlertUrl(rawLink) : null;
  const publishedAt = normalizeDate(
    getFirstTagValue(entry, "published") ??
      getFirstTagValue(entry, "updated") ??
      getFirstTagValue(entry, "dc:date"),
  );
  const updatedAt = normalizeDate(getFirstTagValue(entry, "updated") ?? publishedAt);
  const rawId =
    cleanText(getFirstTagValue(entry, "id")) ||
    normalizedSourceUrl ||
    rawLink ||
    `${config.id}-${index + 1}`;

  if (!rawId || !normalizedSourceUrl) {
    return null;
  }

  const authorBlock = getFirstTagValue(entry, "author");
  const authorName = authorBlock ? cleanText(getFirstTagValue(authorBlock, "name")) : undefined;
  const content = cleanText(rawContent) || undefined;

  return {
    id: rawId,
    sourceId: config.id,
    provider: "rss",
    title: cleanText(rawTitle) || normalizedSourceUrl,
    summary: content,
    content,
    authorName: authorName || undefined,
    publishedAt,
    updatedAt,
    url: normalizedSourceUrl,
    sourceUrl: rawLink ?? undefined,
  };
};

const parseClassicRssFeed = (
  config: AtomParseConfig,
  xml: string,
): ResearchFeed => {
  const channel = getFirstTagValue(xml, "channel") ?? xml;
  const header = getHeaderBlock(channel, "item");
  const feedTitle = cleanText(getFirstTagValue(header, "title")) || config.title || config.id;
  const siteUrl = cleanText(getFirstTagValue(header, "link")) || config.url;
  const entries = getBlocks(channel, "item")
    .map((item, index) => parseRssItem(config, item, index))
    .filter((entry): entry is ResearchEntry => entry !== null);

  return {
    source: {
      id: config.id,
      provider: "rss",
      title: config.title ?? feedTitle,
      sourceUrl: config.url,
      feedTitle,
      siteUrl,
      kind: "rss",
      tags: config.tags,
    },
    entries,
    lastUpdated: new Date(normalizeDate(getFirstTagValue(header, "lastBuildDate"))),
  };
};

const parseRssItem = (
  config: AtomParseConfig,
  item: string,
  index: number,
): ResearchEntry | null => {
  const rawLink = cleanText(getFirstTagValue(item, "link"));
  if (!rawLink) {
    return null;
  }

  const url = normalizeGoogleAlertUrl(rawLink);
  const publishedAt = normalizeDate(
    getFirstTagValue(item, "pubDate") ??
      getFirstTagValue(item, "dc:date") ??
      getFirstTagValue(item, "published"),
  );
  const rawId =
    cleanText(getFirstTagValue(item, "guid")) ||
    cleanText(getFirstTagValue(item, "id")) ||
    url ||
    `${config.id}-${index + 1}`;
  const content =
    cleanText(getFirstTagValue(item, "content:encoded") ?? getFirstTagValue(item, "description")) || undefined;

  return {
    id: rawId,
    sourceId: config.id,
    provider: "rss",
    title: cleanText(getFirstTagValue(item, "title")) || url,
    summary:
      cleanText(getFirstTagValue(item, "description") ?? getFirstTagValue(item, "content:encoded")) || undefined,
    content,
    authorName:
      cleanText(getFirstTagValue(item, "author") ?? getFirstTagValue(item, "dc:creator")) || undefined,
    publishedAt,
    updatedAt: publishedAt,
    url,
    sourceUrl: rawLink,
  };
};

const getHeaderBlock = (xml: string, itemTag: string): string => {
  const tagPattern = new RegExp(`<${escapeTag(itemTag)}\\b`, "i");
  const match = xml.search(tagPattern);
  return match >= 0 ? xml.slice(0, match) : xml;
};

const getBlocks = (xml: string, tag: string): string[] => {
  const expression = new RegExp(
    `<${escapeTag(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeTag(tag)}>`,
    "gi",
  );
  return Array.from(xml.matchAll(expression), (match) => match[1] ?? "");
};

const getFirstTagValue = (xml: string, tag: string): string | null => {
  const expression = new RegExp(
    `<${escapeTag(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeTag(tag)}>`,
    "i",
  );
  const match = xml.match(expression);
  return match?.[1]?.trim() ?? null;
};

const getAtomLink = (xml: string): string | null => {
  const tags = Array.from(
    xml.matchAll(new RegExp(`<${escapeTag("link")}(?:\\s[^>]*)?>`, "gi")),
    (match) => match[0],
  );

  for (const tag of tags) {
    const rel = getAttribute(tag, "rel");
    const href = getAttribute(tag, "href");
    if (!href) {
      continue;
    }
    if (!rel || rel === "alternate" || rel === "self") {
      return decodeHtmlEntities(href);
    }
  }

  return null;
};

const getAttribute = (tagMarkup: string, attribute: string): string | null => {
  const expression = new RegExp(`${escapeTag(attribute)}="([^"]*)"`, "i");
  const match = tagMarkup.match(expression);
  return match?.[1]?.trim() ?? null;
};

const normalizeGoogleAlertUrl = (url: string): string => {
  const decoded = decodeHtmlEntities(url);

  try {
    const parsed = new URL(decoded);
    const embeddedUrl = parsed.searchParams.get("url");

    if (parsed.hostname.includes("google.com") && parsed.pathname === "/url" && embeddedUrl) {
      return embeddedUrl;
    }

    return parsed.toString();
  } catch {
    return decoded;
  }
};

const cleanText = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const withoutCdata = value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

  const decoded = decodeHtmlEntities(withoutCdata);
  const withoutTags = decoded
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
};

const decodeHtmlEntities = (value: string): string => {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  let decoded = value;

  for (let index = 0; index < 3; index += 1) {
    const next = decoded
      .replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (entity, token: string) => {
        if (token.startsWith("#x") || token.startsWith("#X")) {
          return String.fromCodePoint(parseInt(token.slice(2), 16));
        }

        if (token.startsWith("#")) {
          return String.fromCodePoint(parseInt(token.slice(1), 10));
        }

        return namedEntities[token] ?? entity;
      })
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
};

const normalizeDate = (value: string | null): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const cleaned = cleanText(value);
  const timestamp = Date.parse(cleaned);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
};

const escapeTag = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
