import { test, expect, beforeAll } from "bun:test";
import { FeishuNotifier } from "../feishu.notify.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("test-feishu-notify");
let configManager: ConfigManager;

beforeAll(async () => {
  configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();
});

test("FeishuNotifier - 初始化测试", async () => {
  const notifier = new FeishuNotifier();
  expect(notifier).toBeDefined();
  logger.info("FeishuNotifier 初始化成功");
});

test("FeishuNotifier - refresh 方法测试", async () => {
  const notifier = new FeishuNotifier();
  await expect(notifier.refresh()).resolves.not.toThrow();
  logger.info("FeishuNotifier refresh 方法执行成功");
});

test("FeishuNotifier - notify 方法基础测试", async () => {
  const notifier = new FeishuNotifier();
  
  // 测试方法是否存在并且可以调用
  expect(typeof notifier.notify).toBe("function");
  
  // 测试基本调用（不依赖外部配置）
  const result = await notifier.notify("Test Title", "Test Content");
  expect(typeof result).toBe("boolean");
  
  logger.info("FeishuNotifier notify 方法测试通过");
});

test("FeishuNotifier - success 方法测试", async () => {
  const notifier = new FeishuNotifier();
  
  expect(typeof notifier.success).toBe("function");
  
  const result = await notifier.success("Success Title", "Success Content");
  expect(typeof result).toBe("boolean");
  
  logger.info("FeishuNotifier success 方法测试通过");
});

test("FeishuNotifier - error 方法测试", async () => {
  const notifier = new FeishuNotifier();
  
  expect(typeof notifier.error).toBe("function");
  
  const result = await notifier.error("Error Title", "Error Content");
  expect(typeof result).toBe("boolean");
  
  logger.info("FeishuNotifier error 方法测试通过");
});

test("FeishuNotifier - warning 方法测试", async () => {
  const notifier = new FeishuNotifier();
  
  expect(typeof notifier.warning).toBe("function");
  
  const result = await notifier.warning("Warning Title", "Warning Content");
  expect(typeof result).toBe("boolean");
  
  logger.info("FeishuNotifier warning 方法测试通过");
});

test("FeishuNotifier - info 方法测试", async () => {
  const notifier = new FeishuNotifier();
  
  expect(typeof notifier.info).toBe("function");
  
  const result = await notifier.info("Info Title", "Info Content");
  expect(typeof result).toBe("boolean");
  
  logger.info("FeishuNotifier info 方法测试通过");
});

test("FeishuNotifier - 方法链式调用测试", async () => {
  const notifier = new FeishuNotifier();
  
  // 测试连续调用不会出错
  await notifier.refresh();
  const result1 = await notifier.notify("Test 1", "Content 1");
  const result2 = await notifier.success("Test 2", "Content 2");
  const result3 = await notifier.warning("Test 3", "Content 3");
  
  expect(typeof result1).toBe("boolean");
  expect(typeof result2).toBe("boolean");
  expect(typeof result3).toBe("boolean");
  
  logger.info("FeishuNotifier 方法链式调用测试通过");
});
