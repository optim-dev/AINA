/**
 * Vertical Process Handler
 *
 * Orchestrates the full vertical linguistic processing pipeline:
 * Step 1: Orthographic and syntactic correction (LanguageTool)
 * Step 2: RAG terminological correction
 * Step 3: Style and tone validation
 *
 * This handler combines all three processing stages from the kit module
 * into a single unified endpoint for efficient processing.
 */

import * as logger from "firebase-functions/logger"
import { HttpsError } from "firebase-functions/v2/https"
import { getBigQueryManager } from "./BigQueryLogger"

// Import kit handlers
import { checkLanguageToolAPI, type LanguageToolRequest } from "../kit/languageToolHandler"

import { executeRAGProcess, type RAGProcessResponse } from "../kit/ragProcessHandler"

import { validateStyleToneHandler } from "../kit/styleToneHandler"

import type { ValidateStyleToneRequest, StyleAlert } from "../kit/types/styleTone"

// =============================================================================
// TYPES
// =============================================================================

export interface VerticalProcessRequest {
	text: string
	language?: string // Default: "ca" (Catalan)
	sessionId?: string
	model?: string // LLM model to use (e.g., "gemini-2.5-flash", "salamandra-7b-vertex")
	options?: {
		// LanguageTool options
		languageToolLevel?: "default" | "picky"
		skipLanguageTool?: boolean

		// RAG options
		skipRAG?: boolean
		ragSearchK?: number
		ragSearchThreshold?: number
		useNLPDetection?: boolean
		useLLMFallback?: boolean

		// Style/Tone options
		skipStyleTone?: boolean
		documentType?: string
		targetAudience?: string
	}
}

export interface LanguageToolMatch {
	message: string
	offset: number
	length: number
	replacements: Array<{ value: string }>
	context: {
		text: string
		offset: number
		length: number
	}
	rule: {
		id: string
		description?: string
		category?: {
			id: string
			name: string
		}
	}
}

export interface LanguageToolResult {
	success: boolean
	matches: LanguageToolMatch[]
	matchesCount: number
	processedText: string
	requestId: string
	latencyMs: number
	error?: string
}

export interface RAGResult {
	success: boolean
	termChanges: Array<{
		original: string
		corrected: string
		terme_recomanat: string
		confidence: number
		context: string
		position?: { start: number; end: number }
		reason: string
	}>
	termChangesCount: number
	processedText: string
	candidates: Array<{
		term: string
		position: number
		context: string
		source: "hash" | "llm" | "nlp"
	}>
	stats: {
		totalCandidates: number
		nlpDetected: number
		hashDetected: number
		llmDetected: number
		correctionsApplied: number
		processingTimeMs: number
	}
	error?: string
}

export interface StyleToneResult {
	success: boolean
	styleIssues: Array<{
		id: string
		type: string
		message: string
		severity: "error" | "warning" | "info"
		suggestion?: string
		context?: {
			text: string
			sentence?: string
		}
	}>
	scores: {
		overall: number
		styleCoherence: number
		toneAdequacy: number
		clarity: number
		formality: number
		terminologyConsistency: number
	}
	toneAnalysis: {
		detectedTone: string
		emotionalTone: string
		objectivity: number
		confidence: number
	}
	metrics: {
		wordCount: number
		sentenceCount: number
		averageSentenceLength: number
		lexicalDiversity: number
		passiveVoicePercentage: number
		readabilityScore: number
	}
	recommendations: Array<{
		id: string
		category: string
		message: string
		priority: "high" | "medium" | "low"
	}>
	processedText: string
	latencyMs: number
	error?: string
}

export interface VerticalProcessResponse {
	success: boolean
	originalText: string
	finalText: string

	step1: LanguageToolResult
	step2: RAGResult
	step3: StyleToneResult

	summary: {
		totalErrors: number
		orthographicErrors: number
		terminologicalChanges: number
		styleIssues: number
		overallScore: number
	}

	metadata: {
		requestId: string
		userId?: string
		sessionId?: string
		totalProcessingTimeMs: number
		pipelineVersion: string
		timestamp: string
	}
}

export interface VerticalProcessLog {
	requestId: string
	timestamp: Date
	userId?: string
	sessionId?: string
	module: string

