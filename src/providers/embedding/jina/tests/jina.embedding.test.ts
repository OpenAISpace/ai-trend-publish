import {
  assert,
  assertEquals,
  assertRejects,
  assertNotEquals,
} from "@std/assert/mod.ts";
import { JinaEmbeddingProvider } from "../jina.embedding.ts";
import { EmbeddingResult, EmbeddingOptions } from "@src/providers/interfaces/embedding.interface.ts";

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

const MOCK_JINA_API_KEY = "test-jina-api-key-embedding";
const DEFAULT_MODEL = "jina-embeddings-v2-base-en";
const CUSTOM_MODEL = "jina-embeddings-v2-small-en";

Deno.test({
  name: "[JinaEmbeddingProvider] Successful embedding creation (default model)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "This is a test text for embedding.";
    const mockEmbeddingVector = Array.from({length: 768}, () => Math.random()); // Example dim for v2-base

    const mockResponseData = {
      model: DEFAULT_MODEL,
      data: [{
        object: "embedding",
        embedding: mockEmbeddingVector,
        index: 0,
      }],
      usage: { total_tokens: 10, prompt_tokens: 10 },
    };

    MOCK_FETCH(async (input: URL | Request | string, init?: RequestInit) => {
      assertEquals(input, "https://api.jina.ai/v1/embeddings");
      assertEquals(init?.method, "POST");
      assertEquals(init?.headers?.get("Authorization"), `Bearer ${MOCK_JINA_API_KEY}`);
      const body = await init?.json();
      assertEquals(body?.model, DEFAULT_MODEL);
      assertEquals(body?.input, [testText]);
      assertEquals(body?.encoding_format, "float");
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaEmbeddingProvider(); // Uses default model
    const result: EmbeddingResult = await provider.createEmbedding(testText);

    assertEquals(result.embedding, mockEmbeddingVector);
    assertEquals(result.model, DEFAULT_MODEL);
    assertEquals(result.dimensions, mockEmbeddingVector.length);
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaEmbeddingProvider] Successful embedding with model option in constructor",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Another test text.";
    const mockEmbeddingVector = Array.from({length: 512}, () => Math.random()); // Example dim for v2-small

    const mockResponseData = {
      model: CUSTOM_MODEL, // Jina returns the model it used
      data: [{ embedding: mockEmbeddingVector, index: 0 }],
      usage: { total_tokens: 5 }
    };

    MOCK_FETCH(async (_input, init) => {
      const body = await init?.json();
      assertEquals(body?.model, CUSTOM_MODEL); // Check if provider sent the custom model
      return Promise.resolve(new Response(JSON.stringify(mockResponseData), { status: 200 }));
    });

    const provider = new JinaEmbeddingProvider({ model: CUSTOM_MODEL });
    const result = await provider.createEmbedding(testText);

    assertEquals(result.model, CUSTOM_MODEL);
    assertEquals(result.dimensions, mockEmbeddingVector.length);

    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  }
});

Deno.test({
  name: "[JinaEmbeddingProvider] Successful embedding with model and encoding_format options in createEmbedding",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Text with custom options.";
    const mockEmbeddingVectorBase64 = ["dGVzdAo=", "ZW1iZWRkaW5nCg=="]; // Dummy base64 strings
     // For base64, the 'embedding' field in EmbeddingResult should still be number[] after decoding.
     // However, Jina API returns base64 strings. The current interface expects number[].
     // This test will assume the provider *does not* decode base64, as the interface is number[].
     // If it *should* decode, this test and the provider need adjustment.
     // For now, let's assume Jina API with encoding_format='base64' returns string[], and our provider would fail validation.
     // Let's test with 'float' and custom model via options.

    const mockEmbeddingVectorFloat = Array.from({length: 512}, () => Math.random());
    const mockResponseDataFloat = {
      model: CUSTOM_MODEL,
      data: [{ embedding: mockEmbeddingVectorFloat, index: 0 }],
      usage: { total_tokens: 6 }
    };

    MOCK_FETCH(async (_input, init) => {
      const body = await init?.json();
      assertEquals(body?.model, CUSTOM_MODEL);
      assertEquals(body?.encoding_format, "float"); // Test if option is passed
      return Promise.resolve(new Response(JSON.stringify(mockResponseDataFloat), { status: 200 }));
    });
    
    const provider = new JinaEmbeddingProvider(); // Default model initially
    const options: EmbeddingOptions = { model: CUSTOM_MODEL, encoding_format: "float" };
    const result = await provider.createEmbedding(testText, options);

    assertEquals(result.model, CUSTOM_MODEL);
    assertEquals(result.dimensions, mockEmbeddingVectorFloat.length);

    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  }
});


Deno.test({
  name: "[JinaEmbeddingProvider] API Error (500)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Text causing server error";

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
    });

    const provider = new JinaEmbeddingProvider();
    await assertRejects(
      () => provider.createEmbedding(testText),
      Error,
      "Jina Embeddings API request failed with status 500: Internal Server Error",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaEmbeddingProvider] API Error with Jina specific JSON detail",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Text causing Jina error";
    const errorJson = { detail: "Invalid model requested" };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(new Response(JSON.stringify(errorJson), { status: 422, headers: { "Content-Type": "application/json" } }));
    });

    const provider = new JinaEmbeddingProvider();
    await assertRejects(
      () => provider.createEmbedding(testText),
      Error,
      "Jina Embeddings API Error: Invalid model requested (Status: 422)",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaEmbeddingProvider] Response Validation Error (Malformed JSON)",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Text leading to malformed response";
    const malformedResponse = {
      // Missing 'model' or 'data'
      unexpected_field: "unexpected_value",
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(malformedResponse), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaEmbeddingProvider();
    await assertRejects(
      () => provider.createEmbedding(testText),
      Error, 
      "Jina Embeddings API returned an invalid response structure.",
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});

Deno.test({
  name: "[JinaEmbeddingProvider] API returns no embedding data in array",
  async fn() {
    Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
    const testText = "Query with no data returned";
    const mockResponseData = {
      model: DEFAULT_MODEL,
      data: [], // Empty data array
      usage: { total_tokens: 5, prompt_tokens: 5 },
    };

    MOCK_FETCH(async (_input, _init) => {
      return Promise.resolve(
        new Response(JSON.stringify(mockResponseData), { status: 200, headers: { "Content-Type": "application/json" }})
      );
    });

    const provider = new JinaEmbeddingProvider();
    await assertRejects(
        () => provider.createEmbedding(testText),
        Error,
        "Jina Embeddings API returned no embedding data."
    );
    
    RESTORE_FETCH();
    Deno.env.delete("JINA_API_KEY");
  },
});


Deno.test({
  name: "[JinaEmbeddingProvider] Constructor API Key Check (Missing)",
  fn() {
    Deno.env.delete("JINA_API_KEY");
    assertRejects(
      () => { new JinaEmbeddingProvider(); },
      Error,
      "JINA_API_KEY environment variable is not set.",
    );
  },
});

Deno.test({
    name: "[JinaEmbeddingProvider] Constructor API Key Check (Present)",
    fn() {
      Deno.env.set("JINA_API_KEY", MOCK_JINA_API_KEY);
      try {
        new JinaEmbeddingProvider();
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
