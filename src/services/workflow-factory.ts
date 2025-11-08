import { WeixinArticleWorkflow } from "@src/services/weixin-article.workflow.ts";
import { WeixinAIBenchWorkflow } from "@src/services/weixin-aibench.workflow.ts";
import { WeixinHelloGithubWorkflow } from "@src/services/weixin-hellogithub.workflow.ts";
import { WorkflowEntrypoint } from "@src/works/workflow.ts";

export enum WorkflowType {
  WeixinArticle = "weixin-article-workflow",
  WeixinAIBench = "weixin-aibench-workflow",
  WeixinHelloGithub = "weixin-hellogithub-workflow",
}

export function getWorkflow(type: WorkflowType): WorkflowEntrypoint {
  switch (type) {
    case WorkflowType.WeixinArticle:
      return new WeixinArticleWorkflow({
        id: WorkflowType.WeixinArticle,
        env: { name: WorkflowType.WeixinArticle },
      });
    case WorkflowType.WeixinAIBench:
      return new WeixinAIBenchWorkflow({
        id: WorkflowType.WeixinAIBench,
        env: { name: WorkflowType.WeixinAIBench },
      });
    case WorkflowType.WeixinHelloGithub:
      return new WeixinHelloGithubWorkflow({
        id: WorkflowType.WeixinHelloGithub,
        env: { name: WorkflowType.WeixinHelloGithub },
      });
    default:
      throw new Error(`未知的工作流类型: ${type}`);
  }
}
