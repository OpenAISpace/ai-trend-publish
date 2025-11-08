import { WorkflowType } from "@src/services/workflow-factory.ts";
import {
  WorkflowTrigger,
  WorkflowDashboardService,
} from "@src/services/workflow-dashboard.service.ts";
import { runWorkflow } from "@src/services/workflow-runner.ts";

const dashboardService = WorkflowDashboardService.getInstance();

function isWorkflowType(value: unknown): value is WorkflowType {
  return typeof value === "string" &&
    Object.values<WorkflowType>(WorkflowType).includes(
      value as WorkflowType,
    );
}

export interface TriggerWorkflowParams {
  workflowType: string;
  payload?: Record<string, unknown>;
  trigger?: WorkflowTrigger | string;
}

export async function triggerWorkflow({
  workflowType,
  payload = {},
  trigger,
}: TriggerWorkflowParams) {
  if (!isWorkflowType(workflowType)) {
    throw new Error(
      `无效的工作流类型。可用类型: ${Object.values(WorkflowType).join(", ")}`,
    );
  }

  if (payload && typeof payload !== "object") {
    throw new Error("payload 必须是对象");
  }

  const normalizedTrigger: WorkflowTrigger =
    trigger === "cron" || trigger === "api" ? trigger : "manual";

  await dashboardService.ensureDefaultSchedules();
  return await runWorkflow(workflowType, normalizedTrigger, payload);
}
