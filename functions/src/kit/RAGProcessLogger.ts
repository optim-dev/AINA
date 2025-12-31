/**
 * RAGProcessLogger - BigQuery logging for RAG terminological correction process
 *
 * This module provides logging and querying for RAG process executions
 * Pattern follows LanguageToolLogger.ts and StyleToneLogger.ts
 *
 * Uses the centralized BigQueryClientManager from BigQueryLogger for all BigQuery operations.
 */

import * as logger from "firebase-functions/logger"
import { getBigQueryManager, DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"
import type { DetectedCandidate, RAGSearchResult } from "./ragProcessHandler"

// ============================================================================
// CONFIGURATION
// ============================================================================

// Re-export DEFAULT_DATASET_ID for backward compatibility
export { DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"
export const RAG_PROCESS_TABLE_ID = "rag_process_logs"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RAGProcessLog {
	requestId: string
	timestamp: Date
	userId: string
	sessionId?: string
	module: "kit" // Always "kit" for RAG process

	// Input
	originalText: string
	textLength: number

	// Configuration options (explicit fields for queryability)
	configDetectionThreshold: number
	configSearchThreshold: number
	configSearchK: number
	configContextWindow: number
	configUseLLMFallback: boolean
	configUseNLPDetection: boolean

	// Detection results
	candidatesCount: number
	nlpDetectedCount: number
	hashDetectedCount: number
	llmDetectedCount: number
	candidates: DetectedCandidate[]

	// Vector search results
	vectorResultsCount: number
	vectorResults: RAGSearchResult[]

	// Corrections
	correctionsCount: number
	corrections: Array<{
		original: string
		corrected: string
		terme_recomanat: string
		confidence: number
		context: string
	}>

	// Output
	improvedText: string
	success: boolean

	// Performance
	processingTimeMs: number

	// Error info (if failed)
	error?: string
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
	detectionMethodDistribution: {
		nlp: number
		hash: number
		llm: number
	}
	executionsByDay: Array<{ date: string; count: number; corrections: number }>
	topTermsCorrections: Array<{ original: string; recommended: string; count: number }>
}

// ============================================================================
// BIGQUERY SCHEMA
// ============================================================================

export const RAG_PROCESS_LOGS_SCHEMA = [
	{ name: "request_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the request" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "When the request was initiated" },
	{ name: "user_id", type: "STRING", mode: "REQUIRED", description: "User identifier" },
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session identifier" },
	{ name: "module", type: "STRING", mode: "REQUIRED", description: "AINA module (always 'kit' for RAG process)" },

	// Input
	{ name: "original_text", type: "STRING", mode: "NULLABLE", description: "The original text that was processed" },
	{ name: "text_length", type: "INTEGER", mode: "REQUIRED", description: "Length of input text in characters" },

	// Configuration options (explicit fields for filtering and analysis)
	{ name: "config_detection_threshold", type: "FLOAT", mode: "REQUIRED", description: "Similarity threshold for hash matching (default: 0.8)" },
	{ name: "config_search_threshold", type: "FLOAT", mode: "REQUIRED", description: "Similarity threshold for vector search (default: 0.8)" },
	{ name: "config_search_k", type: "INTEGER", mode: "REQUIRED", description: "Number of results from vector search (default: 5)" },
	{ name: "config_context_window", type: "INTEGER", mode: "REQUIRED", description: "Words before/after for context (default: 3)" },
	{ name: "config_use_llm_fallback", type: "BOOLEAN", mode: "REQUIRED", description: "Whether LLM fallback is enabled" },
	{ name: "config_use_nlp_detection", type: "BOOLEAN", mode: "REQUIRED", description: "Whether NLP lemmatization detection is enabled" },

	// Detection results
	{ name: "candidates_count", type: "INTEGER", mode: "REQUIRED", description: "Total number of candidates detected" },
	{ name: "nlp_detected_count", type: "INTEGER", mode: "REQUIRED", description: "Candidates detected via NLP" },
	{ name: "hash_detected_count", type: "INTEGER", mode: "REQUIRED", description: "Candidates detected via hash table" },
	{ name: "llm_detected_count", type: "INTEGER", mode: "REQUIRED", description: "Candidates detected via LLM fallback" },
	{ name: "candidates_json", type: "STRING", mode: "NULLABLE", description: "JSON array of detected candidates" },

	// Vector search results
	{ name: "vector_results_count", type: "INTEGER", mode: "REQUIRED", description: "Number of vector search results" },
	{ name: "vector_results_json", type: "STRING", mode: "NULLABLE", description: "JSON array of vector search results" },

	// Corrections
	{ name: "corrections_count", type: "INTEGER", mode: "REQUIRED", description: "Number of corrections applied" },
	{ name: "corrections_json", type: "STRING", mode: "NULLABLE", description: "JSON array of corrections applied" },

	// Output
	{ name: "improved_text", type: "STRING", mode: "NULLABLE", description: "The improved/corrected text" },
	{ name: "success", type: "BOOLEAN", mode: "REQUIRED", description: "Whether the process succeeded" },

	// Performance
	{ name: "processing_time_ms", type: "INTEGER", mode: "REQUIRED", description: "Processing time in milliseconds" },

	// Error info
	{ name: "error", type: "STRING", mode: "NULLABLE", description: "Error message if request failed" },
]

// ============================================================================
// SETUP FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

export async function setupRAGProcessTable(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, tableId: string = RAG_PROCESS_TABLE_ID): Promise<{ created: boolean }> {
	const manager = getBigQueryManager(projectId, datasetId)

	const created = await manager.ensureTable(tableId, RAG_PROCESS_LOGS_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "timestamp",
		},
		clustering: {
			fields: ["user_id", "success"],
		},
	})

	return { created }
}

