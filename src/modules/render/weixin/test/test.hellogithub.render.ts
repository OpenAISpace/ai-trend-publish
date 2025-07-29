import ejs from "ejs";
import fs from "fs";
import path from "path";
import { HelloGithubScraper } from "@src/modules/scrapers/hellogithub.scraper.ts";

interface RenderOptions {
  title?: string;
  maxItems?: number;
}

class HelloGithubRenderer {
  private templatePath: string;
  private outputPath: string;

  constructor() {
    this.templatePath = path.join(
      __dirname,
      "../../templates/hellogithub-weixin.ejs",
    );
    this.outputPath = path.join(__dirname, "../../../output");
  }

  /**
   * 渲染 HelloGithub 内容
   * @param options 渲染选项
   */
  async render(options: RenderOptions = {}) {
    const { title = "本周 AI 开源项目精�?, maxItems = 5 } = options;

    try {
      // 1. 获取数据
      console.log("正在获取数据...");
      const scraper = new HelloGithubScraper();
      const hotItems = await scraper.getHotItems(1);
      const items = await Promise.all(
        hotItems.slice(0, maxItems).map(async (item) => {
          console.log(`正在获取项目详情: ${item.title}`);
          const detail = await scraper.getItemDetail(item.itemId);
          console.log(
            "项目相关链接:",
            JSON.stringify(detail.relatedUrls, null, 2),
          );
          return detail;
        }),
      );

      // 2. 读取并渲染模�?      console.log("正在渲染模板...");
      const template = fs.readFileSync(this.templatePath, "utf-8");
      const html = ejs.render(template, {
        items,
        title,
        renderDate: new Date().toISOString().split("T")[0],
      });

      // 3. 确保输出目录存在
      if (!fs.existsSync(this.outputPath)) {
        fs.mkdirSync(this.outputPath, { recursive: true });
      }

      // 4. 保存结果
      const fileName = `hellogithub-${
        new Date().toISOString().split("T")[0]
      }.html`;
      const outputFilePath = path.join(this.outputPath, fileName);
      fs.writeFileSync(outputFilePath, html, "utf-8");

      console.log("渲染完成！输出文�?", outputFilePath);
      return outputFilePath;
    } catch (error: any) {
      console.error("渲染失败:", error.message);
      throw error;
    }
  }
}

// 测试渲染功能
async function testRender() {
  const renderer = new HelloGithubRenderer();

  try {
    await renderer.render({
      title: "🔥 本周 AI 开源项目精�?,
      maxItems: 5,
    });
  } catch (error: any) {
    console.error("测试失败:", error.message);
  }
}

// 如果直接运行此文件则执行测试
if (require.main === module) {
  testRender();
}
