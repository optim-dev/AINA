# Context Window Strategy - Migration Guide

## Overview

This guide helps you update existing AINA code to leverage the new context window management strategy with environment variable configuration.

## What's Changed

### Environment Variable Configuration (NEW)

Context window behavior is now configurable via environment variables instead of hardcoded values:

| Feature           | Before (Hardcoded)       | After (Configurable)                                           |
| ----------------- | ------------------------ | -------------------------------------------------------------- |
| Auto-fallback     | Always enabled           | `CONTEXT_WINDOW_AUTO_FALLBACK` (default: `true`)               |
| Chunk size        | Fixed in code (12000)    | `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE` (default: 12000)           |
| Chunking strategy | Hardcoded per call       | `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` (default: `paragraph`) |
| Overlap tokens    | Hardcoded per call (500) | `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` (default: 500)         |

### Pre-validation (NEW)

All `callModel()` invocations now validate context window BEFORE making API calls, preventing expensive failed requests.

### Fallback Metadata (NEW)

Responses include fallback information:

```typescript
{
  text: "...",
  provider: "gemini-2.5-flash",
  metadata: {
    fallbackUsed: true,
    originalProvider: "alia-40b-instruct",
    fallbackReason: "context_window_exceeded: 46756 > 12288"
  }
}
```

## Migration Steps

### Step 1: Add Environment Variables

```bash
# Copy example config
cp functions/.env.context-window.example functions/.env.local

# Review and adjust defaults if needed
# Most deployments can use the defaults
```

### Step 2: Update LLMService Factory Calls

#### Before (Explicit autoFallback Parameter)

```typescript
// ❌ Old: autoFallback hardcoded in every call
const aliaService = createAliaService(projectId, "europe-west4", "16k", true)
const salamandraService = createSalamandraService(projectId, "europe-west4", true)
```

#### After (Uses Environment Variable Default)

```typescript
// ✅ New: autoFallback defaults from CONTEXT_WINDOW_AUTO_FALLBACK env var
const aliaService = createAliaService(projectId, "europe-west4", "16k")
const salamandraService = createSalamandraService(projectId, "europe-west4")

// Optional: Override env var default for specific cases
const noFallbackService = createAliaService(projectId, "europe-west4", "16k", false)
```

### Step 3: Simplify Map-Reduce Calls

#### Before (Explicit Chunking Options)

```typescript
// ❌ Old: chunking options hardcoded in every call
import { mapReduce } from "./PromptChunking"

const result = await mapReduce(
	llmService,
	largeDocument,
	{
		mapInstruction: "Extract lots from this section.",
		reduceInstruction: "Merge all lots.",
	},
	{
		maxTokensPerChunk: 12_000,
		overlapTokens: 500,
		strategy: "paragraph",
	}
)
```

#### After (Uses Environment Variable Defaults)

```typescript
// ✅ New: chunking options default from env vars
import { mapReduce } from "./PromptChunking"

const result = await mapReduce(
	llmService,
	largeDocument,
	{
		mapInstruction: "Extract lots from this section.",
		reduceInstruction: "Merge all lots.",
	}
	// Optional: override env var defaults for specific cases
	// { maxTokensPerChunk: 28_000 }
)
```

### Step 4: Update Error Handling

#### Before (No Context Window Validation)

```typescript
// ❌ Old: no pre-validation, fails at API call
try {
	const response = await llmService.callModel({
		prompt: largePrompt,
	})
} catch (error) {
	// Generic error handling
	logger.error("API call failed", error)
}
```

#### After (With Pre-validation and Fallback Metadata)

```typescript
// ✅ New: pre-validation prevents expensive failures
try {
	const response = await llmService.callModel({
		prompt: largePrompt,
	})

	// Check if fallback was used
	if (response.metadata?.fallbackUsed) {
		logger.info("Fallback triggered", {
			from: response.metadata.originalProvider,
			to: response.provider,
			reason: response.metadata.fallbackReason,
		})
	}
} catch (error) {
	if (error instanceof ContextWindowExceededError) {
		// Handle case where even fallback failed
		logger.error("Context window exceeded even with fallback", {
			promptTokens: error.promptTokens,
			maxTokens: error.maxTokens,
			provider: error.provider,
		})

		// Consider using map-reduce
		const result = await mapReduce(llmService, largePrompt, instructions)
	} else {
		logger.error("API call failed", error)
	}
}
```

