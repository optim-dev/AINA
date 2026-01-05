/**
 * PromptChunking - Utilities for splitting large prompts into manageable chunks
 *
 * This module provides strategies for handling prompts that exceed model context windows:
 * 1. Smart chunking with overlap for context preservation
 * 2. Map-reduce pattern for processing large documents
 * 3. Iterative refinement for multi-step processing
 */

import * as logger from "firebase-functions/logger"
import type { LLMService, LLMResponse } from "./LLMService"
import { estimateTokensAdvanced, CONTEXT_WINDOW_CONFIG, CONTEXT_WINDOW_LIMITS, LLMProvider } from "./LLMService"

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default chunking configuration from environment variables
 * Can be overridden per call
 */
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
	maxTokensPerChunk: CONTEXT_WINDOW_CONFIG.defaultChunkSize,
	overlapTokens: CONTEXT_WINDOW_CONFIG.defaultOverlapTokens,
	strategy: CONTEXT_WINDOW_CONFIG.defaultChunkStrategy,
}

// ============================================================================
// TYPES
// ============================================================================

export interface ChunkingOptions {
	/** Maximum tokens per chunk (including overlap) */
	maxTokensPerChunk: number
	/** Number of tokens to overlap between chunks for context */
	overlapTokens?: number
	/** Strategy for chunking */
	strategy?: "sentence" | "paragraph" | "fixed"
	/** Custom chunk splitter function */
	customSplitter?: (text: string, maxTokens: number) => string[]
}

export interface ChunkResult {
	chunks: string[]
	totalChunks: number
	estimatedTokensPerChunk: number[]
}

export interface MapReduceOptions {
	/** Instruction for processing each chunk */
	mapInstruction: string
	/** Instruction for combining results */
	reduceInstruction: string
	/** Whether to include chunk metadata in map prompts */
	includeMetadata?: boolean
}

// ============================================================================
// CHUNKING STRATEGIES
// ============================================================================

/**
 * Split text into chunks at sentence boundaries
 * Preserves sentence integrity and adds overlap for context
 */
export function chunkBySentence(text: string, maxTokensPerChunk: number, overlapTokens: number = 100): ChunkResult {
	// Split by sentence boundaries (., !, ?, followed by space or newline)
	const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text]

	const chunks: string[] = []
	const estimatedTokensPerChunk: number[] = []
	let currentChunk: string[] = []
	let currentTokens = 0

	for (const sentence of sentences) {
		const sentenceTokens = estimateTokensAdvanced(sentence, "ca")

		// If adding this sentence would exceed limit, save current chunk
		if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunk.length > 0) {
			const chunkText = currentChunk.join("")
			chunks.push(chunkText)
			estimatedTokensPerChunk.push(currentTokens)

			// Keep last N tokens for overlap
			const overlapSentences = getOverlapSentences(currentChunk, overlapTokens)
			currentChunk = overlapSentences
			currentTokens = estimateTokensAdvanced(currentChunk.join(""), "ca")
		}

		currentChunk.push(sentence)
		currentTokens += sentenceTokens
	}

	// Add remaining chunk
	if (currentChunk.length > 0) {
		chunks.push(currentChunk.join(""))
		estimatedTokensPerChunk.push(currentTokens)
	}

	logger.info("Chunked text by sentences", {
		totalChunks: chunks.length,
		avgTokensPerChunk: Math.round(estimatedTokensPerChunk.reduce((a, b) => a + b, 0) / chunks.length),
	})

	return {
		chunks,
		totalChunks: chunks.length,
		estimatedTokensPerChunk,
	}
}

/**
 * Split text into chunks at paragraph boundaries
 * Best for documents with clear paragraph structure
 */
