import {
  getNodeChildren,
  getNodeValue,
  isBlockquoteNode,
  isCodeNode,
  isDeleteNode,
  isEmphasisNode,
  isInlineCodeNode,
  isLinkNode,
  isListItemNode,
  isListNode,
  isParagraphNode,
  isStrongNode,
  isTableNode,
  isTextNode,
  markdownToPlainText,
  parseMarkdown,
  tableToAscii,
  type Blockquote,
  type Code,
  type Content,
  type Link,
  type List,
  type ListItem,
  type MdastTable,
  type Root,
} from "chat";

const TELEGRAM_MARKDOWN_V2_SPECIAL_CHAR_PATTERN =
  /(\\|_|\*|\[|\]|\(|\)|~|`|>|#|\+|-|=|\||\{|\}|\.|!)/gu;
const TELEGRAM_MARKDOWN_V2_LINK_ESCAPE_PATTERN = /([)\\])/gu;
const TELEGRAM_MARKDOWN_V2_CODE_ESCAPE_PATTERN = /([`\\])/gu;
const TELEGRAM_MARKDOWN_V2_PARSE_MODE = "MarkdownV2";

const escapeTelegramMarkdownV2Text = (value: string): string =>
  value.replace(TELEGRAM_MARKDOWN_V2_SPECIAL_CHAR_PATTERN, "\\$1");

const escapeTelegramMarkdownV2LinkDestination = (value: string): string =>
  value.replace(TELEGRAM_MARKDOWN_V2_LINK_ESCAPE_PATTERN, "\\$1");

const escapeTelegramMarkdownV2Code = (value: string): string =>
  value.replace(TELEGRAM_MARKDOWN_V2_CODE_ESCAPE_PATTERN, "\\$1");

const sanitizeCodeLanguage = (value: string): string => value.replace(/[^a-z0-9_+-]/giu, "");

const getChildren = (node: Content): Content[] => getNodeChildren(node) ?? [];

const isHeadingNode = (node: Content): node is Content & { depth: number } => node.type === "heading";

const isImageNode = (node: Content): node is Content & { alt: string | null; url: string } => node.type === "image";

const isThematicBreakNode = (node: Content): boolean => node.type === "thematicBreak";

const extractPlainText = (node: Content): string => {
  if (isTextNode(node) || isInlineCodeNode(node) || isCodeNode(node)) {
    return getNodeValue(node) ?? "";
  }

  if (isLinkNode(node)) {
    return getChildren(node).map(extractPlainText).join("");
  }

  return getChildren(node).map(extractPlainText).join("");
};

const renderInlineNodes = (nodes: readonly Content[]): string => nodes.map(renderInlineNode).join("");

const renderLink = (node: Link): string => {
  const label = escapeTelegramMarkdownV2Text(getChildren(node).map(extractPlainText).join(""));
  return `[${label}](${escapeTelegramMarkdownV2LinkDestination(node.url)})`;
};

const renderInlineNode = (node: Content): string => {
  if (isTextNode(node)) {
    return escapeTelegramMarkdownV2Text(getNodeValue(node) ?? "");
  }

  if (isStrongNode(node)) {
    return `*${renderInlineNodes(getChildren(node))}*`;
  }

  if (isEmphasisNode(node)) {
    return `_${renderInlineNodes(getChildren(node))}_`;
  }

  if (isDeleteNode(node)) {
    return `~${renderInlineNodes(getChildren(node))}~`;
  }

  if (isInlineCodeNode(node)) {
    return `\`${escapeTelegramMarkdownV2Code(getNodeValue(node) ?? "")}\``;
  }

  if (isLinkNode(node)) {
    return renderLink(node);
  }

  if (node.type === "break") {
    return "\n";
  }

  if (isImageNode(node)) {
    const alt = typeof node.alt === "string" && node.alt.trim().length > 0 ? node.alt.trim() : "image";
    return `[${escapeTelegramMarkdownV2Text(alt)}](${escapeTelegramMarkdownV2LinkDestination(node.url)})`;
  }

  return renderInlineNodes(getChildren(node));
};

