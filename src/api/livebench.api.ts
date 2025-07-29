import axios from "axios";
import { LLMFactory } from "@src/providers/llm/llm-factory.ts";
import { LLMProvider } from "@src/providers/interfaces/llm.interface.ts";
import { RetryUtil } from "@src/utils/retry.util.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("livebench.api");

interface CategoryMapping {
  [key: string]: string[];
}

interface ModelScore {
  [key: string]: number;
}

interface Metrics {
  [key: string]: number;
}

export interface ModelPerformance {
  metrics: Metrics;
  organization: string;
}

interface ModelInfo {
  scores: ModelScore;
  organization?: string;
}

interface ModelScores {
  [modelName: string]: ModelInfo;
}

export class LiveBenchAPI {
  private static readonly BASE_URL = "https://livebench.ai";
  private categoryMapping: CategoryMapping = {};
  private llmProvider!: LLMProvider;

  constructor() {
    // 使用LLMFactory创建QWEN提供�?    this.refresh();
  }

  async refresh() {
    try {
      const llmFactory = LLMFactory.getInstance();
      this.llmProvider = await llmFactory.getLLMProvider("QWEN");
      await this.llmProvider.refresh();
    } catch (error) {
      console.error("刷新LLM提供者失�?", error);
      throw new Error(`无法刷新LLM提供�? ${(error as Error).message}`);
    }
  }

