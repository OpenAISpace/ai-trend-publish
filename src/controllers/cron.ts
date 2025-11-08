import cron, { ScheduledTask } from "node-cron";
import { WorkflowDashboardService } from "@src/services/workflow-dashboard.service.ts";
import { WorkflowType } from "@src/types/workflows.ts";
import { runWorkflow } from "@src/services/workflow-runner.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("cron");
const dashboardService = WorkflowDashboardService.getInstance();
const scheduledTasks: Map<WorkflowType, ScheduledTask> = new Map();

async function registerCronTask(
  workflowId: WorkflowType,
  cronExpression: string,
  timezone: string,
) {
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        logger.info(`开始执行工作流 ${workflowId}`);
        await runWorkflow(workflowId, "cron");
      } catch (error) {
        logger.error(`工作流 ${workflowId} 执行失败`, error);
      } finally {
        try {
          const nextRun = task.nextDates().toDate();
          await dashboardService.updateNextRunAt(workflowId, nextRun);
        } catch {
          // ignore
        }
      }
    },
    { timezone },
  );

  scheduledTasks.set(workflowId, task);
  try {
    const nextRun = task.nextDates().toDate();
    await dashboardService.updateNextRunAt(workflowId, nextRun);
  } catch {
    // ignore
  }
}

export const startCronJobs = async () => {
  await dashboardService.ensureDefaultSchedules();
  const workflows = await dashboardService.listWorkflows();

  for (const task of scheduledTasks.values()) {
    task.stop();
  }
  scheduledTasks.clear();

  for (const workflow of workflows) {
    if (!workflow.schedule.isEnabled) continue;
    await registerCronTask(
      workflow.id,
      workflow.schedule.cron,
      workflow.schedule.timezone,
    );
  }

  logger.info(`已注册 ${scheduledTasks.size} 个工作流定时任务`);
};
