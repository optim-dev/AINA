# Context Window Management Strategy

## Overview

This document describes AINA's strategy for handling context window limitations across different LLM providers (Gemini, Salamandra, ALIA).

## Problem

Different models have different context window limits:

| Model            | Context Window | Use Case                                  |
| ---------------- | -------------- | ----------------------------------------- |
| Gemini 2.5 Flash | 1M tokens      | Best for large documents, high throughput |
| Gemini 2.5 Pro   | 1M tokens      | Complex reasoning with large context      |
| ALIA-40B (8k)    | 8,192 tokens   | Catalan-optimized, small contexts         |
| ALIA-40B (16k)   | 16,384 tokens  | Catalan-optimized, medium contexts        |
| ALIA-40B (32k)   | 32,768 tokens  | Catalan-optimized, large contexts         |
| Salamandra 7B    | 8,192 tokens   | Catalan-optimized, small contexts         |

When a prompt exceeds the model's context window, you get errors like:

```
This model's maximum context length is 16384 tokens. However, you requested 50852 tokens
(46756 in the prompt, 4096 in the generation). Please reduce the prompt length or max_tokens.
```

## Configuration

The strategy is controlled by environment variables. Copy [`.env.context-window.example`](../functions/.env.context-window.example) and customize:

| Environment Variable                    | Default     | Description                                         |
| --------------------------------------- | ----------- | --------------------------------------------------- |
| `CONTEXT_WINDOW_AUTO_FALLBACK`          | `true`      | Enable automatic fallback to larger context models  |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE`     | `12000`     | Default tokens per chunk for map-reduce             |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` | `paragraph` | Chunking strategy: `sentence`, `paragraph`, `fixed` |
| `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` | `500`       | Overlap tokens between chunks for context           |

### Quick Start

```bash
# Copy example config
cp functions/.env.context-window.example functions/.env.local

# Edit values (defaults work for most cases)
# Deploy functions with environment config
firebase deploy --only functions
```

## Solution: Multi-Layered Strategy

### 1. Pre-validation (Before API Call)

**LLMService** now validates token count BEFORE making the expensive API call:

```typescript
// Automatically validates context window
const response = await llmService.callModel({
	prompt: largePrompt,
	systemPrompt: systemInstructions,
	options: { maxTokens: 4096 },
})
```

**What happens:**

1. Counts tokens in prompt + system prompt
2. Checks against model's limit (minus output tokens)
3. If it fits → proceeds with API call
4. If too large → triggers fallback strategy (if enabled)

### 2. Automatic Fallback (Default: Enabled)

When context window is exceeded, automatically falls back to a model with larger context:

```
Salamandra 7B (8k)
  → ALIA-40B (32k)
    → Gemini Flash (1M)

ALIA-40B (16k)
  → Gemini Flash (1M)
```

**Example:**

```typescript
// Configure with auto-fallback (default: true)
const aliaService = createAliaService(projectId, region, "16k", true)

// If prompt exceeds 16k, automatically uses Gemini Flash (1M)
const response = await aliaService.callModel({
	prompt: veryLargePrompt, // 50k tokens
})

// Response includes fallback metadata
console.log(response.metadata.fallbackUsed) // true
console.log(response.metadata.originalProvider) // "alia-40b-instruct"
console.log(response.provider) // "gemini-2.5-flash"
```

**Disable Fallback:**

```typescript
// Throw error instead of fallback
const aliaService = createAliaService(projectId, region, "16k", false)

try {
	await aliaService.callModel({ prompt: veryLargePrompt })
} catch (error) {
	if (error instanceof ContextWindowExceededError) {
		console.log(`Prompt too large: ${error.promptTokens} > ${error.maxTokens}`)
	}
}
```

### 3. Manual Context Selection

For known large contexts, explicitly choose appropriate model:

```typescript
// Small context - use ALIA 16k (Catalan-optimized)
const aliaSmall = createAliaService(projectId, region, "16k")

// Large context - use ALIA 32k or Gemini
const aliaLarge = createAliaService(projectId, region, "32k")
const gemini = createGeminiService(projectId, region)

// Auto-select based on estimated size
const service = estimatedTokens > 30_000 ? gemini : aliaLarge
```

### 4. Prompt Chunking (Map-Reduce)

For extremely large documents, use map-reduce pattern with configurable defaults:

```typescript
import { mapReduce } from "./PromptChunking"

// Process 100k token document in chunks using env var defaults
const result = await mapReduce(
	llmService,
	largeDocument,
	{
		// Process each chunk independently
		mapInstruction: "Extract all 'lots' from this tender specification section. Return JSON array.",

		// Combine all results
		reduceInstruction: "Merge these lot extractions, removing duplicates. Return final JSON array.",
	}
	// Optional: override env var defaults
	// {
	//   maxTokensPerChunk: 28_000,  // Override CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE
	//   overlapTokens: 1000,        // Override CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS
	//   strategy: "sentence",       // Override CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY
	// }
)

// Result is aggregated from all chunks
console.log(result.json) // Final merged lots
console.log(result.metadata.totalChunks) // How many chunks processed
```

