import {
  BoxRenderable,
  CliRenderEvents,
  createCliRenderer,
  InputRenderable,
  InputRenderableEvents,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { bootstrap } from "../../../mog/src/runtime/bootstrap.ts";
import type {
  RuntimeEvent,
  RuntimeEventLevel,
  Thread,
  ThreadMessage,
} from "../../../mog/src/runtime/store.ts";

type PaneId = "chat" | "console";
type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface MessageChrome {
  label: string;
  labelColor: string;
  backgroundColor: string;
  borderColor: string;
  width: `${number}%`;
  alignSelf: "flex-start" | "flex-end";
}

interface ConsoleChrome {
  label: string;
  labelColor: string;
  borderColor: string;
}

const tokens = {
  bg: "#000000",
  bgSoft: "#0a0a0a",
  panel: "#000000",
  panelSoft: "#05070a",
  border: "#17314b",
  borderStrong: "#68b5fc",
  blue: "#68b5fc",
  yellow: "#e0af68",
  red: "#f7768e",
  text: "#d4d4d4",
  muted: "#666666",
  line: "#2a2116",
  assistantBubble: "#071019",
  userBubble: "#0b0b0d",
};

const runtime = await bootstrap();
const runtimeSurface = await runtime.gateway.bootstrap();
const runtimeThread = runtime.store.ensureDefaultThread("cli");
let activeThreadId = runtimeThread.id;

if (runtime.env.twitter.enabled || runtime.env.rss.enabled) {
  runtime.monitorLoop.start();
}

runtime.store.addEvent({
  kind: "system",
  level: "info",
  source: "frontend.tui",
  message: "open tui attached to mog runtime",
  details: {
    threadId: activeThreadId,
    workspacePath: runtime.env.workspacePath,
    enabledProviders: {
      rss: runtime.env.rss.enabled,
      twitter: runtime.env.twitter.enabled,
    },
  },
});

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  useAlternateScreen: true,
  useMouse: true,
  backgroundColor: tokens.bg,
});

const appShell = new BoxRenderable(renderer, {
  id: "app-shell",
  width: "100%",
  height: "100%",
  flexDirection: "column",
  padding: 1,
  backgroundColor: tokens.bg,
  border: true,
  borderStyle: "single",
  borderColor: tokens.border,
});

const chromeBar = new BoxRenderable(renderer, {
  id: "chrome-bar",
  width: "100%",
  height: 2,
  flexDirection: "row",
  alignItems: "center",
  gap: 1,
  paddingX: 1,
  backgroundColor: tokens.bgSoft,
  border: ["bottom"],
  borderStyle: "single",
  borderColor: tokens.border,
});

const chromeLights = new BoxRenderable(renderer, {
  id: "chrome-lights",
  flexDirection: "row",
  gap: 1,
  backgroundColor: tokens.bgSoft,
});

const lightRed = new TextRenderable(renderer, {
  id: "light-red",
  content: "o",
  fg: tokens.red,
});

const lightYellow = new TextRenderable(renderer, {
  id: "light-yellow",
  content: "o",
  fg: tokens.yellow,
});

const lightBlue = new TextRenderable(renderer, {
  id: "light-blue",
  content: "o",
  fg: tokens.blue,
});

chromeLights.add(lightRed);
chromeLights.add(lightYellow);
chromeLights.add(lightBlue);

const chromeTitle = new TextRenderable(renderer, {
  id: "chrome-title",
  content: "mog://open-tui",
  fg: tokens.text,
});

const chromeTagline = new TextRenderable(renderer, {
  id: "chrome-tagline",
  content: "quietly opinionated",
  fg: tokens.yellow,
});

const chromeSpacer = new BoxRenderable(renderer, {
  id: "chrome-spacer",
  flexGrow: 1,
  backgroundColor: tokens.bgSoft,
});

const chromeMode = new TextRenderable(renderer, {
  id: "chrome-mode",
  content: "chat active",
  fg: tokens.blue,
});