## Code Examples

### Example 1: Elaboration Service (Kit Submission)

#### Before

```typescript
// ❌ Old: hardcoded values, no pre-validation
async function evaluateSubmission(projectId: string, prompt: string, systemPrompt: string): Promise<EvaluationResult> {
	const aliaService = createAliaService(projectId, "europe-west4", "16k", true)

	const response = await aliaService.callModel({
		prompt,
		systemPrompt,
		options: { maxTokens: 4096 },
	})

	return parseEvaluation(response.text)
}
```

#### After

```typescript
// ✅ New: env var defaults, automatic pre-validation and fallback
async function evaluateSubmission(projectId: string, prompt: string, systemPrompt: string): Promise<EvaluationResult> {
	// Uses CONTEXT_WINDOW_AUTO_FALLBACK env var
	const aliaService = createAliaService(projectId, "europe-west4", "16k")

	const response = await aliaService.callModel({
		prompt,
		systemPrompt,
		options: { maxTokens: 4096 },
	})

	// Log if fallback was used for monitoring
	if (response.metadata?.fallbackUsed) {
		logger.info("Submission evaluation used fallback", {
			originalModel: response.metadata.originalProvider,
			fallbackModel: response.provider,
		})
	}

	return parseEvaluation(response.text)
}
```

### Example 2: Tender Analysis (Large Documents)

#### Before

```typescript
// ❌ Old: hardcoded chunking, repetitive options
async function analyzeTender(projectId: string, tenderText: string): Promise<TenderAnalysis> {
	const aliaService = createAliaService(projectId, "europe-west4", "16k", true)

	// Manual chunking with hardcoded values
	const lots = await mapReduce(
		aliaService,
		tenderText,
		{
			mapInstruction: "Extract lots from this section.",
			reduceInstruction: "Merge all lots.",
		},
		{
			maxTokensPerChunk: 12_000,
			overlapTokens: 500,
			strategy: "paragraph",
		}
	)

	const requirements = await mapReduce(
		aliaService,
		tenderText,
		{
			mapInstruction: "Extract requirements.",
			reduceInstruction: "Merge requirements.",
		},
		{
			maxTokensPerChunk: 12_000,
			overlapTokens: 500,
			strategy: "paragraph",
		}
	)

	return { lots, requirements }
}
```

#### After

```typescript
// ✅ New: env var defaults, cleaner code
async function analyzeTender(projectId: string, tenderText: string): Promise<TenderAnalysis> {
	// Uses CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE, _STRATEGY, _OVERLAP env vars
	const aliaService = createAliaService(projectId, "europe-west4", "16k")

	const lots = await mapReduce(aliaService, tenderText, {
		mapInstruction: "Extract lots from this section.",
		reduceInstruction: "Merge all lots.",
	})

	const requirements = await mapReduce(aliaService, tenderText, {
		mapInstruction: "Extract requirements.",
		reduceInstruction: "Merge requirements.",
	})

	return { lots, requirements }
}
```

### Example 3: Workflow with Known Large Context

#### Before

```typescript
// ❌ Old: manual model selection based on size
async function processDocument(projectId: string, document: string): Promise<Result> {
	// Estimate tokens (imprecise)
	const estimatedTokens = document.length / 4

	let service: LLMService
	if (estimatedTokens > 30_000) {
		service = createGeminiService(projectId, "europe-west4")
	} else {
		service = createAliaService(projectId, "europe-west4", "16k", true)
	}

	return await service.callModel({ prompt: document })
}
```

#### After

```typescript
// ✅ New: let auto-fallback handle it, or use ALIA-32k for known large docs
async function processDocument(projectId: string, document: string): Promise<Result> {
	// Option 1: Use ALIA-16k with auto-fallback (env var controlled)
	const service = createAliaService(projectId, "europe-west4", "16k")

	// Option 2: Use ALIA-32k directly for known large documents
	// const service = createAliaService(projectId, "europe-west4", "32k")

	const response = await service.callModel({ prompt: document })

	// Fallback metadata available for logging/monitoring
	if (response.metadata?.fallbackUsed) {
		logger.info("Document processing used fallback", {
			documentSize: document.length,
			fallbackModel: response.provider,
		})
	}

	return response
}
```

