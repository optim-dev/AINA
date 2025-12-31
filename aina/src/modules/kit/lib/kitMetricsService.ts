/**
 * Kit Metrics Service
 * Aggregates metrics from all Kit module BigQuery logs:
 * - LanguageTool logs (spelling/grammar checks)
 * - Style/Tone logs (style validation)
 * - RAG Process logs (terminological corrections)
 * - LLM logs (language model usage)
 */

// =====================================================
// Types
// =====================================================

export interface LanguageToolStats {
	totalRequests: number
	successfulRequests: number
	failedRequests: number
	totalCharactersProcessed: number
	totalErrorsDetected: number
	avgErrorsPerRequest: number
	avgLatencyMs: number
	avgInputLength: number
	errorsByCategory: Record<string, number>
	topErrors: Array<{ message: string; count: number; category: string }>
	requestsByDay: Array<{ date: string; requests: number; errors: number }>
}

export interface StyleToneStats {
	totalValidations: number
	avgOverallScore: number
	avgStyleCoherence: number
	avgToneAdequacy: number
	avgProcessingTimeMs: number
	toneDistribution: Record<string, number>
	documentTypeDistribution: Record<string, number>
	alertsByType: Record<string, number>
	alertsBySeverity: { error: number; warning: number; info: number }
	validationsByDay: Array<{ date: string; count: number; avgScore: number }>
	topAlertRules: Array<{ rule: string; count: number }>
}

export interface RAGProcessStats {
	totalExecutions: number
	successfulExecutions: number
	failedExecutions: number
	totalCandidatesDetected: number
	totalCorrectionsApplied: number
	avgCandidatesPerExecution: number
	avgCorrectionsPerExecution: number
	avgProcessingTimeMs: number
	nlpDetectionRate: number
	hashDetectionRate: number
	llmDetectionRate: number
	executionsByDay: Array<{ date: string; count: number; corrections: number }>
	topTermsCorrections: Array<{ original: string; recommended: string; count: number }>
}

export interface KitAggregatedMetrics {
	// Terminology metrics (from RAG)
	terminologyCorrections: {
		totalCorrections: number
		correctionRate: number // % of candidates that were corrected
		avgCandidatesPerText: number
		avgCorrectionsPerText: number
		topTerms: Array<{ original: string; recommended: string; count: number }>
	}

	// Orthography metrics (from LanguageTool)
	orthography: {
		totalChecks: number
		totalErrorsDetected: number
		avgErrorsPerCheck: number
		errorsByCategory: Record<string, number>
		successRate: number
	}

	// Style metrics (from StyleTone)
	style: {
		totalValidations: number
		avgOverallScore: number
		avgStyleCoherence: number
		avgToneAdequacy: number
		avgClarity: number
		avgFormality: number
		toneDistribution: Record<string, number>
		alertsBySeverity: { error: number; warning: number; info: number }
	}

	// Feedback metrics (placeholder for future)
	feedback: {
		totalFeedback: number
		positiveRate: number
		avgSatisfactionScore: number
	}

	// Performance metrics
	performance: {
		avgLanguageToolLatencyMs: number
		avgStyleToneLatencyMs: number
		avgRAGLatencyMs: number
		overallAvgLatencyMs: number
	}

	// LLM usage (from LLM logs filtered by module=kit)
	llmUsage: {
		totalRequests: number
		tokensInput: number
		tokensOutput: number
		avgLatencyMs: number
		successRate: number
		estimatedCost: number
	}
}

// =====================================================
// Configuration
// =====================================================

const API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:5001/aina-demostradors/europe-west4" : "https://europe-west4-aina-demostradors.cloudfunctions.net"

// =====================================================
// Service Functions
// =====================================================

/**
 * Fetch LanguageTool statistics
 */
export async function getLanguageToolStats(startDate?: Date, endDate?: Date): Promise<LanguageToolStats> {
	const params = new URLSearchParams()
	if (startDate) params.append("startDate", startDate.toISOString())
	if (endDate) params.append("endDate", endDate.toISOString())

	const queryString = params.toString() ? `?${params.toString()}` : ""
	const response = await fetch(`${API_BASE_URL}/languageToolStats${queryString}`)

	if (!response.ok) {
		throw new Error(`Failed to fetch LanguageTool stats: ${response.statusText}`)
	}

	const data = await response.json()
	return data.data as LanguageToolStats
}

/**
 * Fetch Style/Tone statistics
 */