export function chunkByParagraph(text: string, maxTokensPerChunk: number, overlapTokens: number = 50): ChunkResult {
	// Split by double newlines (paragraphs)
	const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)

	const chunks: string[] = []
	const estimatedTokensPerChunk: number[] = []
	let currentChunk: string[] = []
	let currentTokens = 0

	for (const paragraph of paragraphs) {
		const paragraphTokens = estimateTokensAdvanced(paragraph, "ca")

		// If paragraph alone exceeds limit, chunk it by sentences
		if (paragraphTokens > maxTokensPerChunk) {
			// Save current chunk first
			if (currentChunk.length > 0) {
				chunks.push(currentChunk.join("\n\n"))
				estimatedTokensPerChunk.push(currentTokens)
				currentChunk = []
				currentTokens = 0
			}

			// Split large paragraph by sentences
			const sentenceChunks = chunkBySentence(paragraph, maxTokensPerChunk, overlapTokens)
			chunks.push(...sentenceChunks.chunks)
			estimatedTokensPerChunk.push(...sentenceChunks.estimatedTokensPerChunk)
			continue
		}

		// If adding this paragraph would exceed limit, save current chunk
		if (currentTokens + paragraphTokens > maxTokensPerChunk && currentChunk.length > 0) {
			chunks.push(currentChunk.join("\n\n"))
			estimatedTokensPerChunk.push(currentTokens)
			currentChunk = []
			currentTokens = 0
		}

		currentChunk.push(paragraph)
		currentTokens += paragraphTokens
	}

	// Add remaining chunk
	if (currentChunk.length > 0) {
		chunks.push(currentChunk.join("\n\n"))
		estimatedTokensPerChunk.push(currentTokens)
	}

	logger.info("Chunked text by paragraphs", {
		totalChunks: chunks.length,
		avgTokensPerChunk: Math.round(estimatedTokensPerChunk.reduce((a, b) => a + b, 0) / chunks.length),
	})

	return {
		chunks,
		totalChunks: chunks.length,
		estimatedTokensPerChunk,
	}
}

/**
 * Split text into fixed-size chunks (character-based)
 * Simple but may break sentences/words
 */
export function chunkByFixedSize(text: string, maxTokensPerChunk: number, overlapTokens: number = 50): ChunkResult {
	// Rough estimation: 4.5 characters per token for Catalan
	const charsPerToken = 4.5
	const maxCharsPerChunk = Math.floor(maxTokensPerChunk * charsPerToken)
	const overlapChars = Math.floor(overlapTokens * charsPerToken)

	const chunks: string[] = []
	const estimatedTokensPerChunk: number[] = []
	let position = 0

	while (position < text.length) {
		const end = Math.min(position + maxCharsPerChunk, text.length)
		const chunk = text.substring(position, end)
		chunks.push(chunk)
		estimatedTokensPerChunk.push(estimateTokensAdvanced(chunk, "ca"))

		// Move forward, but keep overlap
		position = end - overlapChars

		// Avoid infinite loop at end
		if (position >= text.length - overlapChars) break
	}

	logger.info("Chunked text by fixed size", {
		totalChunks: chunks.length,
		charsPerChunk: maxCharsPerChunk,
	})

	return {
		chunks,
		totalChunks: chunks.length,
		estimatedTokensPerChunk,
	}
}

/**
 * Helper: Get sentences from end of chunk for overlap
 */
function getOverlapSentences(sentences: string[], targetTokens: number): string[] {
	const overlap: string[] = []
	let tokens = 0

	for (let i = sentences.length - 1; i >= 0; i--) {
		const sentence = sentences[i]
		const sentenceTokens = estimateTokensAdvanced(sentence, "ca")

		if (tokens + sentenceTokens > targetTokens) break

		overlap.unshift(sentence)
		tokens += sentenceTokens
	}

	return overlap
}

// ============================================================================
// MAP-REDUCE PATTERN
// ============================================================================

/**
 * Process a large text using map-reduce pattern:
 * 1. MAP: Process each chunk independently
 * 2. REDUCE: Combine results into final output
 *
 * Example use case: Extracting lots from a large tender specification
 */
