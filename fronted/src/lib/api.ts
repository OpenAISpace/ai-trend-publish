import type {
  ConfigItem,
  DashboardSnapshot,
  WorkflowDefinition,
  WorkflowResult,
  WorkflowRun,
  WorkflowSchedule,
  PromptDetail,
  DataSourceRecord,
} from "../types";
import type { Session } from "./session";

const sampleConfigs: ConfigItem[] = [
  {
    key: "SERVER_API_KEY",
    value: "******",
    description: "JSON-RPC server access token",
    scope: "env",
    isEditable: false,
  },
  {
    key: "1_of_week_workflow",
    value: "weixin-article-workflow",
    description: "Workflow executed on Monday",
    scope: "db",
    isEditable: true,
  },
  {
    key: "RSS_DAILY_DIGEST_FEEDS",
    value: '["/weixin/aispace"]',
    description: "Daily RSS digest feed list",
    scope: "db",
    isEditable: true,
  },
];

const sampleWorkflows: WorkflowDefinition[] = [
  {
    id: "weixin-article-workflow",
    name: "Weixin Article",
    description: "Collect daily tech content and publish to WeChat",
    type: "weixin-article-workflow",
    status: "idle",
    schedule: {
      cron: "0 3 * * *",
      timezone: "Asia/Shanghai",
      nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      lastRunAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      isEnabled: true,
    },
    stats: {
      successCount: 128,
      failureCount: 6,
      averageDurationMs: 32500,
      lastDurationMs: 31230,
    },
  },
  {
    id: "weixin-aibench-workflow",
    name: "Weixin AI Bench",
    description: "Sync and summarize AIBench leaderboard updates",
    type: "weixin-aibench-workflow",
    status: "running",
    schedule: {
      cron: "0 12 * * 1,3,5",
      timezone: "Asia/Shanghai",
      nextRunAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      lastRunAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      isEnabled: true,
    },
    stats: {
      successCount: 76,
      failureCount: 2,
      averageDurationMs: 45200,
      lastDurationMs: 46000,
    },
  },
  {
    id: "weixin-hellogithub-workflow",
    name: "Hello GitHub Picks",
    description: "Summarize trending HelloGitHub repositories",
    type: "weixin-hellogithub-workflow",
    status: "queued",
    schedule: {
      cron: "0 9 * * 2,4",
      timezone: "Asia/Shanghai",
      nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      isEnabled: true,
    },
    stats: {
      successCount: 58,
      failureCount: 4,
      averageDurationMs: 28000,
      lastDurationMs: 0,
    },
  },
];

const sampleRuns: WorkflowRun[] = [
  {
    id: "run-20241108-001",
    workflowId: "weixin-aibench-workflow",
    workflowName: "Weixin AI Bench",
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.7).toISOString(),
    status: "success",
    trigger: "cron",
    steps: [
      {
        stepId: "fetch-bench",
        name: "Fetch latest metrics",
        status: "success",
        durationMs: 12000,
        attempts: 1,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.98).toISOString(),
      },
      {
        stepId: "summarize",
        name: "Summarize highlights",
        status: "success",
        durationMs: 18500,
        attempts: 1,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.98).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.95).toISOString(),
      },
    ],
  },
  {
    id: "run-20241107-004",
    workflowId: "weixin-hellogithub-workflow",
    workflowName: "Hello GitHub Picks",
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 25.5).toISOString(),
    status: "failed",
    trigger: "cron",
    resultSummary: "GitHub API quota exceeded",
    steps: [
      {
        stepId: "fetch-trending",
        name: "Pull trending repositories",
        status: "success",
        durationMs: 15000,
        attempts: 1,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 25.8).toISOString(),
      },
      {
        stepId: "summarize",
        name: "Write recommendations",
        status: "failure",
        durationMs: 6000,
        attempts: 3,
        error: "GitHub API quota exceeded",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 25.8).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 25.7).toISOString(),
      },
    ],
  },
];

const sampleResults: WorkflowResult[] = [
  {
    id: "result-20241108-001",
    workflowId: "weixin-article-workflow",
    workflowName: "Weixin Article",
    generatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: "success",
    preview:
      "[AI Daily] OpenAI ships GPT-4.2 Turbo while DeepSeek-R1 opens a free tier...",
    metadata: {
      articleCount: 5,
      publishTarget: "AISPACE Official Account",
    },
  },
  {
    id: "result-20241107-003",
    workflowId: "weixin-aibench-workflow",
    workflowName: "Weixin AI Bench",
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: "success",
    preview: "AIBench adds Claude 3.5 Sonnet with a 6% score boost",
  },
];

