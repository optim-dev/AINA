# Context Window Strategy Implementation - Summary

## Problem Statement

AINA's ALIA-40B model encountered context window limitation errors when processing large documents:

```
This model's maximum context length is 16384 tokens. However, you requested 50852 tokens
(46756 in the prompt, 4096 in the generation). Please reduce the prompt length or max_tokens.
```

Different models have different context limits:

- Gemini 2.5 Flash/Pro: 1M tokens
- ALIA-40B (8k/16k/32k): 8,192 / 16,384 / 32,768 tokens
- Salamandra 7B: 8,192 tokens

## Solution Implemented

A comprehensive **multi-layered strategy** with **environment variable configuration** to handle context window limitations:

### 1. Pre-validation

- Validates token count BEFORE making API calls
- Prevents expensive failed requests
- Uses @xenova/transformers tokenizer for AINA models

### 2. Automatic Fallback (Configurable)

- Transparently switches to larger context models when needed
- Fallback hierarchy:
  - ALIA-16k → Gemini Flash (1M)
  - Salamandra → ALIA-40B → Gemini Flash
- **Controlled by `CONTEXT_WINDOW_AUTO_FALLBACK` env var** (default: true)

### 3. Manual Context Selection

- Explicit model selection for known large contexts
- Use ALIA-32k or Gemini directly for large documents

### 4. Map-Reduce Chunking (Configurable Defaults)

- Split large documents into manageable chunks
- Process independently, then combine results
- Three strategies: sentence, paragraph, fixed-size
- **Defaults from env vars:**
  - `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE` (default: 12000)
  - `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` (default: paragraph)
  - `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` (default: 500)

### 5. Iterative Refinement

- Progressive refinement across chunks
- Maintains context from previous chunks
- Ideal for summarization tasks

## Features Implemented

### Core Features

✅ **Context window validation** - Pre-validates before API calls  
✅ **Auto-fallback system** - Transparent model switching  
✅ **Environment variable configuration** - Runtime-configurable strategy  
✅ **Map-reduce utilities** - Three chunking strategies with configurable defaults  
✅ **Iterative refinement** - Progressive context building  
✅ **Error handling** - ContextWindowExceededError with details  
✅ **Observability** - BigQuery logging with fallback metadata

### Code Changes

**LLMService.ts:**

- Added `CONTEXT_WINDOW_CONFIG` constant reading env vars
- Added `CONTEXT_WINDOW_LIMITS` configuration
- Implemented `validateContextWindow()` method
- Implemented `getFallbackProvider()` for hierarchy
- Implemented `createFallbackService()` for switching
- Updated `callModel()` with pre-validation and auto-fallback
- Updated `createAliaService()` and `createSalamandraService()` to use env var defaults
- Added `ContextWindowExceededError` class

**PromptChunking.ts:**

- Added `DEFAULT_CHUNKING_OPTIONS` from CONTEXT_WINDOW_CONFIG
- Created `chunkBySentence()` utility
- Created `chunkByParagraph()` utility
- Created `chunkByFixedSize()` utility
- Implemented `mapReduce()` pattern with env var defaults
- Implemented `iterativeRefinement()` pattern with env var defaults

### Documentation

📄 **docs/context-window-strategy.md** - Complete strategy guide with configuration  
📄 **docs/context-window-migration-guide.md** - Migration guide for existing code  
📄 **functions/.env.context-window.example** - Environment variable examples and use cases  
📄 **examples/contextWindowExamples.ts** - Six practical examples  
📄 **CONTEXT_WINDOW_STRATEGY_SUMMARY.md** - This summary

## Configuration

### Environment Variables

| Variable                                | Default     | Description                                          |
| --------------------------------------- | ----------- | ---------------------------------------------------- |
| `CONTEXT_WINDOW_AUTO_FALLBACK`          | `true`      | Enable automatic fallback to larger context models   |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE`     | `12000`     | Default tokens per chunk for map-reduce              |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` | `paragraph` | Default chunking strategy (sentence/paragraph/fixed) |
| `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` | `500`       | Default overlap tokens between chunks                |

### Quick Start

```bash
# Copy example config
cp functions/.env.context-window.example functions/.env.local

# Edit for your deployment (defaults work for most cases)
# Deploy with configuration
firebase deploy --only functions
```

## Usage Examples

### Example 1: Auto-Fallback (Uses Env Var Default)

```typescript
// Uses CONTEXT_WINDOW_AUTO_FALLBACK from environment
const aliaService = createAliaService(projectId, "europe-west4", "16k")

const response = await aliaService.callModel({
	prompt: largePrompt,
})

if (response.metadata?.fallbackUsed) {
	console.log(`Fallback used: ${response.metadata.originalProvider} → ${response.provider}`)
}
```

### Example 2: Map-Reduce with Env Var Defaults

```typescript
import { mapReduce } from "./PromptChunking"

// Uses CONTEXT_WINDOW_DEFAULT_* env vars for chunk size, strategy, and overlap
const result = await mapReduce(llmService, largeDocument, {
	mapInstruction: "Extract lots from this section.",
	reduceInstruction: "Merge all lots.",
})

// Optional: override env var defaults for specific cases
const resultCustom = await mapReduce(
	llmService,
	largeDocument,
	{
		mapInstruction: "Extract requirements.",
		reduceInstruction: "Merge requirements.",
	},
	{
		maxTokensPerChunk: 28_000, // Override default
		strategy: "sentence", // Override default
	}
)
```

