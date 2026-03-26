declare module "@clog/types" {
  export interface NotionTodoItem {
    id: string;
    name: string;
    progress: string | null;
    dueDate: string | null;
    assignees: string[];
    taskTypes: string[];
    url: string;
  }

  export interface NotionTodoStatusCount {
    progress: string;
    count: number;
  }

  export interface SurfaceNotionTodoResponse {
    summary: {
      title: string;
      dataSourceId: string;
      generatedAt: number;
      total: number;
      openCount: number;
      statusCounts: readonly NotionTodoStatusCount[];
    };
    items: NotionTodoItem[];
    printout: string;
  }

  export interface IntegrationHealthView {
    kind: string;
    status: string;
    summary: string;
    lastCheckedAt: number;
  }
}