const sampleDashboard: DashboardSnapshot = {
  configs: sampleConfigs,
  workflows: sampleWorkflows,
  runs: sampleRuns,
  results: sampleResults,
};

const samplePrompts: PromptDetail[] = [
  {
    id: "polish",
    title: "润色提示词",
    description: "示例：对文章段落进行润色整理的提示词。",
    content: "请你扮演专业编辑，基于原文保持信息不变地润色句子……",
  },
  {
    id: "ranker",
    title: "排序提示词",
    description: "示例：根据指标对候选素材进行排序的提示词。",
    content: "请你按照给定权重对候选内容打分，并给出排序理由……",
  },
].map((prompt) => ({
  ...prompt,
  size: prompt.content.length,
  updatedAt: new Date().toISOString(),
}));

const sampleDataSources: DataSourceRecord[] = [
  { id: 1, platform: "weixin", identifier: "AISPACE-tech" },
  { id: 2, platform: "github", identifier: "openai/trending" },
];

export class ApiClient {
  private apiKey: string;
  private unlocked: boolean;

  constructor(session: Session) {
    this.apiKey = session.apiKey ?? "";
    this.unlocked = session.unlocked;
  }

  private canCallRemote() {
    return Boolean(this.unlocked && this.apiKey);
  }

  private headers(additional?: HeadersInit) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...additional,
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
    fallback?: T,
  ): Promise<T> {
    if (!this.canCallRemote()) {
      if (fallback) return structuredClone(fallback);
      throw new Error("API client is not configured");
    }
    try {
      const response = await fetch(path.startsWith("/") ? path : `/${path}`, {
        ...init,
        headers: this.headers(init?.headers),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (fallback) {
        console.warn("Falling back to mock data:", error);
        return structuredClone(fallback);
      }
      throw error;
    }
  }

  fetchDashboard() {
    return this.request<DashboardSnapshot>("api/dashboard", undefined, sampleDashboard);
  }

  fetchWorkflows() {
    return this.request<WorkflowDefinition[]>("api/workflows", undefined, sampleWorkflows);
  }

  fetchConfigs() {
    return this.request<ConfigItem[]>("api/config", undefined, sampleConfigs);
  }

  fetchRuns() {
    return this.request<WorkflowRun[]>("api/workflows/runs", undefined, sampleRuns);
  }

  fetchResults() {
    return this.request<WorkflowResult[]>(
      "api/workflows/results",
      undefined,
      sampleResults,
    );
  }

  fetchPrompts() {
    return this.request<PromptDetail[]>("api/prompts", undefined, samplePrompts);
  }

  async updatePrompt(id: string, content: string) {
    return await this.request<PromptDetail>(`api/prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }, {
      ...(samplePrompts.find((prompt) => prompt.id === id) ?? samplePrompts[0]),
      content,
      updatedAt: new Date().toISOString(),
      size: content.length,
    });
  }

  fetchDataSources() {
    return this.request<DataSourceRecord[]>(
      "api/data-sources",
      undefined,
      sampleDataSources,
    );
  }

  async createDataSource(payload: { platform: string; identifier: string }) {
    return await this.request<DataSourceRecord>("api/data-sources", {
      method: "POST",
      body: JSON.stringify(payload),
    }, {
      id: Date.now(),
      platform: payload.platform,
      identifier: payload.identifier,
    });
  }

  async updateDataSource(
    id: number,
    payload: { platform?: string; identifier?: string },
  ) {
    await this.request(`api/data-sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, { ok: true });
  }

  async deleteDataSource(id: number) {
    await this.request(`api/data-sources/${id}`, {
      method: "DELETE",
    }, { ok: true });
  }

  async updateConfig(item: ConfigItem) {
    await this.request(
      `api/config/${encodeURIComponent(item.key)}`,
      {
        method: "PUT",
        body: JSON.stringify(item),
      },
      item,
    );
    return item;
  }

  async updateSchedule(
    workflowId: string,
    schedule: Partial<WorkflowSchedule>,
  ) {
    return await this.request<WorkflowSchedule>(
      `api/workflows/${workflowId}/schedule`,
      {
        method: "PUT",
        body: JSON.stringify(schedule),
      },
      sampleWorkflows.find((wf) => wf.id === workflowId)?.schedule ??
        schedule,
    );
  }

  async triggerWorkflow(workflowType: string, payload = {}) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    return await this.request(
      `api/workflows/${workflowType}/trigger`,
      {
        method: "POST",
        body: JSON.stringify({
          payload,
          trigger: "api",
          clientRequestId: id,
        }),
      },
      { result: "scheduled" },
    );
  }
}
