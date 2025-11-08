import crypto from "node:crypto";
import db from "@src/db/db.ts";
import {
  config as configTable,
  configMetadata,
  workflowRunSteps,
  workflowRuns,
  workflowResults,
  workflowSchedules,
} from "@src/db/schema.ts";
import { WorkflowType } from "@src/types/workflows.ts";
import {
  WORKFLOW_PRESETS,
  WORKFLOW_PRESET_MAP,
} from "@src/constants/workflows.ts";
import { eq, inArray, desc } from "drizzle-orm";
import { Logger } from "@src/utils/logger-adapter.ts";

export type WorkflowStatus =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "failed";
export type WorkflowTrigger = "cron" | "manual" | "api";

export interface ConfigItemDTO {
  key: string;
  value: string;
  description?: string | null;
  scope?: "env" | "db" | "runtime";
  isEditable?: boolean;
  lastUpdatedAt?: string | null;
  category?: string | null;
}

export interface WorkflowScheduleDTO {
  cron: string;
  timezone: string;
  isEnabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastDurationMs?: number | null;
}

export interface WorkflowStatsDTO {
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
  lastDurationMs?: number | null;
}

export interface WorkflowDefinitionDTO {
  id: WorkflowType;
  name: string;
  description: string;
  type: WorkflowType;
  status: WorkflowStatus;
  schedule: WorkflowScheduleDTO;
  stats: WorkflowStatsDTO;
}

export interface WorkflowRunStepDTO {
  stepId: string;
  name: string;
  status: "success" | "failure";
  durationMs: number;
  attempts: number;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface WorkflowRunDTO {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  finishedAt?: string | null;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  payload?: Record<string, unknown> | null;
  resultSummary?: string | null;
  steps: WorkflowRunStepDTO[];
}

export interface WorkflowResultDTO {
  id: string;
  workflowId: string;
  workflowName: string;
  generatedAt: string;
  status: WorkflowStatus;
  outputUrl?: string | null;
  preview?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DashboardSnapshotDTO {
  workflows: WorkflowDefinitionDTO[];
  configs: ConfigItemDTO[];
  runs: WorkflowRunDTO[];
  results: WorkflowResultDTO[];
}

const READONLY_ENV_KEYS = ["SERVER_API_KEY"];
const CONFIG_CATEGORY_MAP: Record<
  string,
  { category: string; description?: string }
> = {
  DEFAULT_LLM_PROVIDER: { category: "llm" },
  FIRE_CRAWL_API_KEY: { category: "crawler" },
  X_API_BEARER_TOKEN: { category: "crawler" },
  WEIXIN_APP_ID: { category: "wechat" },
  WEIXIN_APP_SECRET: { category: "wechat" },
  AUTHOR: { category: "wechat" },
  "1_of_week_workflow": { category: "workflow" },
  "2_of_week_workflow": { category: "workflow" },
  "3_of_week_workflow": { category: "workflow" },
};

const logger = new Logger("workflow-dashboard");

export class WorkflowDashboardService {
  private static instance: WorkflowDashboardService;

  private constructor() {}

  static getInstance(): WorkflowDashboardService {
    if (!WorkflowDashboardService.instance) {
      WorkflowDashboardService.instance = new WorkflowDashboardService();
    }
    return WorkflowDashboardService.instance;
  }

