// src/works/tests/rss-daily-digest.workflow.test.ts
import { RssDailyDigestWorkflow, RssDailyDigestWorkflowEnv, RssDailyDigestWorkflowParams } from "../rss-daily-digest.workflow.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import * as RssHubScraper from "@src/modules/scrapers/rsshub.scraper.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { stub, spy } from "@std/testing/mock";
import { LLMFactory } from "@src/providers/llm/llm-factory.ts";
import { LLMProvider, ChatMessage } from "@src/providers/interfaces/llm.interface.ts";
import { WorkflowEnv, WorkflowEvent, WorkflowStep } from "@src/works/workflow.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";
// import { Logger } from "@zilla/logger";
// Logger.setLogLevel("DEBUG"); // Enable detailed logs for tests if needed

// --- Mock Data Interfaces ---
interface RssHubJsonFeedItem {
  id: string;
  url?: string;
  title?: string;
  date_published?: string;
  pubDate?: string; // Alternative for date
  updated?: string; // Alternative for date
  summary?: string;
  content_html?: string; 
  content_text?: string; 
}

interface RssHubJsonFeed {
  version?: string;
  title: string;
  home_page_url?: string;
  feed_url?: string;
  description?: string;
  icon?: string;
  favicon?: string;
  items: RssHubJsonFeedItem[];
}

// --- Helper Functions ---
const createMockFeed = (title: string, home_page_url: string, items: RssHubJsonFeedItem[]): RssHubJsonFeed => ({
  version: "https://jsonfeed.org/version/1",
  title,
  home_page_url,
  items,
});

const mockRssHubChain = (feedData: RssHubJsonFeed | Promise<RssHubJsonFeed> | Error) => ({
  filterTime: function() {
    return {
      json: async () => {
        if (feedData instanceof Error) throw feedData;
        return Promise.resolve(feedData);
      },
    };
  },
});

// --- Standard Mocks ---
const mockEnv: WorkflowEnv<RssDailyDigestWorkflowEnv> = { 
  id: "test-rss-digest-workflow-id", 
  name: "test-rss-digest-workflow", 
  // root: ".", // These are part of the WorkflowEntrypoint's actual env, but not directly used by this workflow's logic
  // log: (() => {}) as any, 
  // secrets: (() => Promise.resolve(undefined)) as any,
};

const createMockEvent = (payload: Partial<RssDailyDigestWorkflowParams> = {}): WorkflowEvent<RssDailyDigestWorkflowParams> => ({
  id: `test-event-${Math.random().toString(36).substring(7)}`,
  name: "rss.digest.triggered", // Example event name
  payload: { outputAction: "return", ...payload }, // Default to return for easier testing
});

const mockStep: WorkflowStep = {
  do: async (nameOrOpts: any, fnOrUndefined?: any) => {
    const fn = typeof nameOrOpts === 'function' ? nameOrOpts : fnOrUndefined;
    // This simple passthrough assumes the function `fn` itself handles retries if needed,
    // or that the specific test doesn't rely on `step.do`'s retry/timeout logic.
    // For the refactored RssDailyDigestWorkflow, the `_step` parameter is not used internally.
    if (typeof fn === 'function') return await fn(); 
    return Promise.resolve();
  },
  // Basic stubs for other WorkflowStep methods if ever called directly by the workflow (unlikely for this one)
  get: () => null, set: () => {}, info: () => {}, error: () => {}, warn: () => {}, debug: () => {},
  sleep: () => Promise.resolve(), waitForEvent: () => Promise.resolve(null),
  waitForSignal: () => Promise.resolve(null), sendSignal: () => Promise.resolve(),
  run: () => Promise.resolve({}),
};

// Mock BarkNotifier to prevent actual notifications during tests
let barkNotifierInfoStub: any, barkNotifierSuccessStub: any, barkNotifierWarningStub: any, barkNotifierErrorStub: any;

