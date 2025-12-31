import { onCall } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { createGeminiService, createSalamandraService, createAliaService } from "./LLMService"

// --- CONFIGURATION ---
const REGION = "europe-west4"
const PROJECT_ID = process.env.PROJECT_ID || "aina-demostradors"
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "cas/salamandra-7b-instruct"
// Use RAG_SERVICE_URL first to match the rest of the system (vectorization, RAG process)
// Falls back to RAG_SERVICE_ENDPOINT for backward compatibility
const RAG_SERVICE_ENDPOINT = process.env.RAG_SERVICE_URL || process.env.RAG_SERVICE_ENDPOINT || "http://localhost:8000"

// Health check test prompt - minimal to reduce latency and cost
const HEALTH_CHECK_PROMPT = "Respon només: OK"

interface ServiceHealthResult {
	status: "healthy" | "degraded" | "error" | "unavailable"
	message: string
	latencyMs?: number
	model?: string
	endpoint?: string
	provider?: string
}

/**
 * Test Gemini model connectivity with a minimal prompt
 */
async function checkGeminiHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		const geminiService = createGeminiService(PROJECT_ID, REGION, "gemini-2.5-flash")

		await geminiService.callModel({
			prompt: HEALTH_CHECK_PROMPT,
			options: {
				maxTokens: 10,
				temperature: 0.1,
			},
		})

		const latencyMs = Date.now() - startTime

		return {
			status: "healthy",
			message: `Gemini responded successfully`,
			latencyMs,
			model: "gemini-2.5-flash",
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime
		logger.error("Gemini health check failed", { error: error.message })

		return {
			status: "error",
			message: error.message || "Failed to connect to Gemini",
			latencyMs,
			model: "gemini-2.5-flash",
		}
	}
}

/**
 * Test Salamandra model connectivity (Vertex AI deployment)
 */
async function checkSalamandraHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		const salamandraService = createSalamandraService(PROJECT_ID, REGION)

		await salamandraService.callModel({
			prompt: HEALTH_CHECK_PROMPT,
			options: {
				maxTokens: 10,
				temperature: 0.1,
			},
		})

		const latencyMs = Date.now() - startTime

		return {
			status: "healthy",
			message: `Salamandra responded successfully`,
			latencyMs,
			model: "salamandra-7b-instruct",
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime
		logger.error("Salamandra health check failed", { error: error.message })

		// Check if it's an endpoint not found/not active error
		if (error.message?.includes("not found") || error.message?.includes("not active")) {
			return {
				status: "unavailable",
				message: "Salamandra endpoint not deployed or not active",
				latencyMs,
				model: "salamandra-7b-instruct",
			}
		}

		return {
			status: "error",
			message: error.message || "Failed to connect to Salamandra",
			latencyMs,
			model: "salamandra-7b-instruct",
		}
	}
}

/**
 * Test ALIA-40b model connectivity (Vertex AI deployment with vLLM)
 * Supports context sizes: 8k, 16k, 32k
 */
async function checkAliaHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		// Try 16k context first (most common deployment)
		const aliaService = createAliaService(PROJECT_ID, REGION, "16k")

		await aliaService.callModel({
			prompt: HEALTH_CHECK_PROMPT,
			options: {
				maxTokens: 10,
				temperature: 0.1,
			},
		})

		const latencyMs = Date.now() - startTime

		return {
			status: "healthy",
			message: `ALIA-40b responded successfully`,
			latencyMs,
			model: "alia-40b-instruct",
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime
		logger.error("ALIA-40b health check failed", { error: error.message })

		// Check if it's an endpoint not found/not active error
		if (error.message?.includes("not found") || error.message?.includes("not active") || error.message?.includes("Deploy with")) {
			return {
				status: "unavailable",
				message: "ALIA-40b endpoint not deployed (run: python lifecycle_big.py)",
				latencyMs,
				model: "alia-40b-instruct",
			}
		}

		return {
			status: "error",
			message: error.message || "Failed to connect to ALIA-40b",
			latencyMs,
			model: "alia-40b-instruct",
		}
	}
}

