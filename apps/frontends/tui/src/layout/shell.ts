import {
  BoxRenderable,
  createCliRenderer,
  TextRenderable,
} from "@opentui/core";
import type { PaneId } from "./tokens.ts";
import { tokens } from "./tokens.ts";

type CliRenderer = Awaited<ReturnType<typeof createCliRenderer>>;

export const createShell = (
  renderer: CliRenderer,
  chatPanel: BoxRenderable,
  consolePanel: BoxRenderable,
) => {
  const root = new BoxRenderable(renderer, {
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
  chromeLights.add(new TextRenderable(renderer, { id: "light-red", content: "o", fg: tokens.red }));
  chromeLights.add(new TextRenderable(renderer, { id: "light-yellow", content: "o", fg: tokens.yellow }));
  chromeLights.add(new TextRenderable(renderer, { id: "light-blue", content: "o", fg: tokens.blue }));

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
  workArea.add(chatPanel);
  workArea.add(consolePanel);

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

  root.add(chromeBar);
  root.add(workArea);
  root.add(footerBar);

  return {
    root,
    updateLayout(options: {
      activePane: PaneId;
      compact: boolean;
      stacked: boolean;
      toolCount: number;
      status: string;
    }): void {
      workArea.flexDirection = options.stacked ? "column" : "row";
      chatPanel.width = options.stacked ? "100%" : "50%";
      consolePanel.width = options.stacked ? "100%" : "50%";

      chromeMode.content = options.activePane === "chat" ? "chat active" : "console active";
      chromeMode.fg = options.activePane === "chat" ? tokens.blue : tokens.red;
      chromeTagline.visible = !options.compact;

      footerLeft.content = options.compact
        ? "tab switch // enter send"
        : "tab switch // enter send // ctrl+q quit";
      footerRight.visible = !options.compact;
      footerRight.content = `${options.status} // ${options.toolCount} tools`;
    },
  };
};
