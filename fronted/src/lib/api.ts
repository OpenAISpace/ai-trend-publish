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
    description: "Console passphrase (read-only)",
    scope: "env",
    isEditable: false,
  },
  {
    key: "AI_SUMMARIZER_LLM_PROVIDER",
    value: "DEEPSEEK:deepseek-chat",
    description: "Default LLM provider used by the summarizer",
    scope: "db",
    isEditable: true,
  },
  {
    key: "FIRE_CRAWL_API_KEY",
    value: "fc_live_xxx",
    description: "Firecrawl crawl token",
    scope: "db",
    isEditable: true,
  },
];
const sampleWorkflows: WorkflowDefinition[] = [
  {
    id: "weixin-article-workflow",
    name: "WeChat Daily Digest",
    description: "Aggregate Firecrawl/Twitter sources and push to WeChat",
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
    name: "AIBench Leaderboard",
    description: "Sync the latest LLM leaderboard and publish a recap",
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
    name: "HelloGitHub Picks",
    description: "Summarize trending GitHub repos and push a briefing",
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
    workflowName: "AIBench Leaderboard",
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.7).toISOString(),
    status: "success",
    trigger: "cron",
    steps: [
      {
        stepId: "fetch-bench",
        name: "Fetch benchmark data",
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
    id: "run-20241108-002",
    workflowId: "weixin-article-workflow",
    workflowName: "WeChat Daily Digest",
    startedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    status: "failed",
    trigger: "manual",
    resultSummary: "WeChat API returned 401, please verify App Secret",
    steps: [
      {
        stepId: "fetch-sources",
        name: "Fetch sources",
        status: "success",
        durationMs: 6200,
        attempts: 1,
        startedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 178).toISOString(),
      },
      {
        stepId: "publish",
        name: "Publish to WeChat",
        status: "failure",
        durationMs: 2000,
        attempts: 2,
        error: "401 Unauthorized",
        startedAt: new Date(Date.now() - 1000 * 60 * 175).toISOString(),
        finishedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      },
    ],
  },
];
const sampleResults: WorkflowResult[] = [
  {
    id: "result-20241108-001",
    workflowId: "weixin-article-workflow",
    workflowName: "WeChat Daily Digest",
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
    workflowName: "AIBench Leaderboard",
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: "success",
    preview: "Claude 3.5 Sonnet climbs 6% while MiniCPM ties GPT-4o-mini",
  },
];
const samplePrompts: PromptDetail[] = [
  {
    id: "polish",
    title: "Polish Prompt",
    description: "Example prompt used when polishing long form content",
    content: "You are a professional editor...",
  },
  {
    id: "ranker",
    title: "Ranking Prompt",
    description: "Example prompt used when ranking candidates",
    content: "You are a trend analyst...",
  },
].map((prompt) => ({
  ...prompt,
  size: prompt.content.length,
  updatedAt: new Date().toISOString(),
}));
const sampleDataSources: DataSourceRecord[] = [
  { id: 1, platform: "firecrawl", identifier: "https://news.ycombinator.com" },
  { id: 2, platform: "twitter", identifier: "https://x.com/openai" },
];

export class ApiClient {
  private apiKey: string;

  constructor(session: Session) {
    this.apiKey = session.apiKey ?? "";
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
    fallback?: T
  ): Promise<T> {
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
    return this.request<DashboardSnapshot>("api/dashboard", undefined);
  }

  fetchWorkflows() {
    return this.request<WorkflowDefinition[]>(
      "api/workflows",
      undefined,
      sampleWorkflows
    );
  }

  fetchConfigs() {
    return this.request<ConfigItem[]>("api/config", undefined, sampleConfigs);
  }

  fetchRuns() {
    return this.request<WorkflowRun[]>(
      "api/workflows/runs",
      undefined,
      sampleRuns
    );
  }

  fetchResults() {
    return this.request<WorkflowResult[]>(
      "api/workflows/results",
      undefined,
      sampleResults
    );
  }

  fetchPrompts() {
    return this.request<PromptDetail[]>(
      "api/prompts",
      undefined,
      samplePrompts
    );
  }

  async updatePrompt(id: string, content: string) {
    return await this.request<PromptDetail>(
      `api/prompts/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({ content }),
      },
      {
        ...(samplePrompts.find((prompt) => prompt.id === id) ??
          samplePrompts[0]),
        content,
        updatedAt: new Date().toISOString(),
        size: content.length,
      }
    );
  }

  fetchDataSources() {
    return this.request<DataSourceRecord[]>(
      "api/data-sources",
      undefined,
      sampleDataSources
    );
  }

  async createDataSource(payload: { platform: string; identifier: string }) {
    return await this.request<DataSourceRecord>(
      "api/data-sources",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {
        id: Date.now(),
        platform: payload.platform,
        identifier: payload.identifier,
      }
    );
  }

  async updateDataSource(
    id: number,
    payload: { platform?: string; identifier?: string }
  ) {
    await this.request(
      `api/data-sources/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { ok: true }
    );
  }

  async deleteDataSource(id: number) {
    await this.request(
      `api/data-sources/${id}`,
      {
        method: "DELETE",
      },
      { ok: true }
    );
  }

  async updateConfig(item: ConfigItem) {
    await this.request(
      `api/config/${encodeURIComponent(item.key)}`,
      {
        method: "PUT",
        body: JSON.stringify(item),
      },
      item
    );
    return item;
  }

  async updateSchedule(
    workflowId: string,
    schedule: Partial<WorkflowSchedule>
  ) {
    return await this.request<WorkflowSchedule>(
      `api/workflows/${workflowId}/schedule`,
      {
        method: "PUT",
        body: JSON.stringify(schedule),
      },
      sampleWorkflows.find((wf) => wf.id === workflowId)?.schedule ?? schedule
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
      { result: "scheduled" }
    );
  }
}
