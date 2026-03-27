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

export interface RuntimeState {
  status: "booting" | "idle" | "monitoring" | "error";
  threads: Thread[];
  findings: Finding[];
}

const STORAGE_FILE = "runtime.json";

export class RuntimeStore {
  private status: RuntimeState["status"] = "booting";
  private threads: Thread[] = [];
  private findings: Finding[] = [];

  constructor(private storagePath = resolveInstanceStoragePath()) {}

  private isDefaultChannelThread(thread: Thread, channel: Thread["channel"]): boolean {
    return thread.channel === channel && !thread.externalId && !thread.title;
  }

  setStatus(status: RuntimeState["status"]): void {
    this.status = status;
    this.save();
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
      this.save();
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
    this.save();
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
    this.save();
  }

  listFindings(): Finding[] {
    return [...this.findings];
  }

  addFinding(finding: Omit<Finding, "id" | "createdAt" | "acknowledged">): Finding {
    const nextFinding: Finding = {
      ...finding,
      id: crypto.randomUUID(),
      acknowledged: false,
      createdAt: new Date().toISOString(),
    };
    this.findings.push(nextFinding);
    this.save();
    return nextFinding;
  }

  acknowledgeFinding(findingId: string): Finding | null {
    const finding = this.findings.find((entry) => entry.id === findingId);
    if (!finding) {
      return null;
    }

    finding.acknowledged = true;
    finding.acknowledgedAt = new Date().toISOString();
    this.save();
    return finding;
  }

  private save(): void {
    const data: RuntimeState = {
      status: this.status,
      threads: this.threads,
      findings: this.findings,
    };
    const path = `${this.storagePath}/${STORAGE_FILE}`;

    try {
      mkdirSync(this.storagePath, { recursive: true });
      writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
    } catch {
      console.error("Failed to save runtime store");
    }
  }

  load(): void {
    const path = `${this.storagePath}/${STORAGE_FILE}`;

    try {
      const content = readFileSync(path, "utf8");
      const data: RuntimeState = JSON.parse(content);
      this.status = data.status ?? "booting";
      this.threads = data.threads ?? [];
      this.findings = data.findings ?? [];
    } catch {
      this.status = "idle";
    }
  }
}