// ============================================================================
// LOGGER FACTORY (Using centralized BigQueryClientManager)
// ============================================================================

/**
 * Create a BigQuery logging callback for RAG process executions
 *
 * This factory creates a callback function that automatically handles table setup
 * and logs all RAG process executions to BigQuery.
 *
 * Uses the centralized BigQueryClientManager for all operations.
 *
 * @param projectId - GCP project ID (optional, uses default credentials if not provided)
 * @param datasetId - BigQuery dataset ID (defaults to 'aina_mvp_metrics')
 * @param tableId - BigQuery table ID (defaults to 'rag_process_logs')
 * @returns Callback function that accepts RAGProcessLog
 *
 * @example
 * ```typescript
 * const logRAGProcess = createRAGProcessLogger('aina-demostradors')
 *
 * // Use in your function:
 * await logRAGProcess({
 *   requestId: 'rag_123',
 *   timestamp: new Date(),
 *   module: 'kit',
 *   userId: 'user_123',
 *   originalText: 'Text to process',
 *   // ... rest of log data
 * })
 * ```
 */
export function createRAGProcessLogger(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, tableId: string = RAG_PROCESS_TABLE_ID): (log: RAGProcessLog) => Promise<void> {
	let initialized = false
	const manager = getBigQueryManager(projectId, datasetId)

	return async (log: RAGProcessLog) => {
		try {
			// Ensure table exists on first use
			if (!initialized) {
				await setupRAGProcessTable(projectId, datasetId, tableId)
				initialized = true
			}

			await manager.insert(tableId, [
				{
					request_id: log.requestId,
					timestamp: log.timestamp.toISOString(),
					user_id: log.userId,
					session_id: log.sessionId || null,
					module: log.module,
					original_text: log.originalText?.substring(0, 10000) || null, // Limit stored text
					text_length: log.textLength,
					// Configuration options (explicit fields)
					config_detection_threshold: log.configDetectionThreshold,
					config_search_threshold: log.configSearchThreshold,
					config_search_k: log.configSearchK,
					config_context_window: log.configContextWindow,
					config_use_llm_fallback: log.configUseLLMFallback,
					config_use_nlp_detection: log.configUseNLPDetection,
					// Detection results
					candidates_count: log.candidatesCount,
					nlp_detected_count: log.nlpDetectedCount,
					hash_detected_count: log.hashDetectedCount,
					llm_detected_count: log.llmDetectedCount,
					candidates_json: JSON.stringify(log.candidates?.slice(0, 100) || []), // Limit stored candidates
					vector_results_count: log.vectorResultsCount,
					vector_results_json: JSON.stringify(log.vectorResults?.slice(0, 50) || []), // Limit stored results
					corrections_count: log.correctionsCount,
					corrections_json: JSON.stringify(log.corrections?.slice(0, 100) || []), // Limit stored corrections
					improved_text: log.improvedText?.substring(0, 10000) || null, // Limit stored text
					success: log.success,
					processing_time_ms: log.processingTimeMs,
					error: log.error || null,
				},
			])

			logger.debug("RAG process logged to BigQuery", { requestId: log.requestId })
		} catch (error: any) {
			logger.error("Failed to log RAG process to BigQuery", {
				error: error.message,
				requestId: log.requestId,
			})
		}
	}
}

