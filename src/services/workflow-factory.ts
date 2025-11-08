import { WeixinArticleWorkflow } from "@src/workflow/weixin-article.workflow";
import { WeixinAIBenchWorkflow } from "@src/workflow/weixin-aibench.workflow";
import { WeixinHelloGithubWorkflow } from "@src/workflow/weixin-hellogithub.workflow";
import { WorkflowEntrypoint } from "@src/works/workflow.ts";
import { WorkflowType } from "@src/types/workflows.ts";

export { WorkflowType } from "@src/types/workflows.ts";

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
