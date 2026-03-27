import {
  CliRenderEvents,
  InputRenderableEvents,
  createCliRenderer,
} from "@opentui/core";
import { bootstrap } from "@mog/core";
import type { RuntimeView } from "@mog/types";
import { createChatPane } from "./chat/pane.ts";
import { createConsolePane } from "./console/pane.ts";
import { createInProcessGatewayClient } from "./gateway/in-process-client.ts";
import { createShell } from "./layout/shell.ts";
import { isCompactLayout, isStackedLayout, type PaneId } from "./layout/tokens.ts";
import { buildChatMessages, selectActiveCliThread } from "./state/runtime-view-model.ts";

export async function startTuiApp(): Promise<void> {
  const runtime = await bootstrap();
  const client = createInProcessGatewayClient(runtime);
  const bootstrapInfo = await client.bootstrap();
  let runtimeView = await client.readState();
  let activeThreadId = selectActiveCliThread(runtimeView)?.id;
  let activePane: PaneId = "chat";
  let isSending = false;
  let shuttingDown = false;

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useAlternateScreen: true,
    useMouse: true,
    backgroundColor: "#000000",
  });

  const chatPane = createChatPane(renderer);
  const consolePane = createConsolePane(renderer);
  const shell = createShell(renderer, chatPane.panel, consolePane.panel);
  renderer.root.add(shell.root);

  const syncViews = (): void => {
    const activeThread = selectActiveCliThread(runtimeView, activeThreadId);
    activeThreadId = activeThread?.id;

    const compact = isCompactLayout(renderer.width, renderer.height);
    const stacked = isStackedLayout(renderer.width);
    chatPane.render(buildChatMessages(activeThread));
    consolePane.render(runtimeView.events.slice(-120));

    shell.updateLayout({
      activePane,
      compact,
      stacked,
      toolCount: bootstrapInfo.availableTools.length,
      status: runtimeView.status,
    });
    chatPane.setCompact(compact);
    consolePane.setCompact(compact);
    chatPane.setStatus({
      focused: activePane === "chat",
      isSending,
    });
    chatPane.setFocused(activePane === "chat");
    consolePane.setFocused(activePane === "console");
    consolePane.setMeta({
      appName: bootstrapInfo.appName,
      statusValue: runtimeView.status,
      workspacePath: bootstrapInfo.workspacePath,
      eventCount: runtimeView.events.length,
      findingCount: runtimeView.findings.length,
      focused: activePane === "console",
      stacked,
    });
  };

  const focusPane = (pane: PaneId): void => {
    activePane = pane;
    syncViews();
  };

  const unsubscribe = client.subscribe((nextView: RuntimeView) => {
    runtimeView = nextView;
    syncViews();
  });

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    unsubscribe();
    runtime.kernel.stop();
    renderer.destroy();
  };

  chatPane.input.on(InputRenderableEvents.ENTER, async (value: string) => {
    const message = value.trim();
    if (!message || isSending) {
      return;
    }

    isSending = true;
    syncViews();
    chatPane.input.value = "";

    try {
      const response = await client.sendMessage({
        channel: "cli",
        threadId: activeThreadId,
        message,
      });
      activeThreadId = response.thread.id;
      runtimeView = await client.readState();
    } finally {
      isSending = false;
      focusPane("chat");
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
    }
  });

  renderer.on(CliRenderEvents.RESIZE, () => {
    syncViews();
  });

  syncViews();
  focusPane("chat");

  setTimeout(() => {
    syncViews();
  }, 0);
}
