// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

import {
  RerankerProvider,
  RerankerOptions,
  RerankedDocument,
} from "@src/providers/interfaces/reranker.interface.ts";
import { z } from "npm:zod@3.23.8";

// Zod Schema for Jina Reranker API Request
const JinaRerankerRequestSchema = z.object({
  model: z.string(),
  query: z.string(),
  documents: z.array(z.string()),
  top_n: z.number().optional(),
  return_documents: z.boolean().optional(),
});

// Zod Schema for a single result object in the Jina Reranker API Response
const JinaRerankerResultSchema = z.object({
  index: z.number(), // Original index of the document
  relevance_score: z.number(),
  document: z.object({ // Present if request had return_documents: true
    text: z.string(),
  }).optional(),
});

// Zod Schema for Jina Reranker API Response
const JinaRerankerResponseSchema = z.object({
  model: z.string(),
  usage: z.object({
    total_tokens: z.number().optional(), // Jina's usage object can vary
    prompt_tokens: z.number().optional(),
  }).optional(), // The entire usage object can be optional
  results: z.array(JinaRerankerResultSchema),
  message: z.string().optional(), // For potential error messages from API
  detail: z.any().optional(), // For more detailed errors
});


export interface JinaRerankerProviderConfig {
  model?: string; // Default: "jina-reranker-v2-base-multilingual"
}

export class JinaRerankerProvider implements RerankerProvider {
  private apiKey: string;
  private defaultModel: string;
  private jinaApiUrl = "https://api.jina.ai/v1/rerank";

  constructor(config?: JinaRerankerProviderConfig) {
    const apiKey = Deno.env.get("JINA_API_KEY");
    if (!apiKey) {
      throw new Error(
        "JINA_API_KEY environment variable is not set. " +
        "Get your Jina AI API key for free: https://jina.ai/?sui=apikey",
      );
    }
    this.apiKey = apiKey;
    // Recommended default by Jina for general purpose multilingual reranking.
    this.defaultModel = config?.model || "jina-reranker-v2-base-multilingual";
  }

  async initialize(): Promise<void> {
    // No specific initialization needed if API key is set
    return Promise.resolve();
  }

  async refresh(): Promise<void> {
    // No specific refresh logic needed unless config can change dynamically
    return Promise.resolve();
  }

