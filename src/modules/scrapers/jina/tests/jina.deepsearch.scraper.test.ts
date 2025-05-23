import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertNotEquals,
} from "@std/assert/mod.ts";
import { JinaDeepSearchScraper } from "../jina.deepsearch.scraper.ts";
import { ScrapedContent } from "@src/modules/interfaces/scraper.interface.ts";

// Store the original fetch function
const originalFetch = globalThis.fetch;
let mockFetch: ((input: URL | Request | string, init?: RequestInit) => Promise<Response>) | null = null;

// Helper to mock globalThis.fetch
function MOCK_FETCH(mock: (input: URL | Request | string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = mock;
  mockFetch = mock;
}

// Helper to restore original fetch
function RESTORE_FETCH() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  mockFetch = null;
}

const MOCK_JINA_API_KEY = "test-jina-api-key-deepsearch";

Deno.test({
  name: "[JinaDeepSearchScraper] Successful search with source parsing",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testQuery = "What is Deno?";
    const mockResponseContent = 
`Deno is a simple, modern and secure runtime for JavaScript and TypeScript.

Sources:
[1] https://deno.land/
[Source 2] https://example.com/deno-article
https://another-example.com/related`; // Test non-markdown link

    const mockResponseData = {
      id: "chatcmpl-mockid",
      object: "chat.completion",
      created: Date.now(),
      model: "jina-deepsearch-v1",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: mockResponseContent,
        },
        finish_reason: "stop",
      }],
      usage: { total_tokens: 50, prompt_tokens: 10, completion_tokens: 40 },
    };

    MOCK_FETCH(async (input: URL | Request | string, init?: RequestInit) => {
      assertEquals(input, "https://deepsearch.jina.ai/v1/chat/completions");
      assertEquals(init?.method, "POST");
      assertEquals(init?.headers?.get("Authorization"), `Bearer ${MOCK_JINA_API_KEY}`);
      const body = await init?.json();
      assertEquals(body?.model, "jina-deepsearch-v1");
      assertEquals(body?.messages[0]?.content, testQuery);
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const scraper = new JinaDeepSearchScraper();
    const results: ScrapedContent[] = await scraper.scrape(testQuery);

    assertEquals(results.length, 1);
    const result = results[0];
    assertStringIncludes(result.id, "jina-deepsearch-What is Deno?");
    assertStringIncludes(result.title, 'Search Results for: "What is Deno?"');
    assertEquals(result.content, "Deno is a simple, modern and secure runtime for JavaScript and TypeScript.");
    assertStringIncludes(result.url, `jina-deepsearch://query?${encodeURIComponent(testQuery)}`);
    assert(result.publishDate); 
    assertEquals(result.media?.length, 0); // No media expected
    
    assertEquals(result.metadata?.query, testQuery);
    assertEquals(result.metadata?.model, "jina-deepsearch-v1");
    assertEquals(result.metadata?.usage?.total_tokens, 50);
    assert(Array.isArray(result.metadata?.sources));
    assertEquals(result.metadata?.sources?.length, 3);
    assertEquals(result.metadata?.sources?.[0], "https://deno.land/");
    assertEquals(result.metadata?.sources?.[1], "https://example.com/deno-article");
    assertEquals(result.metadata?.sources?.[2], "https://another-example.com/related");
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaDeepSearchScraper] Successful search - no sources section",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testQuery = "Tell me about Deno";
    const mockResponseContent = "Deno is a runtime for JavaScript and TypeScript. No sources listed here.";
    const mockResponseData = { /* ... structure like above ... */ 
        model: "jina-deepsearch-v1", 
        choices: [{ index: 0, message: { role: "assistant", content: mockResponseContent }, finish_reason: "stop" }]
    };

    MOCK_FETCH(async (_input, _init) => Promise.resolve(new Response(JSON.stringify(mockResponseData), { status: 200 })));

    const scraper = new JinaDeepSearchScraper();
    const results = await scraper.scrape(testQuery);
    
    assertEquals(results.length, 1);
    assertEquals(results[0].content, mockResponseContent);
    assertEquals(results[0].metadata?.sources?.length, 0);

    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  }
});


Deno.test({
  name: "[JinaDeepSearchScraper] API Error (500)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testQuery = "Query causing server error";

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
    });

    const scraper = new JinaDeepSearchScraper();
    await assertRejects(
      () => scraper.scrape(testQuery),
      Error,
      "Jina DeepSearch API request failed with status 500: Internal Server Error",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
    name: "[JinaDeepSearchScraper] API Error with Jina specific JSON (e.g. 422 Unprocessable Entity)",
    async fn() {
      Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
      const testQuery = "Invalid query for Jina";
      const errorJson = { error: { message: "Request validation error", type: "invalid_request_error", code: "invalid_query" } };
  
      MOCK_FETCH(async (_input, _init) => {
        return Promise.resolve(new Response(JSON.stringify(errorJson), { status: 422, headers: { "Content-Type": "application/json" } }));
      });
  
      const scraper = new JinaDeepSearchScraper();
      await assertRejects(
        () => scraper.scrape(testQuery),
        Error,
        "Jina DeepSearch API Error: Request validation error (Status: 422)",
      );
      
      RESTORE_FETCH();
      Deno.env.delete("JINA_API_KEY");
    },
  });

Deno.test({
  name: "[JinaDeepSearchScraper] Response Validation Error (Malformed JSON)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testQuery = "Query leading to malformed response";
    const malformedResponse = {
      // Missing 'choices' or 'choices[0].message.content'
      model: "jina-deepsearch-v1",
      unexpected_field: "unexpected_value",
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(malformedResponse), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const scraper = new JinaDeepSearchScraper();
    await assertRejects(
      () => scraper.scrape(testQuery),
      Error, 
      "Jina DeepSearch API returned an invalid response structure.",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaDeepSearchScraper] API returns no choices",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testQuery = "Query with no choices";
    const mockResponseData = {
      model: "jina-deepsearch-v1",
      choices: [], // Empty choices array
      usage: { total_tokens: 5, prompt_tokens: 5, completion_tokens: 0 },
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const scraper = new JinaDeepSearchScraper();
    const results = await scraper.scrape(testQuery);
    assertEquals(results.length, 0); // Expect empty array, not an error
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaDeepSearchScraper] Constructor API Key Check (Missing)",
  fn() {
    Deno.env.delete("JINA_API_KEY");
    assertRejects(
      () => { new JinaDeepSearchScraper(); },
      Error,
      "JINA_API_KEY environment variable is not set.",
    );
  },
});

Deno.test({
    name: "[JinaDeepSearchScraper] Constructor API Key Check (Present)",
    fn() {
      Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
      try {
        new JinaDeepSearchScraper();
      } catch (e) {
        assert(false, `Should not throw when API key is present: ${e.message}`);
      } finally {
        Deno.env.delete("JINA_API_KEY");
      }
    },
  });

// Safeguard teardown
globalThis.addEventListener("unload", () => {
    if (mockFetch) {
        RESTORE_FETCH();
    }
});