export async function getStyleToneStats(days: number = 30): Promise<StyleToneStats> {
	const response = await fetch(`${API_BASE_URL}/styleToneStats?days=${days}`)

	if (!response.ok) {
		throw new Error(`Failed to fetch Style/Tone stats: ${response.statusText}`)
	}

	const data = await response.json()
	return data.data as StyleToneStats
}

/**
 * Fetch RAG Process statistics via callable function
 */
export async function getRAGProcessStats(idToken: string): Promise<RAGProcessStats> {
	const { httpsCallable } = await import("firebase/functions")
	const { functions } = await import("@/services/firebase")

	const getStats = httpsCallable(functions, "getRAGProcessStats")
	const result = await getStats({})

	return (result.data as { success: boolean; stats: RAGProcessStats }).stats
}

/**
 * Fetch all Kit module metrics and aggregate them
 */
export async function getKitAggregatedMetrics(idToken: string, options: { days?: number; startDate?: Date; endDate?: Date } = {}): Promise<KitAggregatedMetrics> {
	const { days = 30 } = options

	// Calculate date range
	const endDate = options.endDate || new Date()
	const startDate = options.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000)

	// Fetch all stats in parallel
	const [languageToolStats, styleToneStats, ragStats] = await Promise.all([
		getLanguageToolStats(startDate, endDate).catch((e) => {
			console.warn("Failed to fetch LanguageTool stats:", e)
			return null
		}),
		getStyleToneStats(days).catch((e) => {
			console.warn("Failed to fetch StyleTone stats:", e)
			return null
		}),
		getRAGProcessStats(idToken).catch((e) => {
			console.warn("Failed to fetch RAG stats:", e)
			return null
		}),
	])

	// Calculate aggregated metrics
	const totalCandidates = ragStats?.totalCandidatesDetected || 0
	const totalCorrections = ragStats?.totalCorrectionsApplied || 0

	return {
		terminologyCorrections: {
			totalCorrections: totalCorrections,
			correctionRate: totalCandidates > 0 ? (totalCorrections / totalCandidates) * 100 : 0,
			avgCandidatesPerText: ragStats?.avgCandidatesPerExecution || 0,
			avgCorrectionsPerText: ragStats?.avgCorrectionsPerExecution || 0,
			topTerms: ragStats?.topTermsCorrections || [],
		},
		orthography: {
			totalChecks: languageToolStats?.totalRequests || 0,
			totalErrorsDetected: languageToolStats?.totalErrorsDetected || 0,
			avgErrorsPerCheck: languageToolStats?.avgErrorsPerRequest || 0,
			errorsByCategory: languageToolStats?.errorsByCategory || {},
			successRate: languageToolStats?.totalRequests ? ((languageToolStats.successfulRequests || 0) / languageToolStats.totalRequests) * 100 : 0,
		},
		style: {
			totalValidations: styleToneStats?.totalValidations || 0,
			avgOverallScore: styleToneStats?.avgOverallScore || 0,
			avgStyleCoherence: styleToneStats?.avgStyleCoherence || 0,
			avgToneAdequacy: styleToneStats?.avgToneAdequacy || 0,
			avgClarity: 0, // TODO: Add to StyleToneLogger if needed
			avgFormality: 0, // TODO: Add to StyleToneLogger if needed
			toneDistribution: styleToneStats?.toneDistribution || {},
			alertsBySeverity: styleToneStats?.alertsBySeverity || { error: 0, warning: 0, info: 0 },
		},
		feedback: {
			totalFeedback: 0, // TODO: Implement feedback tracking
			positiveRate: 0,
			avgSatisfactionScore: 0,
		},
		performance: {
			avgLanguageToolLatencyMs: languageToolStats?.avgLatencyMs || 0,
			avgStyleToneLatencyMs: styleToneStats?.avgProcessingTimeMs || 0,
			avgRAGLatencyMs: ragStats?.avgProcessingTimeMs || 0,
			overallAvgLatencyMs: ((languageToolStats?.avgLatencyMs || 0) + (styleToneStats?.avgProcessingTimeMs || 0) + (ragStats?.avgProcessingTimeMs || 0)) / 3,
		},
		llmUsage: {
			totalRequests: 0, // Will be populated from LLM logs
			tokensInput: 0,
			tokensOutput: 0,
			avgLatencyMs: 0,
			successRate: 0,
			estimatedCost: 0,
		},
	}
}
