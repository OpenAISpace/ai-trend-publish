import { ConfigManager } from "@src/utils/config/config-manager.ts";
import {
  LLMProvider,
  LLMProviderType,
  LLMProviderTypeMap,
} from "@src/providers/interfaces/llm.interface.ts";
import { OpenAICompatibleLLM } from "@src/providers/llm/openai-compatible-llm.ts";
import { XunfeiLLM } from "@src/providers/llm/xunfei-llm.ts";

/**
 * 解析LLM提供者配�?
 * 支持两种格式:
 * 1. 简单格�? "PROVIDER" - 仅指定提供者类�?
 * 2. 扩展格式: "PROVIDER:model" - 指定提供者类型和模型
 */
interface ParsedLLMConfig {
  providerType: LLMProviderType;
  model?: string;
}

/**
 * LLM工厂类，用于创建和管理不同的LLM提供者实�?
 */
export class LLMFactory {
  private static instance: LLMFactory;
  private providers: Map<string, LLMProvider> = new Map();
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 获取LLM工厂单例
   */
  public static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  /**
   * 解析LLM提供者配置字符串
   * @param config 配置字符串，格式�?"PROVIDER" �?"PROVIDER:model"
   * @returns 解析后的配置对象
   */
  private parseLLMConfig(config: string): ParsedLLMConfig {
    const parts = config.split(":");
    const providerType = parts[0] as LLMProviderType;
    const model = parts.length > 1 ? parts[1] : undefined;

    return { providerType, model };
  }

  /**
   * 获取提供者缓存键
   * 对于指定了模型的提供者，使用 "PROVIDER:model" 作为�?
   * @param config 解析后的配置对象
   * @returns 缓存�?
   */
  private getProviderCacheKey(config: ParsedLLMConfig): string {
    return config.model
      ? `${config.providerType}:${config.model}`
      : config.providerType;
  }

  /**
   * 获取指定类型的LLM提供�?
   * @param typeOrConfig LLM提供者配置字符串
   * @param needRefresh 是否需要刷新提供者配�?
   * @returns LLM提供者实�?
   */
  public async getLLMProvider<T extends ParsedLLMConfig>(
    typeOrConfig: T | string,
    needRefresh: boolean = true,
  ): Promise<LLMProviderTypeMap[T["providerType"]]> {
    // 解析配置
    const config = typeof typeOrConfig === "string"
      ? this.parseLLMConfig(typeOrConfig)
      : typeOrConfig;

    type ProviderType = LLMProviderTypeMap[T["providerType"]];

    // 获取缓存�?
    const cacheKey = this.getProviderCacheKey(config);

    // 如果已经创建过该类型的提供者，且不需要刷新，直接返回
    if (this.providers.has(cacheKey) && !needRefresh) {
      return this.providers.get(cacheKey)! as ProviderType;
    }

    // 如果需要刷新且提供者存在，先刷新配�?
    if (needRefresh && this.providers.has(cacheKey)) {
      await this.providers.get(cacheKey)!.refresh();
      return this.providers.get(cacheKey)! as ProviderType;
    }

    // 根据类型创建对应的LLM提供�?
    let provider: LLMProvider;

    switch (config.providerType) {
      case "OPENAI":
        provider = new OpenAICompatibleLLM("OPENAI_", undefined, config.model);
        break;
      case "DEEPSEEK":
        provider = new OpenAICompatibleLLM(
          "DEEPSEEK_",
          undefined,
          config.model,
        );
        break;
      case "XUNFEI":
        // 讯飞不支持指定模�?
        if (config.model) {
          console.warn(
            `警告: 讯飞API不支持指定模型，将忽略模型设�? ${config.model}`,
          );
        }
        provider = new XunfeiLLM();
        break;
      case "QWEN":
        provider = new OpenAICompatibleLLM("QWEN_", undefined, config.model);
        break;
      case "CUSTOM":
        provider = new OpenAICompatibleLLM(
          "CUSTOM_LLM_",
          undefined,
          config.model,
        );
        break;
      default:
        throw new Error(`不支持的LLM提供者类�? ${config.providerType}`);
    }

    // 初始化提供�?
    try {
      await provider.initialize();
      this.providers.set(cacheKey, provider);
      return provider as ProviderType;
    } catch (error) {
      console.error(`初始化LLM提供者失�?[${cacheKey}]:`, error);
      throw new Error(
        `无法初始化LLM提供�?[${cacheKey}]: ${(error as Error).message}`,
      );
    }
  }

  /**
   * 刷新所有已创建的LLM提供者的配置
   */
  public async refreshAllProviders(): Promise<void> {
    const refreshPromises: Promise<void>[] = [];

    for (const [type, provider] of this.providers.entries()) {
      refreshPromises.push(
        provider.refresh().catch((error) => {
          console.error(`刷新LLM提供者配置失�?[${type}]:`, error);
        }),
      );
    }

    await Promise.allSettled(refreshPromises);
  }

  /**
   * 获取默认的LLM提供�?
   * 从配置中读取DEFAULT_LLM_PROVIDER，如果未配置则默认使用OpenAI
   */
  public async getDefaultProvider(): Promise<LLMProvider> {
    try {
      const defaultProviderConfig =
        await this.configManager.get("DEFAULT_LLM_PROVIDER") || "OPENAI";
      return this.getLLMProvider(defaultProviderConfig as string);
    } catch (error) {
      console.error("获取默认LLM提供者失败，尝试使用OpenAI作为备�?", error);
      return this.getLLMProvider("OPENAI");
    }
  }
}