// ============================================================================
// QUERY FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

export async function getRAGProcessStats(
	projectId: string = "aina-demostradors",
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = RAG_PROCESS_TABLE_ID,
	startDate?: Date,
	endDate?: Date
): Promise<RAGProcessStats> {
	const manager = getBigQueryManager(projectId, datasetId)
	const fullTableName = manager.getFullTableName(tableId)

	// Build date filter
	let dateFilter = ""
	const params: Record<string, any> = {}
	if (startDate) {
		dateFilter += " AND timestamp >= @startDate"
		params.startDate = startDate.toISOString()
	}
	if (endDate) {
		dateFilter += " AND timestamp <= @endDate"
		params.endDate = endDate.toISOString()
	}

	// Main stats query
	const statsQuery = `
		SELECT
			COUNT(*) as total_executions,
			COUNTIF(success = TRUE) as successful_executions,
			COUNTIF(success = FALSE) as failed_executions,
			SUM(candidates_count) as total_candidates,
			SUM(corrections_count) as total_corrections,
			AVG(candidates_count) as avg_candidates,
			AVG(corrections_count) as avg_corrections,
			AVG(processing_time_ms) as avg_processing_time_ms,
			SUM(nlp_detected_count) as nlp_detected,
			SUM(hash_detected_count) as hash_detected,
			SUM(llm_detected_count) as llm_detected
		FROM ${fullTableName}
		WHERE module = 'kit' ${dateFilter}
	`

	// Daily breakdown query
	const dailyQuery = `
		SELECT
			DATE(timestamp) as date,
			COUNT(*) as count,
			SUM(corrections_count) as corrections
		FROM ${fullTableName}
		WHERE module = 'kit' ${dateFilter}
		GROUP BY date
		ORDER BY date DESC
		LIMIT 30
	`

	// Top corrections query
	const topCorrectionsQuery = `
		WITH parsed_corrections AS (
			SELECT
				JSON_EXTRACT_SCALAR(correction_entry, '$.original') as original,
				JSON_EXTRACT_SCALAR(correction_entry, '$.terme_recomanat') as recommended
			FROM ${fullTableName},
			UNNEST(JSON_EXTRACT_ARRAY(corrections_json)) as correction_entry
			WHERE module = 'kit' AND success = TRUE ${dateFilter}
		)
		SELECT
			original,
			recommended,
			COUNT(*) as count
		FROM parsed_corrections
		WHERE original IS NOT NULL AND recommended IS NOT NULL
		GROUP BY original, recommended
		ORDER BY count DESC
		LIMIT 20
	`

	try {
		const client = await manager.getClient()
		const [statsRows] = await client.query({ query: statsQuery, params })
		const stats = statsRows[0] || {}

		let executionsByDay: Array<{ date: string; count: number; corrections: number }> = []
		let topTermsCorrections: Array<{ original: string; recommended: string; count: number }> = []

		try {
			const [dailyRows] = await client.query({ query: dailyQuery, params })
			executionsByDay = dailyRows.map((row: any) => ({
				date: row.date?.value || row.date,
				count: Number(row.count),
				corrections: Number(row.corrections),
			}))
		} catch (e) {
			logger.warn("Failed to get daily breakdown", { error: (e as Error).message })
		}

		try {
			const [topRows] = await client.query({ query: topCorrectionsQuery, params })
			topTermsCorrections = topRows.map((row: any) => ({
				original: row.original,
				recommended: row.recommended,
				count: Number(row.count),
			}))
		} catch (e) {
			logger.warn("Failed to get top corrections", { error: (e as Error).message })
		}

		const totalDetected = Number(stats.nlp_detected || 0) + Number(stats.hash_detected || 0) + Number(stats.llm_detected || 0)

		return {
			totalExecutions: Number(stats.total_executions) || 0,
			successfulExecutions: Number(stats.successful_executions) || 0,
			failedExecutions: Number(stats.failed_executions) || 0,
			totalCandidatesDetected: Number(stats.total_candidates) || 0,
			totalCorrectionsApplied: Number(stats.total_corrections) || 0,
			avgCandidatesPerExecution: Number(stats.avg_candidates) || 0,
			avgCorrectionsPerExecution: Number(stats.avg_corrections) || 0,
			avgProcessingTimeMs: Number(stats.avg_processing_time_ms) || 0,
			detectionMethodDistribution: {
				nlp: totalDetected > 0 ? Math.round((Number(stats.nlp_detected || 0) / totalDetected) * 100) : 0,
				hash: totalDetected > 0 ? Math.round((Number(stats.hash_detected || 0) / totalDetected) * 100) : 0,
				llm: totalDetected > 0 ? Math.round((Number(stats.llm_detected || 0) / totalDetected) * 100) : 0,
			},
			executionsByDay,
			topTermsCorrections,
		}
	} catch (error: any) {
		// If table doesn't exist, return empty stats
		if (error.message && error.message.includes("Not found")) {
			logger.info("RAG process table not found, returning empty stats")
			return {
				totalExecutions: 0,
				successfulExecutions: 0,
				failedExecutions: 0,
				totalCandidatesDetected: 0,
				totalCorrectionsApplied: 0,
				avgCandidatesPerExecution: 0,
				avgCorrectionsPerExecution: 0,
				avgProcessingTimeMs: 0,
				detectionMethodDistribution: { nlp: 0, hash: 0, llm: 0 },
				executionsByDay: [],
				topTermsCorrections: [],
			}
		}

		logger.error("Failed to get RAG process stats", { error: error.message })
		throw error
	}
}

