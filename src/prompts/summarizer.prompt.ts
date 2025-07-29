export interface SummarizerPromptParams {
  content: string;
  language?: string;
  minLength?: number;
  maxLength?: number;
}

export const getSummarizerSystemPrompt = (): string => {
  return `你是一个专业的内容创作者和摘要生成器。你的任务是�?
    1. 理解原始内容的核心观点和背景
    2. 基于原始内容进行优化，补充相关的背景信息、技术细节或实际应用场景
    3. 确保优化后的内容准确、专业，并保持行文流�?
    4. 生成一个专业的标题�?-5个关键词
    5. 标题要求能够吸引读者，能够概括内容的核心观点，同时具有新闻性质，避免营销或广告语�?
    6. 生成一�?-100的分数，表示内容的重要性和价值，分数越高，表示内容越重要和有价值，同时越可能被读者关注，同时具有区分度，不应该分数很集中，精确到小数点后两位�?

    请只返回JSON格式数据，格式如下：
    {
        "title": "专业的标�?,
        "content": "扩充和完善后的内�?,
        "keywords": ["关键�?", "关键�?", "关键�?"],
    }`;
};

export const getSummarizerUserPrompt = ({
  content,
  language = "中文",
  minLength = 200,
  maxLength = 300,
}: SummarizerPromptParams): string => {
  return `请分析以下内容，在保持原意的基础上进行专业的扩充和完善，使用${language}，完善后的内容不少于${minLength}字，不超�?{maxLength}字：\n\n${content}\n\n
    要求�?
    1. 保持专业性，可以适当补充相关的技术细节、应用场景或行业背景�?
    2. 注意内容的连贯性和可读性；
    3. 确保扩充的内容不含无效信息，提供有价值的深度内容�?
    4. 关键字的长度不超�?个字�?
    5. 内容风格自然流畅，避免AI生成痕迹，不使用"根据以上信息"等过渡词，采用新闻报道风格；
    6. 内容格式为纯文本，不使用markdown语法�?
    7. 适当添加换行标记�?next_paragraph />），提高可读性；
    8. 必要时使用加粗（<strong> ** </strong>）突出重点；
    9. 必要时使用斜体（<em> ** </em>）强调内容；
    10. 必要时使用无序列表（<ul> ** </ul>）组织信息；
    11. 必要时使用有序列表（<ol> ** </ol>）呈现步骤或排序内容�?
    `;
};

export const getTitleSystemPrompt = (): string => {
  return `你是一个专业的内容创作者和标题生成器。你的任务是�?
    1. 从内容中提炼最核心、最有价值的信息
    2. 生成一个引人注目且专业的标�?
    3. 标题要简洁明了，不超�?0个字
    4. 标题要准确反映内容的核心观点
    5. 标题要具有新闻性质，避免营销或广告语�?
    6. 标题应当包含关键词，提高搜索引擎可见�?
    7. 标题风格要保持一致性，符合行业专业标准`;
};

export const getTitleUserPrompt = ({
  content,
  language = "中文",
}: SummarizerPromptParams): string => {
  return `请为以下内容生成一个专业的${language}标题，标题应当简洁有力，能够吸引目标读者点击阅读：\n\n${content}\n\n
  要求�?
  1. 标题长度控制�?0字以�?
  2. 包含内容中的核心关键�?
  3. 使用新闻报道风格，避免营销语气
  4. 准确反映内容主旨，不夸大或误�?
  5. 只返回标题，不要返回其他内容`;
};