	inputText: string
	inputLength: number
	finalText: string
	finalLength: number

	step1Success: boolean
	step1MatchesCount: number
	step1LatencyMs: number
	step1Error?: string

	step2Success: boolean
	step2TermChangesCount: number
	step2LatencyMs: number
	step2Error?: string

	step3Success: boolean
	step3IssuesCount: number
	step3OverallScore: number
	step3LatencyMs: number
	step3Error?: string

	totalProcessingTimeMs: number
	overallSuccess: boolean
	pipelineVersion: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || "aina-demostradors"
const DATASET_ID = "kit_logs"
const TABLE_ID = "vertical_process_logs"
const PIPELINE_VERSION = "1.0.0"

// Use centralized BigQuery manager
function getBigQueryManager_() {
	return getBigQueryManager(PROJECT_ID, DATASET_ID)
}

// =============================================================================
// LOGGING
// =============================================================================

const VERTICAL_PROCESS_SCHEMA = [
	{ name: "requestId", type: "STRING", mode: "REQUIRED" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" },
	{ name: "userId", type: "STRING", mode: "NULLABLE" },
	{ name: "sessionId", type: "STRING", mode: "NULLABLE" },
	{ name: "module", type: "STRING", mode: "REQUIRED" },
	{ name: "inputText", type: "STRING", mode: "REQUIRED" },
	{ name: "inputLength", type: "INTEGER", mode: "REQUIRED" },
	{ name: "finalText", type: "STRING", mode: "REQUIRED" },
	{ name: "finalLength", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step1Success", type: "BOOLEAN", mode: "REQUIRED" },
	{ name: "step1MatchesCount", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step1LatencyMs", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step1Error", type: "STRING", mode: "NULLABLE" },
	{ name: "step2Success", type: "BOOLEAN", mode: "REQUIRED" },
	{ name: "step2TermChangesCount", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step2LatencyMs", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step2Error", type: "STRING", mode: "NULLABLE" },
	{ name: "step3Success", type: "BOOLEAN", mode: "REQUIRED" },
	{ name: "step3IssuesCount", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step3OverallScore", type: "FLOAT", mode: "REQUIRED" },
	{ name: "step3LatencyMs", type: "INTEGER", mode: "REQUIRED" },
	{ name: "step3Error", type: "STRING", mode: "NULLABLE" },
	{ name: "totalProcessingTimeMs", type: "INTEGER", mode: "REQUIRED" },
	{ name: "overallSuccess", type: "BOOLEAN", mode: "REQUIRED" },
	{ name: "pipelineVersion", type: "STRING", mode: "REQUIRED" },
]

/**
 * Generate unique request ID
 */
export function generateVerticalProcessRequestId(): string {
	return `vp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create BigQuery logger for vertical process
 */
export function createVerticalProcessLogger(projectId: string = PROJECT_ID) {
	return async (log: VerticalProcessLog): Promise<void> => {
		try {
			const manager = getBigQueryManager_()

			// Ensure table exists using manager
			await manager.ensureTable(TABLE_ID, VERTICAL_PROCESS_SCHEMA, {
				timePartitioning: {
					type: "DAY",
					field: "timestamp",
				},
			})

			// Insert log row
			const row = {
				...log,
				timestamp: log.timestamp.toISOString(),
			}

			await manager.insert(TABLE_ID, [row])
			logger.info("Logged vertical process to BigQuery", { requestId: log.requestId })
		} catch (error: any) {
			logger.error("Failed to log vertical process to BigQuery", {
				error: error.message,
				requestId: log.requestId,
			})
		}
	}
}

// Initialize logger
const logVerticalProcess = createVerticalProcessLogger(PROJECT_ID)

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Execute the full vertical processing pipeline
 *
 * @param request - The processing request with text and options
 * @param auth - Optional authentication context
 * @returns Complete processing results from all three steps
 */
export async function executeVerticalProcess(request: VerticalProcessRequest, auth?: { uid?: string }): Promise<{ result: VerticalProcessResponse; requestId: string }> {
	const requestId = generateVerticalProcessRequestId()
	const startTime = Date.now()
	const userId = auth?.uid
	const { text, language = "ca", sessionId, model, options = {} } = request

	if (!text || typeof text !== "string" || text.trim().length === 0) {
		throw new HttpsError("invalid-argument", "Text is required and must be a non-empty string")
	}

	logger.info("Starting vertical process", {
		requestId,
		userId,
		textLength: text.length,
		model,
		options,
	})

	let processedText = text

	// Initialize result objects
	let step1Result: LanguageToolResult = {
		success: false,
		matches: [],
		matchesCount: 0,
		processedText: text,
		requestId: "",
		latencyMs: 0,
	}

	let step2Result: RAGResult = {
		success: false,
		termChanges: [],
		termChangesCount: 0,
		processedText: text,
		candidates: [],
		stats: {
			totalCandidates: 0,
			nlpDetected: 0,
			hashDetected: 0,
			llmDetected: 0,
			correctionsApplied: 0,
			processingTimeMs: 0,
		},
	}

	let step3Result: StyleToneResult = {
		success: false,
		styleIssues: [],
		scores: {
			overall: 0,
			styleCoherence: 0,
			toneAdequacy: 0,
			clarity: 0,
			formality: 0,
			terminologyConsistency: 0,
		},
		toneAnalysis: {
			detectedTone: "unknown",
			emotionalTone: "neutre",
			objectivity: 0,
			confidence: 0,
		},
		metrics: {
			wordCount: 0,
			sentenceCount: 0,
			averageSentenceLength: 0,
			lexicalDiversity: 0,
			passiveVoicePercentage: 0,
			readabilityScore: 0,
		},
		recommendations: [],
		processedText: text,
		latencyMs: 0,
	}

	// ==========================================================================
	// STEP 1: LanguageTool - Orthographic and syntactic correction
	// ==========================================================================
	if (!options.skipLanguageTool) {
		const step1Start = Date.now()
		try {
			logger.info("Step 1: Starting LanguageTool check", { requestId })

			const ltRequest: LanguageToolRequest = {
				text: processedText,
				language: language,
				level: options.languageToolLevel || "picky",
				sessionId,
			}

			const ltResponse = await checkLanguageToolAPI(ltRequest, auth)

			// Apply LanguageTool corrections to the text
			let correctedText = processedText
			const matches = ltResponse.result.matches || []

			// Sort matches by offset in reverse order to apply from end to start
			// This prevents offset shifting when replacing
			const sortedMatches = [...matches].sort((a: any, b: any) => b.offset - a.offset)

			for (const match of sortedMatches) {
				if (match.replacements && match.replacements.length > 0 && match.offset !== undefined && match.length !== undefined) {
					const replacement = match.replacements[0].value
					correctedText = correctedText.substring(0, match.offset) + replacement + correctedText.substring(match.offset + match.length)
				}
			}

			step1Result = {
				success: true,
				matches: matches,
				matchesCount: matches.length,
				processedText: correctedText,
				requestId: ltResponse.requestId,
				latencyMs: ltResponse.latencyMs,
			}

			// Update processed text for next step
			processedText = correctedText

			logger.info("Step 1: LanguageTool completed", {
				requestId,
				matchesCount: step1Result.matchesCount,
				latencyMs: step1Result.latencyMs,
			})
		} catch (error: any) {
			logger.error("Step 1: LanguageTool failed", { requestId, error: error.message })
			step1Result = {
				...step1Result,
				success: false,
				latencyMs: Date.now() - step1Start,
				error: error.message,
			}
		}
	} else {
		step1Result.success = true
		logger.info("Step 1: Skipped LanguageTool check", { requestId })
	}

	// ==========================================================================
	// STEP 2: RAG Terminological correction
	// ==========================================================================
	if (!options.skipRAG) {
		const step2Start = Date.now()
		try {
			logger.info("Step 2: Starting RAG terminological process", { requestId })

			const ragResponse: RAGProcessResponse = await executeRAGProcess(
				processedText,
				userId || "",
				sessionId,
				{
					searchK: options.ragSearchK || 5,
					searchThreshold: options.ragSearchThreshold || 0.8,
					useNLPDetection: options.useNLPDetection !== false,
					useLLMFallback: options.useLLMFallback !== false,
				},
				model
			)

			// Convert RAG corrections to termChanges format
			const termChanges = ragResponse.corrections.map((c) => ({
				original: c.original,
				corrected: c.corrected,
				terme_recomanat: c.terme_recomanat,
				confidence: c.confidence,
				context: c.context,
				reason: `Terme normatiu: ${c.terme_recomanat}`,
			}))

			step2Result = {
				success: ragResponse.success,
				termChanges,
				termChangesCount: termChanges.length,
				processedText: ragResponse.improvedText,
				candidates: ragResponse.candidates,
				stats: ragResponse.stats,
			}

			// Update processed text for next step
			if (ragResponse.improvedText && ragResponse.improvedText !== processedText) {
				processedText = ragResponse.improvedText
			}

			logger.info("Step 2: RAG completed", {
				requestId,
				termChangesCount: step2Result.termChangesCount,
				latencyMs: ragResponse.stats.processingTimeMs,
			})
		} catch (error: any) {
			logger.error("Step 2: RAG process failed", { requestId, error: error.message })
			step2Result = {
				...step2Result,
				success: false,
				error: error.message,
			}
			step2Result.stats.processingTimeMs = Date.now() - step2Start
		}
	} else {
		step2Result.success = true
		logger.info("Step 2: Skipped RAG process", { requestId })
	}

	// ==========================================================================
	// STEP 3: Style and Tone validation
	// ==========================================================================
	if (!options.skipStyleTone) {
		const step3Start = Date.now()
		try {
			logger.info("Step 3: Starting style/tone validation", { requestId })

			const styleToneRequest: ValidateStyleToneRequest = {
				text: processedText,
				documentType: options.documentType as any,
				targetAudience: options.targetAudience as any,
				sessionId,
				model,
			}

			const { result: stResponse, processingTimeMs } = await validateStyleToneHandler(styleToneRequest, auth)

			// Convert alerts to styleIssues format for frontend
			const styleIssues = stResponse.alerts.map((alert: StyleAlert) => ({
				id: alert.id,
				type: alert.type,
				message: alert.message,
				severity: alert.severity,
				suggestion: alert.suggestion,
				context: alert.context
					? {
							text: alert.context.text,
							sentence: alert.context.sentence,
					  }
					: undefined,
			}))

			step3Result = {
				success: true,
				styleIssues,
				scores: stResponse.scores,
				toneAnalysis: stResponse.toneAnalysis,
				metrics: stResponse.styleMetrics,
				recommendations: stResponse.recommendations.map((r: any) => ({
					id: r.id,
					category: r.category,
					message: r.message,
					priority: r.priority,
				})),
				processedText,
				latencyMs: processingTimeMs,
			}

			logger.info("Step 3: Style/tone validation completed", {
				requestId,
				issuesCount: styleIssues.length,
				overallScore: stResponse.scores.overall,
				latencyMs: processingTimeMs,
			})
		} catch (error: any) {
			logger.error("Step 3: Style/tone validation failed", { requestId, error: error.message })
			step3Result = {
				...step3Result,
				success: false,
				latencyMs: Date.now() - step3Start,
				error: error.message,
			}
		}
	} else {
		step3Result.success = true
		logger.info("Step 3: Skipped style/tone validation", { requestId })
	}

	// ==========================================================================
	// BUILD FINAL RESPONSE
	// ==========================================================================
	const totalProcessingTimeMs = Date.now() - startTime
	const overallSuccess = step1Result.success && step2Result.success && step3Result.success

	const response: VerticalProcessResponse = {
		success: overallSuccess,
		originalText: text,
		finalText: processedText,

		step1: step1Result,
		step2: step2Result,
		step3: step3Result,

		summary: {
			totalErrors: step1Result.matchesCount + step2Result.termChangesCount + step3Result.styleIssues.length,
			orthographicErrors: step1Result.matchesCount,
			terminologicalChanges: step2Result.termChangesCount,
			styleIssues: step3Result.styleIssues.length,
			overallScore: step3Result.scores.overall,
		},

		metadata: {
			requestId,
			userId,
			sessionId,
			totalProcessingTimeMs,
			pipelineVersion: PIPELINE_VERSION,
			timestamp: new Date().toISOString(),
		},
	}

	// Log to BigQuery (async, don't await)
	logVerticalProcess({
		requestId,
		timestamp: new Date(),
		userId,
		sessionId,
		module: "kit",
		inputText: text,
		inputLength: text.length,
		finalText: processedText,
		finalLength: processedText.length,
		step1Success: step1Result.success,
		step1MatchesCount: step1Result.matchesCount,
		step1LatencyMs: step1Result.latencyMs,
		step1Error: step1Result.error,
		step2Success: step2Result.success,
		step2TermChangesCount: step2Result.termChangesCount,
		step2LatencyMs: step2Result.stats.processingTimeMs,
		step2Error: step2Result.error,
		step3Success: step3Result.success,
		step3IssuesCount: step3Result.styleIssues.length,
		step3OverallScore: step3Result.scores.overall,
		step3LatencyMs: step3Result.latencyMs,
		step3Error: step3Result.error,
		totalProcessingTimeMs,
		overallSuccess,
		pipelineVersion: PIPELINE_VERSION,
	}).catch((e) => {
		logger.error("Failed to log vertical process", { error: e.message, requestId })
	})

	logger.info("Vertical process completed", {
		requestId,
		overallSuccess,
		totalProcessingTimeMs,
		summary: response.summary,
	})

	return { result: response, requestId }
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface VerticalProcessStats {
	totalExecutions: number
	successRate: number
	averageProcessingTimeMs: number
	averageScore: number
	stepStats: {
		step1: { successRate: number; avgMatches: number; avgLatencyMs: number }
		step2: { successRate: number; avgChanges: number; avgLatencyMs: number }
		step3: { successRate: number; avgIssues: number; avgLatencyMs: number }
	}
	periodStart: string
	periodEnd: string
}

/**
 * Get vertical process statistics
 */
export async function getVerticalProcessStats(days: number = 30): Promise<VerticalProcessStats> {
	try {
		const manager = getBigQueryManager_()
		const query = `
			SELECT
				COUNT(*) as totalExecutions,
				COUNTIF(overallSuccess = TRUE) / COUNT(*) * 100 as successRate,
				AVG(totalProcessingTimeMs) as avgProcessingTimeMs,
				AVG(step3OverallScore) as avgScore,
				
				COUNTIF(step1Success = TRUE) / COUNT(*) * 100 as step1SuccessRate,
				AVG(step1MatchesCount) as step1AvgMatches,
				AVG(step1LatencyMs) as step1AvgLatencyMs,
				
				COUNTIF(step2Success = TRUE) / COUNT(*) * 100 as step2SuccessRate,
				AVG(step2TermChangesCount) as step2AvgChanges,
				AVG(step2LatencyMs) as step2AvgLatencyMs,
				
				COUNTIF(step3Success = TRUE) / COUNT(*) * 100 as step3SuccessRate,
				AVG(step3IssuesCount) as step3AvgIssues,
				AVG(step3LatencyMs) as step3AvgLatencyMs,
				
				MIN(timestamp) as periodStart,
				MAX(timestamp) as periodEnd
			FROM \`${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\`
			WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
		`

		const rows = await manager.query(query)
		const row = rows[0] || {}

		return {
			totalExecutions: row.totalExecutions || 0,
			successRate: row.successRate || 0,
			averageProcessingTimeMs: Math.round(row.avgProcessingTimeMs || 0),
			averageScore: Math.round((row.avgScore || 0) * 10) / 10,
			stepStats: {
				step1: {
					successRate: row.step1SuccessRate || 0,
					avgMatches: Math.round((row.step1AvgMatches || 0) * 10) / 10,
					avgLatencyMs: Math.round(row.step1AvgLatencyMs || 0),
				},
				step2: {
					successRate: row.step2SuccessRate || 0,
					avgChanges: Math.round((row.step2AvgChanges || 0) * 10) / 10,
					avgLatencyMs: Math.round(row.step2AvgLatencyMs || 0),
				},
				step3: {
					successRate: row.step3SuccessRate || 0,
					avgIssues: Math.round((row.step3AvgIssues || 0) * 10) / 10,
					avgLatencyMs: Math.round(row.step3AvgLatencyMs || 0),
				},
			},
			periodStart: row.periodStart?.toISOString() || new Date().toISOString(),
			periodEnd: row.periodEnd?.toISOString() || new Date().toISOString(),
		}
	} catch (error: any) {
		logger.error("Failed to get vertical process stats", { error: error.message })
		throw error
	}
}
