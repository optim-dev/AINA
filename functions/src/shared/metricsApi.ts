/**
 * Metrics API - HTTP endpoints for LLM metrics dashboard
 *
 * Provides REST API access to aggregated metrics from BigQuery,
 * designed to power the ModelMetriques dashboard.
 *
 * Endpoints:
 * - GET/POST /metricsForDashboard - Get comprehensive dashboard metrics
 * - GET/POST /metricsTimeSeries - Get time series data for trending
 * - GET/POST /metricsComparison - Get comparison metrics
 */

import { onRequest } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"
import { createMetricsEngine, type AinaModule, type LLMModel, type TimeGranularity } from "./MetricsEngine"

// --- CONFIGURATION ---
const REGION = "europe-west4"
const PROJECT_ID = "aina-demostradors"

// CORS configuration - allowed origins for development and production
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
const PRODUCTION_ORIGIN_PATTERNS = [/\.web\.app$/, /\.firebaseapp\.com$/]

/**
 * Set CORS headers on the response
 */
function setCorsHeaders(req: any, res: any): boolean {
	const origin = req.headers.origin || ""

	// Check if origin is allowed
	const isAllowed = ALLOWED_ORIGINS.includes(origin) || PRODUCTION_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin)) || !origin // Allow requests without origin (curl, etc.)

	if (isAllowed) {
		res.set("Access-Control-Allow-Origin", origin || "*")
	} else {
		res.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0])
	}

	res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	res.set("Access-Control-Max-Age", "3600")

	// Handle preflight requests
	if (req.method === "OPTIONS") {
		res.status(204).send("")
		return true
	}
	return false
}

/**
 * HTTP endpoint to get comprehensive dashboard metrics
 *
 * GET /metricsForDashboard
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - module: AinaModule or comma-separated list (optional)
 *   - model: LLMModel or comma-separated list (optional)
 *
 * POST /metricsForDashboard
 * Body:
 *   {
 *     "startDate": "2024-12-01T00:00:00Z",
 *     "endDate": "2024-12-31T23:59:59Z",
 *     "module": "valoracio",
 *     "model": "gemini-2.5-flash"
 *   }
 *
 * @example
 * curl https://europe-west4-aina-demostradors.cloudfunctions.net/metricsForDashboard
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/metricsForDashboard?module=valoracio"
 */
export const metricsForDashboard = onRequest({ region: REGION }, async (req, res) => {
	// Handle CORS
	if (setCorsHeaders(req, res)) return

	try {
		// Parse parameters from query or body
		const params = { ...req.query, ...req.body }

		// Parse dates
		const startDateStr = params.startDate as string | undefined
		const endDateStr = params.endDate as string | undefined

		const startDate = startDateStr ? new Date(startDateStr) : undefined
		const endDate = endDateStr ? new Date(endDateStr) : undefined

		// Validate dates if provided
		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format. Use ISO 8601 format." })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format. Use ISO 8601 format." })
			return
		}

		// Parse module filter
		const moduleParam = params.module as string | undefined
		const module = moduleParam ? (moduleParam.includes(",") ? (moduleParam.split(",").map((m) => m.trim()) as AinaModule[]) : (moduleParam as AinaModule)) : undefined

		// Parse model filter
		const modelParam = params.model as string | undefined
		const model = modelParam ? (modelParam.includes(",") ? (modelParam.split(",").map((m) => m.trim()) as LLMModel[]) : (modelParam as LLMModel)) : undefined

		logger.info("Fetching dashboard metrics", { startDate, endDate, module, model })

		const engine = createMetricsEngine(PROJECT_ID)
		const metrics = await engine.getDashboardMetrics({
			startDate,
			endDate,
			module,
			model,
		})

		res.json({
			status: "success",
			data: metrics,
		})
	} catch (error: any) {
		logger.error("Failed to fetch dashboard metrics", { error: error.message, stack: error.stack })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})

/**
 * HTTP endpoint to get time series metrics for trending visualization
 *
 * GET /metricsTimeSeries
 * Query params:
 *   - granularity: "hour" | "day" | "week" | "month" (default: "day")
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - module: AinaModule (optional)
 *   - model: LLMModel (optional)
 *
 * @example
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/metricsTimeSeries?granularity=day"
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/metricsTimeSeries?granularity=hour&module=kit"
 */
export const metricsTimeSeries = onRequest({ region: REGION }, async (req, res) => {
	// Handle CORS
	if (setCorsHeaders(req, res)) return

	try {
		const params = { ...req.query, ...req.body }

		// Parse granularity
		const granularity = (params.granularity as TimeGranularity) || "day"
		const validGranularities = ["hour", "day", "week", "month"]
		if (!validGranularities.includes(granularity)) {
			res.status(400).json({
				error: `Invalid granularity. Must be one of: ${validGranularities.join(", ")}`,
			})
			return
		}

		// Parse dates
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

		// Parse filters
		const module = params.module as AinaModule | undefined
		const model = params.model as LLMModel | undefined

		logger.info("Fetching time series metrics", { granularity, startDate, endDate, module, model })

		const engine = createMetricsEngine(PROJECT_ID)
		const timeSeries = await engine.getTimeSeriesMetrics(granularity, {
			startDate,
			endDate,
			module,
			model,
		})

		res.json({
			status: "success",
			data: timeSeries,
			query: {
				granularity,
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
				module: module || null,
				model: model || null,
				dataPoints: timeSeries.length,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch time series metrics", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})

/**
 * HTTP endpoint to get comparison metrics between models or modules
 *
 * GET /metricsComparison
 * Query params:
 *   - type: "models" | "modules" (required)
 *   - module: AinaModule (required if type="models")
 *   - model: LLMModel (required if type="modules")
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *
 * @example
 * # Compare all models for the "valoracio" module
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/metricsComparison?type=models&module=valoracio"
 *
 * # Compare all modules for "gemini-2.5-flash" model
 * curl "https://europe-west4-aina-demostradors.cloudfunctions.net/metricsComparison?type=modules&model=gemini-2.5-flash"
 */
export const metricsComparison = onRequest({ region: REGION }, async (req, res) => {
	// Handle CORS
	if (setCorsHeaders(req, res)) return

	try {
		const params = { ...req.query, ...req.body }

		const type = params.type as "models" | "modules" | undefined
		if (!type || !["models", "modules"].includes(type)) {
			res.status(400).json({ error: "Parameter 'type' is required. Must be 'models' or 'modules'." })
			return
		}

		// Parse dates
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

		const engine = createMetricsEngine(PROJECT_ID)
		let comparison: Record<string, any>

		if (type === "models") {
			const module = params.module as AinaModule | undefined
			if (!module) {
				res.status(400).json({ error: "Parameter 'module' is required when type='models'." })
				return
			}
			logger.info("Fetching model comparison", { module, startDate, endDate })
			comparison = await engine.getModelComparison(module, { startDate, endDate })
		} else {
			const model = params.model as LLMModel | undefined
			if (!model) {
				res.status(400).json({ error: "Parameter 'model' is required when type='modules'." })
				return
			}
			logger.info("Fetching module comparison", { model, startDate, endDate })
			comparison = await engine.getModuleComparison(model, { startDate, endDate })
		}

		res.json({
			status: "success",
			data: comparison,
			query: {
				type,
				module: params.module || null,
				model: params.model || null,
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch comparison metrics", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
			code: error.code,
		})
	}
})
