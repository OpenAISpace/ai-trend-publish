// deno-lint-ignore-file no-unused-vars
import { WeixinArticleWorkflow } from "@src/services/weixin-article.workflow.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { WeixinAIBenchWorkflow } from "@src/services/weixin-aibench.workflow.ts";
import { WeixinHelloGithubWorkflow } from "@src/services/weixin-hellogithub.workflow.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import { configureLogger } from "@src/utils/logger-config.ts";

const logger = new Logger("test");

const test_workflows = [
  WeixinAIBenchWorkflow,
  WeixinArticleWorkflow,
  WeixinHelloGithubWorkflow,
];

const selected_workflow = test_workflows[1];

async function bootstrap() {
  // Configure LogTape for test
  await configureLogger();

  const configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();
  
  logger.info("测试开始，日志系统已初始化");

  if (selected_workflow === WeixinAIBenchWorkflow) {
    const weixinWorkflow = new selected_workflow({
      id: "test-workflow",
      env: {
        name: "test-workflow",
      },
    });

    await weixinWorkflow.execute({
      payload: {
        forcePublish: true,
      },
      id: "manual-action",
      timestamp: Date.now(),
    });

    const stats = weixinWorkflow.getWorkflowStats("manual-action");
    logger.debug("Workflow stats:", stats);
  } else if (selected_workflow === WeixinArticleWorkflow) {
    const weixinWorkflow = new selected_workflow({
      id: "test-workflow",
      env: {
        name: "test-workflow",
      },
    });

    await weixinWorkflow.execute({
      payload: {},
      id: "manual-action",
      timestamp: Date.now(),
    });

    const stats = weixinWorkflow.getWorkflowStats("manual-action");
    logger.debug("Workflow stats:", stats);
  } else if (selected_workflow === WeixinHelloGithubWorkflow) {
    const weixinWorkflow = new selected_workflow({
      id: "test-workflow",
      env: {
        name: "test-workflow",
      },
    });

    await weixinWorkflow.execute({
      payload: {},
      id: "manual-action",
      timestamp: Date.now(),
    });

    const stats = weixinWorkflow.getWorkflowStats("manual-action");
    logger.debug("Workflow stats:", stats);
  }
}

bootstrap().catch(console.error);
