/**
 * LLM API - Callable endpoints for LLM interactions
 *
 * This file provides thin callable wrappers around LLMService.ts
 * All actual LLM logic (providers, token counting, logging) is handled by LLMService.
 *
 * Endpoints:
 * - askLLM: Main endpoint for LLM requests - supports model selection (requires auth)
 * - llmStats: Get LLM service statistics (requires auth)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { LLMService, LLMProvider, getGeminiService, createGeminiService, createSalamandraService, createSalamandraLocalService, createAliaService, createBigQueryLogger } from "./LLMService"
import type { AinaModule } from "./LLMService"

// --- CONFIGURATION ---
const REGION = "europe-west4"
const PROJECT_ID = process.env.PROJECT_ID || "aina-demostradors"

// Cache for LLM service instances with BigQuery logging configured
const serviceCache: Map<LLMProvider, LLMService> = new Map()

/**
 * Get or create an LLM service instance for the specified provider
 * All instances are configured with BigQuery logging for observability
 */
function getLLMService(provider: LLMProvider = LLMProvider.GEMINI_FLASH): LLMService {
	// Check cache first
	if (serviceCache.has(provider)) {
		return serviceCache.get(provider)!
	}

	// Create new service based on provider
	let service: LLMService

	switch (provider) {
		case LLMProvider.GEMINI:
		case LLMProvider.GEMINI_FLASH:
			service = createGeminiService(PROJECT_ID, REGION, "gemini-2.5-flash")
			break
		case LLMProvider.GEMINI_PRO:
			service = createGeminiService(PROJECT_ID, REGION, "gemini-2.5-pro")
			break
		case LLMProvider.SALAMANDRA:
		case LLMProvider.SALAMANDRA_7B_INSTRUCT:
			service = createSalamandraService(PROJECT_ID, REGION)
			break
		case LLMProvider.SALAMANDRA_7B_LOCAL:
			service = createSalamandraLocalService()
			break
		case LLMProvider.ALIA_40B_INSTRUCT:
			service = createAliaService(PROJECT_ID, REGION, "16k")
			break
		default:
			// Default to Gemini Flash
			service = getGeminiService()
	}

	// Configure BigQuery logging
	service.setLogCallback(createBigQueryLogger())

	// Cache the service
	serviceCache.set(provider, service)

	return service
}

/**
 * Parse provider/model string to LLMProvider enum
 * Supports both backend provider names and frontend model IDs from ModelSelection.jsx
 *
 * Frontend model IDs (LLMModel type):
 * - "salamandra-7b-vertex" -> SALAMANDRA_7B_INSTRUCT
 * - "salamandra-ta-7b-local" -> SALAMANDRA_7B_LOCAL (uses local Ollama)
 * - "gemini-2.5-flash" -> GEMINI_FLASH
 * - "alia-40b-vertex" -> ALIA_40B_INSTRUCT
 */
function parseProvider(providerStr?: string): LLMProvider {
	if (!providerStr) return LLMProvider.GEMINI_FLASH

	const normalized = providerStr.toLowerCase().trim()

	switch (normalized) {
		// Frontend model IDs from ModelSelection.jsx
		case "gemini-2.5-flash":
			return LLMProvider.GEMINI_FLASH
		case "salamandra-7b-vertex":
			return LLMProvider.SALAMANDRA_7B_INSTRUCT
		case "salamandra-ta-7b-local":
		case "salamandra-local":
			return LLMProvider.SALAMANDRA_7B_LOCAL
		case "alia-40b-vertex":
			return LLMProvider.ALIA_40B_INSTRUCT

		// Backend provider names (legacy support)
		case "gemini":
		case "gemini-flash":
			return LLMProvider.GEMINI_FLASH
		case "gemini-pro":
		case "gemini-2.5-pro":
			return LLMProvider.GEMINI_PRO
		case "salamandra":
		case "salamandra-7b":
		case "salamandra-7b-instruct":
			return LLMProvider.SALAMANDRA_7B_INSTRUCT
		case "alia":
		case "alia-40b":
		case "alia-40b-instruct":
			return LLMProvider.ALIA_40B_INSTRUCT
		default:
			logger.warn(`Unknown provider "${providerStr}", defaulting to Gemini Flash`)
			return LLMProvider.GEMINI_FLASH
	}
}

// ============================================================================
// CALLABLE ENDPOINTS
// ============================================================================

