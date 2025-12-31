/**
 * BigQuery Metrics API - HTTP endpoints for querying LLM interaction logs
 *
 * Provides REST API access to BigQuery statistics and logs.
 */

import { onRequest } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { getLogStatistics, queryRecentLogs, verifyBigQueryTable, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID } from "./BigQueryLogger"

// --- CONFIGURATION ---
const REGION = "europe-west4"
const PROJECT_ID = "aina-demostradors"

/**
 * HTTP endpoint to get aggregated LLM statistics from BigQuery
 *
 * GET /bigQueryStats
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *
 * POST /bigQueryStats
 * Body:
 *   {
 *     "startDate": "2024-12-01T00:00:00Z",
 *     "endDate": "2024-12-31T23:59:59Z"
 *   }
 *
 * @example
 * curl https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryStats
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryStats?startDate=2024-12-01"
 */
export const bigQueryStats = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		// Parse dates from query params or body
		const startDateStr = req.query.startDate || req.body?.startDate
		const endDateStr = req.query.endDate || req.body?.endDate

		const startDate = startDateStr ? new Date(startDateStr as string) : undefined
		const endDate = endDateStr ? new Date(endDateStr as string) : undefined

		// Validate dates if provided
		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format. Use ISO 8601 format." })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format. Use ISO 8601 format." })
			return
		}

		logger.info("Fetching BigQuery statistics", { startDate, endDate })

		const stats = await getLogStatistics(PROJECT_ID, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID, startDate, endDate)

		res.json({
			status: "success",
			data: stats,
			query: {
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
				datasetId: DEFAULT_DATASET_ID,
				tableId: DEFAULT_TABLE_ID,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch BigQuery statistics", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})

/**
 * HTTP endpoint to query recent LLM logs from BigQuery
 *
 * GET /bigQueryLogs
 * Query params:
 *   - limit: number (default: 100, max: 1000)
 *   - userId: string (optional)
 *   - sessionId: string (optional)
 *   - provider: string (optional, e.g., "gemini-2.5-flash", "salamandra-7b-instruct")
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - onlyErrors: boolean (optional)
 *
 * POST /bigQueryLogs
 * Body:
 *   {
 *     "limit": 50,
 *     "userId": "user123",
 *     "provider": "gemini-2.5-flash",
 *     "onlyErrors": false
 *   }
 *
 * @example
 * curl https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?limit=10
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?userId=user123&onlyErrors=true"
 */
export const bigQueryLogs = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		// Parse parameters from query or body
		const params = { ...req.query, ...req.body }

		const limit = Math.min(Number(params.limit) || 100, 1000) // Cap at 1000
		const userId = params.userId as string | undefined
		const sessionId = params.sessionId as string | undefined
		const provider = params.provider as string | undefined
		const onlyErrors = params.onlyErrors === true || params.onlyErrors === "true"

		const startDateStr = params.startDate
		const endDateStr = params.endDate

		const startDate = startDateStr ? new Date(startDateStr as string) : undefined
		const endDate = endDateStr ? new Date(endDateStr as string) : undefined

		// Validate dates if provided
		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format. Use ISO 8601 format." })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format. Use ISO 8601 format." })
			return
		}

		logger.info("Fetching BigQuery logs", { limit, userId, sessionId, provider, onlyErrors })

		const logs = await queryRecentLogs(PROJECT_ID, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID, limit, {
			userId,
			sessionId,
			provider,
			startDate,
			endDate,
			onlyErrors,
		})

		res.json({
			status: "success",
			count: logs.length,
			data: logs,
			query: {
				limit,
				userId: userId || null,
				sessionId: sessionId || null,
				provider: provider || null,
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
				onlyErrors,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch BigQuery logs", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})

/**
 * HTTP endpoint to check BigQuery table health/existence
 *
 * GET /bigQueryHealth
 *
 * @example
 * curl https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryHealth
 */
export const bigQueryHealth = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const tableExists = await verifyBigQueryTable(PROJECT_ID, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID)

		res.json({
			status: tableExists ? "healthy" : "unhealthy",
			table: {
				projectId: PROJECT_ID,
				datasetId: DEFAULT_DATASET_ID,
				tableId: DEFAULT_TABLE_ID,
				exists: tableExists,
			},
			timestamp: new Date().toISOString(),
		})
	} catch (error: any) {
		logger.error("BigQuery health check failed", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * HTTP endpoint to setup BigQuery dataset and table (admin only)
 *
 * POST /bigQuerySetup
 *
 * @example
 * curl -X POST https://europe-west4-aina-demostradors.cloudfunctions.net/bigQuerySetup
 */
export const bigQuerySetup = onRequest({ region: REGION, cors: true }, async (req, res) => {
	// Only allow POST
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		const { setupBigQuery } = await import("./BigQueryLogger.js")

		logger.info("Setting up BigQuery dataset and table...")

		const result = await setupBigQuery(PROJECT_ID, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID)

		res.json({
			status: "success",
			message: "BigQuery setup completed",
			result,
		})
	} catch (error: any) {
		logger.error("BigQuery setup failed", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})