export async function getRecentRAGExecutions(
	projectId: string = "aina-demostradors",
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = RAG_PROCESS_TABLE_ID,
	limit: number = 50,
	userId?: string
): Promise<
	Array<{
		requestId: string
		timestamp: string
		userId: string
		originalText: string
		improvedText: string
		candidatesCount: number
		correctionsCount: number
		corrections: any[]
		processingTimeMs: number
		success: boolean
	}>
> {
	const manager = getBigQueryManager(projectId, datasetId)
	const fullTableName = manager.getFullTableName(tableId)

	let userFilter = ""
	const params: Record<string, any> = { limit }
	if (userId) {
		userFilter = "AND user_id = @userId"
		params.userId = userId
	}

	const query = `
		SELECT
			request_id,
			timestamp,
			user_id,
			original_text,
			improved_text,
			candidates_count,
			corrections_count,
			corrections_json,
			processing_time_ms,
			success
		FROM ${fullTableName}
		WHERE module = 'kit' ${userFilter}
		ORDER BY timestamp DESC
		LIMIT @limit
	`

	try {
		const client = await manager.getClient()
		const [rows] = await client.query({ query, params })
		return rows.map((row: any) => ({
			requestId: row.request_id,
			timestamp: row.timestamp?.value || row.timestamp,
			userId: row.user_id,
			originalText: row.original_text,
			improvedText: row.improved_text,
			candidatesCount: row.candidates_count,
			correctionsCount: row.corrections_count,
			corrections: JSON.parse(row.corrections_json || "[]"),
			processingTimeMs: row.processing_time_ms,
			success: row.success,
		}))
	} catch (error: any) {
		// If table doesn't exist, return empty list
		if (error.message && error.message.includes("Not found")) {
			logger.info("RAG process table not found, returning empty list")
			return []
		}

		logger.error("Failed to get recent RAG executions", { error: error.message })
		return []
	}
}

/**
 * Generate a unique request ID for RAG process logging
 */
export function generateRAGProcessRequestId(): string {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 8)
	return `rag_${timestamp}_${random}`
}
