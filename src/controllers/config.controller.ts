import {
  WorkflowDashboardService,
  type ConfigItemDTO,
} from "@src/services/workflow-dashboard.service.ts";
import {
  errorResponse,
  jsonResponse,
} from "@src/utils/http-response.ts";

const dashboardService = WorkflowDashboardService.getInstance();

export async function listConfigsController() {
  const configs = await dashboardService.listConfigs();
  return jsonResponse(configs);
}

type ConfigUpdatePayload = Partial<
  Pick<
    ConfigItemDTO,
    "value" | "description" | "scope" | "isEditable" | "category"
  >
>;

export async function updateConfigController(
  key: string | undefined,
  payload: ConfigUpdatePayload,
) {
  if (!key) {
    return errorResponse(
      { code: -32602, message: "缺少配置 key" },
      400,
    );
  }

  await dashboardService.upsertConfig({
    key,
    value: payload.value ?? "",
    description: payload.description ?? null,
    scope: payload.scope ?? "db",
    isEditable: payload.isEditable ?? true,
  });

  return jsonResponse({ ok: true });
}