chromeBar.add(chromeLights);
chromeBar.add(chromeTitle);
chromeBar.add(chromeTagline);
chromeBar.add(chromeSpacer);
chromeBar.add(chromeMode);

const workArea = new BoxRenderable(renderer, {
  id: "work-area",
  flexGrow: 1,
  width: "100%",
  flexDirection: "row",
  gap: 1,
  padding: 1,
  backgroundColor: tokens.panel,
});

const chatPanel = new BoxRenderable(renderer, {
  id: "chat-panel",
  flexGrow: 1,
  width: "50%",
  height: "100%",
  flexDirection: "column",
  gap: 1,
  padding: 1,
  backgroundColor: tokens.panel,
  border: true,
  borderStyle: "single",
  borderColor: tokens.borderStrong,
  onMouseDown() {
    focusPane("chat");
  },
});

const chatEyebrowBox = new BoxRenderable(renderer, {
  id: "chat-eyebrow-box",
  width: "100%",
  flexDirection: "row",
  gap: 1,
  paddingX: 1,
  paddingY: 0,
  backgroundColor: tokens.panelSoft,
  border: true,
  borderStyle: "single",
  borderColor: tokens.line,
});

const chatEyebrowPrompt = new TextRenderable(renderer, {
  id: "chat-eyebrow-prompt",
  content: "$",
  fg: tokens.yellow,
});

const chatEyebrowCommand = new TextRenderable(renderer, {
  id: "chat-eyebrow-command",
  content: "./launch_mog",
  fg: tokens.text,
});

chatEyebrowBox.add(chatEyebrowPrompt);
chatEyebrowBox.add(chatEyebrowCommand);

const chatAccentLine = new TextRenderable(renderer, {
  id: "chat-accent-line",
  content: "quietly opinionated software for marketers",
  fg: tokens.yellow,
});

const chatHeadline = new TextRenderable(renderer, {
  id: "chat-headline",
  content: "the marketing agent that ships",
  fg: tokens.blue,
});

const chatSubline = new TextRenderable(renderer, {
  id: "chat-subline",
  content: "research, write, post, and tighten the loop",
  fg: tokens.muted,
});

const chatChipRow = new BoxRenderable(renderer, {
  id: "chat-chip-row",
  width: "100%",
  flexDirection: "row",
  gap: 1,
  flexWrap: "wrap",
  backgroundColor: tokens.panel,
});

function createChip(id: string, label: string, textColor: string, borderColor: string): BoxRenderable {
  const chip = new BoxRenderable(renderer, {
    id,
    paddingX: 1,
    backgroundColor: tokens.panelSoft,
    border: true,
    borderStyle: "single",
    borderColor,
  });

  chip.add(
    new TextRenderable(renderer, {
      id: `${id}-label`,
      content: label,
      fg: textColor,
    }),
  );

  return chip;
}

chatChipRow.add(createChip("chip-research", "research", tokens.blue, tokens.border));
chatChipRow.add(createChip("chip-compose", "compose", tokens.yellow, tokens.line));
chatChipRow.add(createChip("chip-feedback", "feedback", tokens.red, tokens.red));

const chatStreamFrame = new BoxRenderable(renderer, {
  id: "chat-stream-frame",
  flexGrow: 1,
  width: "100%",
  padding: 1,
  backgroundColor: tokens.panelSoft,
  border: true,
  borderStyle: "single",
  borderColor: tokens.border,
});

const chatScroll = new ScrollBoxRenderable(renderer, {
  id: "chat-scroll",
  flexGrow: 1,
  height: "100%",
  width: "100%",
  stickyScroll: true,
  stickyStart: "bottom",
  rootOptions: {
    backgroundColor: tokens.panelSoft,
  },
  viewportOptions: {
    backgroundColor: tokens.panelSoft,
  },
  contentOptions: {
    backgroundColor: tokens.panelSoft,
  },
});

chatStreamFrame.add(chatScroll);