  private async getModelOrganization(modelName: string): Promise<string> {
    return RetryUtil.retryOperation(async () => {
      await this.refresh();
      const prompt =
        `请搜索这个AI模型名称 "${modelName}" 属于哪个组织或公司。只需要返回组织名�?不要多余输出！！ 请联网搜索！！！！`;
      const systemPrompt =
        `我给你一个大模型名字 请联网搜索所属组织，只需要返回组织名�?不要多余输出�?或者在下面的信息查找chatgpt-4o-latest-0903: https://openai.com/index/hello-gpt-4o/ (OpenAI)chatgpt-4o-latest-2025-01-29: https://help.openai.com/en/articles/9624314-model-release-notes (OpenAI)claude-3-5-sonnet-20240620: https://www.anthropic.com/news/claude-3-5-sonnet (Anthropic)claude-3-5-sonnet-20241022: https://www.anthropic.com/news/3-5-models-and-computer-use (Anthropic)claude-3-5-haiku-20241022: https://www.anthropic.com/claude/haiku (Anthropic)claude-3-haiku-20240307: https://www.anthropic.com/claude (Anthropic)claude-3-opus-20240229: https://www.anthropic.com/claude (Anthropic)claude-3-sonnet-20240229: https://www.anthropic.com/claude (Anthropic)command-r: https://docs.cohere.com/docs/models (Cohere)command-r-08-2024: https://docs.cohere.com/docs/models (Cohere)command-r-plus: https://docs.cohere.com/docs/models (Cohere)command-r-plus-04-2024: https://cohere.com/blog/command-r-plus-microsoft-azure (Cohere)command-r-plus-08-2024: https://docs.cohere.com/docs/models (Cohere)deepseek-coder-v2: https://huggingface.co/deepseek-ai/DeepSeek-V2 (DeepSeek)deepseek-v2.5: https://huggingface.co/deepseek-ai/DeepSeek-V2.5 (DeepSeek)deepseek-v2.5-1210: https://api-docs.deepseek.com/news/news1210 (DeepSeek)deepseek-v3: https://api-docs.deepseek.com/news/news1226 (DeepSeek)deepseek-r1: https://huggingface.co/deepseek-ai/DeepSeek-R1 (DeepSeek)deepseek-r1-distill-qwen-32b: https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B (DeepSeek)deepseek-r1-distill-llama-70b: https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B (DeepSeek)dracarys-72b-instruct: https://huggingface.co/abacusai/Dracarys-72B-Instruct (AbacusAI)dracarys-llama-3.1-70b-instruct: https://huggingface.co/abacusai/Dracarys-Llama-3.1-70B-Instruct (AbacusAI)dracarys2-72b-instruct: https://huggingface.co/abacusai/Dracarys2-72B-Instruct (AbacusAI)dracarys2-llama-3.1-70b-instruct: https://huggingface.co/abacusai/Dracarys2-Llama-3.1-70B-Instruct (AbacusAI)gemini-1.5-flash-001: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-1.5-flash-001 (Google)gemini-1.5-flash-002: https://developers.googleblog.com/en/updated-production-ready-gemini-models-reduced-15-pro-pricing-increased-rate-limits-and-more/ (Google)gemini-1.5-flash-8b-exp-0827: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-1.5-flash-8b-exp-0924: https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-flash-8b (Google)gemini-1.5-flash-api-0514: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-1.5-flash-preview-0514 (Google)gemini-1.5-flash-exp-0827: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-1.5-pro-001: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-1.5-pro-001 (Google)gemini-1.5-pro-002: https://developers.googleblog.com/en/updated-production-ready-gemini-models-reduced-15-pro-pricing-increased-rate-limits-and-more/ (Google)gemini-1.5-pro-api-0514: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-1.5-flash-preview-0514 (Google)gemini-1.5-pro-exp-0801: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-1.5-pro-exp-0827: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-2.0-flash-exp: https://cloud.google.com/vertex-ai/generative-ai/docs/gemini-v2 (Google)gemini-2.0-flash: https://blog.google/technology/google-deepmind/gemini-model-updates-february-2025/ (Google)gemini-2.0-flash-thinking-exp-1219: https://ai.google.dev/gemini-api/docs/thinking-mode (Google)gemini-2.0-flash-thinking-exp-01-21: https://ai.google.dev/gemini-api/docs/thinking-mode (Google)gemini-2.0-flash-lite-preview-02-05: https://blog.google/technology/google-deepmind/gemini-model-updates-february-2025/ (Google)gemini-2.0-pro-exp-02-05: https://blog.google/technology/google-deepmind/gemini-model-updates-february-2025/ (Google)gemini-exp-1114: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-exp-1121: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemini-exp-1206: https://ai.google.dev/gemini-api/docs/models/experimental-models (Google)gemma-2-27b-it: https://huggingface.co/google/gemma-2-27b (Google)gemma-2-9b-it: https://huggingface.co/google/gemma-2-9b (Google)gpt-3.5-turbo-0125: https://openai.com/index/new-embedding-models-and-api-updates/ (OpenAI)gpt-4-0125-preview: https://openai.com/index/new-models-and-developer-products-announced-at-devday/ (OpenAI)gpt-4-0613: https://openai.com/index/new-models-and-developer-products-announced-at-devday/ (OpenAI)gpt-4-turbo-2024-04-09: https://openai.com/index/new-models-and-developer-products-announced-at-devday/ (OpenAI)gpt-4o-2024-05-13: https://openai.com/index/hello-gpt-4o/ (OpenAI)gpt-4o-2024-08-06: https://openai.com/index/hello-gpt-4o/ (OpenAI)gpt-4o-2024-11-20: https://openai.com/index/hello-gpt-4o/ (OpenAI)gpt-4o-mini-2024-07-18: https://openai.com/index/hello-gpt-4o/ (OpenAI)grok-2: https://x.ai/blog/grok-2 (xAI)grok-2-mini: https://x.ai/blog/grok-2 (xAI)grok-2-1212: https://x.ai/blog/grok-1212 (xAI)lama-3.1-nemotron-70b-instruct: https://build.nvidia.com/nvidia/llama-3_1-nemotron-70b-instruct (NVIDIA)meta-llama-3.1-405b-instruct-turbo: https://www.together.ai/blog/meta-llama-3-1 (Meta)meta-llama-3.1-70b-instruct-turbo: https://www.together.ai/blog/meta-llama-3-1 (Meta)meta-llama-3.1-8b-instruct-turbo: https://www.together.ai/blog/meta-llama-3-1 (Meta)llama-3.3-70b-instruct-turbo: https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct (Meta)mistral-large-2407: https://huggingface.co/mistralai/Mistral-Large-Instruct-2407 (Mistral AI)mistral-large-2411: https://huggingface.co/mistralai/Mistral-Large-Instruct-2411 (Mistral AI)mistral-small-2402: https://docs.mistral.ai/getting-started/models/ (Mistral AI)mistral-small-2409: https://huggingface.co/mistralai/Mistral-Small-Instruct-2409 (Mistral AI)mistral-small-2501: https://mistral.ai/en/news/mistral-small-3 (Mistral AI)mixtral-8x22b-instruct-v0.1: https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1 (Mistral AI)o1-mini-2024-09-12: https://platform.openai.com/docs/guides/reasoning (OpenAI)o1-preview-2024-09-12: https://platform.openai.com/docs/guides/reasoning (OpenAI)o1-2024-12-17: https://openai.com/o1/ (OpenAI)o1-2024-12-17-high: https://openai.com/o1/ (OpenAI)o1-2024-12-17-low: https://openai.com/o1/ (OpenAI)o3-mini-2025-01-31-high: https://openai.com/index/openai-o3-mini/ (OpenAI)o3-mini-2025-01-31-low: https://openai.com/index/openai-o3-mini/ (OpenAI)o3-mini-2025-01-31-medium: https://openai.com/index/openai-o3-mini/ (OpenAI)o3-mini-2025-01-31: https://openai.com/index/openai-o3-mini/ (OpenAI)open-mistral-nemo: https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407 (Mistral AI)phi-3-medium-128k-instruct: https://huggingface.co/microsoft/Phi-3-medium-128k-instruct (Microsoft)phi-3-medium-4k-instruct: https://huggingface.co/microsoft/Phi-3-medium-4k-instruct (Microsoft)phi-3-mini-128k-instruct: https://huggingface.co/microsoft/Phi-3-mini-128k-instruct (Microsoft)phi-3-mini-4k-instruct: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct (Microsoft)phi-3-small-128k-instruct: https://huggingface.co/microsoft/Phi-3-small-128k-instruct (Microsoft)phi-3-small-8k-instruct: https://huggingface.co/microsoft/Phi-3-small-8k-instruct (Microsoft)phi-3.5-mini-instruct: https://huggingface.co/microsoft/Phi-3.5-mini-instruct (Microsoft)phi-3.5-moe-instruct: https://huggingface.co/microsoft/Phi-3.5-MoE-instruct (Microsoft)phi-4: https://huggingface.co/microsoft/Phi-4 (Microsoft)qwen2.5-72b-instruct-turbo: https://huggingface.co/Qwen/Qwen2.5-72B-Instruct (Alibaba)qwen2.5-7b-instruct-turbo: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct (Alibaba)qwen2.5-coder-32b-instruct: https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct (Alibaba)qwen2.5-max: https://qwenlm.github.io/blog/qwen2.5-max/ (Alibaba)step-2-16k-202411: https://www.stepfun.com/#step2 (StepFun)grok-beta: https://x.ai/blog/api (xAI)amazon.nova-lite-v1:0: https://aws.amazon.com/ai/generative-ai/nova/ (Amazon)amazon.nova-micro-v1:0: https://aws.amazon.com/ai/generative-ai/nova/ (Amazon)amazon.nova-pro-v1:0: https://aws.amazon.com/ai/generative-ai/nova/ (Amazon)qwq-32b-preview: https://huggingface.co/Qwen/QWQ-32B-Preview (Alibaba)olmo-2-1124-13b-instruct: https://huggingface.co/allenai/OLMo-2-1124-13B-Instruct (AllenAI)learnlm-1.5-pro-experimental: https://ai.google.dev/gemini-api/docs/learnlm (Google)`;

      const response = await this.llmProvider.createChatCompletion([
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      const result = response.choices[0]?.message?.content;
      if (!result || typeof result !== "string") {
        console.warn(
          `Invalid response for model ${modelName}, returning Unknown`,
        );
        return "Unknown";
      }

      const cleanedResponse = result.trim();
      return cleanedResponse || "Unknown";
    }, {
      maxRetries: 3,
      baseDelay: 1000,
      useExponentialBackoff: true,
    });
  }

  private async fetchCategories(): Promise<void> {
    try {
      const response = await axios.get(
        `${LiveBenchAPI.BASE_URL}/categories_2024_11_25.json`,
      );
      this.categoryMapping = response.data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw new Error("Failed to fetch LiveBench categories");
    }
  }

  private async fetchScores(): Promise<ModelScores> {
    try {
      const response = await axios.get(
        `${LiveBenchAPI.BASE_URL}/table_2024_11_25.csv`,
      );
      const rows = response.data.trim().split("\n");
      const headers = rows[0].split(",");
      const modelScores: ModelScores = {};

      const totalRows = rows.length - 1;
      // 并行处理所有模型，但控制并发数�?      const concurrencyLimit = 10; // 同时最多处�?个模�?      const allRows = rows.slice(1);

      // 分批处理数据
      for (let i = 0; i < allRows.length; i += concurrencyLimit) {
        const batch = allRows.slice(i, i + concurrencyLimit);
        await Promise.all(
          batch.map(async (row: string, batchIndex: number) => {
            const index = i + batchIndex;
            const values = row.split(",");
            const modelName = values[0];
            const scores: ModelScore = {};

            for (let j = 1; j < headers.length; j++) {
              const metric = headers[j];
              const score = parseFloat(values[j]);
              if (!isNaN(score)) {
                scores[metric] = score;
              }
            }

            const organization = await this.getModelOrganization(modelName);
            modelScores[modelName] = {
              scores,
              organization,
            };

            // 显示进度
            const progress = (((index + 1) / totalRows) * 100).toFixed(1);
            logger.info(
              `Processing models: ${progress}% (${index + 1}/${totalRows})`,
            );
          }),
        );
      }

      return modelScores;
    } catch (error) {
      console.error("Error fetching scores:", error);
      throw new Error("Failed to fetch LiveBench scores");
    }
  }

  private calculateCategoryAverages(
    modelInfo: ModelInfo,
    categories: CategoryMapping,
  ): ModelPerformance {
    const metrics: Metrics = {};
    const scores = modelInfo.scores;

    // Calculate category averages
    for (const [category, categoryMetrics] of Object.entries(categories)) {
      const validScores = categoryMetrics
        .map((metric) => scores[metric])
        .filter((score) => !isNaN(score));

      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, score) => acc + score, 0);
        metrics[`${category} Average`] = Number(
          (sum / validScores.length).toFixed(2),
        );
      } else {
        metrics[`${category} Average`] = 0;
      }
    }

