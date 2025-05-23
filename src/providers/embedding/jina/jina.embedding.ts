// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

import {
  EmbeddingProvider,
  EmbeddingOptions,
  EmbeddingResult,
} from "@src/providers/interfaces/embedding.interface.ts";
import { z } from "npm:zod@3.23.8";

// Zod Schema for Jina Embeddings API Request
const JinaEmbeddingRequestSchema = z.object({
  model: z.string(),
  input: z.array(z.string()),
  encoding_format: z.enum(["float", "base64"]).optional(),
  // Jina also supports 'dimensions' for some models, could be added to EmbeddingOptions
});

// Zod Schema for a single embedding object in the Jina API Response
const JinaEmbeddingObjectSchema = z.object({
  object: z.string().optional(), // e.g., "embedding"
  embedding: z.array(z.number()),
  index: z.number(),
});

// Zod Schema for Jina Embeddings API Response
const JinaEmbeddingResponseSchema = z.object({
  model: z.string(),
  data: z.array(JinaEmbeddingObjectSchema),
  usage: z.object({
    total_tokens: z.number(),
    prompt_tokens: z.number().optional(), // Some models might not return this
  }),
});

export interface JinaEmbeddingProviderConfig {
  model?: string; // Default: "jina-embeddings-v2-base-en"
  // other Jina specific configurations can be added here
}

export class JinaEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private defaultModel: string;
  private jinaApiUrl = "https://api.jina.ai/v1/embeddings";

  constructor(config?: JinaEmbeddingProviderConfig) {
    const apiKey = Deno.env.get("JINA_API_KEY");
    if (!apiKey) {
      throw new Error(
        "JINA_API_KEY environment variable is not set. " +
        "Get your Jina AI API key for free: https://jina.ai/?sui=apikey",
      );
    }
    this.apiKey = apiKey;
    this.defaultModel = config?.model || "jina-embeddings-v2-base-en"; // A common default Jina model
  }

  async initialize(): Promise<void> {
    // No specific initialization needed for Jina embeddings if API key is set
    return Promise.resolve();
  }

  async refresh(): Promise<void> {
    // No specific refresh logic needed unless config can change dynamically
    return Promise.resolve();
  }

  async createEmbedding(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const model = options?.model || this.defaultModel;
    const encoding_format = options?.encoding_format || "float";

    // Jina API expects 'input' to be an array of strings.
    // The interface provides a single 'text', so we wrap it in an array.
    const requestBody = JinaEmbeddingRequestSchema.parse({
      model: model,
      input: [text],
      encoding_format: encoding_format,
      // If options.dimensions is provided, and the chosen Jina model supports it,
      // it could be passed here. For example, some models accept a `dimensions` parameter.
      // However, the Jina API documentation for the /v1/embeddings endpoint
      // doesn't list `dimensions` as a top-level request parameter.
      // It's usually tied to the model choice itself or specific newer models.
    });

    console.info(`[JinaEmbeddingProvider] Creating embedding for text (first 50 chars): "${text.substring(0,50)}..." with model: ${model}`);

    try {
      const response = await fetch(this.jinaApiUrl, {
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
          `[JinaEmbeddingProvider] API request failed with status ${response.status}: ${errorBody}`,
        );
        // Attempt to parse Jina specific error structure if available
        try {
            const errJson = JSON.parse(errorBody);
            if (errJson && errJson.detail) { // Jina errors often have a "detail" field
                 throw new Error(`Jina Embeddings API Error: ${errJson.detail} (Status: ${response.status})`);
            }
        } catch (e) { /* ignore parsing error, throw original text */ }
        throw new Error(
          `Jina Embeddings API request failed with status ${response.status}: ${errorBody}`,
        );
      }

      const result = await response.json();
      const parsedResult = JinaEmbeddingResponseSchema.safeParse(result);

      if (!parsedResult.success) {
        console.error(
          `[JinaEmbeddingProvider] Invalid API response structure: ${parsedResult.error.toString()}`,
          result
        );
        throw new Error(
          `Jina Embeddings API returned an invalid response structure. ${parsedResult.error.toString()}`,
        );
      }
      
      const apiData = parsedResult.data;

      if (!apiData.data || apiData.data.length === 0 || !apiData.data[0].embedding) {
        console.warn("[JinaEmbeddingProvider] API returned no embedding data.", apiData);
        throw new Error("Jina Embeddings API returned no embedding data.");
      }

      const embeddingData = apiData.data[0]; // Since we send one text, we expect one embedding object

      return {
        embedding: embeddingData.embedding,
        model: apiData.model, // The model actually used by Jina
        dimensions: embeddingData.embedding.length, // Derived from the embedding vector
      };

    } catch (error) {
      console.error(`[JinaEmbeddingProvider] Error creating embedding for text "${text.substring(0,50)}...":`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to create embedding using Jina: ${error.message}`);
      }
      throw new Error(`Failed to create embedding using Jina: Unknown error`);
    }
  }
}

// Example of how to use the provider (optional, for testing or demonstration)
/*
async function main() {
  if (!Deno.env.get("JINA_API_KEY")) {
    console.error("Please set the JINA_API_KEY environment variable.");
    console.log("Get your Jina AI API key for free: https://jina.ai/?sui=apikey");
    return;
  }

  // Instantiate without specific config (uses default model)
  const embeddingProvider = new JinaEmbeddingProvider();
  
  // Or with specific config
  // const embeddingProviderWithConfig = new JinaEmbeddingProvider({ model: "jina-embeddings-v2-small-en" });


  const textToEmbed = "Hello from Jina Embeddings!";
  
  try {
    console.log(`Attempting to create embedding for: "${textToEmbed}"`);
    
    // Using default model from provider
    let result = await embeddingProvider.createEmbedding(textToEmbed);
    console.log("\n--- Embedding Result (Default Model) ---");
    console.log("Model Used:", result.model);
    console.log("Dimensions:", result.dimensions);
    console.log("Embedding (first 5 values):", result.embedding.slice(0, 5));
    console.log(`Total ${result.embedding.length} values.`);

    // Example: Overriding model and options via createEmbedding options
    // Note: Jina might have different model identifiers for different capabilities
    // For example, 'jina-embeddings-v2-base-en' is a common one.
    // 'jina-embeddings-v3-base' or similar for newer versions.
    const customOptions: EmbeddingOptions = {
        model: "jina-embeddings-v2-small-en", // Example of a different Jina model
        // encoding_format: "base64" // if needed
    };
    console.log(`\nAttempting to create embedding with custom options: Model ${customOptions.model}`);
    result = await embeddingProvider.createEmbedding(textToEmbed, customOptions);
    console.log("\n--- Embedding Result (Custom Options) ---");
    console.log("Model Used:", result.model); // Will be the one Jina actually used
    console.log("Dimensions:", result.dimensions);
    console.log("Embedding (first 5 values):", result.embedding.slice(0, 5));


  } catch (error) {
    console.error("\nError during Jina Embedding example:", error.message);
  }
}

// To run this example:
// 1. Ensure JINA_API_KEY is set in your environment.
// 2. Uncomment the following line and run the file with Deno: `deno run -A src/providers/embedding/jina/jina.embedding.ts`
// main();
*/