const chatStatus = new TextRenderable(renderer, {
  id: "chat-status",
  content: "chat active // enter send // tab terminal",
  fg: tokens.blue,
});

const composerFrame = new BoxRenderable(renderer, {
  id: "composer-frame",
  width: "100%",
  flexDirection: "column",
  gap: 1,
  padding: 1,
  backgroundColor: tokens.panelSoft,
  border: true,
  borderStyle: "single",
  borderColor: tokens.line,
});

const composerLabel = new TextRenderable(renderer, {
  id: "composer-label",
  content: "quick install // placeholder preview",
  fg: tokens.muted,
});

const composerRow = new BoxRenderable(renderer, {
  id: "composer-row",
  width: "100%",
  flexDirection: "row",
  gap: 1,
  alignItems: "center",
  backgroundColor: tokens.panelSoft,
});

const composerPromptBox = new BoxRenderable(renderer, {
  id: "composer-prompt-box",
  paddingX: 1,
  backgroundColor: tokens.panel,
  border: true,
  borderStyle: "single",
  borderColor: tokens.line,
});

composerPromptBox.add(
  new TextRenderable(renderer, {
    id: "composer-prompt",
    content: "$",
    fg: tokens.yellow,
  }),
);

const chatInput = new InputRenderable(renderer, {
  id: "chat-input",
  flexGrow: 1,
  width: "100%",
  placeholder: "tell mog what to work on",
  backgroundColor: tokens.panel,
  focusedBackgroundColor: "#08111a",
  textColor: tokens.text,
  cursorColor: tokens.yellow,
  maxLength: 2000,
});

composerRow.add(composerPromptBox);
composerRow.add(chatInput);
composerFrame.add(composerLabel);
composerFrame.add(composerRow);

const consolePanel = new BoxRenderable(renderer, {
  id: "console-panel",
  flexGrow: 1,
  width: "50%",
  height: "100%",
  flexDirection: "column",
  gap: 1,
  padding: 1,
  backgroundColor: tokens.panel,
  border: true,
  borderStyle: "single",
  borderColor: tokens.border,
  onMouseDown() {
    focusPane("console");
  },
});

const consoleMetaTop = new TextRenderable(renderer, {
  id: "console-meta-top",
  content: "",
  fg: tokens.yellow,
});

const consoleMetaBottom = new TextRenderable(renderer, {
  id: "console-meta-bottom",
  content: "",
  fg: tokens.muted,
});

const consoleInfoRow = new BoxRenderable(renderer, {
  id: "console-info-row",
  width: "100%",
  flexDirection: "row",
  gap: 1,
  flexWrap: "wrap",
  backgroundColor: tokens.panel,
});

consoleInfoRow.add(createChip("console-chip-live", "mog logs", tokens.blue, tokens.border));
consoleInfoRow.add(createChip("console-chip-tools", "tools", tokens.yellow, tokens.line));
consoleInfoRow.add(createChip("console-chip-findings", "findings", tokens.red, tokens.red));

const consoleFrame = new BoxRenderable(renderer, {
  id: "console-frame",
  flexGrow: 1,
  width: "100%",
  padding: 1,
  backgroundColor: tokens.panelSoft,
  border: true,
  borderStyle: "single",
  borderColor: tokens.border,
});

const consoleScroll = new ScrollBoxRenderable(renderer, {
  id: "console-scroll",
  flexGrow: 1,
  height: "100%",
  width: "100%",
  stickyScroll: true,
  stickyStart: "bottom",
  rootOptions: {
    backgroundColor: tokens.panelSoft,
  },
  viewportOptions: {
    backgroundColor: tokens.panelSoft,
  },
  contentOptions: {
    backgroundColor: tokens.panelSoft,
  },
});

consoleFrame.add(consoleScroll);

const consoleStatus = new TextRenderable(renderer, {
  id: "console-status",
  content: "mog console // runtime events // findings",
  fg: tokens.muted,
});

