import { test, expect, beforeAll } from "bun:test";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { FireCrawlScraper } from "@src/modules/scrapers/fireCrawl.scraper.ts";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("fireCrawl-scraper");
let configManager: ConfigManager;

beforeAll(async () => {
  configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();
});

test("FireCrawl爬虫 scrapeUrl 测试", async () => {
  const scraper = new FireCrawlScraper();
  const result = await scraper.scrape(
    "https://www.toutiao.com/c/user/token/MS4wLjABAAAAHK1oKjkp6Bg3PJvPsD_i4cJrD41ElNK5jYIN9133Odc/?source=tuwen_detail&entrance_gid=7481195783346225716&log_from=59b4abc4209de_1741923570906",
  );

  // 验证返回结果不为空
  expect(typeof result).toBe("object");
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);

  // 验证推文内容格式
  const firstTweet = result[0];
  expect(typeof firstTweet.content).toBe("string");
  expect(typeof firstTweet.publishDate).toBe("string");

  logger.info("FireCrawl爬虫 scrapeUrl 测试成功");
  logger.info("结果: ", result);
});

test("FireCrawl爬虫 初始化测试", async () => {
  const scraper = new FireCrawlScraper();
  expect(scraper).toBeDefined();
  logger.info("FireCrawl爬虫 初始化成功");
});

test("FireCrawl爬虫 scrape 方法存在测试", async () => {
  const scraper = new FireCrawlScraper();
  expect(typeof scraper.scrape).toBe("function");
  logger.info("FireCrawl爬虫 scrape 方法存在");
});
