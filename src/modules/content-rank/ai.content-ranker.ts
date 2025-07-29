import { RetryUtil } from "@src/utils/retry.util.ts";
import { ScrapedContent } from "@src/modules/interfaces/scraper.interface.ts";
import { LLMFactory } from "@src/providers/llm/llm-factory.ts";
import { ChatMessage } from "@src/providers/interfaces/llm.interface.ts";
import {
  getSystemPrompt,
  getUserPrompt,
} from "@src/prompts/content-ranker.prompt.ts";
import { RankResult } from "@src/modules/interfaces/content-ranker.interface.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("ai-content-ranker");

export class ContentRanker {
  private llmFactory: LLMFactory;
  private configInstance: ConfigManager;

  constructor() {
    this.llmFactory = LLMFactory.getInstance();
    this.configInstance = ConfigManager.getInstance();
    this.configInstance.get("AI_CONTENT_RANKER_LLM_PROVIDER").then(
      (provider) => {
        logger.info(`Ranker当前使用的LLM模型: ${provider}`);
      },
    );
  }

  public async rankContents(contents: ScrapedContent[]): Promise<RankResult[]> {
    if (!contents.length) {
      return [];
    }

    return RetryUtil.retryOperation(
      async () => {
        const llmProvider = await this.llmFactory.getLLMProvider(
          await this.configInstance.get("AI_CONTENT_RANKER_LLM_PROVIDER"),
        );
        const messages: ChatMessage[] = [
          { role: "system", content: getSystemPrompt() },
          { role: "user", content: getUserPrompt(contents) },
        ];

        const response = await llmProvider.createChatCompletion(messages);

        const result = response.choices?.[0]?.message?.content;
        if (!result) {
          throw new Error("未获取到有效的评分结果");
        }

        return parseRankingResult(result);
      },
    );
  }

  public async rankContentsBatch(
    contents: ScrapedContent[],
    batchSize: number = 5,
  ): Promise<RankResult[]> {
    const results: RankResult[] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await this.rankContents(batch);
      results.push(...batchResults);

      if (i + batchSize < contents.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

function parseRankingResult(result: string): RankResult[] {
  const lines = result.trim().split("\n");
  return lines.map((line) => {
    const cleanedLine = line.replace(/文章ID[:：]?/i, "").trim();
    const match = cleanedLine.match(/^(\S+)(?:[\s:：]+(\d+(?:\.\d+)?)$)/);

    if (!match) {
      throw new Error(`Invalid format for line: ${line}`);
    }

    const [, id, scoreStr] = match;
    const score = parseFloat(scoreStr);

    if (isNaN(score)) {
      throw new Error(`Invalid score format for line: ${line}`);
    }

    // 清理ID末尾的冒号
    const cleanedId = id.replace(/[:：]$/, "");

    return { id: cleanedId, score };
  });
}