/**
 * Test local Salamandra model running on Ollama
 * Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
async function checkLocalSalamandraHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		// First, check if Ollama is running by hitting the root endpoint
		const healthResponse = await fetch(`${OLLAMA_ENDPOINT}/`, {
			method: "GET",
			signal: AbortSignal.timeout(3000),
		})

		if (!healthResponse.ok) {
			const latencyMs = Date.now() - startTime
			return {
				status: "error",
				message: `Ollama server responded with status ${healthResponse.status}`,
				latencyMs,
				model: OLLAMA_MODEL,
				endpoint: OLLAMA_ENDPOINT,
			}
		}

		// Then, make a minimal generation request to verify the model is loaded
		const generateResponse = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: OLLAMA_MODEL,
				prompt: HEALTH_CHECK_PROMPT,
				stream: false,
				options: {
					num_predict: 10, // Minimal tokens
					temperature: 0.1,
				},
			}),
			signal: AbortSignal.timeout(30000), // 30 second timeout for model loading
		})

		const latencyMs = Date.now() - startTime

		if (generateResponse.ok) {
			await generateResponse.json() // Consume response body
			return {
				status: "healthy",
				message: `Ollama + ${OLLAMA_MODEL} responding`,
				latencyMs,
				model: OLLAMA_MODEL,
				endpoint: OLLAMA_ENDPOINT,
			}
		} else {
			const errorText = await generateResponse.text().catch(() => "")

			// Check if model is not found
			if (generateResponse.status === 404 || (errorText.includes("model") && errorText.includes("not found"))) {
				return {
					status: "unavailable",
					message: `Model "${OLLAMA_MODEL}" not found in Ollama`,
					latencyMs,
					model: OLLAMA_MODEL,
					endpoint: OLLAMA_ENDPOINT,
				}
			}

			return {
				status: "degraded",
				message: `Ollama responded with status ${generateResponse.status}`,
				latencyMs,
				model: OLLAMA_MODEL,
				endpoint: OLLAMA_ENDPOINT,
			}
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime

		// Connection refused means server is not running
		if (error.message?.includes("ECONNREFUSED") || error.cause?.code === "ECONNREFUSED") {
			return {
				status: "unavailable",
				message: "Ollama not running (start with: ollama serve)",
				latencyMs,
				model: OLLAMA_MODEL,
				endpoint: OLLAMA_ENDPOINT,
			}
		}

		if (error.name === "TimeoutError") {
			return {
				status: "error",
				message: "Ollama timeout - model may be loading",
				latencyMs,
				model: OLLAMA_MODEL,
				endpoint: OLLAMA_ENDPOINT,
			}
		}

		return {
			status: "error",
			message: error.message || "Failed to connect to Ollama",
			latencyMs,
			model: OLLAMA_MODEL,
			endpoint: OLLAMA_ENDPOINT,
		}
	}
}

/**
 * Test RAG/Embedding service connectivity
 * Uses the /health endpoint which returns model_loaded, nlp_model_loaded, etc.
 */
async function checkEmbeddingServiceHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		const response = await fetch(`${RAG_SERVICE_ENDPOINT}/health`, {
			method: "GET",
			signal: AbortSignal.timeout(5000),
		})

		const latencyMs = Date.now() - startTime

		if (response.ok) {
			const data = await response.json().catch(() => ({}))

			// Check if embedding model is loaded
			const modelLoaded = data.model_loaded === true
			const nlpLoaded = data.nlp_model_loaded === true

			if (modelLoaded && nlpLoaded) {
				return {
					status: "healthy",
					message: `Model: ${data.nlp_model_name || "loaded"}, Embeddings: ready`,
					latencyMs,
					provider: "rag-service",
					endpoint: RAG_SERVICE_ENDPOINT,
				}
			} else {
				return {
					status: "degraded",
					message: `Model: ${modelLoaded ? "✓" : "✗"}, NLP: ${nlpLoaded ? "✓" : "✗"}`,
					latencyMs,
					provider: "rag-service",
					endpoint: RAG_SERVICE_ENDPOINT,
				}
			}
		} else {
			return {
				status: "degraded",
				message: `Service responded with status ${response.status}`,
				latencyMs,
				provider: "rag-service",
				endpoint: RAG_SERVICE_ENDPOINT,
			}
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime

		if (error.message?.includes("ECONNREFUSED") || error.cause?.code === "ECONNREFUSED") {
			return {
				status: "unavailable",
				message: "RAG service not running",
				latencyMs,
				provider: "rag-service",
				endpoint: RAG_SERVICE_ENDPOINT,
			}
		}

		if (error.name === "TimeoutError") {
			return {
				status: "error",
				message: "RAG service timeout",
				latencyMs,
				provider: "rag-service",
				endpoint: RAG_SERVICE_ENDPOINT,
			}
		}

		return {
			status: "error",
			message: error.message || "Failed to connect to embedding service",
			latencyMs,
			provider: "rag-service",
			endpoint: RAG_SERVICE_ENDPOINT,
		}
	}
}

/**
 * Test Vector DB (FAISS) connectivity via RAG service /health endpoint
 * Checks index_loaded, glossary_entries, and ready_for_search fields
 */
