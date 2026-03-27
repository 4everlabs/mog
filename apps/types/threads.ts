export type RuntimeChannel = "cli" | "telegram" | "web" | "system";

export type ThreadMessageRole = "user" | "assistant" | "system";

export interface ThreadMessage {
  id: string;
  role: ThreadMessageRole;
  content: string;
  timestamp: string;
}

export interface Thread {
  id: string;
  channel: RuntimeChannel;
  externalId?: string;
  title?: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
}
