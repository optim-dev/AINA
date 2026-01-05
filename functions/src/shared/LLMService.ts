/**
 * LLMService - Unified wrapper for all LLM interactions with observability
 *
 * This service provides:
 * - Unified interface for multiple LLM providers (Gemini, Salamandra, etc.)
 * - Token counting and usage tracking
 * - Latency monitoring
 * - Error handling and logging
 * - Request/response logging for observability
 * - Cost estimation
 */

import * as logger from "firebase-functions/logger"
import type { PredictionServiceClient, EndpointServiceClient } from "@google-cloud/aiplatform"
import { AutoTokenizer, type PreTrainedTokenizer } from "@xenova/transformers"

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Context window strategy configuration from environment variables
 */
export const CONTEXT_WINDOW_CONFIG = {
	/** Enable auto-fallback to larger context models (default: true) */
	autoFallback: process.env.CONTEXT_WINDOW_AUTO_FALLBACK === "true" || process.env.CONTEXT_WINDOW_AUTO_FALLBACK === undefined,

	/** Enable auto map-reduce when context exceeded and no fallback available (default: false) */
	autoMapReduce: process.env.CONTEXT_WINDOW_AUTO_MAP_REDUCE === "true",

	/** Default chunk size for map-reduce (default: 12000 tokens) */
	defaultChunkSize: parseInt(process.env.CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE || "12000", 10),

	/** Default chunking strategy: "sentence" | "paragraph" | "fixed" (default: "paragraph") */
	defaultChunkStrategy: (process.env.CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY || "paragraph") as "sentence" | "paragraph" | "fixed",

	/** Default overlap tokens for chunking (default: 500) */
	defaultOverlapTokens: parseInt(process.env.CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS || "500", 10),
} as const

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export enum LLMProvider {
	GEMINI = "gemini",
	SALAMANDRA = "salamandra",
	GEMINI_FLASH = "gemini-2.5-flash",
	GEMINI_PRO = "gemini-2.5-pro",
	SALAMANDRA_7B_INSTRUCT = "salamandra-7b-instruct",
	SALAMANDRA_7B_LOCAL = "salamandra-7b-local",
	ALIA_40B_INSTRUCT = "alia-40b-instruct",
}

/**
 * Context window limits for each provider (in tokens)
 * Includes both input and output tokens
 */
export const CONTEXT_WINDOW_LIMITS: Record<LLMProvider, number> = {
	[LLMProvider.GEMINI]: 1_048_576, // 1M tokens
	[LLMProvider.GEMINI_FLASH]: 1_048_576, // 1M tokens
	[LLMProvider.GEMINI_PRO]: 1_048_576, // 1M tokens
	[LLMProvider.SALAMANDRA]: 8_192, // 8k tokens
	[LLMProvider.SALAMANDRA_7B_INSTRUCT]: 8_192, // 8k tokens
	[LLMProvider.SALAMANDRA_7B_LOCAL]: 4_096, // 4k tokens
	[LLMProvider.ALIA_40B_INSTRUCT]: 16_384, // 16k tokens (can be 32k with different endpoint)
}

export interface LLMConfig {
	provider: LLMProvider
	projectId: string
	region: string
	endpointDisplayName?: string // For custom Vertex AI endpoints (Salamandra)
	modelId?: string // For Gemini models
	ollamaEndpoint?: string // For local Ollama models
	ollamaModel?: string // Ollama model name (e.g., "cas/salamandra-7b-instruct")
	maxRetries?: number
	timeoutMs?: number
	contextSize?: "8k" | "16k" | "32k" // For ALIA models with different context windows
	autoFallback?: boolean // Automatically fallback to larger context models when needed (default: true)
}

export interface LLMRequestOptions {
	maxTokens?: number
	temperature?: number
	topP?: number
	topK?: number
	stopSequences?: string[]
}

/** Available AINA modules that can make LLM calls */
export type AinaModule = "valoracio" | "elaboracio" | "kit"

export interface LLMRequest {
	prompt: string
	systemPrompt?: string
	options?: LLMRequestOptions
	userId?: string
	sessionId?: string
	context?: Record<string, any>
	/** When true, forces JSON output with low temperature (0.1) and high top_p (0.95) */
	jsonResponse?: boolean
	/** The AINA module making the request (valoracio, elaboracio, kit) */
	module?: AinaModule
	/** Internal flag to prevent recursive auto-fallback/map-reduce. DO NOT SET MANUALLY. */
	_skipAutoStrategies?: boolean
}

export interface TokenUsage {
	promptTokens: number
	completionTokens: number
	totalTokens: number
}

export interface LLMResponse {
	text: string
	usage: TokenUsage
	latencyMs: number
	provider: LLMProvider
	modelVersion: string
	requestId: string
	metadata?: Record<string, any>
	/** Parsed JSON response when jsonResponse was requested */
	json?: any
}

export interface LLMInteractionLog {
	requestId: string
	timestamp: Date
	provider: LLMProvider
	modelVersion: string
	userId?: string
	sessionId?: string
	module?: AinaModule
	prompt: string
	systemPrompt?: string
	response: string
	usage: TokenUsage
	latencyMs: number
	error?: string
	errorStack?: string
	options: LLMRequestOptions
	context?: Record<string, any>
	costEstimate?: CostEstimate
	fallbackUsed?: boolean // True if fallback to another model was used
	fallbackReason?: string // Reason for fallback (e.g., "context_window_exceeded")
}

export class ContextWindowExceededError extends Error {
	constructor(public promptTokens: number, public maxTokens: number, public provider: LLMProvider, message?: string) {
		super(message || `Prompt exceeds context window: ${promptTokens} tokens > ${maxTokens} tokens for ${provider}`)
		this.name = "ContextWindowExceededError"
	}
}

export interface CostEstimate {
	inputCost: number
	outputCost: number
	totalCost: number
	currency: string
}

export interface ProviderStats {
	totalRequests: number
	successfulRequests: number
	failedRequests: number
	totalTokensUsed: number
	totalLatencyMs: number
	averageLatencyMs: number
	estimatedCost: number
}

// ============================================================================
// TOKEN COUNTING UTILITIES
// ============================================================================

/**
 * Simple token estimator based on character count
 * For production, consider using tiktoken or similar libraries
 */
export function estimateTokens(text: string): number {
	if (!text) return 0
	// Rough estimation: ~4 characters per token for most languages
	// For Catalan/Spanish, this might be slightly higher
	return Math.ceil(text.length / 4)
}

/**
 * More accurate token estimation for different languages
 */