const setupNotifierMocks = () => {
    barkNotifierInfoStub = stub(BarkNotifier.prototype, "info", () => Promise.resolve(true));
    barkNotifierSuccessStub = stub(BarkNotifier.prototype, "success", () => Promise.resolve(true));
    barkNotifierWarningStub = stub(BarkNotifier.prototype, "warning", () => Promise.resolve(true));
    barkNotifierErrorStub = stub(BarkNotifier.prototype, "error", () => Promise.resolve(true));
};
const restoreNotifierMocks = () => {
    barkNotifierInfoStub.restore();
    barkNotifierSuccessStub.restore();
    barkNotifierWarningStub.restore();
    barkNotifierErrorStub.restore();
};


// --- Test Suite ---
Deno.test("RssDailyDigestWorkflow - Successful Digest Generation (LLM)", async () => {
  setupNotifierMocks();
  const workflow = new RssDailyDigestWorkflow(mockEnv);
  const realDateNow = Date.now;
  const mockDate = new Date("2023-10-27T12:00:00Z");
  Date.now = () => mockDate.getTime();

  const configGetStub = stub(ConfigManager.getInstance(), "get");
  configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('["/test/feed1"]');
  configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);
  configGetStub.withArgs("RSS_DAILY_DIGEST_LLM_PROVIDER").resolves("MOCK_LLM_PROVIDER");

  const feed1Data = createMockFeed("Tech News", "http://technews.example.com", [
    { id: "tn1", title: "Revolutionary AI", url: "http://technews.example.com/ai", date_published: "2023-10-27T10:00:00Z", content_text: "AI breakthroughs." },
    { id: "tn2", title: "Quantum Computing Update", url: "http://technews.example.com/quantum", date_published: "2023-10-27T09:00:00Z", content_text: "Quantum leaps." },
  ]);
  const rssHubDefaultStub = stub(RssHubScraper, "default", () => mockRssHubChain(feed1Data));

  const mockExpectedMarkdown = `# Daily RSS Digest - 2023-10-27\n\n## From: Tech News ([source](http://technews.example.com))\n\n### [Revolutionary AI](http://technews.example.com/ai)\n*Published: 10/27/2023, 10:00:00 AM*\n\nAI breakthroughs.\n\n---\n\n### [Quantum Computing Update](http://technews.example.com/quantum)\n*Published: 10/27/2023, 9:00:00 AM*\n\nQuantum leaps.\n\n---\n\n";
  
  const mockLlmProvider: Partial<LLMProvider> = {
    createChatCompletion: async (messages: ChatMessage[]) => {
      assertEquals(messages[0].role, "system");
      assertStringIncludes(messages[0].content, "Daily RSS Digest - 2023-10-27");
      assertEquals(messages[1].role, "user");
      const userPromptData = JSON.parse(messages[1].content.substring(messages[1].content.indexOf('[')));
      assertEquals(userPromptData.length, 2);
      assertEquals(userPromptData[0].title, "Revolutionary AI");
      return Promise.resolve({ choices: [{ message: { role: "assistant", content: mockExpectedMarkdown } }] });
    },
    initialize: () => Promise.resolve(), refresh: () => Promise.resolve(), setModel: () => {},
  };
  const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider", () => Promise.resolve(mockLlmProvider as LLMProvider));
  const createChatCompletionSpy = spy(mockLlmProvider, "createChatCompletion");

  try {
    const result = await workflow.run(createMockEvent({ outputAction: "return" }), mockStep);
    assertEquals(result, mockExpectedMarkdown);
    assertEquals(createChatCompletionSpy.calls.length, 1);
  } finally {
    configGetStub.restore();
    rssHubDefaultStub.restore();
    getLlmProviderStub.restore();
    Date.now = realDateNow;
    restoreNotifierMocks();
  }
});

Deno.test("RssDailyDigestWorkflow - No Feeds Configured", async () => {
  setupNotifierMocks();
  const workflow = new RssDailyDigestWorkflow(mockEnv);
  const configGetStub = stub(ConfigManager.getInstance(), "get");
  configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('[]'); 
  configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);
  
  const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider");

  try {
    const result = await workflow.run(createMockEvent({ outputAction: "return" }), mockStep);
    assertEquals(result, "# RSS Daily Digest\n\nNo RSS feeds configured or configuration is invalid.");
    assertEquals(getLlmProviderStub.calls.length, 0); // LLM provider should not be fetched
  } finally {
    configGetStub.restore();
    getLlmProviderStub.restore();
    restoreNotifierMocks();
  }
});

Deno.test("RssDailyDigestWorkflow - Malformed FEEDS Configuration (Invalid JSON)", async () => {
    setupNotifierMocks();
    const workflow = new RssDailyDigestWorkflow(mockEnv);
    const configGetStub = stub(ConfigManager.getInstance(), "get");
    configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('this is not json'); 
    configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);

    const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider");
    let errorThrown: Error | null = null;
    try {
        await workflow.run(createMockEvent({ outputAction: "return" }), mockStep);
    } catch (e) {
        errorThrown = e;
    }
    assertEquals(errorThrown instanceof Error, true);
    if (errorThrown) { // Type guard
      assertStringIncludes(errorThrown.message, "Failed to parse RSS_DAILY_DIGEST_FEEDS configuration.");
    }
    assertEquals(getLlmProviderStub.calls.length, 0);

    configGetStub.restore();
    getLlmProviderStub.restore();
    restoreNotifierMocks();
});


Deno.test("RssDailyDigestWorkflow - No New Items Found", async () => {
  setupNotifierMocks();
  const workflow = new RssDailyDigestWorkflow(mockEnv);
  const realDateNow = Date.now;
  const mockDate = new Date("2023-10-28T12:00:00Z"); // Use a specific date for consistent output
  Date.now = () => mockDate.getTime();

  const configGetStub = stub(ConfigManager.getInstance(), "get");
  configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('["/test/emptyFeed"]');
  configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);
  configGetStub.withArgs("RSS_DAILY_DIGEST_LLM_PROVIDER").resolves("MOCK_LLM_PROVIDER");

  const emptyFeedData = createMockFeed("Empty Feed", "http://empty.example.com", []);
  const rssHubDefaultStub = stub(RssHubScraper, "default", () => mockRssHubChain(emptyFeedData));
  
  const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider");

  try {
    const result = await workflow.run(createMockEvent({ outputAction: "return" }), mockStep);
    assertEquals(result, `# Daily Digest - 2023-10-28\n\nNo new articles found in the last 24 hours.`);
    assertEquals(getLlmProviderStub.calls.length, 0);
  } finally {
    configGetStub.restore();
    rssHubDefaultStub.restore();
    getLlmProviderStub.restore();
    Date.now = realDateNow;
    restoreNotifierMocks();
  }
});