export async function mapReduce(llmService: LLMService, text: string, options: MapReduceOptions, chunkingOptions: Partial<ChunkingOptions> = {}, maxOutputTokens: number = 512): Promise<LLMResponse> {
	const { mapInstruction, reduceInstruction, includeMetadata = true } = options

	// Get the model's context window limit
	const provider = llmService.getProvider()
	const contextLimit = CONTEXT_WINDOW_LIMITS[provider as LLMProvider] || 8192

	// Calculate adaptive chunk size based on model's context window
	// Reserve tokens for: instruction (~200), output (maxOutputTokens), and safety margin (10%)
	const instructionOverhead = 200 // Approximate tokens for map instruction wrapper
	const safetyMargin = Math.floor(contextLimit * 0.1)
	const adaptiveChunkSize = Math.max(
		100, // Minimum chunk size
		contextLimit - maxOutputTokens - instructionOverhead - safetyMargin
	)

	logger.info("Calculated adaptive chunk size", {
		provider,
		contextLimit,
		maxOutputTokens,
		instructionOverhead,
		safetyMargin,
		adaptiveChunkSize,
		envChunkSize: CONTEXT_WINDOW_CONFIG.defaultChunkSize,
	})

	// STEP 1: Chunk the text - use adaptive size if smaller than env default
	const effectiveChunkSize = Math.min(adaptiveChunkSize, CONTEXT_WINDOW_CONFIG.defaultChunkSize)
	const effectiveOverlap = Math.min(
		chunkingOptions.overlapTokens ?? CONTEXT_WINDOW_CONFIG.defaultOverlapTokens,
		Math.floor(effectiveChunkSize * 0.1) // Max 10% overlap
	)

	const fullChunkingOptions: ChunkingOptions = {
		...DEFAULT_CHUNKING_OPTIONS,
		...chunkingOptions,
		maxTokensPerChunk: effectiveChunkSize,
		overlapTokens: effectiveOverlap,
	}
	const strategy = fullChunkingOptions.strategy || "paragraph"
	let chunkResult: ChunkResult

	switch (strategy) {
		case "sentence":
			chunkResult = chunkBySentence(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		case "paragraph":
			chunkResult = chunkByParagraph(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		case "fixed":
			chunkResult = chunkByFixedSize(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		default:
			throw new Error(`Unknown chunking strategy: ${strategy}`)
	}

	logger.info("Starting map-reduce processing", {
		totalChunks: chunkResult.totalChunks,
		strategy,
	})

	// STEP 2: MAP - Process each chunk
	const mapResults: string[] = []
	let totalMapTokens = 0
	let totalMapLatency = 0

	for (let i = 0; i < chunkResult.chunks.length; i++) {
		const chunk = chunkResult.chunks[i]
		const metadata = includeMetadata ? `\n\n[Chunk ${i + 1}/${chunkResult.totalChunks}, ~${chunkResult.estimatedTokensPerChunk[i]} tokens]` : ""

		const mapPrompt = `${mapInstruction}\n\n---\n${chunk}${metadata}`

		try {
			const response = await llmService.callModel({
				prompt: mapPrompt,
				jsonResponse: true, // Force JSON for easier parsing
				_skipAutoStrategies: true, // Prevent recursive auto-fallback/map-reduce
				options: {
					maxTokens: maxOutputTokens, // Use controlled output size for map phase
				},
			})

			mapResults.push(response.text)
			totalMapTokens += response.usage.totalTokens
			totalMapLatency += response.latencyMs

			logger.info(`Processed chunk ${i + 1}/${chunkResult.totalChunks}`, {
				tokens: response.usage.totalTokens,
				latency: response.latencyMs,
			})
		} catch (error: any) {
			logger.error(`Failed to process chunk ${i + 1}`, { error: error.message })
			// Continue with remaining chunks
			mapResults.push(`{"error": "Failed to process chunk ${i + 1}: ${error.message}"}`)
		}
	}

	// STEP 3: REDUCE - Combine results
	const combinedResults = mapResults.join("\n\n---\n\n")
	const reducePrompt = `${reduceInstruction}\n\n---\nResults from ${chunkResult.totalChunks} chunks:\n\n${combinedResults}`

	const reduceResponse = await llmService.callModel({
		prompt: reducePrompt,
		jsonResponse: true,
		_skipAutoStrategies: true, // Prevent recursive auto-fallback/map-reduce
		options: {
			maxTokens: maxOutputTokens, // Use controlled output size for reduce phase
		},
	})

	logger.info("Map-reduce completed", {
		totalChunks: chunkResult.totalChunks,
		mapTokens: totalMapTokens,
		mapLatency: totalMapLatency,
		reduceTokens: reduceResponse.usage.totalTokens,
		reduceLatency: reduceResponse.latencyMs,
		totalTokens: totalMapTokens + reduceResponse.usage.totalTokens,
		totalLatency: totalMapLatency + reduceResponse.latencyMs,
	})

	// Return final response with aggregated stats
	return {
		...reduceResponse,
		usage: {
			promptTokens: totalMapTokens + reduceResponse.usage.promptTokens,
			completionTokens: reduceResponse.usage.completionTokens,
			totalTokens: totalMapTokens + reduceResponse.usage.totalTokens,
		},
		latencyMs: totalMapLatency + reduceResponse.latencyMs,
		metadata: {
			...reduceResponse.metadata,
			mapReduce: true,
			totalChunks: chunkResult.totalChunks,
			mapTokens: totalMapTokens,
			reduceTokens: reduceResponse.usage.totalTokens,
		},
	}
}

// ============================================================================
// ITERATIVE REFINEMENT
// ============================================================================

/**
 * Process a large text iteratively:
 * 1. Process first chunk
 * 2. Use result to guide processing of next chunk
 * 3. Refine result progressively
 *
 * Best for tasks requiring context from previous chunks (e.g., summarization)
 */
export async function iterativeRefinement(llmService: LLMService, text: string, initialInstruction: string, refinementInstruction: string, chunkingOptions: Partial<ChunkingOptions> = {}): Promise<LLMResponse> {
	// Chunk the text with defaults from env vars
	const fullChunkingOptions: ChunkingOptions = {
		...DEFAULT_CHUNKING_OPTIONS,
		...chunkingOptions,
	}
	const strategy = fullChunkingOptions.strategy || "paragraph"
	let chunkResult: ChunkResult

	switch (strategy) {
		case "sentence":
			chunkResult = chunkBySentence(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		case "paragraph":
			chunkResult = chunkByParagraph(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		case "fixed":
			chunkResult = chunkByFixedSize(text, fullChunkingOptions.maxTokensPerChunk, fullChunkingOptions.overlapTokens)
			break
		default:
			throw new Error(`Unknown chunking strategy: ${strategy}`)
	}

	logger.info("Starting iterative refinement", {
		totalChunks: chunkResult.totalChunks,
		strategy,
	})

	// Process first chunk
	let currentResult = ""
	let totalTokens = 0
	let totalLatency = 0

	for (let i = 0; i < chunkResult.chunks.length; i++) {
		const chunk = chunkResult.chunks[i]
		const isFirst = i === 0

		const prompt = isFirst ? `${initialInstruction}\n\n---\n${chunk}` : `${refinementInstruction}\n\nCurrent result:\n${currentResult}\n\n---\nNew chunk to process:\n${chunk}`

		try {
			const response = await llmService.callModel({
				prompt,
				jsonResponse: false,
			})

			currentResult = response.text
			totalTokens += response.usage.totalTokens
			totalLatency += response.latencyMs

			logger.info(`Refined with chunk ${i + 1}/${chunkResult.totalChunks}`, {
				tokens: response.usage.totalTokens,
				latency: response.latencyMs,
			})
		} catch (error: any) {
			logger.error(`Failed to refine with chunk ${i + 1}`, { error: error.message })
			// Continue with current result
		}
	}

	logger.info("Iterative refinement completed", {
		totalChunks: chunkResult.totalChunks,
		totalTokens,
		totalLatency,
	})

	// Return final refined result
	return {
		text: currentResult,
		usage: {
			promptTokens: totalTokens,
			completionTokens: 0, // Included in totalTokens
			totalTokens,
		},
		latencyMs: totalLatency,
		provider: llmService["config"].provider,
		modelVersion: "iterative-refinement",
		requestId: `iterative_${Date.now()}`,
		metadata: {
			iterativeRefinement: true,
			totalChunks: chunkResult.totalChunks,
		},
	}
}
