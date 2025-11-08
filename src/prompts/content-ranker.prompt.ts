import { PromptService } from "@src/services/prompt.service.ts";
import { ScrapedContent } from "@src/modules/interfaces/scraper.interface.ts";

const promptService = PromptService.getInstance();

export async function getSystemPrompt(): Promise<string> {
  return await promptService.getPromptContent("ranker");
}

export function getUserPrompt(contents: ScrapedContent[]): string {
  return contents
    .map((content) => {
      const media = content.media?.map((m) => m.url).filter(Boolean) ?? [];
      return [
        `文章ID: ${content.id}`,
        `标题: ${content.title}`,
        `发布时间: ${content.publishDate ?? "未知时间"}`,
        `来源: ${content.metadata?.source ?? "unknown"}`,
        `内容:\n${content.content}`,
        `图片: ${media.length ? media.join(", ") : "无"}`,
        "---",
      ].join("\n");
    })
    .join("\n");
}