  async rerank(
    query: string,
    documents: string[],
    options?: RerankerOptions,
  ): Promise<RerankedDocument[]> {
    const model = options?.model || this.defaultModel;
    // `return_documents: false` is default by Jina.
    // If true, Jina sends back document text. If false, we map it ourselves from input.
    // For our RerankedDocument interface, we always need the document text.
    // It's more efficient to set return_documents: false and map it from the input `documents` array.
    const returnDocumentsApiOption = options?.returnDocuments ?? false;

    const requestBody = JinaRerankerRequestSchema.parse({
      model: model,
      query: query,
      documents: documents,
      top_n: options?.topN, // Jina API handles undefined as "return all"
      return_documents: returnDocumentsApiOption,
    });

    console.info(`[JinaRerankerProvider] Reranking ${documents.length} documents for query "${query.substring(0,50)}..." with model: ${model}`);

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
        let errorMessage = `Jina Reranker API request failed with status ${response.status}`;
        try {
            const errJson = JSON.parse(errorBody);
            // Jina errors might be in `detail` or `message`
            if (errJson.detail && typeof errJson.detail === 'string') {
                 errorMessage = `Jina Reranker API Error: ${errJson.detail} (Status: ${response.status})`;
            } else if (errJson.detail && errJson.detail.msg) { // FastAPI validation errors
                 errorMessage = `Jina Reranker API Error: ${errJson.detail.msg} (Status: ${response.status})`;
            } else if (errJson.message) {
                 errorMessage = `Jina Reranker API Error: ${errJson.message} (Status: ${response.status})`;
            } else {
                 errorMessage += `: ${errorBody}`;
            }
        } catch (e) { 
            errorMessage += `: ${errorBody}`;
        }
        console.error(`[JinaRerankerProvider] ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const parsedResult = JinaRerankerResponseSchema.safeParse(result);

      if (!parsedResult.success) {
        console.error(
          `[JinaRerankerProvider] Invalid API response structure: ${parsedResult.error.toString()}`,
          result
        );
        throw new Error(
          `Jina Reranker API returned an invalid response structure. ${parsedResult.error.toString()}`,
        );
      }
      
      const apiData = parsedResult.data;

      if (!apiData.results) {
        console.warn("[JinaRerankerProvider] API returned no results.", apiData);
        return [];
      }

      // Map Jina's response to RerankedDocument[]
      // The results from Jina are already sorted by relevance_score descending.
      const rerankedDocs: RerankedDocument[] = apiData.results.map((res) => {
        // Ensure the document text is correctly assigned
        let documentText = "";
        if (returnDocumentsApiOption && res.document?.text) {
          documentText = res.document.text;
        } else if (documents[res.index] !== undefined) {
          // If Jina didn't return the document text, use the original document
          // from the input array based on the index Jina provides.
          documentText = documents[res.index];
        } else {
            // This case should ideally not happen if API and input are valid.
            console.warn(`[JinaRerankerProvider] Document text not found for index ${res.index}. This might indicate an issue.`);
        }

        return {
          document: documentText,
          index: res.index,
          relevanceScore: res.relevance_score,
        };
      });

      return rerankedDocs;

    } catch (error) {
      console.error(`[JinaRerankerProvider] Error reranking documents for query "${query.substring(0,50)}...":`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to rerank documents using Jina: ${error.message}`);
      }
      throw new Error(`Failed to rerank documents using Jina: Unknown error`);
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

  // Instantiate with default model ("jina-reranker-v2-base-multilingual")
  const rerankerProvider = new JinaRerankerProvider();
  
  // Or with a specific model
  // const rerankerProviderWithConfig = new JinaRerankerProvider({ model: "jina-reranker-v1-base-en" });

  const query = "What is the capital of France?";
  const documentsToRerank = [
    "Paris is known for the Eiffel Tower.", // Expected high score
    "The capital of Germany is Berlin.",
    "France is a country in Western Europe.",
    "The Louvre Museum is located in Paris, France." // Expected high score
  ];

  try {
    console.log(`Attempting to rerank ${documentsToRerank.length} documents for query: "${query}"`);
    
    // Example 1: Default options (all documents returned, sorted)
    let rerankedResults = await rerankerProvider.rerank(query, documentsToRerank);
    console.log("\n--- Reranked Results (Default Options) ---");
    rerankedResults.forEach(result => {
      console.log(
        `Score: ${result.relevanceScore.toFixed(4)}, Index: ${result.index}, Doc: "${result.document}"`
      );
    });

    // Example 2: With topN and a different model (if you have one configured or it's a valid Jina model)
    const customOptions: RerankerOptions = {
        topN: 2,
        // model: "jina-reranker-v1-turbo-en" // Example of a different Jina reranker model
        // returnDocuments: true // To test Jina returning document text
    };
    console.log(`\nAttempting to rerank with topN: ${customOptions.topN}`);
    // Note: To use a different model, ensure it's compatible with your Jina API key and plan
    rerankedResults = await rerankerProvider.rerank(query, documentsToRerank, customOptions);
    console.log(`\n--- Reranked Results (topN: ${customOptions.topN}) ---`);
    rerankedResults.forEach(result => {
      console.log(
        `Score: ${result.relevanceScore.toFixed(4)}, Index: ${result.index}, Doc: "${result.document}"`
      );
    });

  } catch (error) {
    console.error("\nError during Jina Reranker example:", error.message);
  }
}

// To run this example:
// 1. Ensure JINA_API_KEY is set in your environment.
// 2. Uncomment the following line and run the file with Deno: `deno run -A src/providers/reranker/jina/jina.reranker.ts`
// main();
*/