const footerBar = new BoxRenderable(renderer, {
  id: "footer-bar",
  width: "100%",
  height: 2,
  flexDirection: "row",
  alignItems: "center",
  gap: 1,
  paddingX: 1,
  backgroundColor: tokens.bgSoft,
  border: ["top"],
  borderStyle: "single",
  borderColor: tokens.border,
});

const footerLeft = new TextRenderable(renderer, {
  id: "footer-left",
  content: "tab switch // enter send // ctrl+q quit",
  fg: tokens.muted,
});

const footerSpacer = new BoxRenderable(renderer, {
  id: "footer-spacer",
  flexGrow: 1,
  backgroundColor: tokens.bgSoft,
});

const footerRight = new TextRenderable(renderer, {
  id: "footer-right",
  content: "mog local session",
  fg: tokens.blue,
});

footerBar.add(footerLeft);
footerBar.add(footerSpacer);
footerBar.add(footerRight);

chatPanel.add(chatEyebrowBox);
chatPanel.add(chatAccentLine);
chatPanel.add(chatHeadline);
chatPanel.add(chatSubline);
chatPanel.add(chatChipRow);
chatPanel.add(chatStreamFrame);
chatPanel.add(chatStatus);
chatPanel.add(composerFrame);

consolePanel.add(consoleMetaTop);
consolePanel.add(consoleMetaBottom);
consolePanel.add(consoleInfoRow);
consolePanel.add(consoleFrame);
consolePanel.add(consoleStatus);

workArea.add(chatPanel);
workArea.add(consolePanel);

appShell.add(chromeBar);
appShell.add(workArea);
appShell.add(footerBar);
renderer.root.add(appShell);

const chatMessages: ChatMessage[] = [];

let activePane: PaneId = "chat";
let shuttingDown = false;
let isSending = false;

function getActiveThread(): Thread {
  return runtime.store.getThread(activeThreadId)
    ?? runtime.store.ensureDefaultThread("cli");
}

function toChatRole(role: ThreadMessage["role"]): ChatRole {
  return role === "assistant" ? "assistant" : "user";
}

function clearChildren(scrollBox: ScrollBoxRenderable): void {
  for (const child of scrollBox.getChildren()) {
    scrollBox.remove(child.id);
  }
}

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const visible = Math.max(6, maxLength - 3);
  const left = Math.ceil(visible / 2);
  const right = Math.floor(visible / 2);
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function messageChrome(role: ChatRole): MessageChrome {
  if (role === "assistant") {
    return {
      label: "MOG",
      labelColor: tokens.yellow,
      backgroundColor: tokens.assistantBubble,
      borderColor: tokens.borderStrong,
      width: "92%",
      alignSelf: "flex-start" as const,
    };
  }

  return {
    label: "YOU",
    labelColor: tokens.red,
    backgroundColor: tokens.userBubble,
    borderColor: tokens.red,
    width: "82%",
    alignSelf: "flex-end" as const,
  };
}

function consoleChrome(level: RuntimeEventLevel): ConsoleChrome {
  switch (level) {
    case "error":
      return {
        label: "ERR",
        labelColor: tokens.red,
        borderColor: tokens.red,
      };
    case "warning":
      return {
        label: "WRN",
        labelColor: tokens.yellow,
        borderColor: tokens.yellow,
      };
    case "debug":
      return {
        label: "DBG",
        labelColor: tokens.muted,
        borderColor: tokens.line,
      };
    default:
      return {
        label: "INF",
        labelColor: tokens.blue,
        borderColor: tokens.border,
      };
  }
}

function formatEventTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
}

function summarizeEventDetails(event: RuntimeEvent): string | null {
  const details = event.details;
  if (!details) {
    return null;
  }

  if (typeof details["workspaceFile"] === "string") {
    return truncateMiddle(details["workspaceFile"], 48);
  }

  if (typeof details["threadId"] === "string" && typeof details["channel"] === "string") {
    return `${details["channel"]} // ${truncateMiddle(details["threadId"], 18)}`;
  }

  if (typeof details["sourceId"] === "string" && typeof details["newEntriesFound"] === "number") {
    return `${details["sourceId"]} // +${details["newEntriesFound"]} new`;
  }

  if (typeof details["error"] === "string") {
    return details["error"];
  }

  if (typeof details["threadCount"] === "number") {
    return `${details["threadCount"]} threads`;
  }

  return null;
}

