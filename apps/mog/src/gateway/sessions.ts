import type { SendMessageParams } from "@mog/types";
import type { RuntimeChannel, Thread } from "@mog/types";
import type { RuntimeRepository } from "../runtime/state/repository.ts";

const resolveCreatableChannel = (channel: RuntimeChannel): Exclude<RuntimeChannel, "system"> =>
  channel === "system" ? "cli" : channel;

export const resolveMessageThread = (
  repository: RuntimeRepository,
  params: SendMessageParams,
): Thread => {
  const channel = resolveCreatableChannel(params.channel);
  let thread = params.threadId ? repository.getThread(params.threadId) : null;

  if (!thread && params.externalId) {
    thread = repository.findThreadByExternalId(params.channel, params.externalId);
  }

  if (!thread && params.title) {
    thread = repository.findThreadByTitle(params.channel, params.title);
  }

  if (thread) {
    return thread;
  }

  if (!params.threadId && !params.externalId && !params.title) {
    return repository.ensureDefaultThread(channel);
  }

  return repository.createThread(channel, params.externalId, params.title);
};