Deno.test("RssDailyDigestWorkflow - Item Deduplication", async () => {
    setupNotifierMocks();
    const workflow = new RssDailyDigestWorkflow(mockEnv);
    const configGetStub = stub(ConfigManager.getInstance(), "get");
    configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('["/test/dedupFeed"]');
    configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);
    configGetStub.withArgs("RSS_DAILY_DIGEST_LLM_PROVIDER").resolves("MOCK_LLM_PROVIDER");

    const itemsWithDuplicates: RssHubJsonFeedItem[] = [
        { id: "d1", title: "Unique Article 1", url: "http://dedup.example.com/unique1", date_published: "2023-10-29T10:00:00Z", content_text: "Content 1" },
        { id: "d2", title: "Duplicate Article", url: "http://dedup.example.com/duplicate", date_published: "2023-10-29T09:00:00Z", content_text: "Content Dup1" },
        { id: "d3", title: "Duplicate Article (Later)", url: "http://dedup.example.com/duplicate", date_published: "2023-10-29T11:00:00Z", content_text: "Content Dup2 (This one should be ignored due to same URL)" },
        { id: "d4", title: "Unique Article 2", url: "http://dedup.example.com/unique2", date_published: "2023-10-29T11:00:00Z", content_text: "Content 2" },
    ];
    const dedupFeedData = createMockFeed("Deduplication Test Feed", "http://dedup.example.com", itemsWithDuplicates);
    const rssHubDefaultStub = stub(RssHubScraper, "default", () => mockRssHubChain(dedupFeedData));

    const mockLlmProvider: Partial<LLMProvider> = {
        createChatCompletion: async (messages: ChatMessage[]) => {
            const userPromptData = JSON.parse(messages[1].content.substring(messages[1].content.indexOf('[')));
            assertEquals(userPromptData.length, 3, "Should have 3 unique articles after deduplication");
            assertEquals(userPromptData.find((item:any) => item.url === "http://dedup.example.com/duplicate").title, "Duplicate Article");
            return Promise.resolve({ choices: [{ message: { role: "assistant", content: "# Deduplicated Digest" } }] });
        },
        initialize: () => Promise.resolve(), refresh: () => Promise.resolve(), setModel: () => {},
    };
    const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider", () => Promise.resolve(mockLlmProvider as LLMProvider));
    const createChatCompletionSpy = spy(mockLlmProvider, "createChatCompletion");
    
    try {
        await workflow.run(createMockEvent(), mockStep);
        assertEquals(createChatCompletionSpy.calls.length, 1);
    } finally {
        configGetStub.restore();
        rssHubDefaultStub.restore();
        getLlmProviderStub.restore();
        restoreNotifierMocks();
    }
});


