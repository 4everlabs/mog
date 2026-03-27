import {
  BoxRenderable,
  createCliRenderer,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import type { RuntimeEvent, RuntimeStatus } from "@mog/types";
import { formatEventTime, tokens, truncateMiddle } from "../layout/tokens.ts";
import { summarizeEventDetails } from "../state/runtime-view-model.ts";

type CliRenderer = Awaited<ReturnType<typeof createCliRenderer>>;

interface ConsoleChrome {
  label: string;
  labelColor: string;
  borderColor: string;
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

const consoleChrome = (level: RuntimeEvent["level"]): ConsoleChrome => {
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
};

export const createConsolePane = (renderer: CliRenderer) => {
  const panel = new BoxRenderable(renderer, {
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
  });

  const metaTop = new TextRenderable(renderer, {
    id: "console-meta-top",
    content: "",
    fg: tokens.yellow,
  });

  const metaBottom = new TextRenderable(renderer, {
    id: "console-meta-bottom",
    content: "",
    fg: tokens.muted,
  });

  const infoRow = new BoxRenderable(renderer, {
    id: "console-info-row",
    width: "100%",
    flexDirection: "row",
    gap: 1,
    flexWrap: "wrap",
    backgroundColor: tokens.panel,
  });
  infoRow.add(createChip(renderer, "console-chip-live", "mog logs", tokens.blue, tokens.border));
  infoRow.add(createChip(renderer, "console-chip-tools", "tools", tokens.yellow, tokens.line));
  infoRow.add(createChip(renderer, "console-chip-findings", "findings", tokens.red, tokens.red));

  const frame = new BoxRenderable(renderer, {
    id: "console-frame",
    flexGrow: 1,
    width: "100%",
    padding: 1,
    backgroundColor: tokens.panelSoft,
    border: true,
    borderStyle: "single",
    borderColor: tokens.border,
  });

  const scroll = new ScrollBoxRenderable(renderer, {
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
  frame.add(scroll);

  const status = new TextRenderable(renderer, {
    id: "console-status",
    content: "mog console // runtime events // findings",
    fg: tokens.muted,
  });

  panel.add(metaTop);
  panel.add(metaBottom);
  panel.add(infoRow);
  panel.add(frame);
  panel.add(status);

  return {
    panel,
    render(events: RuntimeEvent[]): void {
      clearChildren(scroll);
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

        topRow.add(new TextRenderable(renderer, {
          id: `console-level-${event.id}`,
          content: chrome.label,
          fg: chrome.labelColor,
        }));
        topRow.add(new TextRenderable(renderer, {
          id: `console-time-${event.id}`,
          content: formatEventTime(event.timestamp),
          fg: tokens.muted,
        }));
        topRow.add(new TextRenderable(renderer, {
          id: `console-source-${event.id}`,
          content: event.source,
          fg: tokens.text,
        }));

        row.add(topRow);
        row.add(new TextRenderable(renderer, {
          id: `console-message-${event.id}`,
          content: event.message,
          fg: tokens.text,
        }));

        const detail = summarizeEventDetails(event);
        if (detail) {
          row.add(new TextRenderable(renderer, {
            id: `console-detail-${event.id}`,
            content: detail,
            fg: tokens.muted,
          }));
        }

        scroll.add(row);
      }
    },
    setCompact(compact: boolean): void {
      infoRow.visible = !compact;
      metaBottom.visible = !compact;
      status.visible = !compact;
    },
    setFocused(focused: boolean): void {
      panel.borderColor = focused ? tokens.borderStrong : tokens.border;
      if (focused) {
        scroll.focus();
      } else {
        scroll.blur();
      }
    },
    setMeta(options: {
      appName: string;
      statusValue: RuntimeStatus;
      workspacePath: string;
      eventCount: number;
      findingCount: number;
      focused: boolean;
      stacked: boolean;
    }): void {
      status.content = options.focused
        ? `console active // ${options.eventCount} events`
        : `console idle // ${options.eventCount} events // ${options.findingCount} findings`;
      status.fg = options.focused ? tokens.red : tokens.muted;

      metaTop.content = `${options.appName} // ${options.statusValue}`;
      metaTop.fg = options.statusValue === "error"
        ? tokens.red
        : options.statusValue === "monitoring"
          ? tokens.yellow
          : tokens.blue;
      metaBottom.content = truncateMiddle(options.workspacePath, options.stacked ? 34 : 54);
    },
  };
};
