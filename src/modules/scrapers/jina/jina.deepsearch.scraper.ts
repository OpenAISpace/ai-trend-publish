// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

import {
  ContentScraper,
  ScrapedContent,
  ScraperOptions,
  // Media, // Media is unlikely to be directly from deepsearch text results
} from "@src/modules/interfaces/scraper.interface.ts";
import { z } from "npm:zod@3.23.8";

// Zod Schema for Jina DeepSearch API Request (minimal)
const DeepSearchRequestSchema = z.object({
  model: z.string().default("jina-deepsearch-v1"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  stream: z.boolean().default(false),
  // Potentially add other parameters like max_returned_urls if supported and relevant
});

// Zod Schema for Jina DeepSearch API Response
const DeepSearchResponseSchema = z.object({
  id: z.string().optional(), // Sometimes not present or not strictly needed by us
  object: z.string().optional(), // e.g., "chat.completion"
  created: z.number().optional(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.string(), // "assistant"
        content: z.string(),
      }),
      finish_reason: z.string().optional(), // e.g., "stop"
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number(),
    })
    .optional(),
  // error: z.object({ message: z.string(), type: z.string(), code: z.string().nullable() }).optional(),
});

// Helper function to parse sources from content
// This is a simple parser, might need to be more robust
function parseSourcesFromContent(content: string): { mainContent: string; sources: { url: string, title?: string }[] } {
  const sources: { url: string, title?: string }[] = [];
  let mainContent = content;

  const sourcesHeaderRegex = /\n\s*(sources|references|citations|links):\s*\n/i;
  const match = sourcesHeaderRegex.exec(content);

  if (match) {
    mainContent = content.substring(0, match.index);
    const sourcesText = content.substring(match.index + match[0].length);
    
    // Regex for markdown links: [title](url) or just URLs
    // This regex looks for patterns like [1] https://example.com or [Source 1] https://example.com/path
    // or simple URLs.
    const sourceLineRegex = /(?:\[(?:[^\]]+?|(?:\d+))\]\s*)?(https?:\/\/[^\s\(\)]+)/g;
    let sourceMatch;
    while ((sourceMatch = sourceLineRegex.exec(sourcesText)) !== null) {
      sources.push({ url: sourceMatch[1] });
    }
  }
  // If no explicit "Sources:" section, try to find URLs anywhere in the text
  // This could be noisy, so it's disabled by default. Add if necessary.
  /*
  else {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(content)) !== null) {
      // Avoid adding already captured URLs or parts of markdown if complex markdown is present
      if (!sources.some(s => s.url === urlMatch[0])) {
         // sources.push({ url: urlMatch[0], title: "Referenced URL" }); 
      }
    }
  }
  */

  return { mainContent: mainContent.trim(), sources };
}


export class JinaDeepSearchScraper implements ContentScraper {
  private apiKey: string;
  private deepSearchApiUrl = "https://deepsearch.jina.ai/v1/chat/completions";

  constructor() {
    const apiKey = Deno.env.get("JINA_API_KEY");
    if (!apiKey) {
      throw new Error(
        "JINA_API_KEY environment variable is not set. " +
        "Get your Jina AI API key for free: https://jina.ai/?sui=apikey",
      );
    }
    this.apiKey = apiKey;
  }

