// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

import {
  ContentScraper,
  ScrapedContent,
  ScraperOptions,
  Media,
} from "@src/modules/interfaces/scraper.interface.ts";
import { z } from "npm:zod@3.23.8";

// Define a schema for the Jina API response for stricter parsing.
const JinaResponseSchema = z.object({
  code: z.number(),
  status: z.number().optional(), // sometimes not present
  data: z.object({
    url: z.string(),
    title: z.string(),
    content: z.string(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string().optional(),
    })).optional(),
    videos: z.array(z.object({
      src: z.string(),
      alt: z.string().optional(),
    })).optional(),
    // Add other fields from Jina response if needed
  }),
  usage: z.object({
    total_tokens: z.number(),
  }).optional(), // sometimes not present
  message: z.string().optional(), // present on errors
});

export class JinaScraper implements ContentScraper {
  private apiKey: string;
  private jinaApiUrl = "https://r.jina.ai/";

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
    sourceId: string, // This will be the URL to scrape
    options?: ScraperOptions,
  ): Promise<ScrapedContent[]> {
    console.info(`[JinaScraper] Scraping URL: ${sourceId} with options: ${JSON.stringify(options)}`);

    try {
      const response = await fetch(this.jinaApiUrl + sourceId, { // Jina Reader API uses GET with URL in path
        method: "GET", // Changed from POST to GET as per Jina Reader API docs (https://jina.ai/reader)
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json",
          // "X-With-Images-Summary": "true", // Example of an optional header
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[JinaScraper] API request failed with status ${response.status}: ${errorBody}`,
        );
        throw new Error(
          `Jina API request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const result = await response.json();
      
      // Validate the response structure
      const parsedResult = JinaResponseSchema.safeParse(result);

      if (!parsedResult.success) {
        console.error(
          `[JinaScraper] Invalid API response structure: ${parsedResult.error.toString()}`,
          result
        );
        throw new Error(
          `Jina API returned an invalid response structure. ${parsedResult.error.toString()}`,
        );
      }
      
      const jinaData = parsedResult.data.data;

      const media: Media[] = [];
      if (jinaData.images) {
        jinaData.images.forEach(img => {
          media.push({
            url: img.src,
            type: "image",
            // Jina API doesn't provide size directly, so we omit it or set default
            size: { width: 0, height: 0 }, 
          });
        });
      }
      // TODO: Add similar mapping for videos if needed

      const scrapedContent: ScrapedContent = {
        id: sourceId, // Using the URL as the ID
        title: jinaData.title,
        content: jinaData.content,
        url: jinaData.url, // Jina provides the original URL back
        publishDate: new Date().toISOString(), // Jina doesn't provide a publish date
        media: media,
        metadata: {
          // Store any other relevant data from Jina's response
          usage: parsedResult.data.usage, 
        },
      };

      return [scrapedContent]; // The interface expects an array
    } catch (error) {
      console.error(`[JinaScraper] Error scraping ${sourceId}:`, error);
      // Optionally, re-throw or return an empty array or specific error structure
      if (error instanceof Error) {
        throw new Error(`Failed to scrape ${sourceId} using Jina: ${error.message}`);
      }
      throw new Error(`Failed to scrape ${sourceId} using Jina: Unknown error`);
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

  const scraper = new JinaScraper();
  const urlToScrape = "https://example.com"; // Replace with a real URL

  try {
    console.log(`Attempting to scrape: ${urlToScrape}`);
    const content = await scraper.scrape(urlToScrape);
    if (content.length > 0) {
      console.log("Scraped Content:", content[0].title);
      console.log(content[0].content.substring(0, 200) + "..."); // Print first 200 chars of content
    } else {
      console.log("No content scraped.");
    }
  } catch (error) {
    console.error("Error during scraping example:", error);
  }
}

// To run this example:
// 1. Ensure JINA_API_KEY is set in your environment.
// 2. Uncomment the following line and run the file with Deno: `deno run -A src/modules/scrapers/jina/jina.scraper.ts`
// main();
*/
