import { resolveBrainPath } from "../runtime/paths.ts";

export interface BrainPromptBundle {
  system: string;
  primaryMode: string;
  project: string;
  wakeup: string;
}

let promptBundlePromise: Promise<BrainPromptBundle> | null = null;

const readPromptFile = async (...segments: string[]): Promise<string> => {
  try {
    return (await Bun.file(resolveBrainPath(...segments)).text()).trim();
  } catch {
    return "";
  }
};

export const loadBrainPromptBundle = async (): Promise<BrainPromptBundle> => {
  promptBundlePromise ??= (async () => ({
    system: await readPromptFile("prompts", "system.md"),
    primaryMode: await readPromptFile("prompts", "modes", "primary.md"),
    project: await readPromptFile("knowledge", "4everapp", "project.md"),
    wakeup: await readPromptFile("prompts", "wakeup.md"),
  }))();

  return promptBundlePromise;
};