export function estimateTokensAdvanced(text: string, language: "en" | "ca" | "es" = "ca"): number {
	if (!text) return 0

	// Language-specific adjustments
	const charsPerToken: Record<string, number> = {
		en: 4.0,
		ca: 4.5, // Catalan tends to have slightly longer words
		es: 4.3, // Spanish similar to Catalan
	}

	const ratio = charsPerToken[language] || 4.0
	return Math.ceil(text.length / ratio)
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Pricing per 1,000,000 tokens (in USD) - December 2024
 * Note: Google's Gemini API returns token counts in usageMetadata but NOT cost.
 * Cost must be calculated based on published pricing.
 * See: https://ai.google.dev/pricing
 *
 * Gemini 2.5 Flash: $0.15/1M input, $0.60/1M output (under 200k context)
 * Gemini 2.5 Pro: $1.25/1M input, $10.00/1M output (under 200k context)
 */
const PRICING_PER_MILLION: Record<LLMProvider, { input: number; output: number }> = {
	[LLMProvider.GEMINI]: { input: 0.15, output: 0.6 },
	[LLMProvider.GEMINI_FLASH]: { input: 0.15, output: 0.6 }, // Gemini 2.5 Flash
	[LLMProvider.GEMINI_PRO]: { input: 1.25, output: 10.0 }, // Gemini 2.5 Pro
	[LLMProvider.SALAMANDRA]: { input: 0.0, output: 0.0 }, // Self-hosted, compute costs only
	[LLMProvider.SALAMANDRA_7B_INSTRUCT]: { input: 0.0, output: 0.0 },
	[LLMProvider.SALAMANDRA_7B_LOCAL]: { input: 0.0, output: 0.0 }, // Local Ollama, no cloud costs
	[LLMProvider.ALIA_40B_INSTRUCT]: { input: 0.0, output: 0.0 }, // Self-hosted on Vertex AI, compute costs only
}

function calculateCost(usage: TokenUsage, provider: LLMProvider): CostEstimate {
	const pricing = PRICING_PER_MILLION[provider] || { input: 0, output: 0 }
	const inputCost = (usage.promptTokens / 1_000_000) * pricing.input
	const outputCost = (usage.completionTokens / 1_000_000) * pricing.output

	return {
		inputCost,
		outputCost,
		totalCost: inputCost + outputCost,
		currency: "USD",
	}
}

/**
 * Helper: Extract JSON from text that may contain Markdown code blocks or ChatML artifacts
 * Handles common malformed JSON from local models (extra braces, trailing commas, etc.)
 */
function extractJSON(text: string): any {
	// Clean "Prompt: ... Output:" pattern
	if (text.includes("Output:\n")) {
		text = text.split("Output:\n").pop()?.trim() || text
	}

	// Clean echoed prompt artifacts if they look like ChatML tags
	text = text.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, "").trim()
	// Also remove standalone <|im_start|>assistant if present
	text = text.replace(/<\|im_start\|>assistant/g, "").trim()

	try {
		// 1. Try direct parsing in case the model is very obedient
		return JSON.parse(text)
	} catch (e) {
		// 2. If it fails, look for markdown code blocks or JSON braces {}
		const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
		if (jsonMatch) {
			let jsonStr = jsonMatch[0]

			// Clean common malformed JSON issues from local models
			jsonStr = cleanMalformedJSON(jsonStr)

			try {
				logger.info("JSON found in text:", jsonStr)
				return JSON.parse(jsonStr)
			} catch (innerE) {
				logger.warn("JSON found but invalid", innerE)
			}
		}
		// 3. Fallback: return plain text wrapped in JSON so API always returns JSON
		return { response: text }
	}
}

/**
 * Clean common JSON malformations from local models like Salamandra
 */
function cleanMalformedJSON(jsonStr: string): string {
	// Fix extra closing braces/brackets at the end (e.g., "{}}" -> "{}")
	let cleaned = jsonStr

	// Count braces and brackets
	let openBraces = 0
	let openBrackets = 0
	let lastValidIndex = cleaned.length

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i]
		if (char === "{") openBraces++
		if (char === "}") openBraces--
		if (char === "[") openBrackets++
		if (char === "]") openBrackets--

		// If we hit negative (more closes than opens), truncate here
		if (openBraces < 0 || openBrackets < 0) {
			lastValidIndex = i
			break
		}
	}

	if (lastValidIndex < cleaned.length) {
		cleaned = cleaned.substring(0, lastValidIndex)
		// Re-balance if needed
		while (openBraces > 0) {
			cleaned += "}"
			openBraces--
		}
		while (openBrackets > 0) {
			cleaned += "]"
			openBrackets--
		}
		logger.info("Fixed malformed JSON - removed extra braces/brackets")
	}

	// Remove trailing commas before closing braces/brackets (invalid JSON)
	cleaned = cleaned.replace(/,\s*([\]}])/g, "$1")

	// Fix common issues: trailing text after valid JSON
	// Try to find the first valid JSON object/array
	try {
		JSON.parse(cleaned)
		return cleaned
	} catch {
		// Try progressive truncation from the end
		for (let i = cleaned.length; i > 0; i--) {
			const char = cleaned[i - 1]
			if (char === "}" || char === "]") {
				const candidate = cleaned.substring(0, i)
				try {
					JSON.parse(candidate)
					logger.info("Fixed malformed JSON - truncated trailing content")
					return candidate
				} catch {
					// Continue trying
				}
			}
		}
	}

	return cleaned
}

// ============================================================================
// LLMSERVICE CLASS
// ============================================================================

export class LLMService {
	private config: LLMConfig
	private stats: Map<LLMProvider, ProviderStats> = new Map()
	private interactionLogs: LLMInteractionLog[] = []
	private logCallback?: (log: LLMInteractionLog) => Promise<void>

	// Vertex AI clients (lazy initialization)
	private predictionClient: PredictionServiceClient | null = null
	private endpointClient: EndpointServiceClient | null = null
	private endpointCache: Map<string, string> = new Map()

	// Tokenizer for accurate token counting (Salamandra)
	private static salamandraTokenizer: PreTrainedTokenizer | null = null
	private static tokenizerLoading: Promise<PreTrainedTokenizer> | null = null

	constructor(config: LLMConfig) {
		this.config = {
			maxRetries: 3,
			timeoutMs: 30000,
			...config,
		}

		// Initialize stats for the provider
		this.initializeStats(config.provider)
	}

	private initializeStats(provider: LLMProvider): void {
		if (!this.stats.has(provider)) {
			this.stats.set(provider, {
				totalRequests: 0,
				successfulRequests: 0,
				failedRequests: 0,
				totalTokensUsed: 0,
				totalLatencyMs: 0,
				averageLatencyMs: 0,
				estimatedCost: 0,
			})
		}
	}

	/**
	 * Set a callback function for logging interactions (e.g., to BigQuery, Firestore)
	 */
	setLogCallback(callback: (log: LLMInteractionLog) => Promise<void>): void {
		this.logCallback = callback
	}

	/**
	 * Get the current provider
	 */
	getProvider(): LLMProvider {
		return this.config.provider
	}

	/**
	 * Get lazy-initialized Prediction client
	 */
	private getPredictionClient(): PredictionServiceClient {
		if (!this.predictionClient) {
			const { PredictionServiceClient } = require("@google-cloud/aiplatform")
			const apiEndpoint = `${this.config.region}-aiplatform.googleapis.com`
			this.predictionClient = new PredictionServiceClient({ apiEndpoint })
		}
		return this.predictionClient!
	}

	/**
	 * Get lazy-initialized Endpoint client
	 */
	private getEndpointClient(): EndpointServiceClient {
		if (!this.endpointClient) {
			const { EndpointServiceClient } = require("@google-cloud/aiplatform")
			const apiEndpoint = `${this.config.region}-aiplatform.googleapis.com`
			this.endpointClient = new EndpointServiceClient({ apiEndpoint })
		}
		return this.endpointClient!
	}

	/**
	 * Get or load the Salamandra tokenizer (Llama2-compatible)
	 * Uses static caching to avoid reloading on each request
	 */
	private async getSalamandraTokenizer(): Promise<PreTrainedTokenizer> {
		// Return cached tokenizer if available
		if (LLMService.salamandraTokenizer) {
			return LLMService.salamandraTokenizer
		}

		// If already loading, wait for it
		if (LLMService.tokenizerLoading) {
			return LLMService.tokenizerLoading
		}

		// Start loading and cache the promise to prevent duplicate loads
		LLMService.tokenizerLoading = (async () => {
			logger.info("Loading Salamandra tokenizer (Llama2-compatible)...")
			try {
				// Salamandra uses Llama2 tokenizer architecture
				const tokenizer = await AutoTokenizer.from_pretrained("Xenova/llama2-tokenizer")
				LLMService.salamandraTokenizer = tokenizer
				logger.info("Salamandra tokenizer loaded successfully")
				return tokenizer
			} catch (error: any) {
				logger.error("Failed to load Salamandra tokenizer", { error: error.message })
				LLMService.tokenizerLoading = null
				throw error
			}
		})()

		return LLMService.tokenizerLoading
	}