const indentMultilineBlock = (value: string, prefix: string, continuationPrefix: string): string => {
  const lines = value.split("\n");
  if (lines.length === 0) {
    return prefix.trimEnd();
  }

  return lines
    .map((line, index) => `${index === 0 ? prefix : continuationPrefix}${line}`)
    .join("\n");
};

const renderHeading = (node: Content): string => `*${renderInlineNodes(getChildren(node))}*`;

const renderCodeBlock = (node: Code): string => {
  const language = sanitizeCodeLanguage(node.lang ?? "");
  const code = escapeTelegramMarkdownV2Code(getNodeValue(node) ?? "");
  const info = language.length > 0 ? language : "";
  return `\`\`\`${info}\n${code}\n\`\`\``;
};

const renderTable = (node: MdastTable): string => {
  const ascii = tableToAscii(node);
  return `\`\`\`\n${escapeTelegramMarkdownV2Code(ascii)}\n\`\`\``;
};

const renderBlockquote = (node: Blockquote): string => {
  const inner = renderBlocks(getChildren(node));
  const lines = inner.split("\n");
  return lines.map((line) => (line.length > 0 ? `>${line}` : ">")).join("\n");
};

const renderListItem = (
  node: ListItem,
  ordered: boolean,
  markerNumber: number,
  depth: number,
): string => {
  const children = getChildren(node);
  const renderedChildren = children.map((child) => renderBlockNode(child, depth + 1)).filter(Boolean).join("\n");
  const indent = "  ".repeat(depth);
  const marker = ordered ? `${markerNumber}\\.` : "\\-";
  const prefix = `${indent}${marker} `;
  const continuationPrefix = `${indent}  `;
  return indentMultilineBlock(renderedChildren, prefix, continuationPrefix);
};

const renderList = (node: List, depth: number): string =>
  getChildren(node)
    .filter(isListItemNode)
    .map((child, index) => renderListItem(child, Boolean(node.ordered), (node.start ?? 1) + index, depth))
    .join("\n");

const renderBlockNode = (node: Content, depth = 0): string => {
  if (isParagraphNode(node)) {
    return renderInlineNodes(getChildren(node));
  }

  if (isListNode(node)) {
    return renderList(node, depth);
  }

  if (isBlockquoteNode(node)) {
    return renderBlockquote(node);
  }

  if (isCodeNode(node)) {
    return renderCodeBlock(node);
  }

  if (isTableNode(node)) {
    return renderTable(node);
  }

  if (isHeadingNode(node)) {
    return renderHeading(node);
  }

  if (isThematicBreakNode(node)) {
    return "\\-\\-\\-\\-\\-\\-\\-\\-";
  }

  if (isTextNode(node) || isStrongNode(node) || isEmphasisNode(node) || isDeleteNode(node) || isInlineCodeNode(node) || isLinkNode(node)) {
    return renderInlineNode(node);
  }

  return renderBlocks(getChildren(node), depth);
};

const renderBlocks = (nodes: readonly Content[], depth = 0): string =>
  nodes
    .map((node) => renderBlockNode(node, depth))
    .filter((node): node is string => node.trim().length > 0)
    .join("\n\n");

const renderRoot = (root: Root): string => renderBlocks(root.children);

export const convertMarkdownToTelegramMarkdownV2 = (markdown: string): string => {
  const normalized = markdown.replace(/\r\n/gu, "\n").trim();
  if (normalized.length === 0) {
    return "I do not have a useful reply yet\\.";
  }

  try {
    const ast = parseMarkdown(normalized);
    const rendered = renderRoot(ast).trim();
    if (rendered.length > 0) {
      return rendered;
    }
  } catch {
    // Fall through to a plain-text escape path if the markdown parser rejects the input.
  }

  return escapeTelegramMarkdownV2Text(markdownToPlainText(normalized));
};

export const telegramMarkdownV2ParseMode = TELEGRAM_MARKDOWN_V2_PARSE_MODE;
