/**
 * Embedding Provider 接口
 */
export interface EmbeddingProvider {
  /**
   * 初始�?Provider
   */
  initialize(): Promise<void>;

  /**
   * 刷新配置
   */
  refresh(): Promise<void>;

  /**
   * 生成文本�?embedding
   * @param text 输入文本
   * @param options 可选参�?
   */
  createEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;
}

/**
 * Embedding 生成选项
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

/**
 * Embedding 结果
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

/**
 * Embedding Provider 类型
 */
export enum EmbeddingProviderType {
  OPENAI = "OPENAI",
  DASHSCOPE = "DASHSCOPE",
  CUSTOM = "CUSTOM"
}

/**
 * Embedding Provider 类型映射
 */
export interface EmbeddingProviderTypeMap {
  [EmbeddingProviderType.OPENAI]: import("../embedding/openai-compatible-embedding.ts").OpenAICompatibleEmbedding;
  [EmbeddingProviderType.DASHSCOPE]: import("../embedding/openai-compatible-embedding.ts").OpenAICompatibleEmbedding;
  [EmbeddingProviderType.CUSTOM]: import("../embedding/openai-compatible-embedding.ts").OpenAICompatibleEmbedding;
} 
