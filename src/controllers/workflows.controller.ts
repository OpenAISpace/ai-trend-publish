import {
  WorkflowDashboardService,
  type WorkflowScheduleDTO,
} from "@src/services/workflow-dashboard.service.ts";
import { WorkflowType } from "@src/types/workflows.ts";
import { triggerWorkflow } from "@src/controllers/workflow.controller.ts";
import {
  errorResponse,
  jsonResponse,
} from "@src/utils/http-response.ts";

const dashboardService = WorkflowDashboardService.getInstance();

function isWorkflowType(value: string | undefined): value is WorkflowType {
  return Boolean(
    value &&
      Object.values<WorkflowType>(WorkflowType).includes(
        value as WorkflowType,
      ),
  );
}

export async function listWorkflowsController() {
  const workflows = await dashboardService.listWorkflows();
  return jsonResponse(workflows);
}

export async function listWorkflowRunsController() {
  const runs = await dashboardService.listRuns();
  return jsonResponse(runs);
}

export async function listWorkflowResultsController() {
  const results = await dashboardService.listResults();
  return jsonResponse(results);
}

export async function triggerWorkflowController(
  workflowId: string | undefined,
  payload: Record<string, unknown> = {},
  trigger?: string,
) {
  if (!isWorkflowType(workflowId)) {
    return errorResponse(
      { code: -32602, message: "无效的工作流" },
      400,
    );
  }

  try {
    const result = await triggerWorkflow({
      workflowType: workflowId,
      payload,
      trigger,
    });
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(
      {
        code: -32603,
        message: error instanceof Error ? error.message : "触发工作流失败",
      },
      500,
    );
  }
}

type SchedulePatch = Partial<
  Pick<WorkflowScheduleDTO, "cron" | "timezone" | "isEnabled">
>;

export async function updateWorkflowScheduleController(
  workflowId: string | undefined,
  payload: SchedulePatch,
) {
  if (!isWorkflowType(workflowId)) {
    return errorResponse(
      { code: -32602, message: "无效的工作流" },
      400,
    );
  }

  const patch: SchedulePatch = {};
  if (payload.cron) patch.cron = payload.cron;
  if (payload.timezone) patch.timezone = payload.timezone;
  if (typeof payload.isEnabled === "boolean") {
    patch.isEnabled = payload.isEnabled;
  }

  const schedule = await dashboardService.updateWorkflowSchedule(
    workflowId,
    patch,
  );
  return jsonResponse(schedule);
}
