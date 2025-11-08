export type WorkflowStatus = "idle" | "queued" | "running" | "success" | "failed";

export interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  scope?: "env" | "db" | "runtime";
  isEditable?: boolean;
  lastUpdatedAt?: string;
  category?: string;
}

export interface WorkflowSchedule {
  cron: string;
  timezone: string;
  nextRunAt?: string;
  lastRunAt?: string;
  isEnabled: boolean;
  lastDurationMs?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: WorkflowStatus;
  schedule: WorkflowSchedule;
  stats: {
    successCount: number;
    failureCount: number;
    averageDurationMs: number;
    lastDurationMs?: number;
  };
}

export interface WorkflowRunStep {
  stepId: string;
  name: string;
  status: "success" | "failure";
  durationMs: number;
  attempts: number;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  finishedAt?: string;
  status: WorkflowStatus;
  trigger: "cron" | "manual" | "api";
  payload?: Record<string, unknown>;
  resultSummary?: string;
  steps: WorkflowRunStep[];
}

export interface WorkflowResult {
  id: string;
  workflowId: string;
  workflowName: string;
  generatedAt: string;
  status: WorkflowStatus;
  outputUrl?: string;
  preview?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowLogMessage {
  id: string;
  workflowId?: string;
  workflowName?: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface DashboardSnapshot {
  workflows: WorkflowDefinition[];
  configs: ConfigItem[];
  runs: WorkflowRun[];
  results: WorkflowResult[];
}

export interface PromptDetail {
  id: string;
  title: string;
  description?: string;
  size: number;
  updatedAt: string;
  content: string;
}

export interface DataSourceRecord {
  id: number;
  platform: string | null;
  identifier: string | null;
}
