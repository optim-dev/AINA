/**
 * LLM Health Service - Frontend service for checking LLM health status
 *
 * This service provides methods to check the health of various LLM services
 * including Vertex AI Gemini, Salamandra, and local model deployments.
 */

import { httpsCallable } from "firebase/functions"
import { functions } from "./firebase"

// Types for health check responses
export type HealthStatus = "healthy" | "degraded" | "error" | "unavailable" | "checking"

export interface ServiceHealth {
	status: HealthStatus
	message: string
	latencyMs?: number
	model?: string
	endpoint?: string
	provider?: string
}

export interface LLMHealthResponse {
	success: boolean
	message: string
	data?: {
		timestamp: string
		status: "healthy" | "degraded" | "error"
		services: {
			vertexGemini: ServiceHealth
			vertexSalamandra: ServiceHealth
			vertexAlia: ServiceHealth
			localSalamandra: ServiceHealth
			embeddingService: ServiceHealth
			vectorDB: ServiceHealth
		}
		responseTime: string
	}
	error?: string
}

export interface SingleTestResponse {
	success: boolean
	message: string
	data?: ServiceHealth
	error?: string
}

/**
 * Check health of all LLM services
 * This calls the llmHealthCheck Firebase function which tests all services in parallel
 */
export async function checkAllLLMHealth(): Promise<LLMHealthResponse> {
	try {
		const llmHealthCheck = httpsCallable<void, LLMHealthResponse>(functions, "llmHealthCheck")
		const result = await llmHealthCheck()
		return result.data
	} catch (error: any) {
		console.error("Failed to check LLM health:", error)
		return {
			success: false,
			message: "Failed to check LLM health",
			error: error.message || "Unknown error",
		}
	}
}

/**
 * Test Vertex AI Gemini specifically
 */
export async function testGemini(): Promise<SingleTestResponse> {
	try {
		const testVertexGemini = httpsCallable<void, SingleTestResponse>(functions, "testVertexGemini")
		const result = await testVertexGemini()
		return result.data
	} catch (error: any) {
		console.error("Failed to test Gemini:", error)
		return {
			success: false,
			message: "Failed to test Gemini",
			error: error.message || "Unknown error",
		}
	}
}

/**
 * Test Vertex AI Salamandra specifically
 */
export async function testSalamandra(): Promise<SingleTestResponse> {
	try {
		const testVertexSalamandra = httpsCallable<void, SingleTestResponse>(functions, "testVertexSalamandra")
		const result = await testVertexSalamandra()
		return result.data
	} catch (error: any) {
		console.error("Failed to test Salamandra:", error)
		return {
			success: false,
			message: "Failed to test Salamandra",
			error: error.message || "Unknown error",
		}
	}
}

/**
 * Test local Salamandra model specifically
 */
export async function testLocalSalamandra(): Promise<SingleTestResponse> {
	try {
		const testLocalSalamandraFn = httpsCallable<void, SingleTestResponse>(functions, "testLocalSalamandra")
		const result = await testLocalSalamandraFn()
		return result.data
	} catch (error: any) {
		console.error("Failed to test local Salamandra:", error)
		return {
			success: false,
			message: "Failed to test local Salamandra",
			error: error.message || "Unknown error",
		}
	}
}

/**
 * Test Vertex AI ALIA-40b specifically
 */
export async function testAlia(): Promise<SingleTestResponse> {
	try {
		const testVertexAlia = httpsCallable<void, SingleTestResponse>(functions, "testVertexAlia")
		const result = await testVertexAlia()
		return result.data
	} catch (error: any) {
		console.error("Failed to test ALIA-40b:", error)
		return {
			success: false,
			message: "Failed to test ALIA-40b",
			error: error.message || "Unknown error",
		}
	}
}

/**
 * Map backend status to frontend status constant
 */
export function mapHealthStatus(backendStatus: string): HealthStatus {
	switch (backendStatus) {
		case "healthy":
			return "healthy"
		case "degraded":
			return "degraded"
		case "error":
			return "error"
		case "unavailable":
			return "unavailable"
		default:
			return "checking"
	}
}