  async scrape(
    sourceId: string, // This will be the search query
    options?: ScraperOptions, // Options might be used for model selection, etc.
  ): Promise<ScrapedContent[]> {
    console.info(`[JinaDeepSearchScraper] Searching with query: ${sourceId} with options: ${JSON.stringify(options)}`);

    const requestBody = DeepSearchRequestSchema.parse({
      model: "jina-deepsearch-v1", // Or make configurable via options
      messages: [{ role: "user", content: sourceId }],
      stream: false,
      // Example: if options.limit is used to control number of results,
      // it might map to a Jina param like `max_returned_urls` if supported by the API.
      // This API endpoint (chat/completions) might not directly support it.
    });

    try {
      const response = await fetch(this.deepSearchApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[JinaDeepSearchScraper] API request failed with status ${response.status}: ${errorBody}`,
        );
        // Attempt to parse Jina specific error structure if available
        try {
            const errJson = JSON.parse(errorBody);
            if (errJson && errJson.error && errJson.error.message) {
                 throw new Error(`Jina DeepSearch API Error: ${errJson.error.message} (Status: ${response.status})`);
            }
        } catch (e) { /* ignore parsing error, throw original text */ }
        throw new Error(
          `Jina DeepSearch API request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const result = await response.json();
      const parsedResult = DeepSearchResponseSchema.safeParse(result);

      if (!parsedResult.success) {
        console.error(
          `[JinaDeepSearchScraper] Invalid API response structure: ${parsedResult.error.toString()}`,
          result
        );
        throw new Error(
          `Jina DeepSearch API returned an invalid response structure. ${parsedResult.error.toString()}`,
        );
      }
      
      const apiData = parsedResult.data;

      if (!apiData.choices || apiData.choices.length === 0) {
        console.warn("[JinaDeepSearchScraper] API returned no choices.", apiData);
        return [];
      }

      const messageContent = apiData.choices[0].message.content;
      const { mainContent, sources } = parseSourcesFromContent(messageContent);

      // For DeepSearch, the primary result is the synthesized answer.
      // The sources found can be listed in metadata or as part of the content.
      // The `ContentScraper` interface is geared towards scraping a *single* primary content object per URL.
      // Here, the "URL" is the query itself.
      // If we want each source to be a `ScrapedContent`, we'd need to fetch and parse each source URL.
      // That's beyond the scope of this scraper; this scraper is for the DeepSearch *result itself*.

      const scrapedContent: ScrapedContent = {
        id: `jina-deepsearch-${sourceId}-${new Date().getTime()}`, // Unique ID for the search result
        title: `Search Results for: "${sourceId.substring(0, 50)}${sourceId.length > 50 ? '...' : ''}"`,
        content: mainContent,
        url: `jina-deepsearch://query?${encodeURIComponent(sourceId)}`, // A virtual URL representing the query
        publishDate: new Date().toISOString(),
        media: [], // DeepSearch is text-based
        metadata: {
          query: sourceId,
          model: apiData.model,
          usage: apiData.usage,
          originalResponse: options?.filters?.includeOriginalResponse ? messageContent : undefined, // Optional: include full response
          sources: sources.map(s => s.url), // Store extracted source URLs
          // If we had titles for sources: sources: sources
        },
      };

      return [scrapedContent];
    } catch (error) {
      console.error(`[JinaDeepSearchScraper] Error processing query "${sourceId}":`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to process query "${sourceId}" using Jina DeepSearch: ${error.message}`);
      }
      throw new Error(`Failed to process query "${sourceId}" using Jina DeepSearch: Unknown error`);
    }
  }
}

// Example of how to use the scraper (optional, for testing or demonstration)
/*
async function main() {
  if (!Deno.env.get("JINA_API_KEY")) {
    console.error("Please set the JINA_API_KEY environment variable.");
    console.log("Get your Jina AI API key for free: https://jina.ai/?sui=apikey");
    return;
  }

  const deepSearchScraper = new JinaDeepSearchScraper();
  // Example query from Jina's DeepSearch documentation/examples if available
  const searchQuery = "What are the recent advancements in AI-powered search engines?"; 

  try {
    console.log(`Attempting Jina DeepSearch for query: "${searchQuery}"`);
    const contentItems = await deepSearchScraper.scrape(searchQuery, {
      // Example of passing options, though not many are used by this scraper directly
      // filters: { includeOriginalResponse: true } 
    });

    if (contentItems.length > 0) {
      const item = contentItems[0];
      console.log("\n--- Jina DeepSearch Result ---");
      console.log("Title:", item.title);
      console.log("ID:", item.id);
      console.log("URL (Virtual):", item.url);
      console.log("Publish Date:", item.publishDate);
      
      console.log("\nContent (Parsed):");
      console.log(item.content.substring(0, 500) + (item.content.length > 500 ? "..." : ""));
      
      if (item.metadata.sources && item.metadata.sources.length > 0) {
        console.log("\nSources found:");
        item.metadata.sources.forEach((src: string, idx: number) => console.log(`[${idx+1}] ${src}`));
      } else {
        console.log("\nNo external sources explicitly listed in the response.");
      }
      
      console.log("\nMetadata:", item.metadata);

    } else {
      console.log("No content items returned from Jina DeepSearch.");
    }
  } catch (error) {
    console.error("\nError during Jina DeepSearch scraping example:", error.message);
  }
}

// To run this example:
// 1. Ensure JINA_API_KEY is set in your environment.
// 2. Uncomment the following line and run the file with Deno: `deno run -A src/modules/scrapers/jina/jina.deepsearch.scraper.ts`
// main();
*/
