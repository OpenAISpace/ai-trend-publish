export interface RssDigestArticleInputForPrompt {
  title: string;
  url: string;
  sourceFeedTitle?: string;
  mainContent: string;
}

export const getRssDigestSystemPrompt = (): string => {
  const currentDate = new Date().toISOString().split('T')[0];
  return `
You are an expert news editor tasked with creating a concise and engaging daily digest from a list of articles.
The digest should be in Markdown format.
The main title of the digest should be "# Daily RSS Digest - ${currentDate}".

You will receive a list of articles, potentially grouped by their source feed.
For each article provided, you should:
1. Synthesize a brief summary (typically 1-3 sentences) from the "mainContent". Do not just copy the provided content. Highlight the key takeaways and what makes the article noteworthy.
2. Format the article with its title as a Markdown H3 heading, linked to its original URL.
3. Include the synthesized summary below the heading.
4. If a "sourceFeedTitle" is provided for a group of articles, present them under an H2 heading for that source (e.g., "## From: [Source Feed Title]").

Ensure the entire output is a single, valid Markdown document.
Do not include any preamble, conversational text, or explanation outside of the Markdown content itself.
Articles should be separated by a "---" horizontal rule.
Strive for an informative, professional, and engaging tone.
`;
};

export const getRssDigestUserPrompt = (articles: RssDigestArticleInputForPrompt[]): string => {
  // Structure the input for the LLM. JSON string is a good choice.
  // We map the articles to ensure only relevant fields are passed and to match RssDigestArticleInputForPrompt.
  const articlesForLlm = articles.map(article => ({
    title: article.title,
    url: article.url,
    sourceFeedTitle: article.sourceFeedTitle, // This helps the LLM understand grouping if articles are pre-grouped or if it needs to infer.
    mainContent: article.mainContent,
  }));

  // Using JSON.stringify to pass the structured data to the LLM.
  const articlesJsonString = JSON.stringify(articlesForLlm, null, 2);

  return `
Please generate a Markdown daily digest based on the following articles:

${articlesJsonString}

Follow all formatting, synthesis, and structural instructions from the system prompt. Ensure the output is only the Markdown digest.
`;
};
