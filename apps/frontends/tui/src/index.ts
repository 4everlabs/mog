import {
  BoxRenderable,
  CliRenderEvents,
  createCliRenderer,
  InputRenderable,
  InputRenderableEvents,
  ScrollBoxRenderable,
  TextRenderable,
  type KeyEvent,
} from "@opentui/core";

type PaneId = "chat" | "terminal";
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

const terminalRowsPadding = 10;
const terminalColsPadding = 8;
const maxTerminalChars = 48_000;
const esc = String.fromCharCode(27);
const bell = String.fromCharCode(7);
const ansiPattern = new RegExp(
  `${esc}(?:\\][^${bell}]*(?:${bell}|${esc}\\\\)|[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])`,
  "g",
);

const shellPath = process.env.SHELL ?? "/bin/zsh";
const shellLabel = shellPath.split("/").pop() ?? shellPath;
const shellArgs =
  shellLabel === "zsh"
    ? ["-f"]
    : shellLabel === "bash"
      ? ["--noprofile", "--norc", "-i"]
      : [];

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

const terminalPanel = new BoxRenderable(renderer, {
  id: "terminal-panel",
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
    focusPane("terminal");
  },
});

const terminalMetaTop = new TextRenderable(renderer, {
  id: "terminal-meta-top",
  content: "",
  fg: tokens.yellow,
});

const terminalMetaBottom = new TextRenderable(renderer, {
  id: "terminal-meta-bottom",
  content: "",
  fg: tokens.muted,
});

const terminalInfoRow = new BoxRenderable(renderer, {
  id: "terminal-info-row",
  width: "100%",
  flexDirection: "row",
  gap: 1,
  flexWrap: "wrap",
  backgroundColor: tokens.panel,
});

terminalInfoRow.add(createChip("terminal-chip-live", "local shell", tokens.blue, tokens.border));
terminalInfoRow.add(createChip("terminal-chip-pty", "pty linked", tokens.yellow, tokens.line));
terminalInfoRow.add(createChip("terminal-chip-focus", "tab to focus", tokens.red, tokens.red));

const terminalFrame = new BoxRenderable(renderer, {
  id: "terminal-frame",
  flexGrow: 1,
  width: "100%",
  padding: 1,
  backgroundColor: tokens.panelSoft,
  border: true,
  borderStyle: "single",
  borderColor: tokens.border,
});

const terminalScroll = new ScrollBoxRenderable(renderer, {
  id: "terminal-scroll",
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

terminalFrame.add(terminalScroll);

const terminalText = new TextRenderable(renderer, {
  id: "terminal-text",
  width: "100%",
  content: "",
  fg: tokens.text,
});

const terminalStatus = new TextRenderable(renderer, {
  id: "terminal-status",
  content: "shell inactive // tab to capture keys // ctrl+q quit",
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

terminalScroll.add(terminalText);
terminalPanel.add(terminalMetaTop);
terminalPanel.add(terminalMetaBottom);
terminalPanel.add(terminalInfoRow);
terminalPanel.add(terminalFrame);
terminalPanel.add(terminalStatus);

workArea.add(chatPanel);
workArea.add(terminalPanel);

appShell.add(chromeBar);
appShell.add(workArea);
appShell.add(footerBar);
renderer.root.add(appShell);

const chatMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "left side is mog chat. right side is the live local shell.",
  },
  {
    id: "assistant-hint",
    role: "assistant",
    content:
      "the shell styling now mirrors the website language.",
  },
];

let activePane: PaneId = "chat";
let terminalBuffer = "";
let terminalClosed = false;
let shuttingDown = false;
let messageCounter = 0;

const decoder = new TextDecoder();
const terminal = new Bun.Terminal({
  cols: 80,
  rows: 24,
  data(_term, data) {
    appendTerminalOutput(decoder.decode(data));
  },
  exit() {
    terminalClosed = true;
    appendTerminalOutput("\n[terminal closed]\n");
    syncStatus();
  },
});

const shell = Bun.spawn([shellPath, ...shellArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TERM: "dumb",
  },
  terminal,
  onExit(_proc, exitCode, signalCode, error) {
    const detail = error?.message ?? (signalCode ? `signal ${signalCode}` : `exit ${exitCode ?? "?"}`);
    appendTerminalOutput(`\n[shell ended: ${detail}]\n`);
    terminalClosed = true;
    syncStatus();
  },
});

function escapeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "");
}

function sanitizeTerminalOutput(value: string): string {
  return escapeText(value).replace(ansiPattern, "");
}