### Example 3: Disable Auto-Fallback for Specific Service

```typescript
// Override env var to disable fallback
const aliaService = createAliaService(projectId, "europe-west4", "16k", false)

try {
	await aliaService.callModel({ prompt: largePrompt })
} catch (error) {
	if (error instanceof ContextWindowExceededError) {
		// Handle manually with map-reduce
		const result = await mapReduce(aliaService, largePrompt, instructions)
	}
}
```

## Configuration Recommendations

### Production (Default)

```bash
CONTEXT_WINDOW_AUTO_FALLBACK=true
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=12000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=500
```

**Best for:** Mixed workloads, unpredictable document sizes  
**Cost:** Medium (ALIA-16k → Gemini fallback when needed)

### High-Volume / Cost-Optimized

```bash
CONTEXT_WINDOW_AUTO_FALLBACK=false
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=8000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=200
```

**Best for:** Budget constraints, predictable small documents  
**Cost:** Low (stays on ALIA, uses map-reduce)

### Quality-First / Large Documents

```bash
CONTEXT_WINDOW_AUTO_FALLBACK=true
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=28000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=1000
```

**Best for:** Contract analysis, technical specs, quality-critical  
**Cost:** Higher (uses ALIA-32k or Gemini more often)

## Cost & Performance

| Strategy            | Cost    | Latency | Quality                  |
| ------------------- | ------- | ------- | ------------------------ |
| ALIA-16k (direct)   | Lowest  | Low     | Best for Catalan         |
| ALIA → Gemini       | Medium  | Medium  | Good balance             |
| Gemini (direct)     | Medium  | Low     | Good all-around          |
| Map-Reduce (ALIA)   | Low     | Higher  | Best for massive docs    |
| Map-Reduce (Gemini) | Highest | Medium  | Best quality, large docs |

## Observability

All LLM calls are logged to BigQuery with:

- `fallbackUsed`: boolean
- `fallbackReason`: string
- `originalProvider`: string
- `usage.totalTokens`: number

### Monitoring Query

```sql
-- Check fallback rate
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN fallbackUsed THEN 1 ELSE 0 END) as fallback_count,
  ROUND(100.0 * SUM(CASE WHEN fallbackUsed THEN 1 ELSE 0 END) / COUNT(*), 2) as fallback_rate
FROM `aina-demostradors.aina_logs_dev.llm_logs_v2`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date
ORDER BY date DESC;

-- If fallback_rate > 20%, consider:
--   - Increasing CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE
--   - Using ALIA-32k by default
--   - Implementing map-reduce for specific workflows
```

## Deployment Steps

1. **Configure environment variables:**

```bash
cp functions/.env.context-window.example functions/.env.local
# Edit as needed (defaults work for most cases)
```

2. **Ensure ALIA endpoints deployed (8k, 16k, 32k):**

```bash
cd scripts_infra_vertex
python lifecycle_big.py
```

3. **Deploy functions with environment config:**

```bash
firebase deploy --only functions
```

4. **Monitor BigQuery for fallback usage and tune configuration**

## Migration from Hardcoded Values

See [docs/context-window-migration-guide.md](docs/context-window-migration-guide.md) for:

- Step-by-step migration instructions
- Before/after code examples
- Testing strategies
- Configuration recommendations by use case

**Key Changes:**

- `createAliaService()` and `createSalamandraService()` now use env var default for `autoFallback`
- `mapReduce()` and `iterativeRefinement()` now have optional `chunkingOptions` parameter with env var defaults
- All chunking operations inherit sensible defaults from environment configuration

## Next Steps

1. ✅ Implement pre-validation
2. ✅ Implement auto-fallback
3. ✅ Add environment variable configuration
4. ✅ Add map-reduce utilities with configurable defaults
5. ✅ Add iterative refinement
6. ✅ Document strategy and migration path
7. 🔄 Monitor production usage and tune env vars
8. 🔄 Migrate existing code to use env var defaults
9. 🔄 Consider streaming for large contexts
10. 🔄 Explore semantic chunking (RAG-based)

## Files Modified

- `functions/src/shared/LLMService.ts` - Core service with validation, fallback, and env var config
- `functions/src/shared/PromptChunking.ts` - Map-reduce with configurable defaults
- `functions/.env.context-window.example` - Environment variable documentation and examples
- `docs/context-window-strategy.md` - Complete documentation with configuration
- `docs/context-window-migration-guide.md` - Migration guide for existing code
- `examples/contextWindowExamples.ts` - Usage examples
- `CONTEXT_WINDOW_STRATEGY_SUMMARY.md` - This summary

## Testing

Run TypeScript compilation:

```bash
cd functions
npm run build  # ✅ Success
```

Test in emulator:

```bash
npm run serve
```

## References

- [Context Window Strategy Documentation](docs/context-window-strategy.md)
- [Migration Guide](docs/context-window-migration-guide.md)
- [Environment Variable Examples](functions/.env.context-window.example)
- [Code Examples](examples/contextWindowExamples.ts)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [@xenova/transformers](https://huggingface.co/docs/transformers.js)