Deno.test("RssDailyDigestWorkflow - Date Sorting", async () => {
    setupNotifierMocks();
    const workflow = new RssDailyDigestWorkflow(mockEnv);
    const configGetStub = stub(ConfigManager.getInstance(), "get");
    configGetStub.withArgs("RSS_DAILY_DIGEST_FEEDS").resolves('["/test/sortingFeed"]');
    configGetStub.withArgs("RSS_DAILY_DIGEST_HOURS_AGO").resolves(24);
    configGetStub.withArgs("RSS_DAILY_DIGEST_LLM_PROVIDER").resolves("MOCK_LLM_PROVIDER");

    const itemsForSorting: RssHubJsonFeedItem[] = [
        { id: "s1", title: "Article Old", url: "http://sort.example.com/old", date_published: "2023-10-30T08:00:00Z", content_text: "Old" },
        { id: "s2", title: "Article New", url: "http://sort.example.com/new", date_published: "2023-10-30T10:00:00Z", content_text: "New" },
        { id: "s3", title: "Article Middle", url: "http://sort.example.com/middle", date_published: "2023-10-30T09:00:00Z", content_text: "Middle" },
    ];
    const sortingFeedData = createMockFeed("Sorting Test Feed", "http://sort.example.com", itemsForSorting);
    const rssHubDefaultStub = stub(RssHubScraper, "default", () => mockRssHubChain(sortingFeedData));
    
    const mockLlmProvider: Partial<LLMProvider> = {
        createChatCompletion: async (messages: ChatMessage[]) => {
            const userPromptData = JSON.parse(messages[1].content.substring(messages[1].content.indexOf('[')));
            assertEquals(userPromptData.length, 3);
            assertEquals(userPromptData[0].title, "Article New", "First article should be the newest");
            assertEquals(userPromptData[1].title, "Article Middle");
            assertEquals(userPromptData[2].title, "Article Old", "Last article should be the oldest");
            return Promise.resolve({ choices: [{ message: { role: "assistant", content: "# Sorted Digest" } }] });
        },
        initialize: () => Promise.resolve(), refresh: () => Promise.resolve(), setModel: () => {},
    };
    const getLlmProviderStub = stub(LLMFactory.getInstance(), "getLLMProvider", () => Promise.resolve(mockLlmProvider as LLMProvider));
    const createChatCompletionSpy = spy(mockLlmProvider, "createChatCompletion");

    try {
        await workflow.run(createMockEvent(), mockStep);
        assertEquals(createChatCompletionSpy.calls.length, 1);
    } finally {
        configGetStub.restore();
        rssHubDefaultStub.restore();
        getLlmProviderStub.restore();
        restoreNotifierMocks();
    }
});

