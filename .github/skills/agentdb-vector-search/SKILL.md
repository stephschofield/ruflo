---
name: "AgentDB Vector Search"
description: "Semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying with HNSW indexing."
---

# AgentDB Vector Search

## What This Skill Does

Implements vector-based semantic search using AgentDB's high-performance vector database with 150x-12,500x faster operations than traditional solutions. Features HNSW indexing, quantization, and sub-millisecond search.

## Prerequisites

- Node.js 18+
- ruflo MCP server configured

## MCP Tools for Vector Search

Use the ruflo MCP tools:
- `memory_store` - Store vectors and documents
- `memory_search` - Semantic similarity search
- `memory_retrieve` - Fetch specific entries
- `embeddings_generate` - Generate embeddings for text
- `embeddings_search` - Search by embedding similarity
- `embeddings_compare` - Compare embedding similarity

## Quick Start

```bash
# Initialize embeddings
npx ruflo embeddings init --dimension 1536

# Generate and store embeddings
npx ruflo embeddings generate --text "authentication patterns" --store

# Search semantically
npx ruflo embeddings search --query "how to implement login" --top-k 10

# Compare similarity
npx ruflo embeddings compare --a "OAuth tokens" --b "JWT authentication"
```

## Use Cases

### RAG (Retrieval-Augmented Generation)
1. Embed documents into vector database
2. Query with user question to find relevant context
3. Pass context to LLM for answer generation

### Code Search
1. Embed code functions and documentation
2. Search by natural language description
3. Find similar implementations across codebase

### Knowledge Base
1. Store team knowledge as embeddings
2. Query semantically for relevant information
3. Build intelligent documentation search

## Performance

- **Search latency**: <100 microseconds
- **HNSW indexing**: Approximate nearest neighbor
- **Quantization**: 4-32x compression with minimal accuracy loss
- **Scalable**: Handles 100K+ vectors efficiently
