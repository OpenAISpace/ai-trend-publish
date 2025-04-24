import { getDataSources } from "../data-sources/getDataSources.ts";
import { ContentRanker } from "@src/modules/content-rank/ai.content-ranker.ts";
import { ContentPublisher } from "@src/modules/interfaces/publisher.interface.ts";
import {
  ContentScraper,
  ScrapedContent,
} from "@src/modules/interfaces/scraper.interface.ts";
import { ContentSummarizer } from "@src/modules/interfaces/summarizer.interface.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";
import { WeixinPublisher } from "@src/modules/publishers/weixin.publisher.ts";
import { WeixinTemplate } from "../modules/render/weixin/interfaces/article.type.ts";
import { FireCrawlScraper } from "@src/modules/scrapers/fireCrawl.scraper.ts";
import { TwitterScraper } from "@src/modules/scrapers/twitter.scraper.ts";
import { AISummarizer } from "@src/modules/summarizer/ai.summarizer.ts";
import { ImageGeneratorFactory } from "@src/providers/image-gen/image-generator-factory.ts";
import { WeixinArticleTemplateRenderer } from "../modules/render/weixin/article.renderer.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import {
  WorkflowEntrypoint,
  WorkflowEnv,
  WorkflowEvent,
  WorkflowStep,
} from "@src/works/workflow.ts";
import { WorkflowTerminateError } from "@src/works/workflow-error.ts";
import { Logger } from "@zilla/logger";
import ProgressBar from "jsr:@deno-library/progress";
import { ImageGeneratorType } from "@src/providers/interfaces/image-gen.interface.ts";
import { VectorService } from "@src/services/vector-service.ts";
import { EmbeddingProvider } from "@src/providers/interfaces/embedding.interface.ts";
import { EmbeddingFactory } from "@src/providers/embedding/embedding-factory.ts";
import { EmbeddingProviderType } from "@src/providers/interfaces/embedding.interface.ts";
import { VectorSimilarityUtil } from "@src/utils/VectorSimilarityUtil.ts";
const logger = new Logger("weixin-article-workflow");

interface WeixinWorkflowEnv {
  name: string;
}

// 工作流参数类型定义
interface WeixinWorkflowParams {
  sourceType?: "all" | "firecrawl" | "twitter";
  maxArticles?: number;
  forcePublish?: boolean;
}

