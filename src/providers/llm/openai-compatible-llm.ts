import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { HttpClient } from "@src/utils/http/http-client.ts";
import {
  ChatCompletionOptions,
  ChatMessage,
  LLMProvider,
} from "@src/providers/interfaces/llm.interface.ts";

export class OpenAICompatibleLLM implements LLMProvider {
  private baseURL!: string;
  private token!: string;
  private defaultModel!: string;
  private availableModels: string[] = [];
  private httpClient: HttpClient;

  constructor(
    private configKeyPrefix: string = "",
    private configManager: ConfigManager = ConfigManager.getInstance(),
    private specifiedModel?: string,
  ) {
    this.httpClient = HttpClient.getInstance();
  }

  async initialize(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.baseURL = await this.configManager.get(
      `${this.configKeyPrefix}BASE_URL`,
    );
    this.token = await this.configManager.get(`${this.configKeyPrefix}API_KEY`);

    // 获取模型配置，支持多模型格式 "model1|model2|model3"
    const modelConfig =
      await this.configManager.get(`${this.configKeyPrefix}MODEL`) ||
      "gpt-3.5-turbo";
    this.availableModels = (modelConfig as string).split("|").map((
      model: string,
    ) => model.trim());

    // 如果指定了特定模型，使用指定的模型，否则使用第一个可用模�?
    this.defaultModel = this.specifiedModel || this.availableModels[0];

    if (!this.baseURL) {
      throw new Error(`${this.configKeyPrefix}BASE_URL is not set`);
    }
    if (!this.token) {
      throw new Error(`${this.configKeyPrefix}API_KEY is not set`);
    }

    // 检查API服务是否可用
    const isHealthy = await this.httpClient.healthCheck(this.baseURL);
    if (!isHealthy) {
      console.warn(
        `警告: LLM服务 ${this.baseURL} 健康检查失败，可能无法正常访问`,
      );
    }
  }

  /**
   * 设置使用的模�?
   * @param model 模型名称
   */
  public setModel(model: string): void {
    if (this.availableModels.includes(model)) {
      this.defaultModel = model;
    } else {
      console.warn(
        `警告: 模型 ${model} 不在可用模型列表中，将使用默认模�?${this.defaultModel}`,
      );
    }
  }

  /**
   * 获取当前使用的模�?
   * @returns 当前模型名称
   */
  public getModel(): string {
    return this.defaultModel;
  }

  /**
   * 获取所有可用的模型
   * @returns 可用模型列表
   */
  public getAvailableModels(): string[] {
    return [...this.availableModels];
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<any> {
    try {
      // 使用HttpClient进行请求，自动处理重试和超时
      return await this.httpClient.request(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: options.model || this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 1,
          max_tokens: options.max_tokens ?? 2000,
          stream: options.stream ?? false,
          response_format: options.response_format,
        }),
        timeout: 60000, // 60秒超�?
        retries: 3, // 最多重�?�?
        retryDelay: 1000, // 重试间隔1�?
      });
    } catch (error) {
      throw new Error(`创建聊天完成失败: ${(error as Error).message}`);
    }
  }
}
