import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { WeixinTemplate } from "@src/modules/render/weixin/interfaces/article.type.ts";
import { formatDate } from "@src/utils/common.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { WeixinPublisher } from "@src/modules/publishers/weixin.publisher.ts";
import { WeixinArticleTemplateRenderer } from "@src/modules/render/weixin/article.renderer.ts";
import { WeixinImageProcessor } from "@src/utils/image/image-processor.ts";

const originalConsoleLog = console.log;

function formatLog(message: any) {
  originalConsoleLog(`[${new Date().toLocaleString()}]`, message);
}

console.log = formatLog;

// 生成示例HTML预览
const previewArticles: WeixinTemplate[] = [
  {
    id: "1",
    title: "人工智能发展最新突破：GPT-4展现多模态能�?,
    content:
      `当你使用一个库时，它能�?即插即用"，这背后往往<strong>隐藏着一位工程师</strong>付出的巨大努力。编写高质量的技术文档是一项耗时且需要高度专业技能的工作。这些文档不仅包括了详细的API说明、示例代码和常见问题解答，还可能涵盖了一些最佳实践和性能优化建议�?next_paragraph />在软件开发领域，良好的文档可以显著提高开发效率，减少因理解错误导致的bug。对于开源项目来说，优质的文档更是吸引贡献者和用户的关键因素之一。很多工程师在完成核心功能开发后，会花费大量时间来完善相关文档，以确保其他开发者能够快速上手并充分利用该库的功能�?next_paragraph />这种对细节的关注和对用户体验的重视体现了工程师的专业精神。虽然编写文档的过程可能是枯燥乏味的，但其带来的长期收益却非常可观。因此，当下次你在享受某个库带来的便利时，请记得感谢那些默默无闻地为良好文档而努力工作的工程师们。`,
    url: "https://example.com/gpt4-breakthrough",
    publishDate: formatDate(new Date().toISOString()),
    keywords: ["GPT-4", "人工智能", "多模�?, "OpenAI"],
    media: [{
      url:
        "https://oss.liuyaowen.cn/images/%E3%80%90%E5%93%B2%E9%A3%8E%E5%A3%81%E7%BA%B8%E3%80%912024-11-09%2010_13_12.png",
      type: "image",
      size: {
        width: 100,
        height: 100,
      },
    }],
    metadata: {
      author: "AI研究�?,
      readTime: 5,
      wordCount: 1000,
    },
  },
  {
    id: "2",
    title: "人工智能发展最新突破：GPT-4展现多模态能�?,
    content:
      `当你使用一个库时，它能�?即插即用"，这背后往往<em>隐藏着一位工程师</em>付出的巨大努力。编写高质量的技术文档是一项耗时且需要高度专业技能的工作。这些文档不仅包括了详细的API说明、示例代码和常见问题解答，还可能涵盖了一些最佳实践和性能优化建议�?next_paragraph />在软件开发领域，良好的文档可以显著提高开发效率，减少因理解错误导致的bug。对于开源项目来说，优质的文档更是吸引贡献者和用户的关键因素之一。很多工程师在完成核心功能开发后，会花费大量时间来完善相关文档，以确保其他开发者能够快速上手并充分利用该库的功能�?next_paragraph/>这种对细节的关注和对用户体验的重视体现了工程师的专业精神。虽然编写文档的过程可能是枯燥乏味的，但其带来的长期收益却非常可观。因此，当下次你在享受某个库带来的便利时，请记得感谢那些默默无闻地为良好文档而努力工作的工程师们。`,
    url: "https://example.com/gpt4-breakthrough",
    publishDate: formatDate(new Date().toISOString()),
    keywords: ["GPT-4", "人工智能", "多模�?, "OpenAI"],
    media: [{
      url:
        "https://oss.liuyaowen.cn/images/%E3%80%90%E5%93%B2%E9%A3%8E%E5%A3%81%E7%BA%B8%E3%80%912024-11-09%2010_13_12.png",
      type: "image",
      size: {
        width: 100,
        height: 100,
      },
    }, {
      url:
        "https://oss.liuyaowen.cn/images/%E3%80%90%E5%93%B2%E9%A3%8E%E5%A3%81%E7%BA%B8%E3%80%912024-11-09%2010_13_12.png",
      type: "image",
      size: {
        width: 100,
        height: 100,
      },
    }],
    metadata: {
      author: "AI研究�?,
      readTime: 5,
      wordCount: 1000,
    },
  },
  {
    id: "3",
    title: "人工智能发展最新突破：GPT-4展现多模态能�?,
    content:
      `当你使用一个库时，它能�?即插即用"，这背后往往隐藏着一位工程师付出的巨大努力。编写高质量的技术文档是一项耗时且需要高度专业技能的工作。这些文档不仅包括了详细的API说明、示例代码和常见问题解答，还可能涵盖了一些最佳实践和性能优化建议�?next_paragraph/><ul>良好文档的优势：
    <li>提高开发效�?/li><li>减少错误和bug</li><li>吸引更多贡献�?/li></ul><next_paragraph/><ol>文档编写步骤�?li>确定目标受众</li><li>编写API参�?/li><li>提供使用示例</li></ol><next_paragraph/><next_paragraph/>这种对细节的关注和对用户体验的重视体现了工程师的专业精神。虽然编写文档的过程可能是枯燥乏味的，但其带来的长期收益却非常可观。因此，当下次你在享受某个库带来的便利时，请记得感谢那些默默无闻地为良好文档而努力工作的工程师们。`,
    url: "https://example.com/gpt4-breakthrough",
    publishDate: formatDate(new Date().toISOString()),
    keywords: ["GPT-4", "人工智能", "多模�?, "OpenAI"],
    metadata: {
      author: "AI研究�?,
      readTime: 5,
      wordCount: 1000,
    },
  },
];

// 渲染并保存预览文�?
async function renderAndSavePreview() {
  const configManager = ConfigManager.getInstance();
  configManager.initDefaultConfigSources();
  const weixinPublisher = new WeixinPublisher();
  const renderer = new WeixinArticleTemplateRenderer();

  await renderer.initializeTemplates();
  const imageProcessor = new WeixinImageProcessor(weixinPublisher);

  const html = await renderer.render(previewArticles, "modern");

  // 确保temp目录存在
  const tempDir = join(import.meta.dirname as string, "../../../../temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // //上传到微信草稿箱
  // async function uploadToDraft() {
  //   const configManager = ConfigManager.getInstance();
  //   configManager.initDefaultConfigSources();

  //   const weixinPublish = new WeixinPublisher()

  //   await weixinPublish.refresh()

  //   const publishResult = await weixinPublish.publish(
  //     html,
  //     `${new Date().toLocaleDateString()} AI速�?| Test`,
  //     "Test",
  //     "SwCSRjrdGJNaWioRQUHzgF68BHFkSlb_f5xlTquvsOSA6Yy0ZRjFo0aW9eS3JJu_"
  //   );
  //   return publishResult;
  // }

  // uploadToDraft().then((res) => {
  //   console.log(res);
  // });

  // 保存渲染结果
  const outputPath = join(tempDir, "preview_weixin.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`预览文件已生成：${outputPath}`);
}

Deno.test("test", async () => {
  await renderAndSavePreview();
});
