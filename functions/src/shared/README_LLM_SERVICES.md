# LLM Services Health Monitoring

This document describes the LLM (Large Language Model) and AI services integrated into the Aina application health monitoring system.

## Overview

The system monitors five key LLM and AI services that power the application's intelligent features:

## Services

### 1. Vertex AI Gemini

**Model:** `gemini-pro`  
**Provider:** Google Cloud Vertex AI  
**Purpose:** General-purpose LLM for text generation, analysis, and reasoning tasks

**Health Check:**

```typescript
const llmHealthCheck = httpsCallable(functions, "llmHealthCheck")
const result = await llmHealthCheck()
// Check result.data.services.vertexGemini
```

**Implementation Status:** 🚧 Placeholder - Not yet implemented

**When Implemented:**

- Will test connectivity to Vertex AI
- Verify API credentials and quotas
- Perform a simple generation request
- Check model availability and latency

### 2. Vertex AI Salamandra 7B Instruct

**Model:** `salamandra-7b-instruct`  
**Provider:** Custom model on Vertex AI  
**Purpose:** Catalan-optimized instruction-following model for specialized tasks

**Health Check:**

```typescript
const llmHealthCheck = httpsCallable(functions, "llmHealthCheck")
const result = await llmHealthCheck()
// Check result.data.services.vertexSalamandra
```

**Implementation Status:** 🚧 Placeholder - Not yet implemented

**When Implemented:**

- Verify custom model endpoint availability
- Test Catalan language understanding
- Check response quality and latency
- Monitor model version and updates

### 3. Local Salamandra 7B GGUF

**Model:** `salamandra-7b-gguf`  
**Provider:** Local llama.cpp server  
**Endpoint:** `localhost:8080` (default)  
**Purpose:** On-premise inference for privacy-sensitive operations

**Health Check:**

```typescript
const testLocalSalamandra = httpsCallable(functions, "testLocalSalamandra")
const result = await testLocalSalamandra()
```

**Implementation Status:** 🚧 Placeholder - Not yet implemented

**When Implemented:**

- Ping local model server health endpoint
- Verify model is loaded and ready
- Test inference speed and quality
- Check GPU/CPU utilization
- Monitor memory usage

**Recommended Setup:**

```bash
# Start local llama.cpp server
./llama-server \
  --model salamandra-7b-instruct-q4_k_m.gguf \
  --port 8080 \
  --ctx-size 4096 \
  --n-gpu-layers 33
```

### 4. Embedding Service

**Provider:** Vertex AI Text Embeddings (planned)  
**Model:** `text-embedding-004` or similar  
**Purpose:** Convert text to vector embeddings for semantic search

**Health Check:**

```typescript
const llmHealthCheck = httpsCallable(functions, "llmHealthCheck")
const result = await llmHealthCheck()
// Check result.data.services.embeddingService
```

**Implementation Status:** 🚧 Placeholder - Not yet implemented

**When Implemented:**

- Test embedding generation
- Verify vector dimensions (e.g., 768 or 1536)
- Check processing speed
- Monitor batch processing capabilities
- Validate embedding quality with sample texts

### 5. Vector Database

**Provider:** Firestore Vector Search (planned)  
**Alternative Options:** Pinecone, Weaviate, Qdrant  
**Purpose:** Store and search document embeddings for RAG (Retrieval Augmented Generation)

**Health Check:**

```typescript
const llmHealthCheck = httpsCallable(functions, "llmHealthCheck")
const result = await llmHealthCheck()
// Check result.data.services.vectorDB
```

**Implementation Status:** 🚧 Placeholder - Not yet implemented

**When Implemented:**

- Verify database connectivity
- Test vector similarity search
- Check index health and performance
- Monitor storage usage
- Validate search accuracy

**Firestore Vector Search Setup:**

```typescript
// Create vector index
import { FieldValue } from 'firebase-admin/firestore'

// Store document with embedding
await db.collection('documents').add({
  content: 'Sample text',
  embedding: FieldValue.vector([0.1, 0.2, ...]), // 768-dim vector
  metadata: { ... }
})

// Search similar documents
const results = await db.collection('documents')
  .findNearest('embedding', targetVector, {
    limit: 10,
    distanceMeasure: 'COSINE'
  })
```

