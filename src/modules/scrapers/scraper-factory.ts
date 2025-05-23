import { ContentScraper, ScraperOptions } from "@src/modules/interfaces/scraper.interface.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts"; // May not be needed if scrapers self-configure from env

// Import available scrapers
import { JinaScraper } from "./jina/jina.scraper.ts";
import { JinaDeepSearchScraper } from "./jina/jina.deepsearch.scraper.ts";
import { FireCrawlScraper } from "./fireCrawl.scraper.ts";
import { RsshubScraper } from "./rsshub.scraper.ts";
import { HellogithubScraper } from "./hellogithub.scraper.ts";
import { TwitterScraper } from "./twitter.scraper.ts";

/**
 * Scraper Provider Type Enum
 * Using strings directly for now, can be converted to enum if preferred
 */
export enum ScraperType {
  JINA_READER = "JINA_READER", // For JinaScraper (URL scraping)
  JINA_DEEPSEARCH = "JINA_DEEPSEARCH",
  FIRECRAWL = "FIRECRAWL",
  RSSHUB = "RSSHUB",
  HELLOGITHUB = "HELLOGITHUB",
  TWITTER = "TWITTER",
  // Add other scraper types here
}

/**
 * Scraper Provider Type Map
 * Maps ScraperType to the corresponding scraper class.
 */
export interface ScraperTypeMap {
  [ScraperType.JINA_READER]: JinaScraper;
  [ScraperType.JINA_DEEPSEARCH]: JinaDeepSearchScraper;
  [ScraperType.FIRECRAWL]: FireCrawlScraper;
  [ScraperType.RSSHUB]: RsshubScraper;
  [ScraperType.HELLOGITHUB]: HellogithubScraper;
  [ScraperType.TWITTER]: TwitterScraper;
}

/**
 * Parsed Scraper Configuration
 * For scrapers, this might be simpler than embeddings, primarily just the type.
 * Additional constructor parameters could be added if scrapers need them.
 */
interface ParsedScraperConfig {
  scraperType: ScraperType;
  // configKey?: string; // If scrapers needed specific config keys from ConfigManager
}

/**
 * Scraper Factory Class
 */
export class ScraperFactory {
  private static instance: ScraperFactory;
  private scrapers: Map<string, ContentScraper> = new Map();
  // private configManager: ConfigManager; // Uncomment if scrapers need centralized config

  private constructor() {
    // this.configManager = ConfigManager.getInstance(); // Uncomment if needed
  }

  public static getInstance(): ScraperFactory {
    if (!ScraperFactory.instance) {
      ScraperFactory.instance = new ScraperFactory();
    }
    return ScraperFactory.instance;
  }

  /**
   * Parses the scraper configuration string (which is just the type for now)
   * @param typeOrConfig Scraper type string or a ParsedScraperConfig object
   */
  private parseConfig(typeOrConfig: ScraperType | string | ParsedScraperConfig): ParsedScraperConfig {
    if (typeof typeOrConfig === 'object' && 'scraperType' in typeOrConfig) {
        return typeOrConfig as ParsedScraperConfig;
    }
    const scraperType = typeOrConfig as ScraperType;
    if (!Object.values(ScraperType).includes(scraperType)) {
        throw new Error(`Unsupported ScraperType: ${scraperType}`);
    }
    return { scraperType };
  }
  
  private getProviderCacheKey(config: ParsedScraperConfig): string {
    // For scrapers, the type is usually sufficient as a cache key,
    // unless they have constructor params affecting their instance (e.g. different base URLs for RSSHub).
    return config.scraperType;
  }

  /**
   * Gets or creates a scraper instance.
   * Scrapers typically don't have complex initialization or refresh logic like LLM/Embedding providers.
   * @param typeOrConfig ScraperType string or ParsedScraperConfig
   */
  public getScraper<T extends ParsedScraperConfig>(
    typeOrConfig: T | ScraperType | string,
  ): ScraperTypeMap[T["scraperType"]] {
    
    const config = this.parseConfig(typeOrConfig);
    const cacheKey = this.getProviderCacheKey(config);

    if (this.scrapers.has(cacheKey)) {
      return this.scrapers.get(cacheKey)! as ScraperTypeMap[T["scraperType"]];
    }

    const scraper = this.createScraper(config);
    // Most scrapers don't have an async initialize() method. If they did, this would need to be async.
    // For now, assuming synchronous constructor and setup.
    this.scrapers.set(cacheKey, scraper);
    return scraper as ScraperTypeMap[T["scraperType"]];
  }

