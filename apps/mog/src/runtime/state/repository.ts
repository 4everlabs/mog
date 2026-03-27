import { EventEmitter } from "node:events";
import { dirname } from "node:path";
import type { RuntimeEvent, RuntimeEventLevel, RuntimeStatus, RuntimeView } from "@mog/types";
import type { Finding } from "@mog/types";
import type { RuntimeChannel, Thread, ThreadMessage } from "@mog/types";
import {
  getInstanceId,
  resolveLegacyInstanceStoragePath,
  resolveRuntimeEventLogPath,
  resolveRuntimeMigrationPath,
  resolveRuntimeSnapshotPath,
} from "../paths.ts";
import { EventLog } from "./event-log.ts";
import { migrateRuntimeStorage } from "./migrate.ts";
import { SnapshotStore, type RuntimeSnapshot } from "./snapshot-store.ts";

const LEGACY_RUNTIME_FILE = "runtime.json";

export interface RuntimeRepositoryConfig {
  instanceId?: string;
  snapshotStore?: SnapshotStore;
  eventLog?: EventLog;
}

interface StatusMeta {
  source?: string;
  message?: string;
  details?: Record<string, unknown>;
  emitWhenUnchanged?: boolean;
}

type RuntimeEventInput = Omit<RuntimeEvent, "id" | "timestamp">;

export class RuntimeRepository extends EventEmitter {
  private status: RuntimeStatus = "booting";
  private threads: Thread[] = [];
  private findings: Finding[] = [];
  private events: RuntimeEvent[] = [];
  private snapshotStore: SnapshotStore;
  private eventLog: EventLog;
  readonly instanceId: string;

  constructor(config: RuntimeRepositoryConfig = {}) {
    super();
    this.instanceId = config.instanceId ?? getInstanceId();
    this.snapshotStore = config.snapshotStore ?? new SnapshotStore(resolveRuntimeSnapshotPath(this.instanceId));
    this.eventLog = config.eventLog ?? new EventLog(resolveRuntimeEventLogPath(this.instanceId));
  }

  load(): void {
    migrateRuntimeStorage({
      storagePath: dirname(resolveRuntimeSnapshotPath(this.instanceId)),
      snapshotPath: resolveRuntimeSnapshotPath(this.instanceId),
      eventLogPath: resolveRuntimeEventLogPath(this.instanceId),
      migrationPath: resolveRuntimeMigrationPath(this.instanceId),
      legacyRuntimeFilePath: `${resolveLegacyInstanceStoragePath(this.instanceId)}/${LEGACY_RUNTIME_FILE}`,
    });

    const snapshot = this.snapshotStore.load();
    const events = this.eventLog.load();

    this.status = snapshot?.status ?? "idle";
    this.threads = snapshot?.threads ?? [];
    this.findings = snapshot?.findings ?? [];
    this.events = events;
  }