    const allScores = Object.values(scores).filter((score) => !isNaN(score));
    if (allScores.length > 0) {
      const globalSum = allScores.reduce((acc, score) => acc + score, 0);
      metrics["Global Average"] = Number(
        (globalSum / allScores.length).toFixed(2),
      );
    } else {
      metrics["Global Average"] = 0;
    }

    return {
      metrics,
      organization: modelInfo.organization || "Unknown",
    };
  }

  public async getModelPerformance(
    modelName?: string,
  ): Promise<{ [key: string]: ModelPerformance }> {
    try {
      await this.fetchCategories();
      const modelScores = await this.fetchScores();
      const result: { [key: string]: ModelPerformance } = {};

      if (modelName) {
        if (modelScores[modelName]) {
          result[modelName] = this.calculateCategoryAverages(
            modelScores[modelName],
            this.categoryMapping,
          );
        } else {
          throw new Error(`Model ${modelName} not found`);
        }
      } else {
        for (const [model, scores] of Object.entries(modelScores)) {
          result[model] = this.calculateCategoryAverages(
            scores,
            this.categoryMapping,
          );
        }
      }

      return result;
    } catch (error) {
      logger.error("Error in getModelPerformance:", error);
      throw error;
    }
  }

  public async getTopPerformers(
    limit: number = 5,
    sortBy: string = "Global Average",
  ): Promise<{ [key: string]: ModelPerformance }> {
    const allPerformance = await this.getModelPerformance();

    const modelRankings = Object.entries(allPerformance)
      .map(([model, performance]) => {
        const avgScore = performance.metrics[sortBy] || 0;
        return { model, performance, avgScore };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);

    const result: { [key: string]: ModelPerformance } = {};
    modelRankings.forEach(({ model, performance }) => {
      result[model] = performance;
    });

    return result;
  }
}