// TODO:
// - Feed fetch error (partial success: ensure successful items are processed)
// - LLM Error handling (e.g., if createChatCompletion throws)
// - Test with multiple, mixed feeds
// - Test outputAction: "file" (spy on Deno.writeTextFile or use a mock fs)
// - Test outputAction: "log" (spy on console.log or logger.info)
// - Test various override parameters in event.payload
// - Test HTML stripping effectiveness with more complex HTML
// - Test maxContentLength truncation
// - Test behavior when RSS_DAILY_DIGEST_LLM_PROVIDER is not set (fallback to DEFAULT_LLM_PROVIDER)The file `src/works/tests/rss-daily-digest.workflow.test.ts` has been overwritten with the new test suite.

**Summary of Changes Applied:**

1.  **Imports**: Added `WorkflowEnv`, `WorkflowEvent`, `WorkflowStep` from `@src/works/workflow.ts`, and `BarkNotifier` from `@src/modules/notify/bark.notify.ts`.
2.  **Standard Mocks**:
    *   `mockEnv`: Defined with `id` and `name`.
    *   `createMockEvent`: Helper function created to generate mock events, defaulting `outputAction` to `"return"`.
    *   `mockStep`: Defined with a passthrough `do` method, as the refactored `run` method (which removed internal `step.do` calls) does not depend on the `step` parameter for its core logic flow.
3.  **Workflow Instantiation**: All `new RssDailyDigestWorkflow()` calls were updated to `new RssDailyDigestWorkflow(mockEnv)`.
4.  **`run` Method Calls**: All `workflow.run()` calls were updated to `workflow.run(createMockEvent(payloadOverrides), mockStep)`.
5.  **Notifier Mocks**: `BarkNotifier` methods (`info`, `success`, `warning`, `error`) are now stubbed using `setupNotifierMocks()` and `restoreNotifierMocks()` around tests to prevent actual notifications.
6.  **Test Case Adaptations**:
    *   **"Successful Digest Generation (LLM)"**: Updated to use new mock structures. Assertions on LLM interaction and output remain.
    *   **"No Feeds Configured"**: Updated. Now correctly asserts the specific Markdown error message and checks that the LLM provider is not fetched.
    *   **"Malformed FEEDS Configuration (Invalid JSON)"**: Updated. Now asserts that a `WorkflowTerminateError` (or an `Error` containing the relevant message) is thrown when feed configuration is invalid JSON. Ensures LLM is not called.
    *   **"No New Items Found"**: Updated. Mocks an empty feed and asserts the specific "No new articles found..." Markdown (with mocked date for consistency). Ensures LLM is not called.
    *   **"Item Deduplication"**: Updated. Mocks feed data with duplicate URLs. Asserts that the data passed to the LLM (via `createChatCompletion` spy) contains only unique items (first occurrence kept).
    *   **"Date Sorting"**: Updated. Mocks feed data with unsorted items. Asserts that the data passed to the LLM reflects correct chronological sorting (newest first).
7.  **Date Mocking**: `Date.now` is consistently mocked in relevant tests to ensure predictable output for digest titles and "no new articles" messages.
8.  **Spy Restoration**: Ensured spies are restored correctly, especially for methods on object instances.

The test suite in `src/works/tests/rss-daily-digest.workflow.test.ts` should now be aligned with the `WorkflowEntrypoint` structure of `RssDailyDigestWorkflow` and reflect the changes made to its `run` method (specifically, that it no longer uses `step.do` internally for its main logic flow).
