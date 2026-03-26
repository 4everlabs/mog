import type { NotionTodoItem, NotionTodoStatusCount, SurfaceNotionTodoResponse } from "@clog/types";
import type { NotionRuntimeConfig } from "../../runtime/config.ts";

const NOTION_VERSION = "2026-03-11";
const QUERY_PAGE_SIZE = 100;
interface RichTextFragment {
  readonly plain_text?: string | null;
}

interface NotionSearchResult {
  readonly object?: string;
  readonly id?: string;
  readonly title?: readonly RichTextFragment[];
  readonly url?: string | null;
  readonly parent?: {
    readonly database_id?: string;
  };
}

interface NotionPropertySchema {
  readonly name?: string;
  readonly type?: string;
  readonly status?: {
    readonly options?: ReadonlyArray<{
      readonly id?: string;
      readonly name?: string;
    }>;
    readonly groups?: ReadonlyArray<{
      readonly name?: string;
      readonly option_ids?: readonly string[];
    }>;
  };
}

interface NotionDataSourceResponse {
  readonly id?: string;
  readonly title?: readonly RichTextFragment[];
  readonly properties?: Record<string, NotionPropertySchema>;
}

interface NotionDateValue {
  readonly start?: string | null;
}

interface NotionPagePropertyValue {
  readonly type?: string;
  readonly title?: readonly RichTextFragment[];
  readonly status?: {
    readonly name?: string | null;
  } | null;
  readonly date?: NotionDateValue | null;
  readonly multi_select?: ReadonlyArray<{
    readonly name?: string | null;
  }>;
  readonly people?: ReadonlyArray<{
    readonly name?: string | null;
    readonly id?: string | null;
  }>;
}

interface NotionPageResponse {
  readonly object?: string;
  readonly id?: string;
  readonly url?: string | null;
  readonly properties?: Record<string, NotionPagePropertyValue>;
}

interface NotionListResponse<T> {
  readonly results?: readonly T[];
  readonly next_cursor?: string | null;
  readonly has_more?: boolean;
}

interface ResolvedTodoDataSource {
  readonly id: string;
  readonly title: string;
  readonly titlePropertyName: string;
  readonly progressPropertyName: string;
  readonly dueDatePropertyName: string | null;
  readonly taskTypePropertyName: string | null;
  readonly assigneePropertyName: string | null;
  readonly completedStatuses: readonly string[];
}

