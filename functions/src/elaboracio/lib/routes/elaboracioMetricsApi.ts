/**
 * Elaboracio Metrics API - HTTP endpoints for decret metrics
 *
 * Provides REST API access to log and query elaboracio metrics.
 *
 * Endpoints:
 * - POST /elaboracioLogMetric - Log a decret metric event
 * - GET /elaboracioGetMetrics - Get aggregated elaboracio metrics
 * - POST /elaboracioSetupTable - Setup the metrics table
 */

import { onRequest } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { logDecretMetricEvent, getElaboracioMetrics, ensureDecretMetricsTable, type DecretMetricEvent, type ElaboracioEventType } from "../elaboracioMetrics"

// --- CONFIGURATION ---
const REGION = "europe-west4"
const PROJECT_ID = "aina-demostradors"

// CORS configuration
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
const PRODUCTION_ORIGIN_PATTERNS = [/\.web\.app$/, /\.firebaseapp\.com$/]

/**
 * Set CORS headers on the response
 */
function setCorsHeaders(req: any, res: any): boolean {
	const origin = req.headers.origin || ""

	const isAllowed = ALLOWED_ORIGINS.includes(origin) || PRODUCTION_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin)) || !origin

	if (isAllowed) {
		res.set("Access-Control-Allow-Origin", origin || "*")
	} else {
		res.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0])
	}

	res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	res.set("Access-Control-Max-Age", "3600")

	if (req.method === "OPTIONS") {
		res.status(204).send("")
		return true
	}
	return false
}

/**
 * HTTP endpoint to log a decret metric event
 *
 * POST /elaboracioLogMetric
 * Body:
 *   {
 *     "event_type": "decret_validated" | "manual_edit" | "legal_validation" | "feedback",
 *     "session_id": "session_123",
 *     "expedient_id": "2024/12345",
 *     "generation_time_seconds": 120.5,
 *     "manual_edit_count": 3,
 *     "manual_edit_section": "fets",
 *     "legal_validation_success": true,
 *     "feedback_score": 4,
 *     "feedback_comments": "Molt precís",
 *     "model_used": "gemini-2.5-flash"
 *   }
 */
export const elaboracioLogMetric = onRequest({ region: REGION }, async (req, res) => {
	if (setCorsHeaders(req, res)) return

	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		const body = req.body

		// Validate required fields
		if (!body.event_type) {
			res.status(400).json({ error: "event_type is required" })
			return
		}

		const validEventTypes: ElaboracioEventType[] = ["decret_validated", "manual_edit", "legal_validation", "feedback"]
		if (!validEventTypes.includes(body.event_type)) {
			res.status(400).json({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}` })
			return
		}

		// Validate feedback score if provided
		if (body.feedback_score !== undefined) {
			const score = Number(body.feedback_score)
			if (isNaN(score) || score < 1 || score > 5) {
				res.status(400).json({ error: "feedback_score must be between 1 and 5" })
				return
			}
		}

		const event: DecretMetricEvent = {
			event_type: body.event_type,
			session_id: body.session_id,
			user_id: body.user_id,
			expedient_id: body.expedient_id,
			beneficiari_nif: body.beneficiari_nif,
			generation_time_seconds: body.generation_time_seconds ? Number(body.generation_time_seconds) : undefined,
			manual_edit_count: body.manual_edit_count ? Number(body.manual_edit_count) : undefined,
			manual_edit_section: body.manual_edit_section,
			legal_validation_success: body.legal_validation_success,
			legal_validation_errors: body.legal_validation_errors,
			feedback_score: body.feedback_score ? Number(body.feedback_score) : undefined,
			feedback_comments: body.feedback_comments,
			model_used: body.model_used,
			metadata: body.metadata,
		}

		logger.info("Logging elaboracio metric event", { event_type: event.event_type })

		await logDecretMetricEvent(event, PROJECT_ID)

		res.json({
			status: "success",
			message: "Metric event logged successfully",
			event_type: event.event_type,
		})
	} catch (error: any) {
		logger.error("Failed to log elaboracio metric", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * HTTP endpoint to get aggregated elaboracio metrics
 *
 * GET /elaboracioGetMetrics
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 */
export const elaboracioGetMetrics = onRequest({ region: REGION }, async (req, res) => {
	if (setCorsHeaders(req, res)) return

	try {
		const params = { ...req.query, ...req.body }

		const startDateStr = params.startDate as string | undefined
		const endDateStr = params.endDate as string | undefined

		const startDate = startDateStr ? new Date(startDateStr) : undefined
		const endDate = endDateStr ? new Date(endDateStr) : undefined

		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format. Use ISO 8601 format." })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format. Use ISO 8601 format." })
			return
		}

		logger.info("Fetching elaboracio metrics", { startDate, endDate })

		const metrics = await getElaboracioMetrics(PROJECT_ID, undefined, startDate, endDate)

		res.json({
			status: "success",
			data: metrics,
			query: {
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch elaboracio metrics", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * HTTP endpoint to setup the elaboracio metrics table (admin)
 *
 * POST /elaboracioSetupTable
 */
export const elaboracioSetupTable = onRequest({ region: REGION }, async (req, res) => {
	if (setCorsHeaders(req, res)) return

	try {
		logger.info("Setting up elaboracio metrics table")

		const created = await ensureDecretMetricsTable(PROJECT_ID)

		res.json({
			status: "success",
			message: created ? "Table created successfully" : "Table already exists",
			table: "elaboracio_decret_metrics",
		})
	} catch (error: any) {
		logger.error("Failed to setup elaboracio metrics table", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})
