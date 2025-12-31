/**
 * Valoracio Metrics API - HTTP endpoints for offer evaluation metrics
 *
 * Provides REST API access to log and query valoracio metrics.
 *
 * Endpoints:
 * - POST /valoracioLogMetric - Log a valoracio metric event
 * - GET /valoracioGetMetrics - Get aggregated valoracio metrics
 * - POST /valoracioSetupTable - Setup the metrics table
 */

import { onRequest } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { logValoracioMetricEvent, getValoracioMetrics, ensureValoracioMetricsTable, type ValoracioMetricEvent, type ValoracioEventType } from "../valoracioMetrics"

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
 * HTTP endpoint to log a valoracio metric event
 *
 * POST /valoracioLogMetric
 * Body:
 *   {
 *     "event_type": "oferta_processada" | "avaluacio_completada" | "correccio_manual" | "consistencia_feedback",
 *     "session_id": "session_123",
 *     "lot_id": "LOT-001",
 *     "oferta_id": "OFERTA-001",
 *     "processing_time_seconds": 45.5,
 *     "total_criteris": 10,
 *     "criteris_avaluats": 8,
 *     "completesa_rubrica": 80.0,
 *     "puntuacio_sistema": 75.5,
 *     "puntuacio_humana": 78.0,
 *     "desviacio": 2.5,
 *     "model_used": "gemini-2.5-flash"
 *   }
 */
export const valoracioLogMetric = onRequest({ region: REGION }, async (req, res) => {
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

		// Validate event_type
		const validEventTypes: ValoracioEventType[] = ["oferta_processada", "avaluacio_completada", "correccio_manual", "consistencia_feedback"]
		if (!validEventTypes.includes(body.event_type)) {
			res.status(400).json({
				error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}`,
			})
			return
		}

		// Build event object
		const event: ValoracioMetricEvent = {
			event_type: body.event_type,
			session_id: body.session_id,
			user_id: body.user_id,
			lot_id: body.lot_id,
			oferta_id: body.oferta_id,
			licitacio_id: body.licitacio_id,
			processing_time_seconds: body.processing_time_seconds,
			total_criteris: body.total_criteris,
			criteris_avaluats: body.criteris_avaluats,
			completesa_rubrica: body.completesa_rubrica,
			puntuacio_sistema: body.puntuacio_sistema,
			puntuacio_humana: body.puntuacio_humana,
			desviacio: body.desviacio,
			criteri_corregit: body.criteri_corregit,
			comentari_correccio: body.comentari_correccio,
			model_used: body.model_used,
			metadata: body.metadata,
		}

		// Log the event
		await logValoracioMetricEvent(event, PROJECT_ID)

		logger.info("Valoracio metric logged via API", { event_type: event.event_type })

		res.status(200).json({
			status: "success",
			message: "Metric logged successfully",
			event_type: event.event_type,
		})
	} catch (error: any) {
		logger.error("Error logging valoracio metric", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message || "Failed to log metric",
		})
	}
})

/**
 * HTTP endpoint to get aggregated valoracio metrics
 *
 * GET /valoracioGetMetrics
 * Query params:
 *   - startDate (optional): ISO date string
 *   - endDate (optional): ISO date string
 */
export const valoracioGetMetrics = onRequest({ region: REGION }, async (req, res) => {
	if (setCorsHeaders(req, res)) return

	if (req.method !== "GET") {
		res.status(405).json({ error: "Method not allowed. Use GET." })
		return
	}

	try {
		// Parse optional date filters
		const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
		const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

		// Validate dates
		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format" })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format" })
			return
		}

		logger.info("Fetching valoracio metrics", { startDate, endDate })

		const metrics = await getValoracioMetrics(PROJECT_ID, undefined, startDate, endDate)

		res.status(200).json({
			status: "success",
			data: metrics,
		})
	} catch (error: any) {
		logger.error("Error fetching valoracio metrics", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message || "Failed to fetch metrics",
		})
	}
})

/**
 * HTTP endpoint to setup the valoracio metrics table
 *
 * POST /valoracioSetupTable
 */
export const valoracioSetupTable = onRequest({ region: REGION }, async (req, res) => {
	if (setCorsHeaders(req, res)) return

	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		logger.info("Setting up valoracio metrics table")

		const success = await ensureValoracioMetricsTable(PROJECT_ID)

		if (success) {
			res.status(200).json({
				status: "success",
				message: "Valoracio metrics table created/verified successfully",
			})
		} else {
			res.status(500).json({
				status: "error",
				error: "Failed to create/verify table",
			})
		}
	} catch (error: any) {
		logger.error("Error setting up valoracio metrics table", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message || "Failed to setup table",
		})
	}
})
