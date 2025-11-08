import { LiveBenchAPI } from "@src/api/livebench.api.ts";
import { AIBenchTemplateRenderer } from "@src/modules/render/index.ts";
import { WeixinPublisher } from "@src/modules/publishers/weixin.publisher.ts";
import {
  CategoryData,
  ModelScore,
} from "@src/modules/render/weixin/interfaces/aibench.type.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";
import { ImageGeneratorFactory } from "@src/providers/image-gen/image-generator-factory.ts";
import {
  WorkflowEntrypoint,
  WorkflowEnv,
  WorkflowEvent,
  WorkflowStep,
} from "@src/works/workflow.ts";
import { WorkflowTerminateError } from "@src/works/workflow-error.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import { ImageGeneratorType } from "@src/providers/interfaces/image-gen.interface.ts";
import { WorkflowDashboardService } from "@src/services/workflow-dashboard.service.ts";
import type { WorkflowType } from "@src/types/workflows.ts";

const logger = new Logger("weixin-aibench-workflow");
const dashboardService = WorkflowDashboardService.getInstance();

interface WeixinAIBenchWorkflowEnv {
  name: string;
}

interface WeixinAIBenchWorkflowParams {
  forcePublish?: boolean;
}

export class WeixinAIBenchWorkflow extends WorkflowEntrypoint<
  WeixinAIBenchWorkflowEnv,
  WeixinAIBenchWorkflowParams
> {
  private liveBenchAPI: LiveBenchAPI;
  private renderer: AIBenchTemplateRenderer;
  private notify: BarkNotifier;
  private publisher: WeixinPublisher;

  constructor(env: WorkflowEnv<WeixinAIBenchWorkflowEnv>) {
    super(env);
    this.liveBenchAPI = new LiveBenchAPI();
    this.renderer = new AIBenchTemplateRenderer();
    this.notify = new BarkNotifier();
    this.publisher = new WeixinPublisher();
  }

  public getWorkflowStats(eventId: string) {
    return this.metricsCollector.getWorkflowEventMetrics(this.env.id, eventId);
  }

  async generateCoverImage(title: string): Promise<string> {
    // 生成封面图并获取URL
    const imageGenerator =
      await ImageGeneratorFactory.getInstance().getGenerator(
        ImageGeneratorType.PDD920_LOGO
      );
    const imageResult = await imageGenerator.generate({
      t: "@AISPACE科技空间",
      text: title,
      type: "json",
    });

    // 由于type为json，imageResult一定是包含url的对?
    return imageResult as string;
  }

  async run(
    event: WorkflowEvent<WeixinAIBenchWorkflowParams>,
    step: WorkflowStep
  ): Promise<void> {
    try {
      logger.info(
        `[工作流开始] 开始执行AI Benchmark数据处理, 当前工作流实例ID: ${this.env.id} 触发事件ID: ${event.id}`
      );

      // 1. 获取模型性能数据
      const modelData = await step.do(
        "fetch-model-data",
        {
          retries: { limit: 3, delay: "10 second", backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          logger.info("[数据获取] 开始获取模型性能数据");
          const data = await this.liveBenchAPI.getModelPerformance();
          if (!data || Object.keys(data).length === 0) {
            throw new WorkflowTerminateError("未获取到任何模型性能数据");
          }
          return data;
        }
      );

      // 打印?个模型性能数据
      const head5Models = Object.entries(modelData).slice(0, 5);
      logger.debug("[数据获取] ?个模型性能数据:", head5Models);

      // 2. 找出性能最好的模型
      const topModel = await step.do("analyze-top-model", async () => {
        const sorted = Object.entries(modelData).sort(
          (a, b) =>
            b[1].metrics["Global Average"] - a[1].metrics["Global Average"]
        );
        if (sorted.length === 0) {
          throw new WorkflowTerminateError("无法确定排名最高的模型");
        }
        return sorted[0];
      });

      const topModelName = topModel[0];
      const topModelOrg = topModel[1].organization || "未知机构";

      // 3. 准备模板数据
      const templateData = await step.do("prepare-template-data", async () => {
        const data = {
          title: `${topModelName}领跑！AI模型性能榜单 - ${new Date().toLocaleDateString()}`,
          updateTime: new Date().toISOString(),
          categories: [] as CategoryData[],
          globalTop10: [] as ModelScore[],
        };

        // 转换数据格式
        const formattedData = this.renderer.transformData(modelData);
        data.categories = formattedData.categories;
        data.globalTop10 = formattedData.globalTop10.slice(0, 10);

        return data;
      });

      // 4. 渲染内容
      const { title, imageTitle, htmlContent } = await step.do(
        "generate-content",
        {
          retries: { limit: 2, delay: "5 second", backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          const title = `${topModelName}领跑?{
            new Date().toLocaleDateString()
          } AI模型性能榜单`;
          const imageTitle = `本周大模型排?${topModelOrg}旗下大模型登顶`;
          const html = await this.renderer.render(templateData);

          return { title, imageTitle, htmlContent: html };
        }
      );

      // 5. 生成并上传封面图
      const mediaId = await step.do(
        "generate-cover",
        {
          retries: { limit: 2, delay: "5 second", backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          const imageUrl = await this.generateCoverImage(imageTitle);
          return await this.publisher.uploadImage(imageUrl);
        }
      );

      // 6. 发布文章
      const publishResult = await step.do(
        "publish-article",
        {
          retries: { limit: 3, delay: "10 second", backoff: "exponential" },
          timeout: "5 minutes",
        },
        async () => {
          logger.info("[发布] 发布到微信公众号");
          return await this.publisher.publish(
            htmlContent,
            title,
            title,
            mediaId
          );
        }
      );

      await dashboardService.recordWorkflowResult({
        workflowId: this.env.id as WorkflowType,

        status: "success",

        preview: htmlContent,

        outputUrl: publishResult.url ?? null,

        metadata: {
          publishId: publishResult.publishId,

          platform: publishResult.platform,

          publishedAt: publishResult.publishedAt.toISOString(),

          topModel: topModelName,

          organization: topModelOrg,
        },
      });

      // 7. 完成报告
      logger.info("[工作流] 工作流执行完成");
      logger.info("[发布] 发布结果:", publishResult);
      await this.notify.success(
        "AI Benchmark更新完成",
        `已生成并发布最新的AI模型性能榜单\n发布状态: ${publishResult.status}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 如果是终止错误，发送通知后直接抛出
      if (error instanceof WorkflowTerminateError) {
        await this.notify.warning("[工作流] 工作流终止", message);
        throw error;
      }

      logger.error("[工作流] 执行失败:", message);
      await this.notify.error("工作流执行失败", message);
      throw error;
    }
  }
}
