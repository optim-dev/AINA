/**
 * LanguageTool Handler
 * Handles all LanguageTool-related logic including API calls, logging, and statistics
 */

import * as logger from "firebase-functions/logger"
import { HttpsError } from "firebase-functions/v2/https"
import { createLanguageToolLogger, getLanguageToolStats, getRecentCorrections, type LanguageToolMatch } from "./LanguageToolLogger"

// Configuration
const LANGUAGETOOL_URL = process.env.LANGUAGETOOL_URL || "http://localhost:8010"
const PROJECT_ID = "aina-demostradors"

// Initialize LanguageTool logger (similar to LLMService pattern)
const logLanguageTool = createLanguageToolLogger(PROJECT_ID)

// Request interface
export interface LanguageToolRequest {
	text: string
	language?: string
	level?: string
	sessionId?: string
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
	return `lt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Categorize matches by error type
 */
export function categorizeMatches(matches: LanguageToolMatch[]): Record<string, number> {
	const categories: Record<string, number> = {}
	for (const match of matches) {
		const category = match.rule?.category?.name || "General"
		categories[category] = (categories[category] || 0) + 1
	}
	return categories
}

/**
 * Check text with LanguageTool API
 */
export async function checkLanguageToolAPI(
	request: LanguageToolRequest,
	auth?: { uid?: string }
): Promise<{
	result: any
	requestId: string
	latencyMs: number
}> {
	const { text, language = "ca", level = "default", sessionId } = request
	const requestId = generateRequestId()
	const startTime = Date.now()

	if (!text || typeof text !== "string" || text.trim().length === 0) {
		throw new HttpsError("invalid-argument", "Text is required and must be a non-empty string")
	}

	try {
		logger.info("LanguageTool check requested", {
			requestId,
			textLength: text.length,
			language,
			level,
			userId: auth?.uid,
		})

		const formData = new URLSearchParams()
		formData.append("language", language)
		formData.append("level", level)
		formData.append("text", text)

		console.log("LANGUAGETOOL_URL", LANGUAGETOOL_URL)
		const response = await fetch(`${LANGUAGETOOL_URL}/v2/check`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		})

		const latencyMs = Date.now() - startTime

		if (!response.ok) {
			logger.error("LanguageTool API error", {
				requestId,
				status: response.status,
				statusText: response.statusText,
			})

			// Log failed request
			await logLanguageTool({
				requestId,
				timestamp: new Date(),
				userId: auth?.uid,
				sessionId,
				module: "kit",
				inputText: text,
				inputLength: text.length,
				language,
				level,
				matchesCount: 0,
				matches: [],
				errorsByCategory: {},
				latencyMs,
				success: false,
				error: `API error: ${response.status} ${response.statusText}`,
			})

			throw new HttpsError("internal", `LanguageTool API error: ${response.status} ${response.statusText}`)
		}

		const result = await response.json()
		const matches: LanguageToolMatch[] = result.matches || []
		const errorsByCategory = categorizeMatches(matches)

		logger.info("LanguageTool check completed", {
			requestId,
			matchesFound: matches.length,
			latencyMs,
			userId: auth?.uid,
		})

		// Log successful request to BigQuery
		await logLanguageTool({
			requestId,
			timestamp: new Date(),
			userId: auth?.uid,
			sessionId,
			module: "kit",
			inputText: text,
			inputLength: text.length,
			language,
			level,
			matchesCount: matches.length,
			matches,
			errorsByCategory,
			latencyMs,
			success: true,
		})

		// Return result with additional metadata
		return {
			result: {
				...result,
				_meta: {
					requestId,
					latencyMs,
					module: "kit",
				},
			},
			requestId,
			latencyMs,
		}
	} catch (error: any) {
		const latencyMs = Date.now() - startTime

		logger.error("Error calling LanguageTool", {
			requestId,
			error: error.message,
			userId: auth?.uid,
		})

		// Log error to BigQuery if not already logged
		if (!(error instanceof HttpsError)) {
			await logLanguageTool({
				requestId,
				timestamp: new Date(),
				userId: auth?.uid,
				sessionId,
				module: "kit",
				inputText: text,
				inputLength: text.length,
				language,
				level,
				matchesCount: 0,
				matches: [],
				errorsByCategory: {},
				latencyMs,
				success: false,
				error: error.message,
			})
		}

		if (error instanceof HttpsError) {
			throw error
		}

		// Check if it's a network error
		if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
			throw new HttpsError("unavailable", "LanguageTool service is not available. Please ensure the container is running.")
		}

		throw new HttpsError("internal", "Failed to process text with LanguageTool")
	}
}

/**
 * Get LanguageTool statistics
 */
export async function fetchLanguageToolStats(startDate?: Date, endDate?: Date) {
	logger.info("Fetching LanguageTool statistics", { startDate, endDate })
	return getLanguageToolStats(PROJECT_ID, undefined, undefined, startDate, endDate)
}

/**
 * Get recent corrections
 */
export async function fetchRecentCorrections(limit: number = 50, userId?: string) {
	logger.info("Fetching recent LanguageTool corrections", { limit, userId })
	return getRecentCorrections(PROJECT_ID, undefined, undefined, limit, userId)
}