const normalizeNotionId = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const match = value.match(/[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/u);
  if (!match) {
    return null;
  }

  const hex = match[0].replaceAll("-", "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const toPlainText = (fragments: readonly RichTextFragment[] | null | undefined): string =>
  (fragments ?? [])
    .map((fragment) => fragment.plain_text ?? "")
    .join("")
    .trim();

const normalizeLabel = (value: string): string => value.trim().toLowerCase();

const uniqueStrings = (values: readonly string[]): string[] => {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

const compareTaskItems = (left: NotionTodoItem, right: NotionTodoItem): number => {
  const progressOrder = (value: string | null): number => {
    const normalized = normalizeLabel(value ?? "");
    if (normalized === "in progress") {
      return 0;
    }
    if (normalized === "not started") {
      return 1;
    }
    if (normalized === "read comment") {
      return 2;
    }
    if (normalized === "done") {
      return 9;
    }
    return 3;
  };

  const progressComparison = progressOrder(left.progress) - progressOrder(right.progress);
  if (progressComparison !== 0) {
    return progressComparison;
  }

  if (left.dueDate && right.dueDate && left.dueDate !== right.dueDate) {
    return left.dueDate.localeCompare(right.dueDate);
  }

  if (left.dueDate && !right.dueDate) {
    return -1;
  }

  if (!left.dueDate && right.dueDate) {
    return 1;
  }

  return left.name.localeCompare(right.name);
};

export class NotionApiClient {
  private resolvedDataSource: ResolvedTodoDataSource | null = null;

  constructor(private readonly config: NotionRuntimeConfig) {}

  async getTodoList(input: {
    readonly includeDone?: boolean;
    readonly limit?: number;
    readonly progress?: readonly string[];
  }): Promise<SurfaceNotionTodoResponse> {
    const dataSource = await this.resolveTodoDataSource();
    const allItems = await this.listAllTodoItems(dataSource);
    const completedStatuses = new Set(dataSource.completedStatuses.map((status) => normalizeLabel(status)));
    const statusCounts = this.buildStatusCounts(allItems);
    const openItems = allItems.filter((item) => !completedStatuses.has(normalizeLabel(item.progress ?? "")));
    const requestedProgress = uniqueStrings(input.progress ?? []).map((value) => normalizeLabel(value));
    const includeDone = input.includeDone ?? false;

    const filteredItems = allItems.filter((item) => {
      if (!includeDone && completedStatuses.has(normalizeLabel(item.progress ?? ""))) {
        return false;
      }

      if (requestedProgress.length === 0) {
        return true;
      }

      return requestedProgress.includes(normalizeLabel(item.progress ?? ""));
    });

    const limitedItems = filteredItems
      .sort(compareTaskItems)
      .slice(0, input.limit ?? filteredItems.length);

    const summary = {
      title: dataSource.title,
      dataSourceId: dataSource.id,
      generatedAt: Date.now(),
      total: allItems.length,
      openCount: openItems.length,
      statusCounts,
    } as const;

    return {
      summary,
      items: limitedItems,
      printout: this.buildPrintout(summary, limitedItems, {
        includeDone,
        progress: requestedProgress,
      }),
    };
  }

  private async resolveTodoDataSource(): Promise<ResolvedTodoDataSource> {
    if (this.resolvedDataSource) {
      return this.resolvedDataSource;
    }

    const configuredId = normalizeNotionId(this.config.todoDataSourceId);
    const dataSource = configuredId
      ? await this.fetchResolvedDataSource(configuredId)
      : await this.searchResolvedDataSource();
    this.resolvedDataSource = dataSource;
    return dataSource;
  }

  private async searchResolvedDataSource(): Promise<ResolvedTodoDataSource> {
    const title = this.config.todoSearchTitle.trim();
    if (!title) {
      throw new Error("Notion todo title is not configured.");
    }

    const databaseIdFromUrl = normalizeNotionId(this.config.todoPageUrl);
    const response = await this.request<NotionListResponse<NotionSearchResult>>("/v1/search", {
      method: "POST",
      body: JSON.stringify({
        query: title,
        filter: {
          value: "data_source",
          property: "object",
        },
        page_size: 20,
      }),
    });
    const results = (response.results ?? []).filter((result) => result.object === "data_source" && typeof result.id === "string");
    const exactTitleMatches = results.filter((result) => normalizeLabel(toPlainText(result.title)) === normalizeLabel(title));
    const preferred = [
      ...exactTitleMatches.filter((result) => normalizeNotionId(result.parent?.database_id) === databaseIdFromUrl),
      ...exactTitleMatches,
      ...results.filter((result) => normalizeNotionId(result.parent?.database_id) === databaseIdFromUrl),
      ...results,
    ][0];

    if (!preferred?.id) {
      throw new Error(`Unable to find a Notion data source for "${title}". Share the database with the integration or set POSTHOG_CLAW_NOTION_TODO_DATA_SOURCE_ID.`);
    }

    return await this.fetchResolvedDataSource(preferred.id);
  }

  private async fetchResolvedDataSource(dataSourceId: string): Promise<ResolvedTodoDataSource> {
    const response = await this.request<NotionDataSourceResponse>(`/v1/data_sources/${encodeURIComponent(dataSourceId)}`);
    const properties = Object.entries(response.properties ?? {});
    const titleProperty = properties.find(([, value]) => value.type === "title");
    const statusProperties = properties.filter(([, value]) => value.type === "status");
    const progressProperty = statusProperties.find(([, value]) => normalizeLabel(value.name ?? "") === "progress")
      ?? statusProperties.find(([, value]) => normalizeLabel(value.name ?? "") === "status")
      ?? statusProperties[0];
    const dueDateProperty = properties.find(([, value]) => value.type === "date" && normalizeLabel(value.name ?? "") === "due date")
      ?? properties.find(([, value]) => value.type === "date");
    const taskTypeProperty = properties.find(([, value]) => value.type === "multi_select" && normalizeLabel(value.name ?? "") === "task type")
      ?? properties.find(([, value]) => value.type === "multi_select");
    const assigneeProperty = properties.find(([, value]) => value.type === "people" && normalizeLabel(value.name ?? "") === "assignee")
      ?? properties.find(([, value]) => value.type === "people");

    if (!titleProperty || !progressProperty) {
      throw new Error("Configured Notion todo data source is missing a title or status property.");
    }

    return {
      id: response.id?.trim() || dataSourceId,
      title: toPlainText(response.title) || this.config.todoSearchTitle.trim(),
      titlePropertyName: titleProperty[0],
      progressPropertyName: progressProperty[0],
      dueDatePropertyName: dueDateProperty?.[0] ?? null,
      taskTypePropertyName: taskTypeProperty?.[0] ?? null,
      assigneePropertyName: assigneeProperty?.[0] ?? null,
      completedStatuses: this.resolveCompletedStatuses(progressProperty[1]),
    };
  }

  private resolveCompletedStatuses(property: NotionPropertySchema): readonly string[] {
    const options = property.status?.options ?? [];
    const groups = property.status?.groups ?? [];
    const optionNamesById = new Map(
      options
        .filter((option): option is { id: string; name: string } => typeof option.id === "string" && typeof option.name === "string")
        .map((option) => [option.id, option.name]),
    );
    const groupedStatuses = groups
      .filter((group) => ["complete", "completed", "done"].includes(normalizeLabel(group.name ?? "")))
      .flatMap((group) => (group.option_ids ?? []).map((optionId) => optionNamesById.get(optionId) ?? ""))
      .filter(Boolean);
    if (groupedStatuses.length > 0) {
      return uniqueStrings(groupedStatuses);
    }

    const fallback = options
      .map((option) => option.name ?? "")
      .filter((name) => ["done", "verified", "complete", "completed"].includes(normalizeLabel(name)));
    return uniqueStrings(fallback);
  }

  private async listAllTodoItems(dataSource: ResolvedTodoDataSource): Promise<NotionTodoItem[]> {
    const items: NotionTodoItem[] = [];
    let nextCursor: string | null | undefined;

    do {
      const search = new URLSearchParams();
      for (const property of uniqueStrings([
        dataSource.titlePropertyName,
        dataSource.progressPropertyName,
        dataSource.dueDatePropertyName ?? "",
        dataSource.taskTypePropertyName ?? "",
        dataSource.assigneePropertyName ?? "",
      ])) {
        search.append("filter_properties[]", property);
      }

      const response = await this.request<NotionListResponse<NotionPageResponse>>(
        `/v1/data_sources/${encodeURIComponent(dataSource.id)}/query?${search.toString()}`,
        {
          method: "POST",
          body: JSON.stringify({
            page_size: QUERY_PAGE_SIZE,
            start_cursor: nextCursor ?? undefined,
          }),
        },
      );

      for (const result of response.results ?? []) {
        if (result.object !== "page") {
          continue;
        }

        const item = this.toTodoItem(result, dataSource);
        if (item) {
          items.push(item);
        }
      }

      nextCursor = response.has_more ? response.next_cursor ?? null : null;
    } while (nextCursor);

    return items;
  }

  private toTodoItem(page: NotionPageResponse, dataSource: ResolvedTodoDataSource): NotionTodoItem | null {
    const properties = page.properties ?? {};
    const titleValue = properties[dataSource.titlePropertyName];
    const name = toPlainText(titleValue?.title);
    if (!name || !page.id || !page.url) {
      return null;
    }

    const progressValue = properties[dataSource.progressPropertyName];
    const dueDateValue = dataSource.dueDatePropertyName ? properties[dataSource.dueDatePropertyName] : undefined;
    const taskTypeValue = dataSource.taskTypePropertyName ? properties[dataSource.taskTypePropertyName] : undefined;
    const assigneeValue = dataSource.assigneePropertyName ? properties[dataSource.assigneePropertyName] : undefined;

    return {
      id: page.id,
      name,
      progress: progressValue?.status?.name?.trim() || null,
      dueDate: dueDateValue?.date?.start?.trim() || null,
      assignees: uniqueStrings((assigneeValue?.people ?? []).map((person) => person.name?.trim() || person.id?.trim() || "")),
      taskTypes: uniqueStrings((taskTypeValue?.multi_select ?? []).map((item) => item.name?.trim() || "")),
      url: page.url,
    };
  }

  private buildStatusCounts(items: readonly NotionTodoItem[]): readonly NotionTodoStatusCount[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const progress = item.progress?.trim() || "Unknown";
      counts.set(progress, (counts.get(progress) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([progress, count]) => ({ progress, count }));
  }

  private buildPrintout(
    summary: {
      readonly title: string;
      readonly total: number;
      readonly openCount: number;
      readonly statusCounts: readonly NotionTodoStatusCount[];
    },
    items: readonly NotionTodoItem[],
    input: {
      readonly includeDone: boolean;
      readonly progress: readonly string[];
    },
  ): string {
    const lines = [
      summary.title,
      `Open: ${summary.openCount}/${summary.total}`,
      `Status counts: ${summary.statusCounts.map((entry) => `${entry.progress} ${entry.count}`).join(", ")}`,
    ];

    if (input.progress.length > 0) {
      lines.push(`Filter: ${input.progress.join(", ")}`);
    }

    lines.push("");

    if (items.length === 0) {
      lines.push(input.includeDone ? "No matching tasks found." : "Nothing still needs to be done.");
      return lines.join("\n");
    }

    const groups = new Map<string, NotionTodoItem[]>();
    for (const item of items) {
      const progress = item.progress ?? "Unknown";
      const existing = groups.get(progress);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(progress, [item]);
      }
    }

    for (const [progress, groupItems] of [...groups.entries()].sort((left, right) => compareTaskItems(
      { ...left[1][0]!, name: "", id: "", dueDate: null, assignees: [], taskTypes: [], url: "https://notion.so" },
      { ...right[1][0]!, name: "", id: "", dueDate: null, assignees: [], taskTypes: [], url: "https://notion.so" },
    ))) {
      lines.push(`${progress} (${groupItems.length})`);
      for (const item of groupItems.sort(compareTaskItems)) {
        const details = [
          item.dueDate ? `due ${item.dueDate}` : null,
          item.assignees.length > 0 ? `owner ${item.assignees.join(", ")}` : null,
          item.taskTypes.length > 0 ? item.taskTypes.join(", ") : null,
        ].filter((value): value is string => Boolean(value));
        lines.push(details.length > 0 ? `- ${item.name} (${details.join(" | ")})` : `- ${item.name}`);
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.config.token?.trim();
    if (!token) {
      throw new Error("NOTION_SECRET is required to query Notion.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await fetch(`https://api.notion.com${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`Notion API ${response.status}: ${body.slice(0, 500)}`);
      }

      return JSON.parse(body) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Notion API request timed out after ${this.config.requestTimeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
