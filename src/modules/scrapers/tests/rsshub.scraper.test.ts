import { test, expect } from "bun:test";
import request from "@src/modules/scrapers/rsshub.scraper.ts";

test("RSSHub 获取 JSON 格式数据", async () => {
  // 基本使用 - 获取 JSON Feed 格式数据
  const feed = await request("/aibase/news").json();
  console.log("JSON Feed 数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 获取 RSS 2.0 格式数据", async () => {
  // 获取 RSS 2.0 格式数据
  const feed = await request("/aibase/news").rss2();
  console.log("RSS 2.0 数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 获取 Atom 格式数据", async () => {
  // 获取 Atom 格式数据
  const feed = await request("/aibase/news").atom();
  console.log("Atom 数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 获取 RSS3 格式数据", async () => {
  // 获取 RSS3 格式数据
  const feed = await request("/aibase/news").rss3();
  console.log("RSS3 数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 配置测试", async () => {
  // 自定义 RSSHub 实例配置
  request.config({
    baseURL: "https://rsshub.example.com", // 修改 RSSHub 实例地址
    timeout: 5000, // 设置 5 秒超时
    enableCache: true, // 启用缓存
    cacheMaxAge: 10 * 60 * 1000, // 缓存 10 分钟
    cacheSize: 200, // 最大缓存 200 条
  });

  const feed = await request("/v2/bing/daily-wallpaper").rss2();
  console.log("自定义配置后的数据", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 过滤器测试", async () => {
  // 使用过滤器和限制条目数
  const feed = await request("/aibase/news")
    .filter("AI") // 只包含 AI 相关内容
    .filterOut("广告") // 排除广告内容
    .filterTitle("技术") // 标题包含技术
    .filterDescription("创新") // 描述包含创新
    .filterAuthor("张三") // 作者是张三
    .filterCategory("科技") // 分类是科技
    .filterTime(3600) // 最近一小时
    .limit(1) // 限制返回 1 条
    .json();

  console.log("过滤后的数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 排序和全文测试", async () => {
  const feed = await request("/aibase/news")
    .sorted(true) // 按时间排序
    .fulltext() // 获取全文
    .get();
  console.log("排序和全文数据", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 格式转换测试", async () => {
  const feed = await request("/aibase/news")
    .format("json") // 指定输出 JSON 格式
    .opencc("s2t") // 简体转繁体
    .brief(200) // 输出200字简介
    .get();
  console.log("格式转换后的数据:", feed);
  expect(feed).toBeDefined();
});

test("RSSHub 缓存控制测试", async () => {
  // 清除特定路径缓存
  request("/aibase/news").clearCache();

  // 清除所有缓存
  request.clearCache();

  const feed = await request("/aibase/news").json();
  console.log("清除缓存后的数据:", feed);
  expect(feed).toBeDefined();
});