export class WeixinArticleWorkflow
  extends WorkflowEntrypoint<WeixinWorkflowEnv, WeixinWorkflowParams> {
  private scraper: Map<string, ContentScraper>;
  private summarizer: ContentSummarizer;
  private publisher: WeixinPublisher;
  private notifier: BarkNotifier;
  private renderer: WeixinArticleTemplateRenderer;
  private contentRanker: ContentRanker;
  private vectorService: VectorService;
  private embeddingModel!: EmbeddingProvider;
  private existingVectors: { vector: number[]; content: string | null }[] = [];
  private stats = {
    success: 0,
    failed: 0,
    contents: 0,
    duplicates: 0,
  };

  constructor(env: WorkflowEnv<WeixinWorkflowEnv>) {
    super(env);
    this.scraper = new Map<string, ContentScraper>();
    this.scraper.set("fireCrawl", new FireCrawlScraper());
    this.scraper.set("twitter", new TwitterScraper());
    this.summarizer = new AISummarizer();
    this.publisher = new WeixinPublisher();
    this.notifier = new BarkNotifier();
    this.renderer = new WeixinArticleTemplateRenderer();
    this.contentRanker = new ContentRanker();
    this.vectorService = new VectorService();
  }

  public getWorkflowStats(eventId: string) {
    return this.metricsCollector.getWorkflowEventMetrics(this.env.id, eventId);
  }

  async run(
    event: WorkflowEvent<WeixinWorkflowParams>,
    step: WorkflowStep,
  ): Promise<void> {
    try {
      logger.info(
        `[工作流开始] 开始执行微信工作流, 当前工作流实例ID: ${this.env.id} 触发事件ID: ${event.id}`,
      );

      // 验证IP白名单
      await step.do("validate-ip-whitelist", {
        retries: { limit: 3, delay: "10 second", backoff: "exponential" },
        timeout: "10 minutes",
      }, async () => {
        const isWhitelisted = await this.publisher.validateIpWhitelist();
        if (typeof isWhitelisted === "string") {
          this.notifier.warning(
            "IP白名单验证失败",
            `当前服务器IP(${isWhitelisted})不在微信公众号IP白名单中，请在微信公众平台添加此IP地址`,
          );
          throw new WorkflowTerminateError(
            `当前服务器IP(${isWhitelisted})不在微信公众号IP白名单中，请在微信公众平台添加此IP地址`,
          );
        }
        return isWhitelisted;
      });
      await this.notifier.info("工作流开始", "开始执行内容抓取和处理");

      // 获取数据源
      const sourceConfigs = await step.do("fetch-sources", async () => {
        const configs = await getDataSources();
        if (!configs.firecrawl) {
          throw new WorkflowTerminateError("未找到firecrawl数据源配置");
        }
        if (!configs.twitter) {
          throw new WorkflowTerminateError("未找到twitter数据源配置");
        }
        return configs;
      });

      const totalSources = sourceConfigs.firecrawl.length +
        sourceConfigs.twitter.length;

      if (totalSources === 0) {
        throw new WorkflowTerminateError("未配置任何数据源");
      }

      logger.info(`[数据源] 发现 ${totalSources} 个数据源`);

      // 3. 抓取内容
      const allContents = await step.do("scrape-contents", {
        retries: { limit: 3, delay: "10 second", backoff: "exponential" },
        timeout: "10 minutes",
      }, async () => {
        const contents: ScrapedContent[] = [];

        // 创建抓取进度条
        const scrapeProgress = new ProgressBar({
          title: "内容抓取进度",
          total: totalSources,
          clear: true, // 完成后清除进度条
          display: ":title | :percent | :completed/:total | :time \n",
        });
        let scrapeCompleted = 0;
        let totalArticles = 0;

        // FireCrawl sources
        const fireCrawlScraper = this.scraper.get("fireCrawl");
        if (!fireCrawlScraper) {
          throw new WorkflowTerminateError("FireCrawlScraper not found");
        }

        for (const source of sourceConfigs.firecrawl) {
          const sourceContents = await this.scrapeSource(
            "FireCrawl",
            source,
            fireCrawlScraper,
          );
          contents.push(...sourceContents);
          totalArticles += sourceContents.length;
          await scrapeProgress.render(++scrapeCompleted, {
            title:
              `抓取 FireCrawl: ${source.identifier}  | 已获取文章: ${totalArticles}篇`,
          });
        }

        // Twitter sources
        const twitterScraper = this.scraper.get("twitter");
        if (!twitterScraper) {
          throw new WorkflowTerminateError("TwitterScraper not found");
        }

        for (const source of sourceConfigs.twitter) {
          const sourceContents = await this.scrapeSource(
            "Twitter",
            source,
            twitterScraper,
          );
          contents.push(...sourceContents);
          totalArticles += sourceContents.length;
          await scrapeProgress.render(++scrapeCompleted, {
            title:
              `抓取 Twitter: ${source.identifier} | 已获取文章: ${totalArticles}篇`,
          });
        }

        this.stats.contents = contents.length;
        if (this.stats.contents === 0) {
          throw new WorkflowTerminateError("未获取到任何内容，流程终止");
        }

        return contents;
      });

      // 4. 内容去重
      const uniqueContents = await step.do("dedup-contents", {
        retries: { limit: 2, delay: "5 second", backoff: "exponential" },
        timeout: "15 minutes",
      }, async () => {
        const ENABLE_DEDUPLICATION = await ConfigManager.getInstance().get(
          "ENABLE_DEDUPLICATION",
        );

        if (!ENABLE_DEDUPLICATION) {
          return allContents;
        }

        // 初始化 embedding 模型
        this.embeddingModel = await EmbeddingFactory.getInstance().getProvider({
          providerType: EmbeddingProviderType.DASHSCOPE,
          model: "text-embedding-v3",
        });

        // 获取所有已存在的向量
        const existingVectors = await this.vectorService.getByType("article");
        this.existingVectors = existingVectors.map((v) => ({
          vector: v.vector,
          content: v.content,
        }));

        // 预先计算所有内容的embedding
        const contentEmbeddings = new Map<string, number[]>();
        const newVectors: {
          content: string;
          vector: number[];
          vectorDim: number;
          vectorType: string;
        }[] = [];

        logger.info("[向量计算] 开始批量计算内容向量");
        const embedProgress = new ProgressBar({
          title: "向量计算进度",
          total: allContents.length,
          clear: true,
          display: ":title | :percent | :completed/:total | :time \n",
        });
        let embedCompleted = 0;

        // 并行计算所有内容的embedding
        await Promise.all(
          allContents.map(async (content) => {
            try {
              const embedding = await this.embeddingModel.createEmbedding(
                content.content,
              );
              contentEmbeddings.set(content.id, embedding.embedding);
              newVectors.push({
                content: content.content,
                vector: embedding.embedding,
                vectorDim: embedding.embedding.length,
                vectorType: "article",
              });
            } catch (error) {
              logger.error(
                `[向量计算] 计算内容 ${content.id} 的向量失败:`,
                error,
              );
            }
            await embedProgress.render(++embedCompleted);
          }),
        );

        logger.info(
          `[向量计算] 完成 ${contentEmbeddings.size} 个内容的向量计算`,
        );

        // 过滤掉重复内容
        const deduplicatedContents: ScrapedContent[] = [];

        for (const content of allContents) {
          const contentVector = contentEmbeddings.get(content.id);
          if (!contentVector) continue;

          // 检查是否与已处理的内容重复
          const isDuplicate = await this.checkDuplicateWithVector(
            content,
            contentVector,
          );

          if (!isDuplicate) {
            deduplicatedContents.push(content);
          }
        }

        // 批量保存新的向量到数据库
        if (newVectors.length > 0) {
          logger.info(`[向量存储] 开始批量保存 ${newVectors.length} 个新向量`);
          await this.vectorService.createBatch(newVectors);
          logger.info("[向量存储] 向量保存完成");
        }

        logger.info(
          `[去重] 完成内容去重，原始内容 ${allContents.length} 篇，去重后 ${deduplicatedContents.length} 篇，重复 ${this.stats.duplicates} 篇`,
        );

        return deduplicatedContents;
      });

      // 5. 内容排序
      const rankedContents = await step.do("rank-contents", {
        retries: { limit: 2, delay: "5 second", backoff: "exponential" },
        timeout: "5 minutes",
      }, async () => {
        logger.info(`[内容排序] 开始排序 ${uniqueContents.length} 条内容`);
        const ranked = await this.contentRanker.rankContents(uniqueContents);
        if (ranked.length === 0) {
          throw new WorkflowTerminateError("内容排序失败，没有任何内容被评分");
        }
        // 按分数排序
        ranked.sort((a, b) => b.score - a.score);
        logger.info("[内容排序] 内容排序完成");
        return ranked;
      });

      // 6. 处理排序后的内容
      const processedContents = await step.do("process-contents", {
        retries: { limit: 2, delay: "5 second", backoff: "exponential" },
        timeout: "15 minutes",
      }, async () => {
        const maxArticles = event.payload.maxArticles ||
          await ConfigManager.getInstance().get("ARTICLE_NUM") || 10;

        // 取前maxArticles篇文章
        const topContents: ScrapedContent[] = [];

        for (const ranked of rankedContents.slice(0, maxArticles)) {
          const content = uniqueContents.find((c) => c.id === ranked.id);
          if (content) {
            content.metadata.score = ranked.score;
            content.metadata.wordCount = content.content.length;
            content.metadata.readTime = Math.ceil(
              content.metadata.wordCount / 275,
            );
            topContents.push(content);
          }
        }

        // 如果文章数量不足，记录警告
        if (topContents.length < maxArticles) {
          logger.warn(
            `[内容处理] 文章数量不足，期望 ${maxArticles} 篇，实际 ${topContents.length} 篇`,
          );
          await this.notifier.warning(
            "内容数量不足",
            `仅获取到 ${topContents.length} 篇文章，少于预期的 ${maxArticles} 篇`,
          );
        }

        logger.debug(
          "[内容处理] 开始处理文章",
          JSON.stringify(topContents, null, 2),
        );

        // 处理内容（润色等）
        const processProgress = new ProgressBar({
          title: "内容处理进度",
          total: topContents.length,
          clear: true,
          display: ":title | :percent | :completed/:total | :time \n",
        });
        let processCompleted = 0;

        await Promise.all(topContents.map(async (content) => {
          await this.processContent(content);
          await processProgress.render(++processCompleted, {
            title: `已处理: ${content.title?.slice(0, 5) || "无标题"}...`,
          });
        }));

        return topContents;
      });

      // 7. 生成文章
      const { summaryTitle, mediaId, renderedTemplate } = await step.do(
        "generate-article",
        {
          retries: { limit: 2, delay: "5 second", backoff: "exponential" },
          timeout: "10 minutes",
        },
        async () => {
          // 准备模板数据
          const templateData: WeixinTemplate[] = processedContents.map(
            (content) => ({
              id: content.id,
              title: content.title,
              content: content.content,
              url: content.url,
              publishDate: content.publishDate,
              metadata: content.metadata,
              keywords: content.metadata.keywords,
              media: content.media,
            }),
          );

          // 生成总标题
          const title = await this.summarizer.generateTitle(
            processedContents.map((c) => c.title).join(" | "),
          ).then((t) => {
            t = `${new Date().toLocaleDateString()} AI速递 | ${t}`;
            return t.slice(0, 64);
          });

          // 生成封面图片
          const imageGenerator = await ImageGeneratorFactory.getInstance()
            .getGenerator(ImageGeneratorType.ALIWANX_POSTER);
          const imageUrl = await imageGenerator.generate({
            title: title.split(" | ")[1].trim().slice(0, 30),
            sub_title: new Date().toLocaleDateString() + " AI速递",
            prompt_text_zh: `科技前沿资讯 | 人工智能新闻 | 每日AI快报 - ${
              title.split(" | ")[1].trim().slice(0, 30)
            }`,
            generate_mode: "generate",
            generate_num: 1,
          });

          // 上传封面图片
          const media = await this.publisher.uploadImage(imageUrl);

          // 渲染模板
          const template = await this.renderer.render(templateData);

          return {
            summaryTitle: title,
            mediaId: media,
            renderedTemplate: template,
          };
        },
      );

      // 8. 发布文章
      await step.do("publish-article", {
        retries: { limit: 3, delay: "10 second", backoff: "exponential" },
        timeout: "5 minutes",
      }, async () => {
        logger.info("[发布] 发布到微信公众号");
        return await this.publisher.publish(
          renderedTemplate,
          summaryTitle,
          summaryTitle,
          mediaId,
        );
      });

      // 9. 完成报告
      const summary = `
        工作流执行完成
        - 数据源: ${totalSources} 个
        - 成功: ${this.stats.success} 个
        - 失败: ${this.stats.failed} 个
        - 内容: ${this.stats.contents} 条
        - 重复: ${this.stats.duplicates} 条
        - 发布: 成功`.trim();

      logger.info(`[工作流完成] ${summary}`);

      if (this.stats.failed > 0) {
        await this.notifier.warning("工作流完成(部分失败)", summary);
      } else {
        await this.notifier.success("工作流完成", summary);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 如果是终止错误，发送通知后直接抛出
      if (error instanceof WorkflowTerminateError) {
        await this.notifier.warning("工作流终止", message);
        throw error;
      }

      logger.error("[工作流] 执行失败:", message);
      await this.notifier.error("工作流失败", message);
      throw error;
    }
  }

  private async scrapeSource(
    type: string,
    source: { identifier: string },
    scraper: ContentScraper,
  ): Promise<ScrapedContent[]> {
    try {
      logger.debug(`[${type}] 抓取: ${source.identifier}`);
      const contents = await scraper.scrape(source.identifier);
      this.stats.success++;
      return contents;
    } catch (error) {
      this.stats.failed++;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[${type}] ${source.identifier} 抓取失败:`, message);
      await this.notifier.warning(
        `${type}抓取失败`,
        `源: ${source.identifier}\n错误: ${message}`,
      );
      return [];
    }
  }

  private async processContent(content: ScrapedContent): Promise<void> {
    try {
      const summary = await this.summarizer.summarize(JSON.stringify(content));
      content.title = summary.title;
      content.content = summary.content;
      content.metadata.keywords = summary.keywords;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[内容处理] ${content.id} 处理失败:`, message);
      await this.notifier.warning(
        "内容处理失败",
        `ID: ${content.id}\n保留原始内容`,
      );
      content.title = content.title || "无标题";
      content.content = content.content || "内容处理失败";
      content.metadata.keywords = content.metadata.keywords || [];
    }
  }

  private async checkDuplicateWithVector(
    content: ScrapedContent,
    contentVector: number[],
  ): Promise<boolean> {
    try {
      // 在内存中计算相似度
      for (const existingVector of this.existingVectors) {
        if (!existingVector.vector || !contentVector) {
          continue;
        }
        const similarity = VectorSimilarityUtil.cosineSimilarity(
          contentVector,
          existingVector.vector,
        );
        if (similarity >= 0.85) {
          logger.info(
            `[去重] 发现重复内容: ${content.id}, 相似度: ${similarity}, 原内容: ${
              existingVector.content?.slice(0, 50)
            }...`,
          );
          this.stats.duplicates++;
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error(`[去重] 检查重复失败: ${error}`);
      return false;
    }
  }
}
