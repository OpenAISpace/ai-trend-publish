import { DingdingNotify } from "../dingding.notify.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import { test, expect, mock, beforeAll } from "bun:test";

const logger = new Logger("test-notify");

// 创建测试实例和配置管理器
const configManager = ConfigManager.getInstance();

// 在测试开始前设置配置
const setupConfig = async () => {
  await configManager.initDefaultConfigSources();
};

beforeAll(async () => {
  await setupConfig();
});

test("钉钉通知初始化", async () => {
  const dingdingNotify = new DingdingNotify();
  await dingdingNotify.refresh();
  logger.info("钉钉通知初始化完成");
  expect(dingdingNotify).toBeDefined();
});

test("发送文本通知", async () => {
  const dingdingNotify = new DingdingNotify();
  const result = await dingdingNotify.notify(
    "测试通知",
    "这是一条来自TrendFinder的测试消息"
  );
  expect(result).toBe(true);
  logger.info("成功发送文本通知");
});

test("发送成功通知", async () => {
  const dingdingNotify = new DingdingNotify();
  const result = await dingdingNotify.success("操作成功", "数据处理已完成");
  expect(result).toBe(true);
  logger.info("成功发送成功通知");
});

test("发送错误通知（@所有人）", async () => {
  const dingdingNotify = new DingdingNotify();
  const result = await dingdingNotify.error("系统错误", "服务器连接失败");
  expect(result).toBe(true);
  logger.info("成功发送错误通知");
});

test("发送警告通知（@所有人）", async () => {
  const dingdingNotify = new DingdingNotify();
  const result = await dingdingNotify.warning("系统警告", "CPU使用率超过80%");
  expect(result).toBe(true);
  logger.info("成功发送警告通知");
});

test("发送带链接的通知", async () => {
  const dingdingNotify = new DingdingNotify();
  const result = await dingdingNotify.notify(
    "新任务通知",
    "发现新的数据处理任务",
    {
      url: "https://example.com/tasks/123",
      level: "active",
    }
  );
  expect(result).toBe(true);
  logger.info("成功发送带链接的通知");
});
