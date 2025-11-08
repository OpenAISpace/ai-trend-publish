import db from "@src/db/db.ts";
import { workflowRunSteps } from "@src/db/schema.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("workflow-run-store");

export interface WorkflowRunStepRecord {
  stepId: string;
  name: string;
  status: "success" | "failure";
  durationMs: number;
  attempts: number;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export async function recordWorkflowRunStep(
  runId: string,
  step: WorkflowRunStepRecord,
) {
  try {
    await db.insert(workflowRunSteps).values({
      runId,
      stepId: step.stepId,
      name: step.name,
      status: step.status,
      durationMs: step.durationMs,
      attempts: step.attempts,
      error: step.error ?? null,
      startedAt: step.startedAt ?? null,
      finishedAt: step.finishedAt ?? null,
    });
  } catch (error) {
    logger.warn("Failed to record workflow run step", error);
  }
}
