import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { HttpClient } from "@src/utils/http/http-client.ts";
import {
  ChatCompletionOptions,
  ChatMessage,
  LLMProvider,
} from "@src/providers/interfaces/llm.interface.ts";

interface XunfeiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface XunfeiResponse {
  code: number;
  message: string;
  sid: string;
  choices: {
    message: {
      role: "assistant" | "user";
      content: string;
    };
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 讯飞星火大模型API适配?
 */
export class XunfeiLLM implements LLMProvider {
  private baseURL = "https://spark-api-open.xf-yun.com/v1/chat/completions";
  private token!: string;
  private defaultModel = "4.0Ultra";
  private httpClient: HttpClient;

  constructor(
    private configManager: ConfigManager = ConfigManager.getInstance()
  ) {
    this.httpClient = HttpClient.getInstance();
  }

  async initialize(): Promise<void> {
    await this.refresh();
  }

  async setModel(model: string): Promise<void> {
    this.defaultModel = model;
  }

  async refresh(): Promise<void> {
    this.token = await this.configManager.get("XUNFEI_API_KEY");
    if (!this.token) {
      throw new Error("讯飞API密钥未设置");
    }

    // 检查API服务是否可用
    const isHealthy = await this.httpClient.healthCheck(
      "https://spark-api-open.xf-yun.com"
    );
    if (!isHealthy) {
      console.warn("警告: 讯飞API服务健康检查失败，可能无法正常访问");
    }
  }

  /**
   * 创建聊天完成
   * @param messages 消息数组
   * @param options 可选参?
   * @returns 聊天完成响应
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<any> {
    try {
      const xunfeiMessages: XunfeiMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const enableWebSearch =
        options.stream === undefined ? false : options.stream;

      const response = await this.httpClient.request<XunfeiResponse>(
        this.baseURL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            model: this.defaultModel,
            messages: xunfeiMessages,
            stream: false,
            ...(enableWebSearch && {
              tools: [
                {
                  type: "web_search",
                  web_search: {
                    enable: true,
                  },
                },
              ],
            }),
          }),
          timeout: 60000, // 60秒超?
          retries: 3, // 最多重??
          retryDelay: 1000, // 重试间隔1?
        }
      );

      if (response.code !== 0) {
        throw new Error(`API错误: ${response.message}`);
      }

      if (!response.choices || response.choices.length === 0) {
        throw new Error("没有可用的响应选项");
      }

      // 转换为标准格式返?
      return {
        id: response.sid,
        object: "chat.completion",
        created: Date.now(),
        model: this.defaultModel,
        choices: response.choices.map((choice) => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: "stop",
        })),
        usage: response.usage,
      };
    } catch (error) {
      throw new Error(`创建聊天完成失败: ${(error as Error).message}`);
    }
  }

  /**
   * 发送单条消息并获取响应（便捷方法）
   * @param content 消息内容
   * @param systemPrompt 可选的系统提示
   * @param enableWebSearch 是否启用网络搜索
   * @returns 助手的响应
   */
  async sendMessage(
    content: string,
    systemPrompt?: string,
    enableWebSearch?: boolean
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content,
    });

    const response = await this.createChatCompletion(messages, {
      stream: enableWebSearch,
    });

    return response.choices[0].message.content;
  }
}
