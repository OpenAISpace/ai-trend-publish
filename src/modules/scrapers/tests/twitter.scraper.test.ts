import { test, expect, beforeAll } from "bun:test";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { TwitterScraper } from "@src/modules/scrapers/twitter.scraper.ts";

let configManager: ConfigManager;

beforeAll(async () => {
  configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();
});

test("Twitter爬虫测试", async () => {
  const scraper = new TwitterScraper();
  const result = await scraper.scrape("https://x.com/CohereForAI");

  // 验证返回结果不为空
  expect(typeof result).toBe("object");
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);

  // 验证推文内容格式
  const firstTweet = result[0];
  expect(typeof firstTweet.content).toBe("string");
  expect(typeof firstTweet.publishDate).toBe("string");
});

test("Twitter爬虫错误处理测试", async () => {
  const scraper = new TwitterScraper();
  
  await expect(async () => {
    await scraper.scrape("https://x.com/invalid_user_404");
  }).toThrow();
});

test("TwitterScraper 初始化测试", async () => {
  const scraper = new TwitterScraper();
  expect(scraper).toBeDefined();
  expect(typeof scraper.scrape).toBe("function");
});

test("TwitterScraper scrape 方法参数验证", async () => {
  const scraper = new TwitterScraper();
  
  // 测试空字符串
  await expect(async () => {
    await scraper.scrape("");
  }).toThrow();
  
  // 测试无效 URL
  await expect(async () => {
    await scraper.scrape("not-a-url");
  }).toThrow();
});
