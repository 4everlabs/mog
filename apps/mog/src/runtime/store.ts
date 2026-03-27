import { EventEmitter } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolveInstanceStoragePath } from "./paths.ts";

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Thread {
  id: string;
  channel: "cli" | "telegram" | "web" | "system";
  externalId?: string;
  title?: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Finding {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
  details?: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export type RuntimeEventKind = "status" | "thread" | "message" | "finding" | "tool" | "monitor" | "system";
export type RuntimeEventLevel = "debug" | "info" | "warning" | "error";

export interface RuntimeEvent {
  id: string;
  kind: RuntimeEventKind;
  level: RuntimeEventLevel;
  source: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface RuntimeState {
  status: "booting" | "idle" | "monitoring" | "error";
  threads: Thread[];
  findings: Finding[];
  events: RuntimeEvent[];
}

const STORAGE_FILE = "runtime.json";

export class RuntimeStore extends EventEmitter {
  private status: RuntimeState["status"] = "booting";
  private threads: Thread[] = [];
  private findings: Finding[] = [];
  private events: RuntimeEvent[] = [];

  constructor(private storagePath = resolveInstanceStoragePath()) {
    super();
  }

  private isDefaultChannelThread(thread: Thread, channel: Thread["channel"]): boolean {
    return thread.channel === channel && !thread.externalId && !thread.title;
  }

  private snapshot(): RuntimeState {
    return {
      status: this.status,
      threads: this.threads,
      findings: this.findings,
      events: this.events,
    };
  }

  private createEvent(event: Omit<RuntimeEvent, "id" | "timestamp">): RuntimeEvent {
    return {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private persist(nextEvent?: RuntimeEvent): void {
    const path = `${this.storagePath}/${STORAGE_FILE}`;

    try {
      mkdirSync(this.storagePath, { recursive: true });
      writeFileSync(path, JSON.stringify(this.snapshot(), null, 2), "utf8");
      if (nextEvent) {
        this.emit("event", nextEvent);
      }
      this.emit("change", this.snapshot());
    } catch {
      console.error("Failed to save runtime store");
    }
  }

  addEvent(event: Omit<RuntimeEvent, "id" | "timestamp">): RuntimeEvent {
    const nextEvent = this.createEvent(event);
    this.events.push(nextEvent);
    this.persist(nextEvent);
    return nextEvent;
  }

  setStatus(
    status: RuntimeState["status"],
    meta?: {
      source?: string;
      message?: string;
      details?: Record<string, unknown>;
      emitWhenUnchanged?: boolean;
    },
  ): void {
    const previous = this.status;
    this.status = status;
    const shouldEmit = previous !== status || meta?.emitWhenUnchanged;
    const nextEvent = shouldEmit
      ? this.createEvent({
          kind: "status",
          level: status === "error" ? "error" : "info",
          source: meta?.source ?? "runtime.store",
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

  getStatus(): RuntimeState["status"] {
    return this.status;
  }

  listThreads(): Thread[] {
    return [...this.threads];
  }

  getThread(id: string): Thread | null {
    return this.threads.find((thread) => thread.id === id) ?? null;
  }

  ensureDefaultThread(channel: Exclude<Thread["channel"], "system">): Thread {
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
      const nextEvent = this.createEvent({
        kind: "thread",
        level: "debug",
        source: "runtime.store",
        message: `removed ${duplicateIds.size} duplicate ${channel} thread placeholder(s)`,
        details: {
          channel,
          duplicateIds: [...duplicateIds],
        },
      });
      this.events.push(nextEvent);
      this.persist(nextEvent);
    }

    if (activeThread) {
      return activeThread;
    }

    return this.createThread(channel);
  }

  createThread(channel: Thread["channel"], externalId?: string, title?: string): Thread {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const thread: Thread = { id, channel, externalId, title, messages: [], createdAt: now, updatedAt: now };
    this.threads.push(thread);
    const nextEvent = this.createEvent({
      kind: "thread",
      level: "info",
      source: "runtime.store",
      message: `created ${channel} thread${title ? ` "${title}"` : ""}`,
      details: {
        threadId: id,
        channel,
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

    thread.messages.push({
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    thread.updatedAt = new Date().toISOString();
    const nextEvent = this.createEvent({
      kind: "message",
      level: message.role === "system" ? "debug" : "info",
      source: `thread.${thread.channel}`,
      message: `${message.role}: ${message.content}`,
      details: {
        threadId,
        channel: thread.channel,
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
    const nextEvent = this.createEvent({
      kind: "finding",
      level:
        finding.severity === "critical"
          ? "error"
          : finding.severity === "warning"
            ? "warning"
            : "info",
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

  load(): void {
    const path = `${this.storagePath}/${STORAGE_FILE}`;

    try {
      const content = readFileSync(path, "utf8");
      const data: RuntimeState = JSON.parse(content);
      this.status = data.status ?? "booting";
      this.threads = data.threads ?? [];
      this.findings = data.findings ?? [];
      this.events = data.events ?? [];
    } catch {
      this.status = "idle";
    }
  }
}