## Integration Architecture

```
┌─────────────────────────────────────────────────┐
│           Aina Application Frontend             │
│                 (Dashboard)                      │
└───────────────────┬─────────────────────────────┘
                    │
                    │ Health Check Requests
                    ▼
┌─────────────────────────────────────────────────┐
│         Firebase Cloud Functions                │
│          (llmHealthCheck endpoint)              │
└───┬─────┬─────┬─────┬─────┬─────────────────────┘
    │     │     │     │     │
    │     │     │     │     └─► Vector DB
    │     │     │     └───────► Embedding Service
    │     │     └─────────────► Local Salamandra
    │     └───────────────────► Vertex Salamandra
    └─────────────────────────► Vertex Gemini
```

## Status Values

- **healthy** ✅ - Service is operational and responding correctly
- **warning** ⚠️ - Service is functional but has issues (high latency, rate limits)
- **error** ❌ - Service is unavailable or experiencing critical failures
- **not_implemented** 🚧 - Service placeholder, not yet implemented

## Implementation Roadmap

### Phase 1: Cloud Services (Priority)

1. ✅ Create health check infrastructure
2. ⬜ Implement Vertex AI Gemini health check
3. ⬜ Deploy Salamandra 7B to Vertex AI
4. ⬜ Implement Vertex Salamandra health check

### Phase 2: Embeddings & Search

5. ⬜ Set up embedding service (Vertex AI)
6. ⬜ Configure Firestore Vector Search
7. ⬜ Implement embedding health checks
8. ⬜ Implement vector DB health checks

### Phase 3: Local Inference

9. ⬜ Set up local llama.cpp server
10. ⬜ Deploy Salamandra 7B GGUF model
11. ⬜ Implement local model health check
12. ⬜ Add GPU monitoring

## Environment Variables

When implementing, add these to your Firebase Functions environment:

```bash
# Vertex AI Configuration
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_GEMINI_MODEL=gemini-pro
VERTEX_AI_SALAMANDRA_ENDPOINT=your-endpoint

# Local Model Configuration
LOCAL_MODEL_HOST=localhost
LOCAL_MODEL_PORT=8080

# Embedding Service
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768

# Vector Database
VECTOR_DB_PROVIDER=firestore
VECTOR_DB_INDEX_NAME=documents_vector_index
```

## Monitoring & Alerts

Set up alerts for:

- Service downtime (any service unavailable > 5 minutes)
- High latency (response time > 10 seconds)
- Error rate increase (>5% of requests failing)
- Quota exhaustion (approaching API limits)
- Cost anomalies (unexpected spending increase)

## Testing

Once implemented, test health checks with:

```bash
# Test from Firebase Functions shell
firebase functions:shell
> llmHealthCheck()

# Test local model
curl http://localhost:8080/health

# Test from frontend
# Navigate to Dashboard and click "Actualitzar"
```

## Troubleshooting

Common issues and solutions:

| Issue               | Possible Cause     | Solution                     |
| ------------------- | ------------------ | ---------------------------- |
| Vertex AI timeout   | Network/API issue  | Check VPC, firewall rules    |
| Local model offline | Server not running | Start llama.cpp server       |
| Embedding errors    | Model not found    | Verify model name/region     |
| Vector search slow  | Index not created  | Create/rebuild vector index  |
| Rate limit errors   | Too many requests  | Implement request throttling |

## Cost Optimization

- Use local models for non-critical tasks
- Batch embedding generation requests
- Cache frequent LLM responses
- Set appropriate timeout values
- Monitor and optimize token usage
- Use smaller models when possible

## Security Considerations

- Secure API keys in Firebase Functions config
- Validate all health check responses
- Implement authentication for sensitive endpoints
- Monitor for unusual API usage patterns
- Rotate credentials regularly
- Use VPC for internal service communication
