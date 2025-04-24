import cron from "npm:node-cron";
import { WeixinArticleWorkflow } from "@src/services/weixin-article.workflow.ts";
import { WeixinAIBenchWorkflow } from "@src/services/weixin-aibench.workflow.ts";
import { WeixinHelloGithubWorkflow } from "@src/services/weixin-hellogithub.workflow.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";
import { WorkflowEntrypoint } from "@src/works/workflow.ts";
import { WorkflowConfigService } from "@src/services/workflow-config.service.ts";
import { Logger } from "@zilla/logger";
const logger = new Logger("cron");
export enum WorkflowType {
  WeixinArticle = "weixin-article-workflow",
  WeixinAIBench = "weixin-aibench-workflow",
  WeixinHelloGithub = "weixin-hellogithub-workflow",
}

export function getWorkflow(type: WorkflowType): WorkflowEntrypoint {
  switch (type) {
    case WorkflowType.WeixinArticle:
      return new WeixinArticleWorkflow({
        id: "weixin-article-workflow",
        env: {
          name: "weixin-article-workflow",
        },
      });
    case WorkflowType.WeixinAIBench:
      return new WeixinAIBenchWorkflow({
        id: "weixin-aibench-workflow",
        env: {
          name: "weixin-aibench-workflow",
        },
      });
    case WorkflowType.WeixinHelloGithub:
      return new WeixinHelloGithubWorkflow({
        id: "weixin-hellogithub-workflow",
        env: {
          name: "weixin-hellogithub-workflow",
        },
      });
    default:
      throw new Error(`未知的工作流类型: ${type}`);
  }
}

export const startCronJobs = () => {
  const barkNotifier = new BarkNotifier();
  barkNotifier.notify("定时任务启动", "定时任务启动");
  logger.info("初始化定时任务...");

  // 每天凌晨3点执行
  cron.schedule(
    "0 3 * * *",
    async () => {
      const dayOfWeek = new Date().getDay(); // 0是周日，1-6是周一到周六
      const adjustedDay = dayOfWeek === 0
        ? 7
        : dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7; // 将周日的0转换为7

      try {
        const workflowConfigService = WorkflowConfigService.getInstance();
        const workflowType = await workflowConfigService.getDailyWorkflow(
          adjustedDay,
        );

        if (workflowType) {
          logger.info(`开始执行周${adjustedDay}的工作流: ${workflowType}...`);
          const workflow = getWorkflow(workflowType);
          await workflow.execute({
            payload: {},
            id: "cron-job",
            timestamp: Date.now(),
          });
        } else {
          logger.info(`周${adjustedDay}没有配置对应的工作流`);
        }
      } catch (error) {
        logger.error(`工作流执行失败:`, error);
        barkNotifier.notify("工作流执行失败", String(error));
      }
    },
    {
      timezone: "Asia/Shanghai",
    },
  );
};