function appendTerminalOutput(value: string): void {
  terminalBuffer = `${terminalBuffer}${sanitizeTerminalOutput(value)}`.slice(-maxTerminalChars);
  terminalText.content = terminalBuffer;
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

function addChatMessage(role: ChatRole, content: string): void {
  messageCounter += 1;
  chatMessages.push({
    id: `${role}-${messageCounter}`,
    role,
    content,
  });

  if (chatMessages.length > 40) {
    chatMessages.splice(0, chatMessages.length - 40);
  }

  renderChat();
}

function syncStatus(): void {
  const chatFocused = activePane === "chat";
  const compact = renderer.width < 110 || renderer.height < 28;
  const stacked = renderer.width < 70;
  const cwdLimit = stacked ? 34 : 54;

  workArea.flexDirection = stacked ? "column" : "row";
  chatPanel.width = stacked ? "100%" : "50%";
  terminalPanel.width = stacked ? "100%" : "50%";

  chatPanel.borderColor = chatFocused ? tokens.borderStrong : tokens.border;
  terminalPanel.borderColor = chatFocused ? tokens.border : tokens.borderStrong;

  chromeMode.content = chatFocused ? "chat active" : "shell active";
  chromeMode.fg = chatFocused ? tokens.blue : tokens.red;
  chromeTagline.visible = !compact;
  chromeTagline.content = "quietly opinionated";
  footerLeft.content = compact
    ? "tab switch // enter send"
    : "tab switch // enter send // ctrl+q quit";
  footerRight.visible = !compact;
  footerRight.content = "mog session";

  chatHeadline.visible = !compact;
  chatAccentLine.visible = !compact;
  chatSubline.visible = !compact;
  chatChipRow.visible = !compact;
  composerLabel.visible = !compact;
  composerPromptBox.visible = !compact;
  terminalInfoRow.visible = !compact;
  terminalMetaBottom.visible = !compact;
  chatStatus.visible = !compact;
  terminalStatus.visible = !compact;

  composerFrame.border = !compact;
  composerFrame.padding = compact ? 0 : 1;
  composerFrame.backgroundColor = compact ? tokens.panel : tokens.panelSoft;

  chatStatus.content = chatFocused
    ? "chat active // enter send"
    : "chat idle // tab back";
  chatStatus.fg = chatFocused ? tokens.blue : tokens.muted;

  terminalStatus.content = chatFocused
    ? "shell inactive // tab to focus"
    : terminalClosed
      ? "shell active // shell closed"
      : "shell active // keys live";
  terminalStatus.fg = chatFocused ? tokens.muted : tokens.red;

  terminalMetaTop.content = terminalClosed
    ? `${shellLabel} offline`
    : `${shellLabel} // pid ${shell.pid}`;
  terminalMetaTop.fg = terminalClosed ? tokens.red : tokens.yellow;
  terminalMetaBottom.content = truncateMiddle(process.cwd(), cwdLimit);
}

function focusPane(pane: PaneId): void {
  activePane = pane;

  if (pane === "chat") {
    chatInput.focus();
    terminalScroll.blur();
  } else {
    chatInput.blur();
    terminalScroll.focus();
  }

  syncStatus();
}

function resizeTerminal(): void {
  const cols = Math.max(24, terminalScroll.width - terminalColsPadding);
  const rows = Math.max(8, terminalScroll.height - terminalRowsPadding);
  terminal.resize(cols, rows);
  syncStatus();
}

function keyToTerminalSequence(key: KeyEvent): string | null {
  if (key.sequence) {
    return key.sequence;
  }

  switch (key.name) {
    case "return":
    case "enter":
      return "\r";
    case "backspace":
      return "\u007f";
    case "escape":
      return "\u001b";
    default:
      return null;
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!terminalClosed && shell.exitCode === null && !shell.killed) {
    shell.kill("SIGTERM");
  }

  if (!terminal.closed) {
    terminal.close();
  }
  renderer.destroy();
}

chatInput.on(InputRenderableEvents.ENTER, (value: string) => {
  const message = value.trim();
  if (!message) {
    return;
  }

  addChatMessage("user", message);
  addChatMessage(
    "assistant",
    `queued "${message}". the interface is real, but this response layer is still local placeholder text until we wire mog runtime into the left pane.`,
  );
  chatInput.value = "";
});

renderer.keyInput.on("keypress", (key) => {
  if (key.ctrl && key.name === "q") {
    key.preventDefault();
    void shutdown();
    return;
  }

  if (key.name === "tab") {
    key.preventDefault();
    focusPane(activePane === "chat" ? "terminal" : "chat");
    return;
  }

  if (activePane !== "terminal" || terminalClosed) {
    return;
  }

  const sequence = keyToTerminalSequence(key);
  if (!sequence) {
    return;
  }

  key.preventDefault();
  terminal.write(sequence);
});

renderer.on(CliRenderEvents.RESIZE, () => {
  resizeTerminal();
});

renderer.on(CliRenderEvents.DESTROY, () => {
  if (!terminalClosed && shell.exitCode === null && !shell.killed) {
    shell.kill("SIGTERM");
  }
  if (!terminal.closed) {
    terminal.close();
  }
});

renderChat();
focusPane("chat");

setTimeout(() => {
  resizeTerminal();
}, 0);