async function checkVectorDBHealth(): Promise<ServiceHealthResult> {
	const startTime = Date.now()
	try {
		const response = await fetch(`${RAG_SERVICE_ENDPOINT}/health`, {
			method: "GET",
			signal: AbortSignal.timeout(5000),
		})

		const latencyMs = Date.now() - startTime

		if (response.ok) {
			const data = await response.json().catch(() => ({}))

			const indexLoaded = data.index_loaded === true
			const readyForSearch = data.ready_for_search === true
			const glossaryEntries = data.glossary_entries || 0
			const variantsCount = data.variants_count || 0

			if (indexLoaded && readyForSearch) {
				return {
					status: "healthy",
					message: `FAISS index: ${glossaryEntries} termes, ${variantsCount} variants`,
					latencyMs,
					provider: "faiss",
				}
			} else if (indexLoaded) {
				return {
					status: "degraded",
					message: "Index loaded but not ready for search",
					latencyMs,
					provider: "faiss",
				}
			} else {
				return {
					status: "unavailable",
					message: "FAISS index not loaded - run /vectorize",
					latencyMs,
					provider: "faiss",
				}
			}
		} else {
			return {
				status: "error",
				message: `RAG service responded with status ${response.status}`,
				latencyMs,
				provider: "faiss",
			}
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime

		if (error.message?.includes("ECONNREFUSED") || error.cause?.code === "ECONNREFUSED") {
			return {
				status: "unavailable",
				message: "RAG service not running",
				latencyMs,
				provider: "faiss",
			}
		}

		if (error.name === "TimeoutError") {
			return {
				status: "error",
				message: "RAG service timeout",
				latencyMs,
				provider: "faiss",
			}
		}

		return {
			status: "error",
			message: error.message || "Failed to connect to Vector DB",
			latencyMs,
			provider: "faiss",
		}
	}
}

/**
 * Health check for LLM and AI services
 * Tests connectivity to Vertex AI, local models, embeddings, and vector database
 */
export const llmHealthCheck = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	const startTime = Date.now()

	try {
		logger.info("LLM health check initiated", {
			uid: request.auth?.uid,
			timestamp: new Date().toISOString(),
		})

		// Run all health checks in parallel
		const [geminiResult, salamandraResult, aliaResult, localSalamandraResult, embeddingResult, vectorDBResult] = await Promise.all([
			checkGeminiHealth(),
			checkSalamandraHealth(),
			checkAliaHealth(),
			checkLocalSalamandraHealth(),
			checkEmbeddingServiceHealth(),
			checkVectorDBHealth(),
		])

		const services = {
			vertexGemini: geminiResult,
			vertexSalamandra: salamandraResult,
			vertexAlia: aliaResult,
			localSalamandra: localSalamandraResult,
			embeddingService: embeddingResult,
			vectorDB: vectorDBResult,
		}

		// Determine overall status
		const allStatuses = Object.values(services).map((s) => s.status)
		let overallStatus: "healthy" | "degraded" | "error" = "healthy"

		if (allStatuses.some((s) => s === "error")) {
			overallStatus = "error"
		} else if (allStatuses.some((s) => s === "degraded" || s === "unavailable")) {
			overallStatus = "degraded"
		}

		const responseTime = Date.now() - startTime

		logger.info("LLM health check completed", {
			status: overallStatus,
			responseTime,
		})

		return {
			success: true,
			message: "LLM health check completed",
			data: {
				timestamp: new Date().toISOString(),
				status: overallStatus,
				services,
				responseTime: `${responseTime}ms`,
			},
		}
	} catch (error: any) {
		logger.error("LLM health check failed", error)

		return {
			success: false,
			message: "LLM health check failed",
			error: error.message,
			timestamp: new Date().toISOString(),
		}
	}
})

/**
 * Test endpoint for Vertex AI Gemini
 * Performs a simple generation request to verify connectivity
 */
export const testVertexGemini = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	try {
		logger.info("Testing Vertex AI Gemini", {
			uid: request.auth?.uid,
		})

		const result = await checkGeminiHealth()

		return {
			success: result.status === "healthy",
			message: result.message,
			data: result,
		}
	} catch (error: any) {
		logger.error("Vertex AI Gemini test failed", error)

		return {
			success: false,
			message: "Vertex AI Gemini test failed",
			error: error.message,
		}
	}
})

/**
 * Test endpoint for Vertex AI Salamandra model
 * Verifies the deployed model endpoint is responding
 */
export const testVertexSalamandra = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	try {
		logger.info("Testing Vertex AI Salamandra", {
			uid: request.auth?.uid,
		})

		const result = await checkSalamandraHealth()

		return {
			success: result.status === "healthy",
			message: result.message,
			data: result,
		}
	} catch (error: any) {
		logger.error("Vertex AI Salamandra test failed", error)

		return {
			success: false,
			message: "Vertex AI Salamandra test failed",
			error: error.message,
		}
	}
})

/**
 * Test endpoint for local Salamandra model
 * Verifies local model server is running and responding
 */
export const testLocalSalamandra = onCall({ region: REGION }, async (request) => {
	try {
		logger.info("Testing local Salamandra model", {
			uid: request.auth?.uid,
		})

		const result = await checkLocalSalamandraHealth()

		return {
			success: result.status === "healthy",
			message: result.message,
			data: result,
		}
	} catch (error: any) {
		logger.error("Local Salamandra test failed", error)

		return {
			success: false,
			message: "Local Salamandra test failed",
			error: error.message,
		}
	}
})

/**
 * Test endpoint for Vertex AI ALIA-40b model
 * Verifies the deployed model endpoint is responding
 */
export const testVertexAlia = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	try {
		logger.info("Testing Vertex AI ALIA-40b", {
			uid: request.auth?.uid,
		})

		const result = await checkAliaHealth()

		return {
			success: result.status === "healthy",
			message: result.message,
			data: result,
		}
	} catch (error: any) {
		logger.error("Vertex AI ALIA-40b test failed", error)

		return {
			success: false,
			message: "Vertex AI ALIA-40b test failed",
			error: error.message,
		}
	}
})
