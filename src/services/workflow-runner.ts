import { getWorkflow, WorkflowType } from "@src/services/workflow-factory.ts";
import {
  WorkflowDashboardService,
  WorkflowTrigger,
} from "@src/services/workflow-dashboard.service.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import { WORKFLOW_PRESET_MAP } from "@src/constants/workflows.ts";

const logger = new Logger("workflow-runner");

export async function runWorkflow(
  workflowType: WorkflowType,
  trigger: WorkflowTrigger,
  payload: Record<string, unknown> = {}
) {
  const workflow = getWorkflow(workflowType);
  const dashboardService = WorkflowDashboardService.getInstance();
  const runRecord = await dashboardService.recordRunStart({
    workflowId: workflowType,
    workflowName: WORKFLOW_PRESET_MAP.get(workflowType)?.name ?? workflowType,
    trigger,
    payload,
  });
  const startedAt = runRecord.startedAt ?? new Date();

  try {
    await workflow.execute({
      payload,
      id: runRecord.id,
      timestamp: Date.now(),
      trigger,
    });
    const finishedAt = new Date();
    await dashboardService.recordRunEnd(runRecord.id, "success", {
      workflowId: workflowType,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });
    return { runId: runRecord.id };
  } catch (error) {
    const finishedAt = new Date();
    await dashboardService.recordRunEnd(runRecord.id, "failed", {
      workflowId: workflowType,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      error: error instanceof Error ? error : new Error(String(error)),
    });
    logger.error(`Workflow ${workflowType} failed`, error);
    throw error;
  }
}
