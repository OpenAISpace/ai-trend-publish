import { WorkflowType } from "./cron.ts";
import { getWorkflow } from "./cron.ts";
export async function triggerWorkflow(params: Record<string, any>) {
  const { workflowType } = params;

  if (!workflowType || !Object.values(WorkflowType).includes(workflowType)) {
    throw new Error(`无效的工作流类型。可用类�? ${Object.values(WorkflowType).join(", ")}`);
  }

  const workflow = getWorkflow(workflowType);
  workflow.execute({
    payload: {},
    id: "local-step-execution",
    timestamp: Date.now(),
  });
}   
