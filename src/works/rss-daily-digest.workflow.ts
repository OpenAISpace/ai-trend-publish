import { ConfigManager } from "@src/utils/config/config-manager.ts";
import rssHubRequest from "@src/modules/scrapers/rsshub.scraper.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import { LLMFactory } from "@src/providers/llm/llm-factory.ts";
import {
  getRssDigestSystemPrompt,
  getRssDigestUserPrompt,
  RssDigestArticleInputForPrompt,
} from "@src/prompts/rss-digest.prompt.ts";
import { ChatMessage } from "@src/providers/interfaces/llm.interface.ts";
import { RetryUtil } from "@src/utils/retry.util.ts";
import { WorkflowEntrypoint, WorkflowEnv, WorkflowEvent, WorkflowStep } from "@src/works/workflow.ts";
import { WorkflowTerminateError } from "@src/works/workflow-error.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";

// Define Environment and Parameter Interfaces for the Workflow
interface RssDailyDigestWorkflowEnv {
  /** A descriptive name for this workflow instance or type (e.g., "rss-daily-digest-main"). */
  name: string;
}

interface RssDailyDigestWorkflowParams {
  /** 
   * Optional: Array of RSSHub paths to process for this specific run.
   * If provided, these paths will be used instead of those from the RSS_DAILY_DIGEST_FEEDS environment variable.
   * If not provided, feeds from RSS_DAILY_DIGEST_FEEDS will be used.
   */
  overrideFeedPaths?: string[];

  /** 
   * Optional: Number of hours ago to fetch articles for this specific run.
   * Overrides the value from the RSS_DAILY_DIGEST_HOURS_AGO environment variable.
   */
  overrideHoursAgo?: number;

  /** 
   * Optional: Specify the LLM provider configuration string (e.g., "DEEPSEEK:deepseek-chat") to use for this run.
   * Overrides the value from the RSS_DAILY_DIGEST_LLM_PROVIDER environment variable.
   */
  overrideLlmProvider?: string;

  /** 
   * Optional: Define the output action for the generated digest. Default behavior might be to log.
   * - 'log': Print the Markdown to standard output (logger).
   * - 'file': Save the Markdown to a file (requires outputFileName).
   * - 'return': Make the Markdown available as the result of the workflow execution.
   */
  outputAction?: "log" | "file" | "return";

  /** 
   * Optional: Filename for the output if outputAction is 'file'. 
   * If not provided and action is 'file', a default filename like 'rss-digest-[timestamp].md' could be used.
   */
  outputFileName?: string;
}

const logger = new Logger("rss-daily-digest");

interface LlmDigestArticleInput {
  title: string;
  url: string;
  publishedDate?: string; // Kept for sorting before LLM processing
  sourceFeedTitle?: string;
  mainContent: string; // Extracted and truncated text
}


// Utility function to strip HTML tags
function stripHtml(html: string): string {
  // Basic implementation: remove tags and collapse multiple spaces to one
  // More sophisticated parsing might be needed for complex HTML
  let text = html.replace(/<style[^>]*>.*?<\/style>/gs, ''); // Remove style blocks
  text = text.replace(/<script[^>]*>.*?<\/script>/gs, ''); // Remove script blocks
  text = text.replace(/<[^>]+>/g, " "); // Replace tags with space
  text = text.replace(/&nbsp;/g, " "); // Replace &nbsp; with space
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  return text.replace(/\s+/g, " ").trim(); // Collapse multiple spaces and trim
}

interface RssHubJsonFeedItem {
  id: string;
  url?: string;
  title?: string;
  content_html?: string;
  content_text?: string;
  summary?: string;
  description?: string; // Common in RSS, often used as summary
  date_published?: string; // ISO 8601
  pubDate?: string;        // Common in RSS, may need parsing
  updated?: string;        // Common in Atom, ISO 8601
  author?: { name?: string };
  // RSSHub specific fields might exist, e.g. custom fields from the route
}

interface RssHubJsonFeed {
  version: string;
  title: string;
  home_page_url?: string;
  feed_url?: string;
  description?: string;
  icon?: string;
  favicon?: string;
  items: RssHubJsonFeedItem[];
}

export class RssDailyDigestWorkflow extends WorkflowEntrypoint<RssDailyDigestWorkflowEnv, RssDailyDigestWorkflowParams> {
  private configManager: ConfigManager;
  private llmFactory: LLMFactory;
  private notifier: BarkNotifier;

  constructor(env: WorkflowEnv<RssDailyDigestWorkflowEnv>) {
    super(env);
    this.configManager = ConfigManager.getInstance(); // Retain if used directly, or remove if always via getter
    this.llmFactory = LLMFactory.getInstance();     // Retain if used directly, or remove if always via getter
    this.notifier = new BarkNotifier();
    logger.info(`RssDailyDigestWorkflow instance created with name: ${env.name}, ID: ${this.env.id}`);
  }

