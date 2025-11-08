import { WorkflowDashboardService } from "@src/services/workflow-dashboard.service.ts";
import { jsonResponse } from "@src/utils/http-response.ts";

const dashboardService = WorkflowDashboardService.getInstance();

export async function getDashboardSnapshotController() {
  const snapshot = await dashboardService.getDashboardSnapshot();
  return jsonResponse(snapshot);
}
