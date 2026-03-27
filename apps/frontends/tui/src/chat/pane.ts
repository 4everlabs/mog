import {
  BoxRenderable,
  createCliRenderer,
  InputRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import type { ChatMessageViewModel } from "../layout/tokens.ts";
import { tokens } from "../layout/tokens.ts";

type CliRenderer = Awaited<ReturnType<typeof createCliRenderer>>;

interface MessageChrome {
  label: string;
  labelColor: string;
  backgroundColor: string;
  borderColor: string;
  width: `${number}%`;
  alignSelf: "flex-start" | "flex-end";
}

const createChip = (
  renderer: CliRenderer,
  id: string,
  label: string,
  textColor: string,
  borderColor: string,
): BoxRenderable => {
  const chip = new BoxRenderable(renderer, {
    id,
    paddingX: 1,
    backgroundColor: tokens.panelSoft,
    border: true,
    borderStyle: "single",
    borderColor,
  });

  chip.add(new TextRenderable(renderer, {
    id: `${id}-label`,
    content: label,
    fg: textColor,
  }));

  return chip;
};

const clearChildren = (scrollBox: ScrollBoxRenderable): void => {
  for (const child of scrollBox.getChildren()) {
    scrollBox.remove(child.id);
  }
};

const messageChrome = (role: ChatMessageViewModel["role"]): MessageChrome => {
  if (role === "assistant") {
    return {
      label: "MOG",
      labelColor: tokens.yellow,
      backgroundColor: tokens.assistantBubble,
      borderColor: tokens.borderStrong,
      width: "92%",
      alignSelf: "flex-start",
    };
  }

  return {
    label: "YOU",
    labelColor: tokens.red,
    backgroundColor: tokens.userBubble,
    borderColor: tokens.red,
    width: "82%",
    alignSelf: "flex-end",
  };
};

export const createChatPane = (renderer: CliRenderer) => {
  const panel = new BoxRenderable(renderer, {
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
  });

  const eyebrowBox = new BoxRenderable(renderer, {
    id: "chat-eyebrow-box",
    width: "100%",
    flexDirection: "row",
    gap: 1,
    paddingX: 1,
    backgroundColor: tokens.panelSoft,
    border: true,
    borderStyle: "single",
    borderColor: tokens.line,
  });
  eyebrowBox.add(new TextRenderable(renderer, {
    id: "chat-eyebrow-prompt",
    content: "$",
    fg: tokens.yellow,
  }));
  eyebrowBox.add(new TextRenderable(renderer, {
    id: "chat-eyebrow-command",
    content: "./launch_mog",
    fg: tokens.text,
  }));

  const accentLine = new TextRenderable(renderer, {
    id: "chat-accent-line",
    content: "quietly opinionated software for marketers",
    fg: tokens.yellow,
  });

  const headline = new TextRenderable(renderer, {
    id: "chat-headline",
    content: "the marketing agent that ships",
    fg: tokens.blue,
  });

  const subline = new TextRenderable(renderer, {
    id: "chat-subline",
    content: "research, write, post, and tighten the loop",
    fg: tokens.muted,
  });

  const chipRow = new BoxRenderable(renderer, {
    id: "chat-chip-row",
    width: "100%",
    flexDirection: "row",
    gap: 1,
    flexWrap: "wrap",
    backgroundColor: tokens.panel,
  });
  chipRow.add(createChip(renderer, "chip-research", "research", tokens.blue, tokens.border));
  chipRow.add(createChip(renderer, "chip-compose", "compose", tokens.yellow, tokens.line));
  chipRow.add(createChip(renderer, "chip-feedback", "feedback", tokens.red, tokens.red));

  const streamFrame = new BoxRenderable(renderer, {
    id: "chat-stream-frame",
    flexGrow: 1,
    width: "100%",
    padding: 1,
    backgroundColor: tokens.panelSoft,
    border: true,
    borderStyle: "single",
    borderColor: tokens.border,
  });

  const scroll = new ScrollBoxRenderable(renderer, {
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
  streamFrame.add(scroll);

  const status = new TextRenderable(renderer, {
    id: "chat-status",
    content: "chat active // enter send",
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
  composerPromptBox.add(new TextRenderable(renderer, {
    id: "composer-prompt",
    content: "$",
    fg: tokens.yellow,
  }));

  const input = new InputRenderable(renderer, {
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
  composerRow.add(input);
  composerFrame.add(composerLabel);
  composerFrame.add(composerRow);

  panel.add(eyebrowBox);
  panel.add(accentLine);
  panel.add(headline);
  panel.add(subline);
  panel.add(chipRow);
  panel.add(streamFrame);
  panel.add(status);
  panel.add(composerFrame);

  return {
    panel,
    input,
    render(messages: ChatMessageViewModel[]): void {
      clearChildren(scroll);
      for (const message of messages) {
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

        bubble.add(new TextRenderable(renderer, {
          id: `label-${message.id}`,
          content: chrome.label,
          fg: chrome.labelColor,
        }));
        bubble.add(new TextRenderable(renderer, {
          id: `content-${message.id}`,
          content: message.content,
          fg: tokens.text,
        }));

        scroll.add(bubble);
      }
    },
    setCompact(compact: boolean): void {
      headline.visible = !compact;
      accentLine.visible = !compact;
      subline.visible = !compact;
      chipRow.visible = !compact;
      composerLabel.visible = !compact;
      composerPromptBox.visible = !compact;
      status.visible = !compact;

      composerFrame.border = !compact;
      composerFrame.padding = compact ? 0 : 1;
      composerFrame.backgroundColor = compact ? tokens.panel : tokens.panelSoft;
    },
    setFocused(focused: boolean): void {
      panel.borderColor = focused ? tokens.borderStrong : tokens.border;
      if (focused) {
        input.focus();
      } else {
        input.blur();
      }
    },
    setStatus(options: { focused: boolean; isSending: boolean }): void {
      status.content = options.focused
        ? options.isSending
          ? "chat active // sending..."
          : "chat active // enter send"
        : "chat idle // tab back";
      status.fg = options.focused ? tokens.blue : tokens.muted;
    },
  };
};
