/**
 * Reranker Provider Interface
 */

export interface RerankedDocument {
  document: string; // Or the original document type if complex
  index: number;    // Original index of the document in the input array
  relevanceScore: number;
}

export interface RerankerOptions {
  topN?: number;
  model?: string; // Allow specifying model at call time
  returnDocuments?: boolean; // Jina specific: whether to return the document text in the response
}

export interface RerankerProvider {
  /**
   * Reranks a list of documents based on a query.
   * @param query The query string.
   * @param documents An array of document strings to be reranked.
   * @param options Optional parameters for reranking.
   * @returns A promise that resolves to an array of RerankedDocument objects, sorted by relevance.
   */
  rerank(query: string, documents: string[], options?: RerankerOptions): Promise<RerankedDocument[]>;

  /**
   * Optional: Initialize Provider (e.g., load models, check API keys)
   * If not needed, can be a no-op.
   */
  initialize?(): Promise<void>;

  /**
   * Optional: Refresh configuration (e.g., if settings can change)
   * If not needed, can be a no-op.
   */
  refresh?(): Promise<void>;
}