	/**
	 * Count tokens using the Salamandra tokenizer
	 * Falls back to estimation if tokenizer fails
	 */
	private async countSalamandraTokens(text: string): Promise<number> {
		if (!text) return 0

		try {
			const tokenizer = await this.getSalamandraTokenizer()
			const encoded = tokenizer.encode(text)
			return encoded.length
		} catch (error: any) {
			logger.warn("Falling back to token estimation", { error: error.message })
			// Fallback to estimation if tokenizer fails
			return estimateTokensAdvanced(text, "ca")
		}
	}

	/**
	 * Generate a unique request ID
	 */
	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
	}

	/**
	 * Validate if prompt fits within model's context window
	 * Returns the estimated tokens and whether it fits
	 */
	private async validateContextWindow(request: LLMRequest, options: LLMRequestOptions): Promise<{ estimatedPromptTokens: number; fits: boolean; availableInputTokens: number }> {
		// Build the full prompt including system prompt
		let fullPrompt = request.prompt
		if (request.systemPrompt) {
			fullPrompt = `${request.systemPrompt}\n\n${request.prompt}`
		}

		// Get accurate token count for AINA models
		let estimatedPromptTokens: number
		if (
			this.config.provider === LLMProvider.SALAMANDRA ||
			this.config.provider === LLMProvider.SALAMANDRA_7B_INSTRUCT ||
			this.config.provider === LLMProvider.SALAMANDRA_7B_LOCAL ||
			this.config.provider === LLMProvider.ALIA_40B_INSTRUCT
		) {
			estimatedPromptTokens = await this.countSalamandraTokens(fullPrompt)
		} else {
			estimatedPromptTokens = estimateTokensAdvanced(fullPrompt, "ca")
		}

		// Get context window limit based on config
		let contextLimit = CONTEXT_WINDOW_LIMITS[this.config.provider]

		// For ALIA, adjust based on endpoint context size
		if (this.config.provider === LLMProvider.ALIA_40B_INSTRUCT && this.config.contextSize) {
			switch (this.config.contextSize) {
				case "8k":
					contextLimit = 8_192
					break
				case "16k":
					contextLimit = 16_384
					break
				case "32k":
					contextLimit = 32_768
					break
			}
		}

		// Reserve tokens for output
		const maxOutputTokens = options.maxTokens || 4096
		const availableInputTokens = contextLimit - maxOutputTokens

		logger.info("Context window validation", {
			provider: this.config.provider,
			contextLimit,
			estimatedPromptTokens,
			maxOutputTokens,
			availableInputTokens,
			fits: estimatedPromptTokens <= availableInputTokens,
		})

		return {
			estimatedPromptTokens,
			fits: estimatedPromptTokens <= availableInputTokens,
			availableInputTokens,
		}
	}

	/**
	 * Get fallback provider when context window is exceeded
	 */
	private getFallbackProvider(): LLMProvider | null {
		switch (this.config.provider) {
			case LLMProvider.ALIA_40B_INSTRUCT:
				// Fallback to Gemini Flash which has 1M tokens
				return LLMProvider.GEMINI_FLASH
			case LLMProvider.SALAMANDRA:
			case LLMProvider.SALAMANDRA_7B_INSTRUCT:
			case LLMProvider.SALAMANDRA_7B_LOCAL:
				// Fallback to ALIA 32k or Gemini
				return LLMProvider.ALIA_40B_INSTRUCT
			default:
				return null // Gemini already has largest context
		}
	}

	/**
	 * Create a fallback service with larger context window
	 */
	private createFallbackService(fallbackProvider: LLMProvider): LLMService {
		const fallbackConfig: LLMConfig = {
			...this.config,
			provider: fallbackProvider,
		}

		// Specific configuration for fallback providers
		if (fallbackProvider === LLMProvider.GEMINI_FLASH) {
			fallbackConfig.modelId = "gemini-2.5-flash"
			delete fallbackConfig.endpointDisplayName
		} else if (fallbackProvider === LLMProvider.ALIA_40B_INSTRUCT) {
			// Try 32k endpoint first, fall back to 16k if not available
			fallbackConfig.contextSize = "32k"
			fallbackConfig.endpointDisplayName = "alia-40b-endpoint-32k"
		}

		const fallbackService = new LLMService(fallbackConfig)

		// Copy the log callback to maintain observability
		if (this.logCallback) {
			fallbackService.setLogCallback(this.logCallback)
		}

		return fallbackService
	}

	/**
	 * Main method to call the LLM model
	 * This is your "Embudo" (funnel) for all LLM interactions
	 */
	async callModel(request: LLMRequest): Promise<LLMResponse> {
		const requestId = this.generateRequestId()
		const startTime = Date.now()
		let responseText = ""
		let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
		let predictLatencyMs = 0
		let error: Error | null = null
		let fallbackUsed = false
		let fallbackReason: string | undefined

		// Apply JSON-specific settings if jsonResponse is requested
		const jsonOverrides = request.jsonResponse
			? {
					temperature: 0.1, // Temperatura molt baixa per ser determinista amb el JSON
					topP: 0.95,
			  }
			: {}

		const options: LLMRequestOptions = {
			maxTokens: 4096,
			temperature: 0.7,
			topP: 0.95,
			...request.options,
			...jsonOverrides, // JSON overrides take precedence
		}

		// STEP 1: Validate context window BEFORE making the API call
		const validation = await this.validateContextWindow(request, options)

		// Check if we should skip auto-strategies (prevents infinite recursion from map-reduce)
		const skipAutoStrategies = request._skipAutoStrategies === true

		if (!validation.fits) {
			// Only use auto-fallback if not explicitly disabled AND not skipping auto strategies
			const autoFallback = this.config.autoFallback !== false && !skipAutoStrategies

			logger.warn("⚠️  Context window exceeded", {
				requestId,
				provider: this.config.provider,
				estimatedPromptTokens: validation.estimatedPromptTokens,
				availableInputTokens: validation.availableInputTokens,
				autoFallback,
				skipAutoStrategies,
			})

			if (autoFallback) {
				const fallbackProvider = this.getFallbackProvider()

				if (fallbackProvider) {
					logger.info("🔄 Attempting fallback to larger context model", {
						from: this.config.provider,
						to: fallbackProvider,
					})

					// Create fallback service with larger context
					const fallbackService = this.createFallbackService(fallbackProvider)

					try {
						const fallbackResponse = await fallbackService.callModel(request)
						fallbackUsed = true
						fallbackReason = `context_window_exceeded: ${validation.estimatedPromptTokens} > ${validation.availableInputTokens}`

						logger.info("✅ Fallback successful", {
							requestId,
							fallbackProvider,
						})

						// Add fallback metadata to response
						return {
							...fallbackResponse,
							metadata: {
								...fallbackResponse.metadata,
								fallbackUsed: true,
								fallbackReason,
								originalProvider: this.config.provider,
							},
						}
					} catch (fallbackError: any) {
						logger.error("❌ Fallback failed", {
							requestId,
							fallbackProvider,
							error: fallbackError.message,
						})
						// Continue to check auto map-reduce below
					}
				}
			}

			// STEP 2: Try auto map-reduce if enabled and fallback failed/unavailable
			// Skip if we're already inside a map-reduce operation (prevents infinite recursion)
			if (CONTEXT_WINDOW_CONFIG.autoMapReduce && !skipAutoStrategies) {
				logger.info("🔄 Attempting auto map-reduce", {
					requestId,
					provider: this.config.provider,
					estimatedPromptTokens: validation.estimatedPromptTokens,
				})

				try {
					// Import dynamically to avoid circular dependency
					const { mapReduce } = await import("./PromptChunking.js")

					// Extract the user's original question/task from the prompt
					// The prompt may contain context + question, try to preserve both
					const userPrompt = request.prompt
					const systemContext = request.systemPrompt || ""

					// Build context-aware map-reduce instructions
					// MAP: Process each chunk while keeping the user's goal in mind
					const mapInstruction = systemContext
						? `${systemContext}

TASCA ORIGINAL DE L'USUARI:
${userPrompt.slice(0, 500)}${userPrompt.length > 500 ? "..." : ""}

Analitza aquesta secció del document i extreu la informació rellevant per respondre a la tasca de l'usuari:`
						: `TASCA ORIGINAL DE L'USUARI:
${userPrompt.slice(0, 500)}${userPrompt.length > 500 ? "..." : ""}

Analitza aquesta secció del document i extreu la informació rellevant per respondre a la tasca de l'usuari:`

					// REDUCE: Synthesize all partial results into a coherent final answer
					const reduceInstruction = `TASCA ORIGINAL DE L'USUARI:
${userPrompt.slice(0, 300)}${userPrompt.length > 300 ? "..." : ""}

A continuació tens els resultats parcials de l'anàlisi de diferents seccions del document.
Sintetitza tota la informació en una resposta final coherent i completa que respongui directament a la tasca de l'usuari.
No repeteixis informació. Prioritza els punts més rellevants.`

					// Pass maxOutputTokens from request (default to 512 for map-reduce)
					const maxOutputTokens = request.options?.maxTokens || 512

					// For map-reduce, we need a model that can actually process chunks
					// If the current provider failed (e.g., ALIA 404, Gemini 403), use Salamandra Local
					// which is always available during local development
					let mapReduceService: LLMService = this

					// Check if we should use a different (working) model for map-reduce
					// This is especially important when fallback models aren't available locally
					if (
						this.config.provider === LLMProvider.ALIA_40B_INSTRUCT ||
						this.config.provider === LLMProvider.GEMINI ||
						this.config.provider === LLMProvider.GEMINI_FLASH ||
						this.config.provider === LLMProvider.GEMINI_PRO
					) {
						// Try to use Salamandra Local which works with Ollama
						const salamandraConfig: LLMConfig = {
							provider: LLMProvider.SALAMANDRA_7B_LOCAL,
							projectId: this.config.projectId,
							region: this.config.region,
							ollamaEndpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
							ollamaModel: process.env.OLLAMA_MODEL || "cas/salamandra-7b-instruct",
							autoFallback: false, // Don't fallback from map-reduce chunks
						}
						mapReduceService = new LLMService(salamandraConfig)
						if (this.logCallback) {
							mapReduceService.setLogCallback(this.logCallback)
						}
						logger.info("Map-reduce using Salamandra Local (fallback provider not available)", {
							originalProvider: this.config.provider,
							mapReduceProvider: LLMProvider.SALAMANDRA_7B_LOCAL,
						})
					}

					console.log(">>>>>>>>>>>>>>>>>>>>")
					console.log("AUTO MAP-REDUCE ENABLED")
					console.log("MAX OUTPUT TOKENS FOR MAP-REDUCE:", maxOutputTokens)
					console.log("MAP-REDUCE PROVIDER:", mapReduceService.getProvider())
					console.log("<<<<<<<<<<<<<<<<<<<<")
					const mapReduceResponse = await mapReduce(
						mapReduceService,
						request.prompt,
						{
							mapInstruction,
							reduceInstruction,
							includeMetadata: true,
						},
						{}, // Use env var defaults for chunking options
						maxOutputTokens
					)

					logger.info("✅ Auto map-reduce successful", {
						requestId,
						totalChunks: mapReduceResponse.metadata?.totalChunks,
					})

					// Add map-reduce metadata to response
					return {
						...mapReduceResponse,
						metadata: {
							...mapReduceResponse.metadata,
							autoMapReduceUsed: true,
							originalProvider: this.config.provider,
							fallbackAttempted: autoFallback,
						},
					}
				} catch (mapReduceError: any) {
					logger.error("❌ Auto map-reduce failed", {
						requestId,
						error: mapReduceError.message,
					})
					// Continue to throw original context error below
				}
			}

			// If no fallback/map-reduce or both failed, throw context error
			throw new ContextWindowExceededError(validation.estimatedPromptTokens, validation.availableInputTokens, this.config.provider)
		}

		// Update stats
		const stats = this.stats.get(this.config.provider)!
		stats.totalRequests++

		try {
			logger.info("LLM Request initiated", {
				requestId,
				provider: this.config.provider,
				userId: request.userId,
				promptLength: request.prompt.length,
			})

			// Route to appropriate provider
			switch (this.config.provider) {
				case LLMProvider.GEMINI:
				case LLMProvider.GEMINI_FLASH:
				case LLMProvider.GEMINI_PRO:
					console.log("Calling Gemini")
					const geminiResult = await this.callGemini(request, options)
					responseText = geminiResult.text
					usage = geminiResult.usage
					predictLatencyMs = geminiResult.latencyMs
					break

				case LLMProvider.SALAMANDRA:
				case LLMProvider.SALAMANDRA_7B_INSTRUCT:
					console.log("Calling SALAMANDRA")
					const salamandraResult = await this.callSalamandra(request, options)
					responseText = salamandraResult.text
					usage = salamandraResult.usage
					predictLatencyMs = salamandraResult.latencyMs
					break

				case LLMProvider.SALAMANDRA_7B_LOCAL:
					console.log("Calling SALAMANDRA LOCAL (Ollama)")
					// console.log("prompt:", request.prompt)
					const salamandraLocalResult = await this.callSalamandraLocal(request, options)
					responseText = salamandraLocalResult.text
					// console.log("SALAMANDRA LOCAL RESPONSE TEXT:", responseText)
					usage = salamandraLocalResult.usage
					predictLatencyMs = salamandraLocalResult.latencyMs
					break

				case LLMProvider.ALIA_40B_INSTRUCT:
					console.log("Calling ALIA-40B")
					// console.log("prompt:", request.prompt)
					const aliaResult = await this.callAlia(request, options)
					responseText = aliaResult.text
					// console.log("ALIA RESPONSE TEXT:", responseText)
					usage = aliaResult.usage
					predictLatencyMs = aliaResult.latencyMs
					break

				default:
					throw new Error(`Unsupported LLM provider: ${this.config.provider}`)
			}

			// Update success stats
			stats.successfulRequests++
			stats.totalTokensUsed += usage.totalTokens

			// Use the actual LLM predict latency, not the full method execution time
			stats.totalLatencyMs += predictLatencyMs
			stats.averageLatencyMs = stats.totalLatencyMs / stats.successfulRequests

			const costEstimate = calculateCost(usage, this.config.provider)
			stats.estimatedCost += costEstimate.totalCost

			// Parse JSON if jsonResponse was requested
			let jsonResult: any = undefined
			if (request.jsonResponse) {
				jsonResult = extractJSON(responseText)
				// logger.info("Parsed JSON response", { requestId, json: jsonResult })
			}

			const response: LLMResponse = {
				text: responseText,
				usage,
				latencyMs: predictLatencyMs,
				provider: this.config.provider,
				modelVersion: this.getModelVersion(),
				requestId,
				...(jsonResult !== undefined && { json: jsonResult }),
			}

			console.log(">>>>>>>>>>>>>>>>>")

			return response
		} catch (err: any) {
			error = err
			stats.failedRequests++

			logger.error("LLM Request failed", {
				requestId,
				provider: this.config.provider,
				error: err.message,
				stack: err.stack,
			})

			throw err
		} finally {
			// OBSERVABILITY: Always log the interaction (success or failure)
			// Use predictLatencyMs for the actual LLM call latency, fall back to total time if not set (error cases)
			const finalLatencyMs = predictLatencyMs > 0 ? predictLatencyMs : Date.now() - startTime

			const interactionLog: LLMInteractionLog = {
				requestId,
				timestamp: new Date(),
				provider: this.config.provider,
				modelVersion: this.getModelVersion(),
				userId: request.userId,
				sessionId: request.sessionId,
				module: request.module,
				prompt: request.prompt,
				systemPrompt: request.systemPrompt,
				response: responseText,
				usage,
				latencyMs: finalLatencyMs,
				error: error?.message,
				errorStack: error?.stack,
				options,
				context: request.context,
				costEstimate: calculateCost(usage, this.config.provider),
				fallbackUsed,
				fallbackReason,
			}

			// Store locally
			this.interactionLogs.push(interactionLog)

			// Keep only last 1000 logs in memory
			if (this.interactionLogs.length > 1000) {
				this.interactionLogs.shift()
			}

			// Fire-and-forget external logging
			if (this.logCallback) {
				this.logCallback(interactionLog).catch((logError) => {
					logger.error("Failed to log LLM interaction", { error: logError.message })
				})
			}

			logger.info("LLM Request completed", {
				requestId,
				latencyMs: finalLatencyMs,
				success: !error,
				tokensUsed: usage.totalTokens,
			})
		}
	}

	/**
	 * Call Google Gemini models via Vertex AI
	 * Uses the @google/genai SDK in Vertex AI mode (not AI Studio)
	 */
	private async callGemini(request: LLMRequest, options: LLMRequestOptions): Promise<{ text: string; usage: TokenUsage; latencyMs: number }> {
		const { GoogleGenAI } = require("@google/genai")

		// IMPORTANT: Use vertexai: true to use Vertex AI endpoint instead of AI Studio
		// AI Studio uses generativelanguage.googleapis.com and requires API key or specific OAuth scopes
		// Vertex AI uses aiplatform.googleapis.com and works with Application Default Credentials
		const genai = new GoogleGenAI({
			vertexai: true,
			project: this.config.projectId,
			location: this.config.region,
		})

		const modelId = this.config.modelId || "gemini-2.5-flash"

		// Build the prompt with system instructions
		let fullPrompt = request.prompt
		let systemInstruction: string | undefined = request.systemPrompt

		if (request.jsonResponse) {
			// JSON mode: Force JSON output with system instructions
			const jsonSystemPrompt = request.systemPrompt
				? `${request.systemPrompt}\n\nRespon estrictament en format JSON sense text addicional.`
				: `Ets un assistent útil. Respon ÚNICAMENT amb JSON vàlid. No incloguis cap text fora del JSON.
- Si et demanen una LLISTA d'elements, respon amb un array JSON directament: ["element1", "element2", "element3"]
- Si et demanen informació general, respon amb un objecte: {"response": "la teva resposta"}`

			systemInstruction = jsonSystemPrompt
		}

		// Combine system instruction with prompt if present
		if (systemInstruction) {
			fullPrompt = `${systemInstruction}\n\n${request.prompt}`
		}

		// console.log("Gemini full prompt:", fullPrompt)
		const configX = {
			maxOutputTokens: options.maxTokens,
			temperature: options.temperature,
			topP: options.topP,
			topK: options.topK,
			stopSequences: options.stopSequences,
			// Disable thinking tokens to get direct responses
			thinkingConfig: { thinkingBudget: 0 },
			// Use Gemini's native JSON mode when jsonResponse is requested
			...(request.jsonResponse && { responseMimeType: "application/json" }),
		}
		// console.log("Gemini options:", configX)

		// Measure latency around just the LLM predict call
		const predictStart = Date.now()
		const response = await genai.models.generateContent({
			model: modelId,
			contents: fullPrompt,
			config: configX,
		})
		const latencyMs = Date.now() - predictStart

		const text = response.text || ""
		// console.log("Gemini raw response text:", text)

		// Log full response for debugging
		// console.log("Gemini response candidates:", JSON.stringify(response.candidates, null, 2))

		// Check finish reason - if STOP, response completed normally
		// If MAX_TOKENS, it was cut off
		const finishReason = response.candidates?.[0]?.finishReason
		if (finishReason) {
			console.log("Gemini finish reason:", finishReason)
			if (finishReason === "MAX_TOKENS") {
				console.warn("⚠️ Response was truncated due to maxOutputTokens limit")
			}
		}

		// Extract actual token usage from response metadata
		// Note: Gemini 2.5 models use "thinking" tokens that are counted in totalTokenCount
		// but not in candidatesTokenCount. This is expected behavior.
		const usageMetadata = response.usageMetadata || {}
		const promptTokens = usageMetadata.promptTokenCount || 0
		const completionTokens = usageMetadata.candidatesTokenCount || 0
		// For thinking models, totalTokenCount includes thinking tokens
		const thinkingTokens = usageMetadata.thoughtsTokenCount || 0
		const totalTokens = usageMetadata.totalTokenCount || promptTokens + completionTokens + thinkingTokens

		console.log("Gemini token usage:", {
			promptTokens,
			completionTokens,
			thinkingTokens,
			totalTokens,
			note: thinkingTokens > 0 ? "Includes thinking tokens (Gemini 2.5)" : "No thinking tokens",
		})

		return {
			text,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens,
			},
			latencyMs,
		}
	}

	/**
	 * Call Salamandra model deployed on Vertex AI
	 */
	private async callSalamandra(request: LLMRequest, options: LLMRequestOptions): Promise<{ text: string; usage: TokenUsage; latencyMs: number }> {
		const { helpers } = require("@google-cloud/aiplatform")

		// Get or find the endpoint
		const endpointResourceName = await this.findSalamandraEndpoint()

		// Enhance system prompt for Salamandra to prevent echoing/copying input
		let effectiveSystemPrompt = request.systemPrompt || ""
		const antiEchoInstructions = `

INSTRUCCIONS IMPORTANTS:
- NO copiïs ni repeteixis el text d'entrada.
- GENERA contingut NOU i ORIGINAL basat en les dades proporcionades.
- EXPANDEIX i ELABORA la informació, no la repeteixis textualment.
- La teva resposta ha de ser DIFERENT del text que t'he proporcionat.`

		// Format prompt in Salamandra's chat format (ChatML)
		let formattedPrompt: string

		if (request.jsonResponse) {
			// JSON mode: Force JSON output with system instructions and few-shot examples
			const jsonSystemPrompt = effectiveSystemPrompt
				? `${effectiveSystemPrompt} Respon estrictament en format JSON sense text addicional.`
				: `Ets un assistent útil. Respon ÚNICAMENT amb JSON vàlid. No incloguis cap text fora del JSON.
- Si et demanen una LLISTA d'elements, respon amb un array JSON directament: ["element1", "element2", "element3"]
- Si et demanen informació general, respon amb un objecte: {"response": "la teva resposta"}`

			// Few-shot examples to reinforce JSON format
			const fewShot = `<|im_start|>user\nDona'm 3 colors primaris\n<|im_end|>\n<|im_start|>assistant\n["vermell", "blau", "groc"]\n<|im_end|>\n<|im_start|>user\nHola\n<|im_end|>\n<|im_start|>assistant\n{"response": "Hola! En què et puc ajudar?"}\n<|im_end|>\n`

			formattedPrompt = `<|im_start|>system\n${jsonSystemPrompt}<|im_end|>\n${fewShot}<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		} else if (effectiveSystemPrompt) {
			// Add anti-echo instructions for non-JSON generative tasks
			const enhancedSystem = `${effectiveSystemPrompt}${antiEchoInstructions}`
			formattedPrompt = `<|im_start|>system\n${enhancedSystem}<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		} else {
			// Even without system prompt, add basic anti-echo instruction
			formattedPrompt = `<|im_start|>system\nEts un assistent útil que genera contingut original. NO copiïs el text d'entrada, genera una resposta nova.<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		}

		const instanceValue = helpers.toValue({
			prompt: formattedPrompt,
			max_tokens: options.maxTokens,
			temperature: options.temperature,
			top_p: options.topP,
		})

		const predictionRequest = {
			endpoint: endpointResourceName,
			instances: [instanceValue],
		}

		// Measure latency around just the LLM predict call
		const predictStart = Date.now()
		const [response] = await this.getPredictionClient().predict(predictionRequest)
		const latencyMs = Date.now() - predictStart
		// console.log("Raw Vertex AI response:", response)

		// // 1. Check for Token Usage in metadata
		// if (response.metadata) {
		// 	// The structure depends on the model server, but often looks like this:
		// 	const meta = response.metadata as any // or helpers.fromValue(response.metadata)
		// 	console.log("Response metadata:", meta)
		// 	if (meta.usage) {
		// 		console.log("Token Usage:", meta.usage)
		// 		// e.g. { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
		// 	}
		// }
		// // 2. Get Model Info
		// const modelVersion = response.modelVersionId
		// console.log("Model Version ID:", modelVersion)
		// const deployedId = response.deployedModelId
		// console.log("Deployed Model ID:", deployedId)

		// Extract the generated text
		let text = ""
		if (response.predictions && response.predictions.length > 0) {
			const prediction = response.predictions[0] as any

			if (prediction.stringValue !== undefined && prediction.stringValue !== null) {
				text = prediction.stringValue
			} else {
				try {
					const result = helpers.fromValue(prediction)
					text = typeof result === "string" ? result : JSON.stringify(result)
				} catch {
					text = JSON.stringify(prediction)
				}
			}
		}

		// CLEANUP: Remove the echoed prompt from the response
		// The server seems to return "Prompt: ... <|im_start|>assistant\nOutput: ... response"
		const assistantMarker = "<|im_start|>assistant"
		if (text.includes(assistantMarker)) {
			// Split by the assistant tag and take the last part (the actual generation)
			const parts = text.split(assistantMarker)
			text = parts[parts.length - 1]

			// Remove "Output:" artifact if present (case insensitive)
			text = text.replace(/^[\s\n]*Output:[\s\n]*/i, "").trim()
		} else if (text.startsWith(formattedPrompt)) {
			// Fallback: simple prefix removal
			text = text.substring(formattedPrompt.length).trim()
		}

		// Calculate token usage using accurate tokenizer
		const [promptTokens, completionTokens] = await Promise.all([this.countSalamandraTokens(formattedPrompt), this.countSalamandraTokens(text)])
		console.log("Salamandra token counts:", { promptTokens, completionTokens })

		return {
			text,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens: promptTokens + completionTokens,
			},
			latencyMs,
		}
	}

	/**
	 * Find the Salamandra endpoint by display name
	 */
	private async findSalamandraEndpoint(): Promise<string> {
		const cacheKey = this.config.endpointDisplayName || "salamandra-7b-endpoint"

		// Check cache first
		if (this.endpointCache.has(cacheKey)) {
			return this.endpointCache.get(cacheKey)!
		}

		const parent = `projects/${this.config.projectId}/locations/${this.config.region}`

		const [endpoints] = await this.getEndpointClient().listEndpoints({
			parent,
			filter: `display_name="${cacheKey}"`,
		})

		if (!endpoints || endpoints.length === 0) {
			throw new Error(`Salamandra endpoint "${cacheKey}" not found or not active`)
		}

		const endpointName = endpoints[0].name
		if (!endpointName) {
			throw new Error("Endpoint has no name")
		}

		// Cache the endpoint
		this.endpointCache.set(cacheKey, endpointName)

		return endpointName
	}

	/**
	 * Call ALIA-40b model deployed on Vertex AI with vLLM
	 * Uses the vLLM OpenAI-compatible API format
	 */
	private async callAlia(request: LLMRequest, options: LLMRequestOptions): Promise<{ text: string; usage: TokenUsage; latencyMs: number }> {
		const { helpers } = require("@google-cloud/aiplatform")

		// Get or find the endpoint
		const endpointResourceName = await this.findAliaEndpoint()

		// Format prompt in ALIA's chat format (ChatML style like Salamandra)
		let formattedPrompt: string

		if (request.jsonResponse) {
			const effectiveSystem = request.systemPrompt
				? `${request.systemPrompt} Respon estrictament en format JSON sense text addicional.`
				: `Ets un assistent útil. Respon ÚNICAMENT amb JSON vàlid. No incloguis cap text fora del JSON.`

			formattedPrompt = `<|im_start|>system\n${effectiveSystem}<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		} else if (request.systemPrompt) {
			formattedPrompt = `<|im_start|>system\n${request.systemPrompt}<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant`
		} else {
			formattedPrompt = `<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant`
		}

		// vLLM uses different parameter format
		const instanceValue = helpers.toValue({
			prompt: formattedPrompt,
			max_tokens: options.maxTokens,
			temperature: options.temperature,
			top_p: options.topP,
		})

		const predictionRequest = {
			endpoint: endpointResourceName,
			instances: [instanceValue],
		}

		// Measure latency around just the LLM predict call
		const predictStart = Date.now()
		const [response] = await this.getPredictionClient().predict(predictionRequest)
		const latencyMs = Date.now() - predictStart

		// Extract the generated text from vLLM response
		let text = ""
		if (response.predictions && response.predictions.length > 0) {
			const prediction = response.predictions[0] as any

			if (prediction.stringValue !== undefined && prediction.stringValue !== null) {
				text = prediction.stringValue
			} else {
				try {
					const result = helpers.fromValue(prediction)
					text = typeof result === "string" ? result : JSON.stringify(result)
				} catch {
					text = JSON.stringify(prediction)
				}
			}
		}

		// CLEANUP: Remove the echoed prompt from the response
		const assistantMarker = "<|im_start|>assistant"
		if (text.includes(assistantMarker)) {
			const parts = text.split(assistantMarker)
			text = parts[parts.length - 1]
			text = text.replace(/^[\s\n]*Output:[\s\n]*/i, "").trim()
		} else if (text.startsWith(formattedPrompt)) {
			text = text.substring(formattedPrompt.length).trim()
		}

		// Calculate token usage using estimation (ALIA uses same tokenizer family)
		const promptTokens = estimateTokensAdvanced(formattedPrompt, "ca")
		const completionTokens = estimateTokensAdvanced(text, "ca")

		return {
			text,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens: promptTokens + completionTokens,
			},
			latencyMs,
		}
	}

	/**
	 * Call Salamandra model running locally via Ollama
	 * Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
	 */
	private async callSalamandraLocal(request: LLMRequest, options: LLMRequestOptions): Promise<{ text: string; usage: TokenUsage; latencyMs: number }> {
		const ollamaEndpoint = this.config.ollamaEndpoint || process.env.OLLAMA_ENDPOINT || "http://localhost:11434"
		const ollamaModel = this.config.ollamaModel || process.env.OLLAMA_MODEL || "cas/salamandra-7b-instruct"

		// Enhance system prompt for Salamandra to prevent echoing/copying input
		// This is important because smaller models tend to copy input text verbatim
		let effectiveSystemPrompt = request.systemPrompt || ""
		const antiEchoInstructions = `

INSTRUCCIONS IMPORTANTS:
- NO copiïs ni repeteixis el text d'entrada.
- GENERA contingut NOU i ORIGINAL basat en les dades proporcionades.
- EXPANDEIX i ELABORA la informació, no la repeteixis textualment.
- La teva resposta ha de ser DIFERENT del text que t'he proporcionat.`

		// Format prompt in ChatML format (same as Salamandra on Vertex)
		let formattedPrompt: string

		if (request.jsonResponse) {
			const jsonSystemPrompt = effectiveSystemPrompt
				? `${effectiveSystemPrompt} Respon estrictament en format JSON sense text addicional.`
				: `Ets un assistent útil. Respon ÚNICAMENT amb JSON vàlid. No incloguis cap text fora del JSON.
- Si et demanen una LLISTA d'elements, respon amb un array JSON directament: ["element1", "element2", "element3"]
- Si et demanen informació general, respon amb un objecte: {"response": "la teva resposta"}`

			const fewShot = `<|im_start|>user\nDona'm 3 colors primaris\n<|im_end|>\n<|im_start|>assistant\n["vermell", "blau", "groc"]\n<|im_end|>\n<|im_start|>user\nHola\n<|im_end|>\n<|im_start|>assistant\n{"response": "Hola! En què et puc ajudar?"}\n<|im_end|>\n`

			formattedPrompt = `<|im_start|>system\n${jsonSystemPrompt}<|im_end|>\n${fewShot}<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		} else if (effectiveSystemPrompt) {
			// Add anti-echo instructions for non-JSON generative tasks
			const enhancedSystem = `${effectiveSystemPrompt}${antiEchoInstructions}`
			formattedPrompt = `<|im_start|>system\n${enhancedSystem}<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		} else {
			// Even without system prompt, add basic anti-echo instruction
			formattedPrompt = `<|im_start|>system\nEts un assistent útil que genera contingut original. NO copiïs el text d'entrada, genera una resposta nova.<|im_end|>\n<|im_start|>user\n${request.prompt}<|im_end|>\n<|im_start|>assistant\n`
		}

		// Ollama API request body
		const requestBody = {
			model: ollamaModel,
			prompt: formattedPrompt,
			stream: false,
			options: {
				num_predict: options.maxTokens || 4096,
				temperature: options.temperature || 0.7,
				top_p: options.topP || 0.95,
				top_k: options.topK,
				stop: options.stopSequences || ["<|im_end|>"],
			},
		}

		// Measure latency around just the LLM call
		const predictStart = Date.now()
		const response = await fetch(`${ollamaEndpoint}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(requestBody),
			signal: AbortSignal.timeout(this.config.timeoutMs || 60000),
		})
		const latencyMs = Date.now() - predictStart

		if (!response.ok) {
			const errorText = await response.text().catch(() => "")
			throw new Error(`Ollama request failed with status ${response.status}: ${errorText}`)
		}

		const result = (await response.json()) as {
			response: string
			done: boolean
			context?: number[]
			total_duration?: number
			load_duration?: number
			prompt_eval_count?: number
			prompt_eval_duration?: number
			eval_count?: number
			eval_duration?: number
		}

		let text = result.response || ""

		// CLEANUP: Remove any remaining ChatML artifacts
		text = text.replace(/<\|im_end\|>/g, "").trim()
		text = text.replace(/<\|im_start\|>[\s\S]*?$/g, "").trim()

		// Use Ollama's token counts if available, otherwise estimate
		const promptTokens = result.prompt_eval_count || (await this.countSalamandraTokens(formattedPrompt))
		const completionTokens = result.eval_count || (await this.countSalamandraTokens(text))

		logger.info("Salamandra Local (Ollama) response", {
			model: ollamaModel,
			promptTokens,
			completionTokens,
			latencyMs,
			totalDurationMs: result.total_duration ? result.total_duration / 1_000_000 : undefined,
		})

		return {
			text,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens: promptTokens + completionTokens,
			},
			latencyMs,
		}
	}

	/**
	 * Find the ALIA-40b endpoint by display name
	 * Supports context variants: alia-40b-endpoint-8k, alia-40b-endpoint-16k, alia-40b-endpoint-32k
	 */
	private async findAliaEndpoint(): Promise<string> {
		const cacheKey = this.config.endpointDisplayName || "alia-40b-endpoint-16k"

		// Check cache first
		if (this.endpointCache.has(cacheKey)) {
			return this.endpointCache.get(cacheKey)!
		}

		const parent = `projects/${this.config.projectId}/locations/${this.config.region}`

		const [endpoints] = await this.getEndpointClient().listEndpoints({
			parent,
			filter: `display_name="${cacheKey}"`,
		})
		console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
		console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
		console.log("endpoints:", endpoints)

		if (!endpoints || endpoints.length === 0) {
			throw new Error(`ALIA-40b endpoint "${cacheKey}" not found or not active. Deploy with: python lifecycle_big.py`)
		}

		const endpointName = endpoints[0].name
		if (!endpointName) {
			throw new Error("Endpoint has no name")
		}

		// Cache the endpoint
		this.endpointCache.set(cacheKey, endpointName)

		return endpointName
	}

	/**
	 * Get the model version string
	 */
	private getModelVersion(): string {
		switch (this.config.provider) {
			case LLMProvider.GEMINI:
			case LLMProvider.GEMINI_FLASH:
				return this.config.modelId || "gemini-2.5-flash"
			case LLMProvider.GEMINI_PRO:
				return this.config.modelId || "gemini-2.5-pro"
			case LLMProvider.SALAMANDRA:
			case LLMProvider.SALAMANDRA_7B_INSTRUCT:
				return "BSC-LT/salamandra-7b-instruct"
			case LLMProvider.SALAMANDRA_7B_LOCAL:
				return this.config.ollamaModel || "cas/salamandra-7b-instruct"
			case LLMProvider.ALIA_40B_INSTRUCT:
				return "BSC-LT/ALIA-40b-instruct"
			default:
				return "unknown"
		}
	}

	// ============================================================================
	// OBSERVABILITY METHODS
	// ============================================================================

	/**
	 * Get statistics for a specific provider
	 */
	getStats(provider?: LLMProvider): ProviderStats | Map<LLMProvider, ProviderStats> {
		if (provider) {
			return this.stats.get(provider) || this.createEmptyStats()
		}
		return this.stats
	}

	/**
	 * Get recent interaction logs
	 */
	getRecentLogs(limit: number = 100): LLMInteractionLog[] {
		return this.interactionLogs.slice(-limit)
	}

	/**
	 * Get logs by user
	 */
	getLogsByUser(userId: string, limit: number = 100): LLMInteractionLog[] {
		return this.interactionLogs.filter((log) => log.userId === userId).slice(-limit)
	}

	/**
	 * Get logs by session
	 */
	getLogsBySession(sessionId: string): LLMInteractionLog[] {
		return this.interactionLogs.filter((log) => log.sessionId === sessionId)
	}

	/**
	 * Get error logs
	 */
	getErrorLogs(limit: number = 100): LLMInteractionLog[] {
		return this.interactionLogs.filter((log) => log.error).slice(-limit)
	}

	/**
	 * Get summary statistics
	 */
	getSummary(): {
		totalRequests: number
		successRate: number
		averageLatencyMs: number
		totalTokensUsed: number
		estimatedCostUSD: number
		byProvider: Record<string, ProviderStats>
	} {
		let totalRequests = 0
		let totalSuccessful = 0
		let totalLatency = 0
		let totalTokens = 0
		let totalCost = 0
		const byProvider: Record<string, ProviderStats> = {}

		this.stats.forEach((stats, provider) => {
			totalRequests += stats.totalRequests
			totalSuccessful += stats.successfulRequests
			totalLatency += stats.totalLatencyMs
			totalTokens += stats.totalTokensUsed
			totalCost += stats.estimatedCost
			byProvider[provider] = stats
		})

		return {
			totalRequests,
			successRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
			averageLatencyMs: totalSuccessful > 0 ? totalLatency / totalSuccessful : 0,
			totalTokensUsed: totalTokens,
			estimatedCostUSD: totalCost,
			byProvider,
		}
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.stats.clear()
		this.initializeStats(this.config.provider)
	}

	/**
	 * Clear interaction logs
	 */
	clearLogs(): void {
		this.interactionLogs = []
	}

	private createEmptyStats(): ProviderStats {
		return {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			totalTokensUsed: 0,
			totalLatencyMs: 0,
			averageLatencyMs: 0,
			estimatedCost: 0,
		}
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a Gemini LLM Service instance
 */
export function createGeminiService(projectId: string, region: string = "europe-west4", modelId: string = "gemini-2.5-flash"): LLMService {
	return new LLMService({
		provider: LLMProvider.GEMINI_FLASH,
		projectId,
		region,
		modelId,
	})
}

/**
 * Create a Salamandra LLM Service instance
 * @param autoFallback - Automatically fallback to larger context models when needed (default: from CONTEXT_WINDOW_AUTO_FALLBACK env var, or true)
 */
export function createSalamandraService(
	projectId: string,
	region: string = "europe-west4",
	endpointDisplayName: string = "salamandra-7b-endpoint",
	autoFallback: boolean = CONTEXT_WINDOW_CONFIG.autoFallback
): LLMService {
	return new LLMService({
		provider: LLMProvider.SALAMANDRA_7B_INSTRUCT,
		projectId,
		region,
		endpointDisplayName,
		autoFallback,
	})
}

/**
 * Create a Salamandra Local (Ollama) LLM Service instance
 * @param ollamaEndpoint - Ollama server URL (default: http://localhost:11434)
 * @param ollamaModel - Ollama model name (default: cas/salamandra-7b-instruct)
 */
export function createSalamandraLocalService(ollamaEndpoint: string = process.env.OLLAMA_ENDPOINT || "http://localhost:11434", ollamaModel: string = process.env.OLLAMA_MODEL || "cas/salamandra-7b-instruct"): LLMService {
	return new LLMService({
		provider: LLMProvider.SALAMANDRA_7B_LOCAL,
		projectId: "local", // Not used for Ollama
		region: "local", // Not used for Ollama
		ollamaEndpoint,
		ollamaModel,
	})
}

/**
 * Create an ALIA-40b LLM Service instance
 * @param contextSize - Context window size: "8k", "16k", or "32k" (default: "16k")
 * @param autoFallback - Automatically fallback to larger context models when needed (default: from CONTEXT_WINDOW_CONFIG)
 */
export function createAliaService(projectId: string, region: string = "europe-west4", contextSize: "8k" | "16k" | "32k" = "16k", autoFallback: boolean = CONTEXT_WINDOW_CONFIG.autoFallback): LLMService {
	console.log("Creating ALIA service with context size:", contextSize, "autoFallback:", autoFallback)
	const endpointDisplayName = `alia-40b-endpoint-${contextSize}`
	return new LLMService({
		provider: LLMProvider.ALIA_40B_INSTRUCT,
		projectId,
		region,
		endpointDisplayName,
		contextSize,
		autoFallback,
	})
}

// ============================================================================
// SINGLETON INSTANCES (Optional)
// ============================================================================

// Default configuration - update these for your project
const DEFAULT_PROJECT_ID = "aina-demostradors"
const DEFAULT_REGION = "europe-west4"

// Cache for LLM service instances
const serviceCache: Map<string, LLMService> = new Map()

/**
 * Get an LLM service instance for a specific model ID from the frontend (ModelSelection.jsx)
 *
 * Supported model IDs (LLMModel type from frontend):
 * - "salamandra-7b-vertex" -> Salamandra 7B on Vertex AI
 * - "salamandra-ta-7b-local" -> Salamandra 7B local (Ollama)
 * - "gemini-2.5-flash" -> Gemini 2.5 Flash
 * - "alia-40b-vertex" -> ALIA 40B on Vertex AI
 *
 * Also supports provider enum values for backward compatibility.
 *
 * @param modelId - Model ID from frontend or LLMProvider string
 * @returns LLMService instance configured for the model
 */
export function getLLMServiceForModel(modelId?: string): LLMService {
	// Default to Gemini Flash if no model specified
	if (!modelId) {
		return getGeminiService()
	}

	const normalized = modelId.toLowerCase().trim()

	// Check cache first
	if (serviceCache.has(normalized)) {
		return serviceCache.get(normalized)!
	}

	let service: LLMService

	switch (normalized) {
		// Frontend model IDs from ModelSelection.jsx (LLMModel type)
		case "gemini-2.5-flash":
		case "gemini":
		case "gemini-flash":
			service = createGeminiService(DEFAULT_PROJECT_ID, DEFAULT_REGION, "gemini-2.5-flash")
			break

		case "gemini-pro":
		case "gemini-2.5-pro":
			service = createGeminiService(DEFAULT_PROJECT_ID, DEFAULT_REGION, "gemini-2.5-pro")
			break

		case "salamandra-7b-vertex":
		case "salamandra":
		case "salamandra-7b":
		case "salamandra-7b-instruct":
			service = createSalamandraService(DEFAULT_PROJECT_ID, DEFAULT_REGION)
			break

		case "salamandra-ta-7b-local":
		case "salamandra-local":
			service = createSalamandraLocalService()
			break

		case "alia-40b-vertex":
		case "alia":
		case "alia-40b":
		case "alia-40b-instruct":
			service = createAliaService(DEFAULT_PROJECT_ID, DEFAULT_REGION, "16k")
			break

		default:
			logger.warn(`Unknown model "${modelId}", defaulting to Gemini Flash`)
			service = createGeminiService(DEFAULT_PROJECT_ID, DEFAULT_REGION, "gemini-2.5-flash")
	}

	// Configure BigQuery logging
	service.setLogCallback(createBigQueryLogger())

	// Cache the service
	serviceCache.set(normalized, service)

	return service
}

// Lazy-initialized singleton instances
let _geminiService: LLMService | null = null
let _salamandraService: LLMService | null = null

export function getGeminiService(): LLMService {
	if (!_geminiService) {
		_geminiService = createGeminiService(DEFAULT_PROJECT_ID, DEFAULT_REGION)
	}
	return _geminiService
}

export function getSalamandraService(): LLMService {
	if (!_salamandraService) {
		_salamandraService = createSalamandraService(DEFAULT_PROJECT_ID, DEFAULT_REGION)
	}
	return _salamandraService
}

// ============================================================================
// BIGQUERY LOGGER - Re-exported from BigQueryLogger.ts
// ============================================================================

// Import for internal use within this file
import { createBigQueryLogger } from "./BigQueryLogger"

// Re-export BigQuery utilities for backward compatibility
export { setupBigQuery, createBigQueryLogger } from "./BigQueryLogger"

// ============================================================================
// FIRESTORE LOGGER (Optional callback implementation)
// ============================================================================

/**
 * Example: Create a Firestore logging callback
 */
export function createFirestoreLogger(collectionName: string = "llm_interactions"): (log: LLMInteractionLog) => Promise<void> {
	return async (log: LLMInteractionLog) => {
		try {
			const admin = require("firebase-admin")
			const { Timestamp } = require("firebase-admin/firestore")
			const db = admin.firestore()

			// Filter out undefined values to avoid Firestore errors
			const cleanLog: Record<string, any> = {
				requestId: log.requestId,
				timestamp: Timestamp.fromDate(log.timestamp),
				provider: log.provider,
				modelVersion: log.modelVersion,
				prompt: log.prompt,
				response: log.response,
				usage: log.usage,
				latencyMs: log.latencyMs,
				options: log.options,
			}

			// Only add optional fields if they have values
			if (log.userId) cleanLog.userId = log.userId
			if (log.sessionId) cleanLog.sessionId = log.sessionId
			if (log.systemPrompt) cleanLog.systemPrompt = log.systemPrompt
			if (log.error) cleanLog.error = log.error
			if (log.errorStack) cleanLog.errorStack = log.errorStack
			if (log.context) cleanLog.context = log.context
			if (log.costEstimate) cleanLog.costEstimate = log.costEstimate
			if (log.module) cleanLog.module = log.module

			// Store the log in Firestore with requestId as document ID

			await db.collection(collectionName).doc(log.requestId).set(cleanLog)
		} catch (error: any) {
			logger.error("Failed to log to Firestore", { error: error.message })
		}
	}
}

export default LLMService
