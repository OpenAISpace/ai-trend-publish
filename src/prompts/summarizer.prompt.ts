import { PromptService } from "@src/services/prompt.service.ts";

export interface SummarizerPromptParams {
  content: string;
  language?: string;
  minLength?: number;
  maxLength?: number;
}

const promptService = PromptService.getInstance();

export const getSummarizerSystemPrompt = async (): Promise<string> => {
  const base = await promptService.getPromptContent("polish");
  const jsonHint = `请只返回JSON格式数据，格式如下：
{
    "title": "专业的标题",
    "content": "扩充和完善后的内容",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "score": 85.50
}
注意：最终回答必须严格输出为 json 格式（小写 json 关键字），不可包含额外说明。`;
  return `${base}${jsonHint}`;
};

export const getSummarizerUserPrompt = ({
  content,
  language = "中文",
  minLength = 200,
  maxLength = 300,
}: SummarizerPromptParams): string => {
  return `请分析以下内容，在保持原意的基础上进行专业化扩写，使用${language}输出，最终正文不少于${minLength}字且不超过${maxLength}字：

=== 原始内容 ===
${content}

=== 执行要求 ===
1. 结合上下文补充必要的背景、数据或案例，保证观点准确；
2. 语言需客观、克制、专业，符合科技媒体风格；
3. 合理拆分段落，使用 <. /> 作为换段标记；
4. 关键信息可使用 <strong>...</strong> 加粗，概念解释可使用 <em>...</em>；
5. 如需列举要点，使用 <ul>...</ul> 或 <ol>...</ol>；
6. 不使用 Markdown 语法，不输出「总结」「综上」等模板化句式；
7. 关键词控制在 6 个字以内，聚焦专业名词；
8. 如原文包含图片或数据，可在正文合适位置加以描述；
9. 严禁添加未证实的信息或主观推断；
10. 若原文存在错误，请在润色后予以纠正但不直接指出；
11. 保持整体语气统一，结尾自然收束。`;
};

export const getTitleSystemPrompt = (): string => {
  return `你是一名科技媒体标题编辑，需要为内容生成兼具新闻性与点击率的中文标题。
请遵循以下原则：
1. 标题长度 12-18 个汉字，体现核心价值；
2. 使用事实与数据说话，避免夸张与营销化语气；
3. 适度包含关键词，提升可检索性；
4. 不得包含表情、英文缩写或无意义符号；
5. 确保与正文观点一致，不误导读者。`;
};

export const getTitleUserPrompt = ({
  content,
  language = "中文",
}: SummarizerPromptParams): string => {
  return `请基于以下内容生成一个 ${language} 标题，满足上方所有规则，只需输出标题本身：

${content}`;
};
