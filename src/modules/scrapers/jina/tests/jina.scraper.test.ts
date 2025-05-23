import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert/mod.ts";
import { JinaScraper } from "../jina.scraper.ts";
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

const MOCK_JINA_API_KEY = "test-jina-api-key";

Deno.test({
  name: "[JinaScraper] Successful scrape",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testUrl = "https://example.com/article";
    const mockResponseData = {
      code: 200,
      status: 200,
      data: {
        url: testUrl,
        title: "Test Article Title",
        content: "This is the article content.",
        images: [{ src: "https://example.com/image.png", alt: "Test Image" }],
      },
      usage: { total_tokens: 100 },
    };

    MOCK_FETCH(async (input: URL | Request | string, _init?: RequestInit) => {
      assertEquals(input, `https://r.jina.ai/${testUrl}`);
      assertEquals(_init?.headers?.get("Authorization"), `Bearer ${MOCK_JINA_API_KEY}`);
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const scraper = new JinaScraper();
    const results: ScrapedContent[] = await scraper.scrape(testUrl);

    assertEquals(results.length, 1);
    const result = results[0];
    assertEquals(result.id, testUrl);
    assertEquals(result.url, testUrl);
    assertEquals(result.title, "Test Article Title");
    assertEquals(result.content, "This is the article content.");
    assert(result.publishDate); // Should be current date string
    assertEquals(result.media?.length, 1);
    assertEquals(result.media?.[0].url, "https://example.com/image.png");
    assertEquals(result.media?.[0].type, "image");
    assertEquals(result.metadata?.usage, { total_tokens: 100 });
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaScraper] API Error (500)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testUrl = "https://example.com/internal-error";

    MOCK_FETCH(async (input: URL | Request | string, _init?: RequestInit) => {
      assertEquals(input, `https://r.jina.ai/${testUrl}`);
      return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
    });

    const scraper = new JinaScraper();
    await assertRejects(
      async () => {
        await scraper.scrape(testUrl);
      },
      Error,
      "Jina API request failed with status 500: Internal Server Error",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaScraper] API Error (401 Unauthorized)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testUrl = "https://example.com/unauthorized";

    MOCK_FETCH(async (input: URL | Request | string, _init?: RequestInit) => {
        assertEquals(input, `https://r.jina.ai/${testUrl}`);
        return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    });

    const scraper = new JinaScraper();
    await assertRejects(
        async () => {
            await scraper.scrape(testUrl);
        },
        Error,
        "Jina API request failed with status 401: Unauthorized",
    );

    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaScraper] Response Validation Error (Malformed JSON)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testUrl = "https://example.com/malformed";
    const malformedResponse = {
      code: 200,
      data: {
        // Missing 'title', 'content', 'url' which are required by JinaResponseSchema
        unexpected_field: "unexpected_value",
      },
    };

    MOCK_FETCH(async (input: URL | Request | string, _init?: RequestInit) => {
      assertEquals(input, `https://r.jina.ai/${testUrl}`);
      return Promise.resolve(
        new Response(JSON.stringify(malformedResponse), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const scraper = new JinaScraper();
    await assertRejects(
      async () => {
        await scraper.scrape(testUrl);
      },
      Error, // Zod errors are typically wrapped in a generic Error by the implementation
      "Jina API returned an invalid response structure.", // Check for part of the message
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaScraper] Constructor API Key Check (Missing)",
  fn() {
    Deno.env.delete("JINA_API_KEY"); // Ensure key is not set
    
    assertRejects(
      () => {
        new JinaScraper();
      },
      Error,
      "JINA_API_KEY environment variable is not set.",
    );
  },
});

Deno.test({
    name: "[JinaScraper] Constructor API Key Check (Present)",
    fn() {
      Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
      try {
        new JinaScraper();
        // No error expected
      } catch (e) {
        assert(false, `Should not throw when API key is present: ${e.message}`);
      } finally {
        Deno.env.delete("JINA_API_KEY");
      }
    },
  });

// Teardown for all tests in this file, if mockFetch was not restored properly in a test.
// This is a safeguard.
globalThis.addEventListener("unload", () => {
    if (mockFetch) {
        RESTORE_FETCH();
    }
});