**Chunking options use environment variable defaults** (see [Configuration](#configuration) above):

- Default chunk size: `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE` (12000 tokens)
- Default strategy: `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` (paragraph)
- Default overlap: `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` (500 tokens)

### 5. Iterative Refinement

For tasks requiring context from previous chunks (e.g., summarization):

```typescript
import { iterativeRefinement } from "./PromptChunking"

// Summarize 100k token document progressively using env var defaults
const result = await iterativeRefinement(
	llmService,
	largeDocument,

	// Initial instruction for first chunk
	"Summarize this section of a tender document.",

	// Refinement instruction for subsequent chunks
	"Update the summary with information from this new section. Keep it concise."
	// Optional: override env var defaults
	// {
	//   maxTokensPerChunk: 28_000,
	//   strategy: "paragraph",
	// }
)

console.log(result.text) // Final refined summary
```

## Recommended Patterns

### Pattern 1: Simple Extraction (< 30k tokens)

Use ALIA-40B-16k with auto-fallback:

```typescript
const service = createAliaService(projectId, "europe-west4", "16k", true)

const response = await service.callModel({
	prompt: mediumDocument,
	systemPrompt: "Extract key information...",
	jsonResponse: true,
})
```

**Pros:** Catalan-optimized, cost-effective  
**Cons:** Falls back to Gemini if too large (higher cost)

### Pattern 2: Large Document Processing (> 30k tokens)

Use Gemini Flash directly:

```typescript
const service = createGeminiService(projectId, "europe-west4", "gemini-2.5-flash")

const response = await service.callModel({
	prompt: largeDocument, // Up to 1M tokens
	systemPrompt: "Analyze this entire document...",
	jsonResponse: true,
})
```

**Pros:** Handles very large contexts, fast  
**Cons:** Not Catalan-optimized, slightly higher cost than ALIA

### Pattern 3: Massive Document Processing (> 1M tokens)

Use map-reduce with chunking:

```typescript
const service = createAliaService(projectId, "europe-west4", "16k")

const result = await mapReduce(
	service,
	massiveDocument,
	{
		mapInstruction: "Extract information from this section...",
		reduceInstruction: "Combine all extracted information...",
	},
	{
		maxTokensPerChunk: 12_000,
		strategy: "paragraph",
	}
)
```

**Pros:** Can handle unlimited size, parallelizable, cost-effective  
**Cons:** Multiple API calls, slightly slower

## Configuration

### Environment Variables

```bash
# Default project and region
DEFAULT_PROJECT_ID=aina-demostradors
DEFAULT_REGION=europe-west4

# Ollama (for local Salamandra)
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=cas/salamandra-7b-instruct
```

### Service Factory Functions

```typescript
// Auto-configured with fallback
export function getLLMServiceForModel(modelId?: string): LLMService

// Specific model instances
export function createGeminiService(projectId, region, modelId): LLMService
export function createAliaService(projectId, region, contextSize, autoFallback): LLMService
export function createSalamandraService(projectId, region, endpoint): LLMService
export function createSalamandraLocalService(ollamaEndpoint, ollamaModel): LLMService
```

## Observability

All context window events are logged:

```typescript
// Context validation
logger.info("Context window validation", {
	provider: "alia-40b-instruct",
	contextLimit: 16384,
	estimatedPromptTokens: 46756,
	maxOutputTokens: 4096,
	availableInputTokens: 12288,
	fits: false, // Exceeds limit
})

// Fallback triggered
logger.warn("⚠️  Context window exceeded", {
	requestId: "req_123",
	provider: "alia-40b-instruct",
	estimatedPromptTokens: 46756,
	availableInputTokens: 12288,
	autoFallback: true,
})

logger.info("🔄 Attempting fallback to larger context model", {
	from: "alia-40b-instruct",
	to: "gemini-2.5-flash",
})

logger.info("✅ Fallback successful", {
	requestId: "req_123",
	fallbackProvider: "gemini-2.5-flash",
})
```

**BigQuery Logs** include:

- `fallbackUsed`: boolean
- `fallbackReason`: string (e.g., "context_window_exceeded: 46756 > 12288")
- `originalProvider`: string (e.g., "alia-40b-instruct")

## Cost Implications

| Strategy                          | Cost    | Latency | Quality                            |
| --------------------------------- | ------- | ------- | ---------------------------------- |
| ALIA-16k (no fallback)            | Lowest  | Low     | Best for Catalan                   |
| ALIA-16k → Gemini (auto-fallback) | Medium  | Medium  | Good for Catalan, handles overflow |
| Gemini Flash (direct)             | Medium  | Low     | Good for all languages             |
| Map-Reduce (ALIA chunks)          | Lowest  | Higher  | Best for massive docs              |
| Map-Reduce (Gemini chunks)        | Highest | Medium  | Best quality for massive docs      |

**Pricing (per 1M tokens):**

- Gemini Flash: $0.15 input, $0.60 output
- Gemini Pro: $1.25 input, $10.00 output
- ALIA/Salamandra: Compute costs only (self-hosted)

## Error Handling

```typescript
try {
	const response = await llmService.callModel({ prompt: largePrompt })
} catch (error) {
	if (error instanceof ContextWindowExceededError) {
		console.error(`Context too large: ${error.promptTokens} tokens`)
		console.error(`Model ${error.provider} supports max ${error.maxTokens} tokens`)

		// Handle by chunking
		const result = await mapReduce(llmService, largePrompt, options, chunkOptions)
	} else {
		throw error
	}
}
```

## Best Practices

1. **Estimate before calling**: Use `estimateTokensAdvanced()` to check size
2. **Enable auto-fallback**: Unless you have specific requirements, keep `autoFallback: true`
3. **Choose right model upfront**: If you know document is large (> 30k tokens), use Gemini directly
4. **Use map-reduce for very large docs**: Documents > 50k tokens benefit from chunking
5. **Monitor fallback rate**: High fallback rate → switch to larger context model by default
6. **Set appropriate maxTokens**: Reserve enough output tokens (default 4096 is safe)

## Deployment Notes

### ALIA Context Variants

### Deployment

1. **Configure environment variables:**

```bash
# Copy example config
cp functions/.env.context-window.example functions/.env.local

# Edit values for your deployment
# Production: Use defaults
# High-volume: Disable auto-fallback, use ALIA-32k
# Quality-first: Enable auto-fallback, use large chunks with Gemini
```

2. **Deploy functions with config:**

```bash
# Deploy with environment variables
firebase deploy --only functions

# Verify environment variables are loaded
firebase functions:config:get
```

3. **Ensure all ALIA endpoints are deployed:**

```bash
cd scripts_infra_vertex
python lifecycle_big.py  # Deploys alia-40b-endpoint-8k, -16k, -32k
```

4. **Check deployment status:**

```bash
gcloud ai endpoints list \
  --region=europe-west4 \
  --filter="displayName:alia-40b"
```

### Testing

1. **Test environment variable configuration:**

```bash
# Check config is loaded
cd functions
npm run serve  # Start emulator
```

2. **Test auto-fallback behavior:**

```typescript
// Test with auto-fallback enabled (default)
const service = createAliaService(projectId, region, "16k")

// This should trigger fallback to Gemini
const response = await service.callModel({
	prompt: "Generate a 50,000 token story...",
	options: { maxTokens: 4096 },
})

assert(response.metadata?.fallbackUsed === true)
assert(response.provider === "gemini-2.5-flash")
```

3. **Test chunking with custom defaults:**

```typescript
// Override env var defaults for specific use case
const result = await mapReduce(llmService, largeDoc, instructions, {
	maxTokensPerChunk: 28_000, // Override default
	strategy: "sentence", // Override default
})
```

### Monitoring Production

Query BigQuery to optimize configuration:

```sql
-- Check fallback rate
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN fallbackUsed THEN 1 ELSE 0 END) as fallback_count,
  ROUND(100.0 * SUM(CASE WHEN fallbackUsed THEN 1 ELSE 0 END) / COUNT(*), 2) as fallback_rate,
  AVG(usage.totalTokens) as avg_tokens,
  MAX(usage.totalTokens) as max_tokens
FROM `aina-demostradors.aina_logs_dev.llm_logs_v2`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date
ORDER BY date DESC;

-- If fallback_rate > 20%, consider:
--   - Increasing CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE
--   - Using ALIA-32k by default for specific workflows
--   - Implementing map-reduce for known large documents

-- Check average chunk processing
SELECT
  AVG(CAST(JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') AS INT64)) as avg_chunks,
  MAX(CAST(JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') AS INT64)) as max_chunks
FROM `aina-demostradors.aina_logs_dev.llm_logs_v2`
WHERE JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') IS NOT NULL
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY);
```

## Troubleshooting

**Q: Getting "context window exceeded" even with fallback enabled?**  
A: Fallback to Gemini might also fail if prompt > 1M tokens. Use map-reduce chunking.

**Q: Fallback not triggering?**  
A: Check `autoFallback` config. Also verify Gemini service is properly initialized.

**Q: Map-reduce results not combining properly?**  
A: Ensure reduce instruction is clear. Test with smaller docs first.

**Q: Accurate token count?**  
A: ALIA/Salamandra use Llama2 tokenizer via `@xenova/transformers`. Gemini uses internal tokenizer (metadata in response).

## Future Enhancements

- [ ] Streaming support for large contexts
- [ ] Parallel map-reduce processing
- [ ] Smart chunking with semantic boundaries (using RAG embeddings)
- [ ] Automatic prompt compression techniques
- [ ] Cache frequently used large prompts

## References

- [Google Gemini Pricing](https://ai.google.dev/pricing)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [AINA Project Documentation](../docs/integracio-recursos-aina.md)