  private createEvent(event: RuntimeEventInput): RuntimeEvent {
    return {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private snapshot(): RuntimeSnapshot {
    return {
      status: this.status,
      threads: this.threads,
      findings: this.findings,
    };
  }

  readState(): RuntimeView {
    return {
      ...this.snapshot(),
      events: [...this.events],
    };
  }

  private persist(nextEvent?: RuntimeEvent): void {
    this.snapshotStore.save(this.snapshot());
    if (nextEvent) {
      this.eventLog.append(nextEvent);
      this.emit("event", nextEvent);
    }
    this.emit("change", this.readState());
  }

  addEvent(event: RuntimeEventInput): RuntimeEvent {
    const nextEvent = this.createEvent(event);
    this.events.push(nextEvent);
    this.persist(nextEvent);
    return nextEvent;
  }

  setStatus(status: RuntimeStatus, meta?: StatusMeta): void {
    const previous = this.status;
    this.status = status;
    const shouldEmit = previous !== status || meta?.emitWhenUnchanged;
    const nextEvent = shouldEmit
      ? this.createEvent({
          kind: "status",
          level: status === "error" ? "error" : "info",
          source: meta?.source ?? "runtime.repository",
          message: meta?.message ?? `status ${previous} -> ${status}`,
          details: {
            previous,
            next: status,
            ...meta?.details,
          },
        })
      : undefined;

    if (nextEvent) {
      this.events.push(nextEvent);
    }

    this.persist(nextEvent);
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  listThreads(): Thread[] {
    return [...this.threads];
  }

  getThread(id: string): Thread | null {
    return this.threads.find((thread) => thread.id === id) ?? null;
  }

  findThreadByExternalId(channel: RuntimeChannel, externalId: string): Thread | null {
    return this.threads.find((thread) => thread.channel === channel && thread.externalId === externalId) ?? null;
  }

  findThreadByTitle(channel: RuntimeChannel, title: string): Thread | null {
    return this.threads.find((thread) => thread.channel === channel && thread.title === title) ?? null;
  }

  private isDefaultChannelThread(thread: Thread, channel: Thread["channel"]): boolean {
    return thread.channel === channel && !thread.externalId && !thread.title;
  }

  ensureDefaultThread(channel: Exclude<RuntimeChannel, "system">): Thread {
    const candidates = this.threads.filter((thread) => this.isDefaultChannelThread(thread, channel));
    const activeThread = candidates.find((thread) => thread.messages.length > 0)
      ?? candidates.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))[0];

    const duplicateIds = new Set(
      candidates
        .filter((thread) => thread !== activeThread && thread.messages.length === 0)
        .map((thread) => thread.id),
    );

    if (duplicateIds.size > 0) {
      this.threads = this.threads.filter((thread) => !duplicateIds.has(thread.id));
      const dedupeEvent = this.createEvent({
        kind: "thread",
        level: "debug",
        source: "runtime.repository",
        message: `removed ${duplicateIds.size} duplicate ${channel} thread placeholder(s)`,
        channel,
        details: {
          duplicateIds: [...duplicateIds],
        },
      });
      this.events.push(dedupeEvent);
      this.persist(dedupeEvent);
    }

    if (activeThread) {
      return activeThread;
    }

    return this.createThread(channel);
  }

  createThread(channel: RuntimeChannel, externalId?: string, title?: string): Thread {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const thread: Thread = { id, channel, externalId, title, messages: [], createdAt: now, updatedAt: now };
    this.threads.push(thread);
    const nextEvent = this.createEvent({
      kind: "thread",
      level: "info",
      source: "runtime.repository",
      message: `created ${channel} thread${title ? ` "${title}"` : ""}`,
      threadId: id,
      channel,
      details: {
        externalId,
        title,
      },
    });
    this.events.push(nextEvent);
    this.persist(nextEvent);
    return thread;
  }

  appendMessage(threadId: string, message: Omit<ThreadMessage, "id" | "timestamp">): void {
    const thread = this.threads.find((entry) => entry.id === threadId);
    if (!thread) {
      return;
    }

    const nextMessage: ThreadMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    thread.messages.push(nextMessage);
    thread.updatedAt = nextMessage.timestamp;
    const nextEvent = this.createEvent({
      kind: "message",
      level: message.role === "system" ? "debug" : "info",
      source: `thread.${thread.channel}`,
      message: `${message.role}: ${message.content}`,
      threadId,
      channel: thread.channel,
      details: {
        role: message.role,
        content: message.content,
      },
    });
    this.events.push(nextEvent);
    this.persist(nextEvent);
  }

  listFindings(): Finding[] {
    return [...this.findings];
  }

  listEvents(): RuntimeEvent[] {
    return [...this.events];
  }

  addFinding(finding: Omit<Finding, "id" | "createdAt" | "acknowledged">): Finding {
    const nextFinding: Finding = {
      ...finding,
      id: crypto.randomUUID(),
      acknowledged: false,
      createdAt: new Date().toISOString(),
    };
    this.findings.push(nextFinding);
    const level: RuntimeEventLevel =
      finding.severity === "critical"
        ? "error"
        : finding.severity === "warning"
          ? "warning"
          : "info";
    const nextEvent = this.createEvent({
      kind: "finding",
      level,
      source: "runtime.findings",
      message: `${finding.category}: ${finding.message}`,
      details: {
        findingId: nextFinding.id,
        severity: finding.severity,
        category: finding.category,
        ...finding.details,
      },
    });
    this.events.push(nextEvent);
    this.persist(nextEvent);
    return nextFinding;
  }

  acknowledgeFinding(findingId: string): Finding | null {
    const finding = this.findings.find((entry) => entry.id === findingId);
    if (!finding) {
      return null;
    }

    finding.acknowledged = true;
    finding.acknowledgedAt = new Date().toISOString();
    const nextEvent = this.createEvent({
      kind: "finding",
      level: "info",
      source: "runtime.findings",
      message: `acknowledged finding ${findingId}`,
      details: {
        findingId,
        severity: finding.severity,
        category: finding.category,
      },
    });
    this.events.push(nextEvent);
    this.persist(nextEvent);
    return finding;
  }
}