/**
 * Callable Function to generate text using LLMService.
 * All LLM interactions should go through this endpoint for unified observability.
 * Requires authenticated user.
 *
 * Supports model selection via the "provider" or "model" parameter.
 *
 * @example
 * // From frontend using Firebase SDK
 * const askLLM = httpsCallable(functions, 'askLLM');
 * const result = await askLLM({ prompt: "Hola!", provider: "gemini-flash" });
 */
export const askLLM = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	// Check authentication
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be logged in to use the LLM service.")
	}

	try {
		// 1. Parse request data
		const data = request.data
		const userPrompt = data.prompt || "Qui ets?"
		const module = data.module as AinaModule | undefined
		const userId = request.auth.uid
		const sessionId = data.sessionId || undefined

		// 2. Get the appropriate LLM service based on provider/model selection
		const providerStr = data.provider || data.model
		const provider = parseProvider(providerStr)
		const llm = getLLMService(provider)

		logger.info("🔍 Processing LLM request", {
			provider: provider,
			module,
			userId,
			promptLength: userPrompt.length,
		})

		// 3. Call LLM using the unified LLMService
		const response = await llm.callModel({
			prompt: userPrompt,
			systemPrompt: data.systemPrompt || data.system,
			module: module,
			jsonResponse: data.jsonResponse !== false, // Default to true for backward compatibility
			userId: userId,
			sessionId: sessionId as string | undefined,
			options: {
				maxTokens: data.maxTokens || 2048,
				temperature: data.temperature || 0.3,
				topP: data.topP || 0.95,
			},
		})
		console.log(">>>>>>>>>")
		console.log("response: ", response)
		console.log(">>>>>>>>>")
		logger.info("✅ LLM response received", {
			requestId: response.requestId,
			provider: response.provider,
			latencyMs: response.latencyMs,
			tokensUsed: response.usage.totalTokens,
		})

		// 4. Return response with observability data
		return {
			status: "success",
			data: response.json ?? response.text,
			text: response.text,
			usage: response.usage,
			latencyMs: response.latencyMs,
			requestId: response.requestId,
			provider: response.provider,
			modelVersion: response.modelVersion,
		}
	} catch (error: any) {
		logger.error("❌ Error in askLLM:", error)

		if (error.message?.includes("not found") || error.message?.includes("not active")) {
			throw new HttpsError("unavailable", "The LLM endpoint is not currently available.")
		}

		throw new HttpsError("internal", error.message || "An error occurred processing the LLM request.")
	}
})

/**
 * Callable Function to get LLM service statistics and observability data.
 * Requires authenticated user.
 *
 * @example
 * // From frontend using Firebase SDK
 * const llmStats = httpsCallable(functions, 'llmStats');
 * const result = await llmStats();
 */
export const llmStats = onCall({ region: REGION }, async (request) => {
	// Check authentication
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be logged in to view LLM stats.")
	}

	try {
		// Get stats from all cached services
		const allStats: Record<string, any> = {}
		let totalRequests = 0
		let totalTokens = 0
		let totalCost = 0

		// Aggregate stats from all service instances
		for (const [provider, service] of serviceCache.entries()) {
			const summary = service.getSummary()
			allStats[provider] = summary
			totalRequests += summary.totalRequests
			totalTokens += summary.totalTokensUsed
			totalCost += summary.estimatedCostUSD
		}

		// If no services have been used yet, get default Gemini service stats
		if (serviceCache.size === 0) {
			const defaultService = getLLMService(LLMProvider.GEMINI_FLASH)
			const summary = defaultService.getSummary()
			allStats[LLMProvider.GEMINI_FLASH] = summary
		}

		// Get recent logs from the default/primary service
		const primaryService = getLLMService(LLMProvider.GEMINI_FLASH)
		const recentLogs = primaryService.getRecentLogs(10)
		const errorLogs = primaryService.getErrorLogs(5)

		return {
			status: "success",
			aggregated: {
				totalRequests,
				totalTokensUsed: totalTokens,
				estimatedCostUSD: totalCost,
			},
			byProvider: allStats,
			recentRequests: recentLogs.map((log) => ({
				requestId: log.requestId,
				timestamp: log.timestamp,
				provider: log.provider,
				userId: log.userId,
				module: log.module,
				latencyMs: log.latencyMs,
				tokensUsed: log.usage.totalTokens,
				error: log.error || null,
			})),
			recentErrors: errorLogs.map((log) => ({
				requestId: log.requestId,
				timestamp: log.timestamp,
				provider: log.provider,
				error: log.error,
			})),
		}
	} catch (error: any) {
		logger.error("❌ Error in llmStats:", error)
		throw new HttpsError("internal", error.message || "An error occurred fetching LLM stats.")
	}
})