## Configuration Recommendations by Use Case

### Production (Default Configuration)

```bash
# .env.local
CONTEXT_WINDOW_AUTO_FALLBACK=true
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=12000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=500
```

**Best for:** Mixed workloads, unpredictable document sizes  
**Cost:** Medium (ALIA-16k → Gemini fallback when needed)  
**Reliability:** High (auto-fallback prevents failures)

### High-Volume / Cost-Optimized

```bash
# .env.local
CONTEXT_WINDOW_AUTO_FALLBACK=false
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=8000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=200
```

**Best for:** Budget-constrained deployments, predictable small documents  
**Cost:** Low (stays on ALIA, uses map-reduce for large docs)  
**Reliability:** Medium (requires explicit error handling)

### Quality-First / Large Documents

```bash
# .env.local
CONTEXT_WINDOW_AUTO_FALLBACK=true
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=28000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=1000
```

**Best for:** Contract analysis, technical specifications, quality-critical work  
**Cost:** Higher (uses ALIA-32k or Gemini more often)  
**Reliability:** Very High (large chunks preserve context)

## Testing Your Migration

### 1. Test with Small Documents (No Fallback Expected)

```typescript
const service = createAliaService(projectId, "europe-west4", "16k")
const response = await service.callModel({
	prompt: "Short prompt here.",
})

assert(response.metadata?.fallbackUsed === false)
assert(response.provider === "alia-40b-instruct")
```

### 2. Test with Large Documents (Fallback Expected)

```typescript
const service = createAliaService(projectId, "europe-west4", "16k")
const response = await service.callModel({
	prompt: "A".repeat(100_000), // Very large prompt
})

assert(response.metadata?.fallbackUsed === true)
assert(response.provider === "gemini-2.5-flash")
```

### 3. Test Map-Reduce with Env Var Defaults

```typescript
const result = await mapReduce(service, largeDocument, {
	mapInstruction: "Extract key points.",
	reduceInstruction: "Combine all points.",
})

// Should use env var defaults
assert(result.metadata?.totalChunks > 0)
```

### 4. Test Disabling Auto-Fallback

```typescript
// Override env var to disable fallback
const service = createAliaService(projectId, "europe-west4", "16k", false)

try {
	await service.callModel({ prompt: "A".repeat(100_000) })
	assert.fail("Should have thrown ContextWindowExceededError")
} catch (error) {
	assert(error instanceof ContextWindowExceededError)
}
```

## Rollback Plan

If you need to rollback:

1. **Keep old code temporarily:**

```typescript
// Keep old implementation as fallback
async function processDocumentOld(projectId: string, prompt: string) {
	// Old hardcoded implementation
}

async function processDocument(projectId: string, prompt: string) {
	try {
		// Try new implementation
		return await processDocumentNew(projectId, prompt)
	} catch (error) {
		logger.warn("New implementation failed, using old", error)
		return await processDocumentOld(projectId, prompt)
	}
}
```

2. **Disable new features via env vars:**

```bash
# Disable auto-fallback
CONTEXT_WINDOW_AUTO_FALLBACK=false
```

3. **Monitor logs for issues:**

```sql
-- Check for increased errors
SELECT
  DATE(timestamp) as date,
  COUNT(*) as errors
FROM `aina-demostradors.aina_logs_dev.llm_logs_v2`
WHERE error IS NOT NULL
GROUP BY date
ORDER BY date DESC;
```

## Support

Questions or issues with migration?

- Review [context-window-strategy.md](./context-window-strategy.md) for detailed documentation
- Check [.env.context-window.example](../functions/.env.context-window.example) for configuration examples
- Review [contextWindowExamples.ts](../functions/src/shared/examples/contextWindowExamples.ts) for code patterns
- Contact: development team

## Next Steps

After migration:

1. **Monitor BigQuery logs** for fallback rates
2. **Tune environment variables** based on actual usage patterns
3. **Optimize specific workflows** that frequently trigger fallback
4. **Consider ALIA-32k endpoint** for known large document workflows
5. **Implement map-reduce** for predictably large documents (>30k tokens)
