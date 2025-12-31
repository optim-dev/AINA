/**
 * LanguageToolLogger - BigQuery logging for LanguageTool interactions
 *
 * This module provides logging and querying for spelling/grammar check requests
 * All logs are categorized under module: "kit"
 *
 * Uses the centralized BigQueryClientManager from BigQueryLogger for all BigQuery operations.
 */

import * as logger from "firebase-functions/logger"
import { getBigQueryManager, DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"

// ============================================================================
// CONFIGURATION
// ============================================================================

// Re-export DEFAULT_DATASET_ID for backward compatibility
export { DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"
export const LANGUAGETOOL_TABLE_ID = "languagetool_logs"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LanguageToolMatch {
	message: string
	offset: number
	length: number
	replacements: Array<{ value: string }>
	rule: {
		id: string
		description?: string
		category: {
			id: string
			name: string
		}
	}
	context: {
		text: string
		offset: number
		length: number
	}
}

export interface LanguageToolLog {
	requestId: string
	timestamp: Date
	userId?: string
	sessionId?: string
	module: "kit" // Always "kit" for LanguageTool
	inputText: string
	inputLength: number
	language: string
	level: string
	matchesCount: number
	matches: LanguageToolMatch[]
	errorsByCategory: Record<string, number>
	latencyMs: number
	success: boolean
	error?: string
}

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

// ============================================================================
// BIGQUERY SCHEMA
// ============================================================================

export const LANGUAGETOOL_LOGS_SCHEMA = [
	{ name: "request_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the request" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "When the request was initiated" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User identifier" },
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session identifier" },
	{ name: "module", type: "STRING", mode: "REQUIRED", description: "AINA module (always 'kit' for LanguageTool)" },
	{ name: "input_text", type: "STRING", mode: "NULLABLE", description: "The text that was checked" },
	{ name: "input_length", type: "INTEGER", mode: "REQUIRED", description: "Length of input text in characters" },
	{ name: "language", type: "STRING", mode: "REQUIRED", description: "Language code (e.g., 'ca' for Catalan)" },
	{ name: "level", type: "STRING", mode: "REQUIRED", description: "Check level ('default' or 'picky')" },
	{ name: "matches_count", type: "INTEGER", mode: "REQUIRED", description: "Number of errors/issues found" },
	{ name: "matches_json", type: "STRING", mode: "NULLABLE", description: "JSON array of all matches/corrections" },
	{ name: "errors_by_category_json", type: "STRING", mode: "NULLABLE", description: "JSON object of error counts by category" },
	{ name: "latency_ms", type: "INTEGER", mode: "REQUIRED", description: "Request latency in milliseconds" },
	{ name: "success", type: "BOOLEAN", mode: "REQUIRED", description: "Whether the request succeeded" },
	{ name: "error", type: "STRING", mode: "NULLABLE", description: "Error message if request failed" },
]

// ============================================================================
// SETUP FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

export async function setupLanguageToolTable(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, tableId: string = LANGUAGETOOL_TABLE_ID): Promise<{ created: boolean }> {
	const manager = getBigQueryManager(projectId, datasetId)

	const created = await manager.ensureTable(tableId, LANGUAGETOOL_LOGS_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "timestamp",
		},
	})

	return { created }
}

// ============================================================================
// LOGGER FACTORY (Using centralized BigQueryClientManager)
// ============================================================================

/**
 * Create a BigQuery logging callback for LanguageTool
 *
 * This factory creates a callback function that automatically handles table setup
 * and logs all LanguageTool interactions to BigQuery.
 *
 * Uses the centralized BigQueryClientManager for all operations.
 *
 * @param projectId - GCP project ID (optional, uses default credentials if not provided)
 * @param datasetId - BigQuery dataset ID (defaults to 'aina_mvp_metrics')
 * @param tableId - BigQuery table ID (defaults to 'languagetool_logs')
 * @returns Callback function that accepts LanguageToolLog
 *
 * @example
 * ```typescript
 * const logLanguageTool = createLanguageToolLogger('aina-demostradors')
 *
 * // Use in your function:
 * await logLanguageTool({
 *   requestId: 'lt_123',
 *   timestamp: new Date(),
 *   module: 'kit',
 *   inputText: 'Text to check',
 *   // ... rest of log data
 * })
 * ```
 */
export function createLanguageToolLogger(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, tableId: string = LANGUAGETOOL_TABLE_ID): (log: LanguageToolLog) => Promise<void> {
	let initialized = false
	const manager = getBigQueryManager(projectId, datasetId)

	return async (log: LanguageToolLog) => {
		try {
			// Ensure table exists on first use
			if (!initialized) {
				await setupLanguageToolTable(projectId, datasetId, tableId)
				initialized = true
			}

			await manager.insert(tableId, [
				{
					request_id: log.requestId,
					timestamp: log.timestamp.toISOString(),
					user_id: log.userId || null,
					session_id: log.sessionId || null,
					module: log.module,
					input_text: log.inputText.substring(0, 10000), // Limit stored text
					input_length: log.inputLength,
					language: log.language,
					level: log.level,
					matches_count: log.matchesCount,
					matches_json: JSON.stringify(log.matches.slice(0, 100)), // Limit stored matches
					errors_by_category_json: JSON.stringify(log.errorsByCategory),
					latency_ms: log.latencyMs,
					success: log.success,
					error: log.error || null,
				},
			])

			logger.debug("LanguageTool request logged to BigQuery", { requestId: log.requestId })
		} catch (error: any) {
			logger.error("Failed to log LanguageTool request to BigQuery", {
				error: error.message,
				requestId: log.requestId,
			})
		}
	}
}

// ============================================================================
// QUERY FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

export async function getLanguageToolStats(
	projectId: string = "aina-demostradors",
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = LANGUAGETOOL_TABLE_ID,
	startDate?: Date,
	endDate?: Date
): Promise<LanguageToolStats> {
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
			COUNT(*) as total_requests,
			COUNTIF(success = TRUE) as successful_requests,
			COUNTIF(success = FALSE) as failed_requests,
			SUM(input_length) as total_characters,
			SUM(matches_count) as total_errors,
			AVG(matches_count) as avg_errors_per_request,
			AVG(latency_ms) as avg_latency_ms,
			AVG(input_length) as avg_input_length
		FROM ${fullTableName}
		WHERE module = 'kit' ${dateFilter}
	`

	// Category breakdown query
	const categoryQuery = `
		SELECT
			JSON_EXTRACT_SCALAR(category_entry, '$') as category,
			SUM(CAST(JSON_EXTRACT_SCALAR(category_entry, '$') AS INT64)) as count
		FROM ${fullTableName},
		UNNEST(JSON_EXTRACT_ARRAY(errors_by_category_json)) as category_entry
		WHERE module = 'kit' AND success = TRUE ${dateFilter}
		GROUP BY category
		ORDER BY count DESC
		LIMIT 20
	`

	// Daily breakdown query
	const dailyQuery = `
		SELECT
			DATE(timestamp) as date,
			COUNT(*) as requests,
			SUM(matches_count) as errors
		FROM ${fullTableName}
		WHERE module = 'kit' ${dateFilter}
		GROUP BY date
		ORDER BY date DESC
		LIMIT 30
	`

	// Top errors query
	const topErrorsQuery = `
		WITH parsed_matches AS (
			SELECT
				JSON_EXTRACT_SCALAR(match_entry, '$.message') as message,
				JSON_EXTRACT_SCALAR(match_entry, '$.rule.category.name') as category
			FROM ${fullTableName},
			UNNEST(JSON_EXTRACT_ARRAY(matches_json)) as match_entry
			WHERE module = 'kit' AND success = TRUE ${dateFilter}
		)
		SELECT
			message,
			category,
			COUNT(*) as count
		FROM parsed_matches
		WHERE message IS NOT NULL
		GROUP BY message, category
		ORDER BY count DESC
		LIMIT 10
	`

	try {
		const client = await manager.getClient()
		const [statsRows] = await client.query({ query: statsQuery, params })
		const stats = statsRows[0] || {}

		let errorsByCategory: Record<string, number> = {}
		let requestsByDay: Array<{ date: string; requests: number; errors: number }> = []
		let topErrors: Array<{ message: string; count: number; category: string }> = []

		try {
			const [categoryRows] = await client.query({ query: categoryQuery, params })
			categoryRows.forEach((row: any) => {
				if (row.category) {
					errorsByCategory[row.category] = Number(row.count)
				}
			})
		} catch (e) {
			logger.warn("Failed to get category breakdown", { error: (e as Error).message })
		}

		try {
			const [dailyRows] = await client.query({ query: dailyQuery, params })
			requestsByDay = dailyRows.map((row: any) => ({
				date: row.date?.value || row.date,
				requests: Number(row.requests),
				errors: Number(row.errors),
			}))
		} catch (e) {
			logger.warn("Failed to get daily breakdown", { error: (e as Error).message })
		}

		try {
			const [topErrorRows] = await client.query({ query: topErrorsQuery, params })
			topErrors = topErrorRows.map((row: any) => ({
				message: row.message,
				count: Number(row.count),
				category: row.category || "General",
			}))
		} catch (e) {
			logger.warn("Failed to get top errors", { error: (e as Error).message })
		}

		return {
			totalRequests: Number(stats.total_requests) || 0,
			successfulRequests: Number(stats.successful_requests) || 0,
			failedRequests: Number(stats.failed_requests) || 0,
			totalCharactersProcessed: Number(stats.total_characters) || 0,
			totalErrorsDetected: Number(stats.total_errors) || 0,
			avgErrorsPerRequest: Number(stats.avg_errors_per_request) || 0,
			avgLatencyMs: Number(stats.avg_latency_ms) || 0,
			avgInputLength: Number(stats.avg_input_length) || 0,
			errorsByCategory,
			topErrors,
			requestsByDay,
		}
	} catch (error: any) {
		// If table doesn't exist, return empty stats
		if (error.message && error.message.includes("Not found")) {
			logger.info("LanguageTool table not found, returning empty stats")
			return {
				totalRequests: 0,
				successfulRequests: 0,
				failedRequests: 0,
				totalCharactersProcessed: 0,
				totalErrorsDetected: 0,
				avgErrorsPerRequest: 0,
				avgLatencyMs: 0,
				avgInputLength: 0,
				errorsByCategory: {},
				topErrors: [],
				requestsByDay: [],
			}
		}

		logger.error("Failed to get LanguageTool stats", { error: error.message })
		throw error
	}
}

export async function getRecentCorrections(
	projectId: string = "aina-demostradors",
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = LANGUAGETOOL_TABLE_ID,
	limit: number = 50,
	userId?: string
): Promise<
	Array<{
		requestId: string
		timestamp: string
		inputText: string
		matchesCount: number
		matches: LanguageToolMatch[]
		latencyMs: number
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
			input_text,
			matches_count,
			matches_json,
			latency_ms
		FROM ${fullTableName}
		WHERE module = 'kit' AND success = TRUE AND matches_count > 0 ${userFilter}
		ORDER BY timestamp DESC
		LIMIT @limit
	`

	try {
		const client = await manager.getClient()
		const [rows] = await client.query({ query, params })
		return rows.map((row: any) => ({
			requestId: row.request_id,
			timestamp: row.timestamp?.value || row.timestamp,
			inputText: row.input_text,
			matchesCount: row.matches_count,
			matches: JSON.parse(row.matches_json || "[]"),
			latencyMs: row.latency_ms,
		}))
	} catch (error: any) {
		// If table doesn't exist, return empty list
		if (error.message && error.message.includes("Not found")) {
			logger.info("LanguageTool table not found, returning empty corrections list")
			return []
		}

		logger.error("Failed to get recent corrections", { error: error.message })
		return []
	}
}
