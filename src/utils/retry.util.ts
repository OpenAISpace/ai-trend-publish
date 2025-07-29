import { Logger } from "@src/utils/logger-adapter.ts";
import { WorkflowTerminateError } from "@src/works/workflow-error.ts";

const logger = new Logger("retry-util");

/**
 * 重试操作的配置选项
 */
export interface RetryOptions {
  /** 最大重试次数*/
  maxRetries?: number;
  /** 基础延迟时间（毫秒） */
  baseDelay?: number;
  /** 是否使用指数退避策略*/
  useExponentialBackoff?: boolean;
}

/**
 * 重试操作的详细结果 */
export interface RetryResult<T> {
  /** 操作结果 */
  result: T;
  /** 实际重试次数 */
  attempts: number;
  /** 是否成功 */
  success: boolean;
  /** 最后一次错误（如果失败）*/
  error?: Error;
}

/**
 * 重试操作工具 */
export class RetryUtil {
  /**
   * 执行可重试的异步操作（原有接口）
   * @param operation 需要重试的异步操作
   * @param options 重试配置选项
   * @returns 操作结果的Promise
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const result = await this.retryOperationWithStats(operation, options);
    if (!result.success) {
      throw result.error;
    }
    return result.result;
  }

  /**
   * 执行可重试的异步操作并返回详细信息
   * @param operation 需要重试的异步操作
   * @param options 重试配置选项
   * @returns 包含详细信息的操作结果
   */
  static async retryOperationWithStats<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<RetryResult<T>> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;
    const useExponentialBackoff = options.useExponentialBackoff ?? true;

    let lastError: Error | undefined;
    let retries = 0;

    // 第一次执行
    try {
      const result = await operation();
      return {
        result,
        attempts: 0, // 第一次成功，重试次数为0
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是终止错误，立即返回不再重试
      if (lastError instanceof WorkflowTerminateError) {
        return {
          result: undefined as T,
          attempts: 0, // 终止错误，重试次数为0
          success: false,
          error: lastError,
        };
      }
    }

    // 开始重试
    while (retries < maxRetries) {
      try {
        retries++;
        const result = await operation();
        return {
          result,
          attempts: retries, // 返回实际重试次数
          success: true,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是终止错误，立即返回不再重试
        if (lastError instanceof WorkflowTerminateError) {
          return {
            result: undefined as T,
            attempts: retries, // 返回已重试次数
            success: false,
            error: lastError,
          };
        }

        if (retries === maxRetries) {
          break;
        }

        const delay = useExponentialBackoff
          ? baseDelay * Math.pow(2, retries)
          : baseDelay * (retries + 1);

        logger.warn(
          `重试操作失败 (${retries}/${maxRetries}): ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      result: undefined as T,
      attempts: retries, // 返回最终重试次数
      success: false,
      error: lastError ?? new Error("未知错误"),
    };
  }
}