  private createScraper(config: ParsedScraperConfig): ContentScraper {
    switch (config.scraperType) {
      case ScraperType.JINA_READER:
        return new JinaScraper(); // Assumes JinaScraper constructor takes no args or handles defaults
      case ScraperType.JINA_DEEPSEARCH:
        return new JinaDeepSearchScraper(); // Assumes JinaDeepSearchScraper constructor takes no args
      case ScraperType.FIRECRAWL:
        return new FireCrawlScraper(); // Assuming constructor takes no args or uses env vars
      case ScraperType.RSSHUB:
        return new RsshubScraper(); // Assuming constructor takes no args
      case ScraperType.HELLOGITHUB:
        return new HellogithubScraper();
      case ScraperType.TWITTER:
        // TwitterScraper might take arguments if it needs API keys/tokens passed directly
        // For now, assuming it reads from env like others or has a default config.
        // If it needs params: new TwitterScraper(this.configManager.get('TWITTER_API_KEY'));
        return new TwitterScraper(); 
      default:
        // This should ideally be caught by parseConfig, but as a safeguard:
        const exhaustiveCheck: never = config.scraperType;
        throw new Error(`Unhandled ScraperType in createScraper: ${exhaustiveCheck}`);
    }
  }
}

// Example Usage (optional, for testing or demonstration within this file)
/*
async function mainFactoryTest() {
  // This requires environment variables for Jina, Firecrawl etc. to be set
  // to fully test the underlying scrapers' functionality.
  // Here we are just testing the factory instantiation.

  try {
    const factory = ScraperFactory.getInstance();

    console.log("Attempting to get JINA_READER scraper...");
    const jinaReader = factory.getScraper(ScraperType.JINA_READER);
    console.log("JINA_READER scraper instance:", jinaReader instanceof JinaScraper ? "OK" : "Failed");
    // await jinaReader.scrape("https://example.com"); // Requires JINA_API_KEY

    console.log("\nAttempting to get JINA_DEEPSEARCH scraper...");
    const jinaDeepSearch = factory.getScraper(ScraperType.JINA_DEEPSEARCH);
    console.log("JINA_DEEPSEARCH scraper instance:", jinaDeepSearch instanceof JinaDeepSearchScraper ? "OK" : "Failed");
    // await jinaDeepSearch.scrape("What is Deno?"); // Requires JINA_API_KEY

    console.log("\nAttempting to get FIRECRAWL scraper...");
    const firecrawlScraper = factory.getScraper(ScraperType.FIRECRAWL);
    console.log("FIRECRAWL scraper instance:", firecrawlScraper instanceof FireCrawlScraper ? "OK" : "Failed");
    // await firecrawlScraper.scrape("https://deno.land"); // Requires FIRECRAWL_API_KEY

    console.log("\nAttempting to get RSSHUB scraper...");
    const rsshubScraper = factory.getScraper(ScraperType.RSSHUB);
    console.log("RSSHUB scraper instance:", rsshubScraper instanceof RsshubScraper ? "OK" : "Failed");
    // await rsshubScraper.scrape("/github/trending/daily/javascript"); // Example RSSHub path

    console.log("\nAttempting to get HELLOGITHUB scraper...");
    const helloGithubScraper = factory.getScraper(ScraperType.HELLOGITHUB);
    console.log("HELLOGITHUB scraper instance:", helloGithubScraper instanceof HellogithubScraper ? "OK" : "Failed");
     // await helloGithubScraper.scrape("some_source_id_if_needed");

    console.log("\nAttempting to get TWITTER scraper...");
    const twitterScraper = factory.getScraper(ScraperType.TWITTER);
    console.log("TWITTER scraper instance:", twitterScraper instanceof TwitterScraper ? "OK" : "Failed");
     // await twitterScraper.scrape("elonmusk"); // Example Twitter username

  } catch (error) {
    console.error("\nError during ScraperFactory test:", error.message);
  }
}

// To run this example:
// 1. Ensure necessary API keys (JINA_API_KEY, etc.) are set if you uncomment scrape calls.
// 2. Uncomment the following line and run: `deno run -A src/modules/scrapers/scraper-factory.ts`
// mainFactoryTest();
*/