function syncChatFromRuntime(): void {
  const thread = getActiveThread();
  chatMessages.splice(
    0,
    chatMessages.length,
    ...thread.messages.map((message) => ({
      id: message.id,
      role: toChatRole(message.role),
      content: message.content,
    })),
  );

  if (chatMessages.length === 0) {
    chatMessages.push({
      id: "empty-state",
      role: "assistant",
      content: "mog runtime is live. send a message to start the cli thread.",
    });
  }
}

function renderChat(): void {
  clearChildren(chatScroll);

  for (const message of chatMessages) {
    const chrome = messageChrome(message.role);
    const bubble = new BoxRenderable(renderer, {
      id: `bubble-${message.id}`,
      width: chrome.width,
      flexDirection: "column",
      padding: 1,
      marginBottom: 1,
      backgroundColor: chrome.backgroundColor,
      border: true,
      borderStyle: "single",
      borderColor: chrome.borderColor,
    });
    bubble.alignSelf = chrome.alignSelf;

    bubble.add(
      new TextRenderable(renderer, {
        id: `label-${message.id}`,
        content: chrome.label,
        fg: chrome.labelColor,
      }),
    );

    bubble.add(
      new TextRenderable(renderer, {
        id: `content-${message.id}`,
        content: message.content,
        fg: tokens.text,
      }),
    );

    chatScroll.add(bubble);
  }
}

function renderConsole(): void {
  clearChildren(consoleScroll);

  const events = runtime.store.listEvents().slice(-120);

  for (const event of events) {
    const chrome = consoleChrome(event.level);
    const row = new BoxRenderable(renderer, {
      id: `console-event-${event.id}`,
      width: "100%",
      flexDirection: "column",
      marginBottom: 1,
      paddingX: 1,
      paddingY: 0,
      backgroundColor: tokens.panelSoft,
      border: true,
      borderStyle: "single",
      borderColor: chrome.borderColor,
    });

    const topRow = new BoxRenderable(renderer, {
      id: `console-top-${event.id}`,
      width: "100%",
      flexDirection: "row",
      gap: 1,
      backgroundColor: tokens.panelSoft,
    });

    topRow.add(
      new TextRenderable(renderer, {
        id: `console-level-${event.id}`,
        content: chrome.label,
        fg: chrome.labelColor,
      }),
    );
    topRow.add(
      new TextRenderable(renderer, {
        id: `console-time-${event.id}`,
        content: formatEventTime(event.timestamp),
        fg: tokens.muted,
      }),
    );
    topRow.add(
      new TextRenderable(renderer, {
        id: `console-source-${event.id}`,
        content: event.source,
        fg: tokens.text,
      }),
    );

    row.add(topRow);
    row.add(
      new TextRenderable(renderer, {
        id: `console-message-${event.id}`,
        content: event.message,
        fg: tokens.text,
      }),
    );

    const detail = summarizeEventDetails(event);
    if (detail) {
      row.add(
        new TextRenderable(renderer, {
          id: `console-detail-${event.id}`,
          content: detail,
          fg: tokens.muted,
        }),
      );
    }

    consoleScroll.add(row);
  }
}

function syncRuntimeViews(): void {
  syncChatFromRuntime();
  renderChat();
  renderConsole();
  syncStatus();
}

