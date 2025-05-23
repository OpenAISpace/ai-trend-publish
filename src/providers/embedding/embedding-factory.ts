import { EmbeddingProvider, EmbeddingProviderType, EmbeddingProviderTypeMap } from "@src/providers/interfaces/embedding.interface.ts";
import { OpenAICompatibleEmbedding } from "@src/providers/embedding/openai-compatible-embedding.ts";
import { JinaEmbeddingProvider } from "./jina/jina.embedding.ts"; // Corrected path
import { ConfigManager } from "@src/utils/config/config-manager.ts";

/**
 * 解析 Embedding Provider 配置
 * 支持两种格式:
 * 1. 简单格式: "PROVIDER" - 仅指定提供者类型
 * 2. 扩展格式: "PROVIDER:model" - 指定提供者类型和模型
 */
interface ParsedEmbeddingConfig {
  providerType: EmbeddingProviderType;
  model?: string;
}

/**
 * Embedding Provider 工厂类
 */
export class EmbeddingFactory {
  private static instance: EmbeddingFactory;
  private providers: Map<string, EmbeddingProvider> = new Map();
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 获取工厂实例
   */
  public static getInstance(): EmbeddingFactory {
    if (!EmbeddingFactory.instance) {
      EmbeddingFactory.instance = new EmbeddingFactory();
    }
    return EmbeddingFactory.instance;
  }

  /**
   * 解析 Provider 配置字符串
   * @param config 配置字符串，格式为 "PROVIDER" 或 "PROVIDER:model"
   */
  private parseConfig(config: string): ParsedEmbeddingConfig {
    const parts = config.split(":");
    const providerType = parts[0] as EmbeddingProviderType;
    const model = parts.length > 1 ? parts[1] : undefined;
    return { providerType, model };
  }

  /**
   * 获取提供者缓存键
   * @param config 解析后的配置对象
   */
  private getProviderCacheKey(config: ParsedEmbeddingConfig): string {
    return config.model ? `${config.providerType}:${config.model}` : config.providerType;
  }

  /**
   * 获取指定类型的 Embedding Provider
   * @param typeOrConfig Provider 类型或配置字符串 
   * @param needRefresh 是否需要刷新配置
   */
  public async getProvider<T extends ParsedEmbeddingConfig>(
    typeOrConfig: T | string,
    needRefresh: boolean = true
  ): Promise<EmbeddingProviderTypeMap[T["providerType"]]> {
    // 解析配置
    const config = typeof typeOrConfig === "string" ? 
      this.parseConfig(typeOrConfig) : typeOrConfig;

    // 获取缓存键
    const cacheKey = this.getProviderCacheKey(config);

    // 如果已经创建过该类型的提供者，且不需要刷新，直接返回
    if (this.providers.has(cacheKey) && !needRefresh) {
      return this.providers.get(cacheKey)! as EmbeddingProviderTypeMap[T["providerType"]];
    }

    // 如果需要刷新且提供者存在，先刷新配置
    if (needRefresh && this.providers.has(cacheKey)) {
      await this.providers.get(cacheKey)!.refresh();
      return this.providers.get(cacheKey)! as EmbeddingProviderTypeMap[T["providerType"]];
    }

    // 创建新的 provider
    const provider = this.createProvider(config);
    
    // 初始化提供者
    try {
      await provider.initialize();
      this.providers.set(cacheKey, provider);
      return provider as EmbeddingProviderTypeMap[T["providerType"]];
    } catch (error) {
      console.error(`初始化 Embedding Provider 失败 [${cacheKey}]:`, error);
      throw new Error(`无法初始化 Embedding Provider [${cacheKey}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 创建指定类型的 Provider
   * @param config Provider 配置
   */
  private createProvider(config: ParsedEmbeddingConfig): EmbeddingProvider {
    switch (config.providerType) {
      case EmbeddingProviderType.OPENAI:
        return new OpenAICompatibleEmbedding("OPENAI_", this.configManager, config.model);
      case EmbeddingProviderType.DASHSCOPE:
        return new OpenAICompatibleEmbedding("DASHSCOPE_", this.configManager, config.model);
      case EmbeddingProviderType.CUSTOM:
        return new OpenAICompatibleEmbedding("CUSTOM_", this.configManager, config.model);
      case EmbeddingProviderType.JINA:
        return new JinaEmbeddingProvider({ model: config.model }); // Pass model to Jina provider
      default:
        throw new Error(`不支持的 Embedding Provider 类型: ${config.providerType}`);
    }
  }
}