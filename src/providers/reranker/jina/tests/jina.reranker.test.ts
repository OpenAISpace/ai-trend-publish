import {
  assert,
  assertEquals,
  assertRejects,
} from "@std/assert/mod.ts";
import { JinaRerankerProvider } from "../jina.reranker.ts";
import { RerankedDocument, RerankerOptions } from "@src/providers/interfaces/reranker.interface.ts";

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

const MOCK_JINA_API_KEY = "test-jina-api-key-reranker";
const DEFAULT_MODEL = "jina-reranker-v2-base-multilingual";
const CUSTOM_MODEL = "jina-reranker-v1-base-en";

const TEST_QUERY = "What is the capital of France?";
const TEST_DOCUMENTS = [
  "Paris is known for the Eiffel Tower.", // Expected high score, index 0
  "The capital of Germany is Berlin.",    // index 1
  "France is a country in Western Europe.",// index 2
  "The Louvre Museum is located in Paris, France.", // Expected high score, index 3
];


Deno.test({
  name: "[JinaRerankerProvider] Successful rerank (default model, return_documents: false)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    
    const mockResponseData = {
      model: DEFAULT_MODEL,
      usage: { total_tokens: 100 },
      results: [
        { index: 0, relevance_score: 0.95 }, // Original index 0
        { index: 3, relevance_score: 0.92 }, // Original index 3
        { index: 2, relevance_score: 0.50 }, // Original index 2
        { index: 1, relevance_score: 0.10 }, // Original index 1
      ],
    };

    MOCK_FETCH(async (input: URL | Request | string, init?: RequestInit) => {
      assertEquals(input, "https://api.jina.ai/v1/rerank");
      assertEquals(init?.method, "POST");
      assertEquals(init?.headers?.get("Authorization"), `Bearer ${MOCK_JINA_API_KEY}`);
      const body = await init?.json();
      assertEquals(body?.model, DEFAULT_MODEL);
      assertEquals(body?.query, TEST_QUERY);
      assertEquals(body?.documents, TEST_DOCUMENTS);
      assertEquals(body?.return_documents, false); // Default behavior tested here
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaRerankerProvider(); // Uses default model
    const results: RerankedDocument[] = await provider.rerank(TEST_QUERY, TEST_DOCUMENTS);

    assertEquals(results.length, 4);
    // Check if results are sorted by score (Jina API does this, provider should preserve)
    assertEquals(results[0].relevanceScore, 0.95);
    assertEquals(results[1].relevanceScore, 0.92);
    
    // Check mapping from original documents based on index
    assertEquals(results[0].document, TEST_DOCUMENTS[0]); // index 0
    assertEquals(results[0].index, 0);
    assertEquals(results[1].document, TEST_DOCUMENTS[3]); // index 3
    assertEquals(results[1].index, 3);
    assertEquals(results[2].document, TEST_DOCUMENTS[2]); // index 2
    assertEquals(results[2].index, 2);
    assertEquals(results[3].document, TEST_DOCUMENTS[1]); // index 1
    assertEquals(results[3].index, 1);
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaRerankerProvider] Successful rerank with topN and return_documents: true",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const topN = 2;
    const options: RerankerOptions = { topN, model: CUSTOM_MODEL, returnDocuments: true };

    const mockResponseData = {
      model: CUSTOM_MODEL,
      usage: { total_tokens: 100 },
      results: [ // Jina would return only topN if top_n is sent, but we test our mapping
        { index: 0, relevance_score: 0.95, document: { text: TEST_DOCUMENTS[0] } },
        { index: 3, relevance_score: 0.92, document: { text: TEST_DOCUMENTS[3] } },
      ],
    };

    MOCK_FETCH(async (_input, init) => {
      const body = await init?.json();
      assertEquals(body?.model, CUSTOM_MODEL);
      assertEquals(body?.top_n, topN);
      assertEquals(body?.return_documents, true);
      return Promise.resolve(new Response(JSON.stringify(mockResponseData), { status: 200 }));
    });

    const provider = new JinaRerankerProvider({ model: CUSTOM_MODEL }); // Can also set model in constructor
    const results = await provider.rerank(TEST_QUERY, TEST_DOCUMENTS, options);

    assertEquals(results.length, topN);
    assertEquals(results[0].document, TEST_DOCUMENTS[0]);
    assertEquals(results[0].relevanceScore, 0.95);
    assertEquals(results[1].document, TEST_DOCUMENTS[3]);
    assertEquals(results[1].relevanceScore, 0.92);

    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  }
});

Deno.test({
  name: "[JinaRerankerProvider] API Error (500)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
    });

    const provider = new JinaRerankerProvider();
    await assertRejects(
      () => provider.rerank(TEST_QUERY, TEST_DOCUMENTS),
      Error,
      "Jina Reranker API request failed with status 500: Internal Server Error",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaRerankerProvider] API Error with Jina specific JSON detail (e.g. FastAPI error)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const errorJson = { detail: [{ loc: ["body", "query"], msg: "field required", type: "value_error.missing" }]};
    // This is a common FastAPI validation error structure. The message parsing should handle it.

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(new Response(JSON.stringify(errorJson), { status: 422, headers: { "Content-Type": "application/json" } }));
    });

    const provider = new JinaRerankerProvider();
    await assertRejects(
      () => provider.rerank(TEST_QUERY, TEST_DOCUMENTS),
      Error,
      "Jina Reranker API Error: field required (Status: 422)", // Provider extracts the msg
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaRerankerProvider] Response Validation Error (Malformed JSON)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const malformedResponse = {
      // Missing 'results' or 'model'
      unexpected_field: "unexpected_value",
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(malformedResponse), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaRerankerProvider();
    await assertRejects(
      () => provider.rerank(TEST_QUERY, TEST_DOCUMENTS),
      Error, 
      "Jina Reranker API returned an invalid response structure.",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaRerankerProvider] API returns no results in array",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const mockResponseData = {
      model: DEFAULT_MODEL,
      results: [], // Empty results array
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaRerankerProvider();
    const results = await provider.rerank(TEST_QUERY, TEST_DOCUMENTS);
    assertEquals(results.length, 0); // Expect empty array, not an error
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaRerankerProvider] Constructor API Key Check (Missing)",
  fn() {
    Deno.env.delete("JINA_API_KEY");
    assertRejects(
      () => { new JinaRerankerProvider(); },
      Error,
      "JINA_API_KEY environment variable is not set.",
    );
  },
});

Deno.test({
    name: "[JinaRerankerProvider] Constructor API Key Check (Present)",
    fn() {
      Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
      try {
        new JinaRerankerProvider();
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