function syncStatus(): void {
  const chatFocused = activePane === "chat";
  const compact = renderer.width < 110 || renderer.height < 28;
  const stacked = renderer.width < 70;
  const eventCount = runtime.store.listEvents().length;
  const findingCount = runtime.store.listFindings().length;
  const status = runtime.store.getStatus();

  workArea.flexDirection = stacked ? "column" : "row";
  chatPanel.width = stacked ? "100%" : "50%";
  consolePanel.width = stacked ? "100%" : "50%";

  chatPanel.borderColor = chatFocused ? tokens.borderStrong : tokens.border;
  consolePanel.borderColor = chatFocused ? tokens.border : tokens.borderStrong;

  chromeMode.content = chatFocused ? "chat active" : "console active";
  chromeMode.fg = chatFocused ? tokens.blue : tokens.red;
  chromeTagline.visible = !compact;
  chromeTagline.content = "quietly opinionated";
  footerLeft.content = compact
    ? "tab switch // enter send"
    : "tab switch // enter send // ctrl+q quit";
  footerRight.visible = !compact;
  footerRight.content = `${status} // ${runtimeSurface.availableTools.length} tools`;

  chatHeadline.visible = !compact;
  chatAccentLine.visible = !compact;
  chatSubline.visible = !compact;
  chatChipRow.visible = !compact;
  composerLabel.visible = !compact;
  composerPromptBox.visible = !compact;
  consoleInfoRow.visible = !compact;
  consoleMetaBottom.visible = !compact;
  chatStatus.visible = !compact;
  consoleStatus.visible = !compact;

  composerFrame.border = !compact;
  composerFrame.padding = compact ? 0 : 1;
  composerFrame.backgroundColor = compact ? tokens.panel : tokens.panelSoft;

  chatStatus.content = chatFocused
    ? isSending
      ? "chat active // sending..."
      : "chat active // enter send"
    : "chat idle // tab back";
  chatStatus.fg = chatFocused ? tokens.blue : tokens.muted;

  consoleStatus.content = chatFocused
    ? `console idle // ${eventCount} events // ${findingCount} findings`
    : `console active // ${eventCount} events`;
  consoleStatus.fg = chatFocused ? tokens.muted : tokens.red;

  consoleMetaTop.content = `${runtime.env.appName} // ${status}`;
  consoleMetaTop.fg = status === "error" ? tokens.red : status === "monitoring" ? tokens.yellow : tokens.blue;
  consoleMetaBottom.content = truncateMiddle(runtime.env.workspacePath, stacked ? 34 : 54);
}

function focusPane(pane: PaneId): void {
  activePane = pane;

  if (pane === "chat") {
    chatInput.focus();
    consoleScroll.blur();
  } else {
    chatInput.blur();
    consoleScroll.focus();
  }

  syncStatus();
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  runtime.store.addEvent({
    kind: "system",
    level: "info",
    source: "frontend.tui",
    message: "open tui shutting down",
  });
  runtime.monitorLoop.stop();
  renderer.destroy();
}

chatInput.on(InputRenderableEvents.ENTER, async (value: string) => {
  const message = value.trim();
  if (!message || isSending) {
    return;
  }

  isSending = true;
  syncStatus();
  chatInput.value = "";

  try {
    const response = await runtime.gateway.sendMessage({
      channel: "cli",
      threadId: activeThreadId,
      message,
    });
    activeThreadId = response.thread.id;
  } catch (error) {
    runtime.store.addEvent({
      kind: "system",
      level: "error",
      source: "frontend.tui",
      message: "failed to send cli message",
      details: {
        error: error instanceof Error ? error.message : String(error),
        input: message,
      },
    });
  } finally {
    isSending = false;
    syncRuntimeViews();
    chatInput.focus();
  }
});

renderer.keyInput.on("keypress", (key) => {
  if (key.ctrl && key.name === "q") {
    key.preventDefault();
    void shutdown();
    return;
  }

  if (key.name === "tab") {
    key.preventDefault();
    focusPane(activePane === "chat" ? "console" : "chat");
    return;
  }
});

renderer.on(CliRenderEvents.RESIZE, () => {
  syncStatus();
});

runtime.store.on("change", () => {
  syncRuntimeViews();
});

syncRuntimeViews();
focusPane("chat");

setTimeout(() => {
  syncStatus();
}, 0);
