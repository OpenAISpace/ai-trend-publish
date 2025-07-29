import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("concurrency-limiter");

export interface ConcurrencyOptions {
  maxConcurrent: number; // 最大并发数
  timeout?: number; // 任务超时时间(ms)
}

/**
 * 并发执行任务列表
 * @param tasks 任务列表
 * @param options 并发选项
 * @returns Promise<Array<T>> 所有任务的执行结果
 */
export async function runConcurrentTasks<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurrencyOptions,
): Promise<T[]> {
  const results: T[] = [];
  const running = new Set<Promise<void>>();

  // 处理单个任务
  const runTask = async (task: () => Promise<T>, index: number) => {
    try {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        task(),
        new Promise<never>((_, reject) => {
          if (options.timeout) {
            timeoutId = setTimeout(() => {
              reject(new Error(`任务执行超时 (${options.timeout}ms)`));
            }, options.timeout);
          }
        }),
      ]);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      results[index] = result;
    } catch (error) {
      logger.error(`任务${index}执行失败:`, error);
      throw error;
    }
  };

  // 任务执行
  const executor = async () => {
    for (let i = 0; i < tasks.length; i++) {
      // 等待有空闲位
      while (running.size >= options.maxConcurrent) {
        await Promise.race(running);
      }

      // 创建新任务
      const promise = runTask(tasks[i], i).finally(() => {
        running.delete(promise);
      });

      running.add(promise);
    }

    // 等待所有任务完成
    await Promise.all(running);
  };

  await executor();
  return results;
}

// 使用示例
/*
const tasks = [
  async () => {
    await sleep(1000);
    return 1;
  },
  async () => {
    await sleep(2000);
    return 2;
  },
  // ... 更多任务
];

const results = await runConcurrentTasks(tasks, {
  maxConcurrent: 3,
  timeout: 5000
});
*/