  public async run(
    event: WorkflowEvent<RssDailyDigestWorkflowParams>,
    _step: WorkflowStep, // Renamed to indicate it's not used directly in this revised structure
  ): Promise<string | void> {
    logger.info(
      `[工作流执行开始] RSS每日摘要工作�? ID: ${this.env.id}, Event: ${event.id}`,
      event.payload,
    );
    let markdownDigest = "";
    let articleInputsForLlm: LlmDigestArticleInput[] = [];

    try {
      // === Configuration Loading START ===
      const llmProviderConfigKey = "RSS_DAILY_DIGEST_LLM_PROVIDER";
      const defaultLlmProvider = "DEFAULT_LLM_PROVIDER";
      const configuredLlmProvider = await this.configManager.get<string>(llmProviderConfigKey)
                                        .catch(() => defaultLlmProvider);
      const llmProviderConfig = event.payload.overrideLlmProvider || configuredLlmProvider;

      const feedPathsString = await this.configManager.get<string>("RSS_DAILY_DIGEST_FEEDS").catch(() => '[]');
      const configuredHoursAgo = await this.configManager.get<number>("RSS_DAILY_DIGEST_HOURS_AGO").catch(() => 24);
      const hoursAgo = event.payload.overrideHoursAgo || configuredHoursAgo;
      let feedPaths: string[];

      if (event.payload.overrideFeedPaths && event.payload.overrideFeedPaths.length > 0) {
        feedPaths = event.payload.overrideFeedPaths;
        logger.info(`Using overrideFeedPaths: ${feedPaths.join(", ")}`);
      } else {
        try {
          feedPaths = JSON.parse(feedPathsString);
          if (!Array.isArray(feedPaths) || !feedPaths.every(p => typeof p === 'string')) {
            logger.error("Invalid RSS_DAILY_DIGEST_FEEDS format. Expected JSON array of strings.");
            throw new WorkflowTerminateError("Invalid RSS_DAILY_DIGEST_FEEDS format in configuration.");
          }
        } catch (error) {
          logger.error("Failed to parse RSS_DAILY_DIGEST_FEEDS from configuration:", error);
          throw new WorkflowTerminateError("Failed to parse RSS_DAILY_DIGEST_FEEDS configuration.");
        }
      }
      
      if (feedPaths.length === 0) {
        logger.info("No RSS feeds configured. Workflow will terminate.");
        await this.notifier.info("RSS Digest Notice", "No RSS feeds configured. Workflow ended.");
        return "# RSS Daily Digest\n\nNo RSS feeds configured or configuration is invalid.";
      }
      logger.info(`Configuration loaded: ${feedPaths.length} feeds, ${hoursAgo} hours ago, LLM: ${llmProviderConfig}`);
      // === Configuration Loading END ===

      // === RSS Item Fetching & Preparation START ===
      const timeWindowSeconds = hoursAgo * 60 * 60;
      let allFetchedItems: LlmDigestArticleInput[] = [];

      for (const path of feedPaths) {
        try {
          logger.debug(`Fetching items for path: ${path}`);
          const feedData = await rssHubRequest(path)
            .filterTime(timeWindowSeconds)
            .json() as RssHubJsonFeed;

          if (feedData && feedData.items) {
            logger.info(`Fetched ${feedData.items.length} items from ${feedData.title} (${path})`);
            for (const item of feedData.items) {
              let mainContent = "";
              const maxContentLength = 1000; 

              if (item.content_text) mainContent = item.content_text;
              else if (item.content_html) mainContent = stripHtml(item.content_html);
              else if (item.summary) mainContent = stripHtml(item.summary);
              else if (item.description) mainContent = stripHtml(item.description);

              if (mainContent.length > maxContentLength) {
                mainContent = mainContent.substring(0, maxContentLength) + "...";
              }
              const publishedDate = item.date_published || item.pubDate || item.updated;

              allFetchedItems.push({
                title: item.title || "No Title",
                url: item.url || "#",
                publishedDate: publishedDate,
                mainContent: mainContent,
                sourceFeedTitle: feedData.title,
              });
            }
          } else {
            logger.warn(`No items found or invalid data for path: ${path}`);
          }
        } catch (error) {
          logger.error(`Failed to fetch/process RSS feed from path: ${path}`, error);
        }
      }

      const seenUrls = new Set<string>();
      const uniqueItems: LlmDigestArticleInput[] = [];
      for (const item of allFetchedItems) {
        if (item.url && item.url !== "#" && !seenUrls.has(item.url)) {
          uniqueItems.push(item);
          seenUrls.add(item.url);
        } else if (!item.url || item.url === "#") {
            logger.warn(`Item found without a valid URL, skipping for deduplication: ${item.title}`);
        }
      }
      
      uniqueItems.sort((a, b) => {
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateB - dateA;
      });
      articleInputsForLlm = uniqueItems;

      if (articleInputsForLlm.length === 0) {
        logger.info("No new items found in configured RSS feeds for the specified time window.");
        await this.notifier.info("RSS Digest Results", `No new articles found in the last ${hoursAgo} hours.`);
        return `# Daily Digest - ${new Date().toISOString().split('T')[0]}\n\nNo new articles found in the last ${hoursAgo} hours.`;
      }
      logger.info(`Fetched and prepared ${articleInputsForLlm.length} unique articles for LLM.`);
      // === RSS Item Fetching & Preparation END ===

      // === LLM Digest Synthesis START ===
      logger.info(`Synthesizing digest using LLM: ${llmProviderConfig}`);
      const llmProvider = await this.llmFactory.getLLMProvider(llmProviderConfig);
      const articlesForPrompt: RssDigestArticleInputForPrompt[] = articleInputsForLlm.map(item => ({
          title: item.title,
          url: item.url,
          sourceFeedTitle: item.sourceFeedTitle,
          mainContent: item.mainContent,
      }));
      const messages: ChatMessage[] = [
        { role: "system", content: getRssDigestSystemPrompt() }, 
        { role: "user", content: getRssDigestUserPrompt(articlesForPrompt) },
      ];

      markdownDigest = await RetryUtil.retryOperation(async () => {
        const response = await llmProvider.createChatCompletion(messages, {
          temperature: 0.5, max_tokens: 3000 
        });
        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          logger.error("LLM response content is empty or invalid.", response);
          throw new Error("LLM failed to generate digest content.");
        }
        return content;
      }, { maxRetries: 3, baseDelay: 1000 });
      logger.info("LLM successfully generated the digest.");
      // === LLM Digest Synthesis END ===

      // === Output Handling START ===
      const outputAction = event.payload.outputAction || "log"; 
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const defaultFileName = `rss-digest-${timestamp}.md`;
      const fileName = event.payload.outputFileName || defaultFileName;

      logger.info(`Handling output with action: ${outputAction}`);
      if (outputAction === "file") {
        console.log(`SIMULATE_WRITE_FILE: Outputting to ${fileName}:\n${markdownDigest}`);
        logger.info(`Digest (simulated) saved to file: ${fileName}`);
        await this.notifier.info("RSS Digest Generated", `Digest content (simulated) saved to ${fileName}`);
      } else if (outputAction === "log") {
        logger.info("--- RSS Daily Digest Start ---");
        console.log(markdownDigest);
        logger.info("--- RSS Daily Digest End ---");
      }
      // === Output Handling END ===

      await this.notifier.success("RSS Daily Digest Workflow Completed", `Successfully generated digest with ${articleInputsForLlm.length} articles.`);
      
      if (outputAction !== "file") { // Return for 'log' and 'return'
        return markdownDigest;
      }
      // If 'file', effectively void return for the main method.

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof WorkflowTerminateError) {
        logger.warn(`Workflow terminated as intended: ${message}`);
        // Assuming WorkflowTerminateError constructor or its thrower handles specific notification.
        // If not, uncomment: await this.notifier.warning("RSS Digest Workflow Terminated", message);
        throw error; // Re-throw to ensure workflow engine handles it as a termination
      }

