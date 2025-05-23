# Jina AI Integration Guide

This document provides a brief overview of how Jina AI is integrated into this project and how to use the Jina-powered components.

## Overview

Jina AI is utilized to provide advanced functionalities such as:

*   **Web Scraping**: Using the Jina Reader API to fetch and parse content from web pages.
*   **Deep Search**: Leveraging the Jina DeepSearch API for comprehensive, intelligent search capabilities.
*   **Text Embeddings**: Generating vector embeddings for text using the Jina Embeddings API.
*   **Search Result Reranking**: Improving the relevance of search results using the Jina Reranker API.

## Prerequisites

**JINA_API_KEY**: All Jina AI components require a JINA_API_KEY to be set as an environment variable.

```bash
export JINA_API_KEY="your_actual_api_key_here"
```

You can obtain a free API key from the [Jina AI Website](https://jina.ai/?sui=apikey). Please refer to the main `README.md` or `.env.example` for more details on environment variable setup.

## Components

### 1. Web Scraper (JinaReader)

*   **Class**: `JinaScraper`
*   **Location**: `src/modules/scrapers/jina/jina.scraper.ts`
*   **API Used**: Jina Reader API (`r.jina.ai`)
*   **Description**: Fetches content from a given URL.
*   **Usage**: Can be instantiated via `ScraperFactory.createScraper(ScraperType.JINA_READER)` or directly. Implements the `ContentScraper` interface.

### 2. Deep Search Scraper (JinaDeepSearch)

*   **Class**: `JinaDeepSearchScraper`
*   **Location**: `src/modules/scrapers/jina/jina.deepsearch.scraper.ts`
*   **API Used**: Jina DeepSearch API (`deepsearch.jina.ai`)
*   **Description**: Performs a deep search based on a query string and returns a synthesized answer along with source URLs.
*   **Usage**: Can be instantiated via `ScraperFactory.createScraper(ScraperType.JINA_DEEPSEARCH)` or directly. Implements the `ContentScraper` interface.

### 3. Embedding Provider (JinaEmbeddings)

*   **Class**: `JinaEmbeddingProvider`
*   **Location**: `src/providers/embedding/jina/jina.embedding.ts`
*   **API Used**: Jina Embeddings API (`api.jina.ai/v1/embeddings`)
*   **Description**: Generates numerical vector representations (embeddings) for input text.
*   **Usage**: Can be instantiated via `EmbeddingFactory.createProvider(EmbeddingProviderType.JINA, { model: "jina-embeddings-v2-base-en" })` or directly. Implements the `EmbeddingProvider` interface. Different Jina embedding models can be specified.

### 4. Reranker Provider (JinaReranker)

*   **Class**: `JinaRerankerProvider`
*   **Location**: `src/providers/reranker/jina/jina.reranker.ts`
*   **API Used**: Jina Reranker API (`api.jina.ai/v1/rerank`)
*   **Description**: Reranks a list of documents based on their relevance to a given query.
*   **Usage**: Can be instantiated directly. Implements the `RerankerProvider` interface. Different Jina reranker models can be specified.

## Configuration

Most Jina components are configured at instantiation, often by specifying the Jina model to use (e.g., for embeddings or reranking). Refer to the respective class constructors and methods for specific options. The API key is globally configured via the environment variable.

## Further Information

For more detailed information on Jina AI APIs and their capabilities, please refer to the [official Jina AI documentation](https://docs.jina.ai/).
