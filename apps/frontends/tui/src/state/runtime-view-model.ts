import type { RuntimeEvent, RuntimeView, Thread } from "@mog/types";
import type { ChatMessageViewModel } from "../layout/tokens.ts";
import { truncateMiddle } from "../layout/tokens.ts";

const DEFAULT_EMPTY_MESSAGE = "mog runtime is live. send a message to start the cli thread.";

export const selectActiveCliThread = (
  view: RuntimeView,
  activeThreadId?: string,
): Thread | null => {
  const selectedThread = activeThreadId
    ? view.threads.find((thread) => thread.id === activeThreadId) ?? null
    : null;

  if (selectedThread) {
    return selectedThread;
  }

  const defaultCliThreads = view.threads.filter((thread) =>
    thread.channel === "cli" && !thread.externalId && !thread.title,
  );

  return defaultCliThreads.find((thread) => thread.messages.length > 0)
    ?? defaultCliThreads.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))[0]
    ?? view.threads.find((thread) => thread.channel === "cli")
    ?? null;
};

export const buildChatMessages = (thread: Thread | null): ChatMessageViewModel[] => {
  if (!thread || thread.messages.length === 0) {
    return [{
      id: "empty-state",
      role: "assistant",
      content: DEFAULT_EMPTY_MESSAGE,
    }];
  }

  return thread.messages.map((message) => ({
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));
};

export const summarizeEventDetails = (event: RuntimeEvent): string | null => {
  if (event.artifactPath) {
    return truncateMiddle(event.artifactPath, 48);
  }

  if (event.threadId && event.channel) {
    return `${event.channel} // ${truncateMiddle(event.threadId, 18)}`;
  }

  if (event.sourceId && typeof event.details?.["newEntriesFound"] === "number") {
    return `${event.sourceId} // +${event.details["newEntriesFound"]} new`;
  }

  if (typeof event.details?.["workspaceFile"] === "string") {
    return truncateMiddle(event.details["workspaceFile"], 48);
  }

  if (typeof event.details?.["threadId"] === "string" && typeof event.details?.["channel"] === "string") {
    return `${event.details["channel"]} // ${truncateMiddle(event.details["threadId"], 18)}`;
  }

  if (typeof event.details?.["sourceId"] === "string" && typeof event.details?.["newEntriesFound"] === "number") {
    return `${event.details["sourceId"]} // +${event.details["newEntriesFound"]} new`;
  }

  if (typeof event.details?.["error"] === "string") {
    return event.details["error"];
  }

  if (typeof event.details?.["threadCount"] === "number") {
    return `${event.details["threadCount"]} threads`;
  }

  return null;
};