      logger.error(`[工作流总异常] RSS每日摘要工作流执行失�? ${message}`, error.stack);
      await this.notifier.error("RSS Daily Digest Workflow Failed Critically", message);
      throw new Error(`Workflow failed critically: ${message}`); 
    }
  }

  // private formatAsMarkdown(items: DigestItem[], hoursAgo: number): string { ... } // Commented out or removed
}

// Example of how this workflow might be run (e.g. in a cron job or a test file)
/*
async function main() {
  // Setup ConfigManager if it's not globally available or needs specific test config
  // For example, setting environment variables or using a test config file
  // process.env.RSS_DAILY_DIGEST_FEEDS = '["/juejin/category/frontend", "/douban/group/697373"]';
  // process.env.RSS_DAILY_DIGEST_HOURS_AGO = "24";

  const digestWorkflow = new RssDailyDigestWorkflow();
  try {
    const markdownOutput = await digestWorkflow.run();
    console.log("Generated Markdown:
", markdownOutput);
    // Here you could save to a file, send via notifier, etc.
    // import { Deno } from "deno";
    // await Deno.writeTextFile("daily-digest.md", markdownOutput);
  } catch (error) {
    console.error("Error running RSS Daily Digest Workflow:", error);
  }
}

if (import.meta.main) {
  main();
}
*/
