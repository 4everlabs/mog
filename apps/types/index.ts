export type RuntimeBootstrap = {
  env: {
    telegram?: {
      botToken?: string;
      userName?: string;
      allowedChatIds?: readonly number[];
    };
    [key: string]: unknown;
  };
  gateway: {
    sendMessage: (params: {
      channel: string;
      title?: string;
      threadId?: string;
      message: string;
    }) => Promise<{
      thread: { id: string };
      replyMessage: { content: string };
    }>;
  };
  store: {
    listThreads: () => Array<{ id: string; channel: string; title?: string }>;
  };
};