  private formatTimestamp(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  private sanitizePreview(value?: string | null, limit = 220) {
    if (!value) return null;
    const plain = value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return null;
    return plain.length > limit ? `${plain.slice(0, limit)}...` : plain;
  }

  async ensureDefaultSchedules(): Promise<void> {
    for (const preset of WORKFLOW_PRESETS) {
      const existing = await db
        .select()
        .from(workflowSchedules)
        .where(eq(workflowSchedules.workflowId, preset.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(workflowSchedules).values({
          workflowId: preset.id,
          cron: preset.defaultCron,
          timezone: preset.timezone,
          isEnabled: 1,
        });
      }
    }
  }

  private async getScheduleRow(workflowId: WorkflowType) {
    const rows = await db
      .select()
      .from(workflowSchedules)
      .where(eq(workflowSchedules.workflowId, workflowId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async getLatestRunStatus(): Promise<Map<string, WorkflowStatus>> {
    const rows = await db
      .select()
      .from(workflowRuns)
      .orderBy(desc(workflowRuns.startedAt))
      .limit(64);
    const statusMap = new Map<string, WorkflowStatus>();
    for (const row of rows) {
      if (!statusMap.has(row.workflowId)) {
        statusMap.set(row.workflowId, row.status as WorkflowStatus);
      }
    }
    return statusMap;
  }

  async listWorkflows(): Promise<WorkflowDefinitionDTO[]> {
    await this.ensureDefaultSchedules();
    const statusMap = await this.getLatestRunStatus();
    const schedules = await db
      .select()
      .from(workflowSchedules)
      .where(
        inArray(
          workflowSchedules.workflowId,
          WORKFLOW_PRESETS.map((preset) => preset.id)
        )
      );

    const scheduleMap = new Map<string, (typeof schedules)[number]>();
    schedules.forEach((row) => scheduleMap.set(row.workflowId, row));

    return WORKFLOW_PRESETS.map((preset) => {
      const schedule = scheduleMap.get(preset.id);
      const status = statusMap.get(preset.id) ?? "idle";
      return {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        type: preset.id,
        status,
        schedule: {
          cron: schedule?.cron ?? preset.defaultCron,
          timezone: schedule?.timezone ?? preset.timezone,
          isEnabled: schedule?.isEnabled !== 0,
          nextRunAt: schedule?.nextRunAt ?? null,
          lastRunAt: schedule?.lastRunAt ?? null,
          lastDurationMs: schedule?.lastDurationMs ?? null,
        },
        stats: {
          successCount: schedule?.successCount ?? 0,
          failureCount: schedule?.failureCount ?? 0,
          averageDurationMs: schedule?.avgDurationMs ?? 0,
          lastDurationMs: schedule?.lastDurationMs ?? null,
        },
      };
    });
  }

  async updateWorkflowSchedule(
    workflowId: WorkflowType,
    patch: Partial<WorkflowScheduleDTO>
  ): Promise<WorkflowScheduleDTO> {
    await this.ensureDefaultSchedules();
    const record = await this.getScheduleRow(workflowId);
    if (!record) {
      throw new Error(`Workflow ${workflowId} schedule not found`);
    }

    const cronValue = patch.cron ?? record.cron;
    const timezoneValue = patch.timezone ?? record.timezone;
    const isEnabledValue = patch.isEnabled ?? record.isEnabled !== 0;

    await db
      .update(workflowSchedules)
      .set({
        cron: cronValue,
        timezone: timezoneValue,
        isEnabled: isEnabledValue ? 1 : 0,
      })
      .where(eq(workflowSchedules.workflowId, workflowId));

    return {
      cron: cronValue,
      timezone: timezoneValue,
      isEnabled: isEnabledValue,
      nextRunAt: record.nextRunAt,
      lastRunAt: record.lastRunAt,
      lastDurationMs: record.lastDurationMs,
    };
  }

  async updateNextRunAt(workflowId: WorkflowType, nextRunAt: Date | null) {
    await db
      .update(workflowSchedules)
      .set({
        nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
      })
      .where(eq(workflowSchedules.workflowId, workflowId));
  }

  async recordRunStart(input: {
    workflowId: WorkflowType;
    workflowName?: string;
    trigger: WorkflowTrigger;
    payload?: Record<string, unknown>;
    runId?: string;
  }) {
    const runId = input.runId ?? crypto.randomUUID();
    const name =
      input.workflowName ??
      WORKFLOW_PRESET_MAP.get(input.workflowId)?.name ??
      input.workflowId;
    const startedAt = new Date();

    await db.insert(workflowRuns).values({
      id: runId,
      workflowId: input.workflowId,
      workflowName: name,
      status: "running",
      trigger: input.trigger,
      payload: input.payload ?? null,
      startedAt: this.formatTimestamp(startedAt),
    });

    return {
      id: runId,
      workflowId: input.workflowId,
      workflowName: name,
      startedAt,
    };
  }

  async recordRunEnd(
    runId: string,
    status: WorkflowStatus,
    options?: {
      error?: Error;
      resultSummary?: string;
      finishedAt?: Date;
      workflowId?: WorkflowType;
      durationMs?: number;
    }
  ) {
    const finishedAt = options?.finishedAt ?? new Date();
    const durationMs = options?.durationMs ?? null;
    const resultSummary =
      options?.resultSummary ??
      (options?.error ? options.error.message : undefined);

    await db
      .update(workflowRuns)
      .set({
        status,
        finishedAt: this.formatTimestamp(finishedAt),
        durationMs: durationMs ?? undefined,
        resultSummary,
      })
      .where(eq(workflowRuns.id, runId));

    if (options?.workflowId && durationMs !== null) {
      await this.updateScheduleStats(
        options.workflowId,
        status,
        finishedAt,
        durationMs
      );
    }
  }

  async recordWorkflowResult(input: {
    workflowId: WorkflowType;
    workflowName?: string;
    status: WorkflowStatus;
    preview?: string | null;
    outputUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const workflowName =
      input.workflowName ??
      WORKFLOW_PRESET_MAP.get(input.workflowId)?.name ??
      input.workflowId;
    const generatedAt = this.formatTimestamp(new Date());
    const preview = this.sanitizePreview(input.preview);

    await db.insert(workflowResults).values({
      id: crypto.randomUUID(),
      workflowId: input.workflowId,
      workflowName,
      status: input.status,
      generatedAt,
      outputUrl: input.outputUrl ?? null,
      preview: preview ?? null,
      metadata: input.metadata ?? null,
    });
  }

  private async updateScheduleStats(
    workflowId: WorkflowType,
    status: WorkflowStatus,
    finishedAt: Date,
    durationMs: number
  ) {
    const schedule = await this.getScheduleRow(workflowId);
    if (!schedule) return;

    const totalRuns =
      (schedule.successCount ?? 0) + (schedule.failureCount ?? 0) + 1;
    const successCount =
      (schedule.successCount ?? 0) + (status === "success" ? 1 : 0);
    const failureCount =
      (schedule.failureCount ?? 0) + (status === "failed" ? 1 : 0);
    const prevAvg = schedule.avgDurationMs ?? 0;
    const avgDurationMs =
      prevAvg === 0
        ? durationMs
        : Math.round((prevAvg * (totalRuns - 1) + durationMs) / totalRuns);

    await db
      .update(workflowSchedules)
      .set({
        lastRunAt: finishedAt.toISOString().slice(0, 19).replace("T", " "),
        lastDurationMs: durationMs,
        successCount,
        failureCount,
        avgDurationMs,
      })
      .where(eq(workflowSchedules.workflowId, workflowId));
  }

  async listRuns(limit = 20): Promise<WorkflowRunDTO[]> {
    const runs = await db
      .select()
      .from(workflowRuns)
      .orderBy(desc(workflowRuns.startedAt))
      .limit(limit);

    if (runs.length === 0) return [];

    const runIds = runs.map((run) => run.id);
    const steps = await db
      .select()
      .from(workflowRunSteps)
      .where(inArray(workflowRunSteps.runId, runIds))
      .orderBy(workflowRunSteps.createdAt);

    const stepMap = new Map<string, WorkflowRunStepDTO[]>();
    steps.forEach((step) => {
      const record: WorkflowRunStepDTO = {
        stepId: step.stepId,
        name: step.name,
        status: step.status as "success" | "failure",
        durationMs: step.durationMs ?? 0,
        attempts: step.attempts ?? 1,
        error: step.error,
        startedAt: step.startedAt ?? undefined,
        finishedAt: step.finishedAt ?? undefined,
      };
      const list = stepMap.get(step.runId) ?? [];
      list.push(record);
      stepMap.set(step.runId, list);
    });

    return runs.map((run) => ({
      id: run.id,
      workflowId: run.workflowId,
      workflowName: run.workflowName,
      startedAt: run.startedAt!,
      finishedAt: run.finishedAt ?? undefined,
      status: run.status as WorkflowStatus,
      trigger: run.trigger as WorkflowTrigger,
      payload: (run.payload ?? undefined) as
        | Record<string, unknown>
        | undefined,
      resultSummary: run.resultSummary ?? undefined,
      steps: stepMap.get(run.id) ?? [],
    }));
  }

  async listResults(limit = 10): Promise<WorkflowResultDTO[]> {
    const rows = await db
      .select()
      .from(workflowResults)
      .orderBy(desc(workflowResults.generatedAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      workflowName: row.workflowName,
      generatedAt: row.generatedAt!,
      status: row.status as WorkflowStatus,
      outputUrl: row.outputUrl ?? undefined,
      preview: row.preview ?? undefined,
      metadata: row.metadata as Record<string, unknown> | null,
    }));
  }

  async listConfigs(): Promise<ConfigItemDTO[]> {
    const rows = await db
      .select({
        id: configTable.id,
        key: configTable.key,
        value: configTable.value,
        description: configMetadata.description,
        scope: configMetadata.scope,
        isEditable: configMetadata.isEditable,
        category: configMetadata.category,
        updatedAt: configMetadata.updatedAt,
      })
      .from(configTable)
      .leftJoin(configMetadata, eq(configTable.key, configMetadata.key));

    const dbConfigs: ConfigItemDTO[] = rows
      .filter((row) => row.key)
      .map((row) => {
        const preset = CONFIG_CATEGORY_MAP[row.key ?? ""];
        return {
          key: row.key!,
          value: row.value ?? "",
          description: row.description ?? preset?.description ?? undefined,
          scope: (row.scope as ConfigItemDTO["scope"]) ?? "db",
          isEditable: row.isEditable !== 0,
          category: row.category ?? preset?.category ?? "general",
          lastUpdatedAt: row.updatedAt ?? undefined,
        };
      });

    const envConfigs: ConfigItemDTO[] = READONLY_ENV_KEYS.map((key) => ({
      key,
      value: process.env[key] ? "******" : "",
      description: "Environment variable",
      scope: "env",
      category: "security",
      isEditable: false,
      lastUpdatedAt: null,
    }));

    return [...envConfigs, ...dbConfigs];
  }

  async upsertConfig(item: ConfigItemDTO) {
    const existing = await db
      .select()
      .from(configTable)
      .where(eq(configTable.key, item.key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(configTable)
        .set({
          value: item.value,
        })
        .where(eq(configTable.id, existing[0].id));
    } else {
      await db.insert(configTable).values({
        key: item.key,
        value: item.value,
      });
    }

    await db
      .insert(configMetadata)
      .values({
        key: item.key,
        description: item.description ?? null,
        scope: item.scope ?? "db",
        isEditable: item.isEditable === false ? 0 : 1,
        category:
          item.category ?? CONFIG_CATEGORY_MAP[item.key]?.category ?? "general",
      })
      .onDuplicateKeyUpdate({
        set: {
          description: item.description ?? null,
          scope: item.scope ?? "db",
          isEditable: item.isEditable === false ? 0 : 1,
          category:
            item.category ??
            CONFIG_CATEGORY_MAP[item.key]?.category ??
            "general",
        },
      });
  }

  async getDashboardSnapshot(): Promise<DashboardSnapshotDTO> {
    const [workflows, configs, runs, results] = await Promise.all([
      this.listWorkflows(),
      this.listConfigs(),
      this.listRuns(),
      this.listResults(),
    ]);

    return { workflows, configs, runs, results };
  }
}
