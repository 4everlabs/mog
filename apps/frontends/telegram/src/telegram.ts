import { Chat, markdownToPlainText, type Message, type Thread } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import type { RuntimeBootstrap } from "@mog/types";
import {
  convertMarkdownToTelegramMarkdownV2,
  telegramMarkdownV2ParseMode,
} from "./markdown-v2";

const writeStdoutLine = (value: string): void => {
  process.stdout.write(`${value}\n`);
};

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

type TelegramThreadTarget = {
  chatId: string;
  messageThreadId?: number;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

const getThreadTitle = (threadId: string): string => `Telegram Thread ${threadId}`;

const getRawChatId = (message: Message): number | null => {
  const raw = message.raw as { chat?: { id?: unknown } } | undefined;
  return typeof raw?.chat?.id === "number" ? raw.chat.id : null;
};

const isAllowedChat = (message: Message, allowedChatIds: readonly number[]): boolean => {
  if (allowedChatIds.length === 0) {
    return true;
  }

  const chatId = getRawChatId(message);
  return chatId !== null && allowedChatIds.includes(chatId);
};

const normalizeTelegramReplyText = (value: string): string => {
  const normalized = value
    .replace(/\r\n/gu, "\n")
    .trim();

  return normalized.length > 0 ? normalized : "I do not have a useful reply yet.";
};

const decodeTelegramThreadId = (threadId: string): TelegramThreadTarget => {
  const parts = threadId.split(":");
  if (parts[0] !== "telegram" || parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid Telegram thread ID: ${threadId}`);
  }

  const chatId = parts[1];
  if (!chatId) {
    throw new Error(`Invalid Telegram thread ID: ${threadId}`);
  }

  const messageThreadIdRaw = parts[2];
  if (!messageThreadIdRaw) {
    return { chatId };
  }

  const messageThreadId = Number.parseInt(messageThreadIdRaw, 10);
  if (!Number.isInteger(messageThreadId)) {
    throw new Error(`Invalid Telegram message thread ID: ${threadId}`);
  }

  return {
    chatId,
    messageThreadId,
  };
};

const sendTelegramMessage = async (
  botToken: string,
  threadId: string,
  text: string,
  parseMode?: string,
): Promise<void> => {
  const target = decodeTelegramThreadId(threadId);
  const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: target.chatId,
      message_thread_id: target.messageThreadId,
      text,
      parse_mode: parseMode,
    }),
  });

  const payload = await response.json() as TelegramSendMessageResponse;
  if (!response.ok || !payload.ok) {
    const description = payload.description ?? response.statusText;
    throw new Error(`Telegram sendMessage failed: ${description}`);
  }
};

const sendTelegramReply = async (
  botToken: string,
  threadId: string,
  markdown: string,
): Promise<void> => {
  const telegramMarkdown = convertMarkdownToTelegramMarkdownV2(markdown);

  try {
    await sendTelegramMessage(botToken, threadId, telegramMarkdown, telegramMarkdownV2ParseMode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("parse entities")) {
      throw error;
    }

    const plainText = normalizeTelegramReplyText(markdownToPlainText(markdown));
    await sendTelegramMessage(botToken, threadId, plainText);
    writeStdoutLine("[telegram] MarkdownV2 parse failed, fell back to plain text");
  }
};

const forwardMessageToRuntime = async (
  runtime: RuntimeBootstrap,
  runtimeThreadIds: Map<string, string>,
  thread: Thread,
  message: Message,
): Promise<string> => {
  const title = getThreadTitle(thread.id);
  const existingThreadId = runtimeThreadIds.get(thread.id)
    ?? runtime.store.listThreads().find((entry) => entry.channel === "telegram" && entry.title === title)?.id;

  const response = await runtime.gateway.sendMessage(
    existingThreadId
      ? {
          channel: "telegram",
          threadId: existingThreadId,
          message: message.text,
        }
      : {
          channel: "telegram",
          title,
          message: message.text,
        },
  );

  runtimeThreadIds.set(thread.id, response.thread.id);
  return response.replyMessage.content;
};

const postRuntimeReply = async (
  runtime: RuntimeBootstrap,
  botToken: string,
  runtimeThreadIds: Map<string, string>,
  allowedChatIds: readonly number[],
  thread: Thread,
  message: Message,
): Promise<void> => {
  if (!isAllowedChat(message, allowedChatIds)) {
    return;
  }

  writeStdoutLine(`[telegram] received message on ${thread.id}: ${message.text}`);
  const reply = await forwardMessageToRuntime(runtime, runtimeThreadIds, thread, message);
  const plainTextReply = normalizeTelegramReplyText(reply);
  await sendTelegramReply(botToken, thread.id, plainTextReply);
  writeStdoutLine(`[telegram] posted reply on ${thread.id}: ${plainTextReply.slice(0, 240)}`);
};

const queueThreadReply = (
  threadQueues: Map<string, Promise<void>>,
  threadId: string,
  operation: () => Promise<void>,
): Promise<void> => {
  const previous = threadQueues.get(threadId) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(operation);

  threadQueues.set(threadId, run);

  return run.finally(() => {
    if (threadQueues.get(threadId) === run) {
      threadQueues.delete(threadId);
    }
  });
};

export const startTelegramSurface = async (runtime: RuntimeBootstrap): Promise<void> => {
  const botToken = runtime.env.telegram?.botToken;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required when Telegram is enabled.");
  }

  const telegram = createTelegramAdapter({
    mode: "polling",
    userName: runtime.env.telegram?.userName ?? undefined,
  });

  const bot = new Chat({
    userName: runtime.env.telegram?.userName ?? "mog",
    adapters: {
      telegram,
    },
    state: createMemoryState(),
  });

  const runtimeThreadIds = new Map<string, string>();
  const threadQueues = new Map<string, Promise<void>>();
  const allowedChatIds = [...(runtime.env.telegram?.allowedChatIds ?? [])];

  bot.onNewMention(async (thread, message) => {
    await queueThreadReply(threadQueues, thread.id, async () => {
      await thread.subscribe();
      await postRuntimeReply(runtime, botToken, runtimeThreadIds, allowedChatIds, thread, message);
    });
  });

  bot.onNewMessage(/[\s\S]+/u, async (thread, message) => {
    await queueThreadReply(threadQueues, thread.id, async () => {
      await thread.subscribe();
      await postRuntimeReply(runtime, botToken, runtimeThreadIds, allowedChatIds, thread, message);
    });
  });

  bot.onSubscribedMessage(async (thread, message) => {
    await queueThreadReply(threadQueues, thread.id, async () => {
      await postRuntimeReply(runtime, botToken, runtimeThreadIds, allowedChatIds, thread, message);
    });
  });

  await bot.initialize();
  writeStdoutLine(`[telegram] Chat SDK initialized in ${telegram.runtimeMode} mode`);
};
