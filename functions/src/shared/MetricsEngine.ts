/**
 * MetricsEngine - Comprehensive metrics aggregation engine for LLM interactions
 *
 * This module provides advanced querying and aggregation of LLM metrics from BigQuery,
 * designed to power the ModelMetriques dashboard with real data.
 *
 * Features:
 * - Aggregation by module, model, and time period
 * - Percentile calculations (P50, P95, P99)
 * - Time series data for trending
 * - Comparative analysis between models/modules
 *
 * Uses the centralized BigQueryClientManager from BigQueryLogger for all BigQuery operations.
 *
 * @see /docs/bigquery-schema.md for schema documentation
 */

import * as logger from "firebase-functions/logger"
import { getBigQueryManager, DEFAULT_DATASET_ID, DEFAULT_TABLE_ID, LLM_LOGS_SCHEMA } from "./BigQueryLogger"

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Available AINA modules that can make LLM calls */
export type AinaModule = "valoracio" | "elaboracio" | "kit"

/** Available LLM models */
export type LLMModel = "salamandra-7b-vertex" | "salamandra-ta-7b-local" | "gemini-2.5-flash"

/** Time granularity for time series queries */
export type TimeGranularity = "hour" | "day" | "week" | "month"

/**
 * Base metrics structure aligned with frontend expectations
 */
export interface ModuleMetrics {
	/** Total input tokens processed */
	tokensEntrada: number
	/** Total output tokens generated */
	tokensSortida: number
	/** Average response time in seconds */
	tempsMitjaResposta: number
	/** Total number of requests */
	peticionsTotals: number
	/** Number of successful requests */
	petitionsExitoses: number
	/** Total cost in EUR */
	costTotal: number
	/** 95th percentile latency in seconds */
	latenciaP95: number
	/** Throughput in requests per minute */
	throughput: number
}

/**
 * Extended metrics with additional statistics
 */
export interface DetailedMetrics extends ModuleMetrics {
	/** 50th percentile latency in seconds */
	latenciaP50: number
	/** 99th percentile latency in seconds */
	latenciaP99: number
	/** Average tokens per request (input) */
	tokensEntradaMitjans: number
	/** Average tokens per request (output) */
	tokensSortidaMitjans: number
	/** Success rate as percentage */
	taxaExit: number
	/** Cost per request in EUR */
	costPerPeticio: number
	/** Output to input token ratio */
	ratioTokens: number
	/** Error count */
	errorsTotal: number
	/** First request timestamp */
	primeraPeticio: string | null
	/** Last request timestamp */
	ultimaPeticio: string | null
}

/**
 * Metrics organized by model and module
 */
export interface MetricsByModelAndModule {
	[model: string]: {
		[module: string]: ModuleMetrics
	}
}

/**
 * Time series data point for trending
 */
export interface TimeSeriesDataPoint {
	timestamp: string
	peticions: number
	tokensEntrada: number
	tokensSortida: number
	latenciaMitja: number
	taxaExit: number
	cost: number
}

/**
 * Complete dashboard metrics response
 */
export interface DashboardMetricsResponse {
	/** Overall aggregated metrics */
	overall: DetailedMetrics
	/** Metrics broken down by model and module */
	byModelAndModule: MetricsByModelAndModule
	/** Best performing configurations */
	topPerformers: {
		fastestResponse: { model: string; module: string; avgLatency: number }
		highestVolume: { model: string; module: string; requests: number }
		bestSuccessRate: { model: string; module: string; successRate: number }
	}
	/** Query metadata */
	query: {
		startDate: string | null
		endDate: string | null
		datasetId: string
		tableId: string
		generatedAt: string
	}
}

/**
 * Filter options for metrics queries
 */
export interface MetricsFilter {
	startDate?: Date
	endDate?: Date
	module?: AinaModule | AinaModule[]
	model?: LLMModel | LLMModel[]
	userId?: string
	sessionId?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const USD_TO_EUR = 0.92 // Approximate conversion rate

// ============================================================================
// METRICS ENGINE CLASS (Using centralized BigQueryClientManager)
// ============================================================================

/**
 * MetricsEngine provides comprehensive metrics querying from BigQuery
 * Uses the centralized BigQueryClientManager for all BigQuery operations.
 */
export class MetricsEngine {
	private manager: ReturnType<typeof getBigQueryManager>
	private tableId: string

	constructor(projectId: string, datasetId: string = DEFAULT_DATASET_ID, tableId: string = DEFAULT_TABLE_ID) {
		this.tableId = tableId
		this.manager = getBigQueryManager(projectId, datasetId)

		// Ensure table exists on initialization
		this.manager
			.ensureTable(this.tableId, LLM_LOGS_SCHEMA, {
				timePartitioning: {
					type: "DAY",
					field: "timestamp",
				},
			})
			.catch((err) => {
				logger.error(`Failed to ensure table ${this.tableId} exists`, { error: err.message })
			})
	}

	/**
	 * Build the fully qualified table name
	 */
	private get fullTableName(): string {
		return this.manager.getFullTableName(this.tableId)
	}

	/**
	 * Build WHERE clause from filters
	 */
	private buildWhereClause(filters?: MetricsFilter): { clause: string; params: Record<string, any> } {
		const conditions: string[] = ["1=1"]
		const params: Record<string, any> = {}

		if (filters?.startDate) {
			conditions.push("timestamp >= @startDate")
			params.startDate = filters.startDate.toISOString()
		}

		if (filters?.endDate) {
			conditions.push("timestamp <= @endDate")
			params.endDate = filters.endDate.toISOString()
		}

		if (filters?.module) {
			const modules = Array.isArray(filters.module) ? filters.module : [filters.module]
			conditions.push(`module IN UNNEST(@modules)`)
			params.modules = modules
		}

		if (filters?.model) {
			const models = Array.isArray(filters.model) ? filters.model : [filters.model]
			conditions.push(`provider IN UNNEST(@models)`)
			params.models = models
		}

		if (filters?.userId) {
			conditions.push("user_id = @userId")
			params.userId = filters.userId
		}

		if (filters?.sessionId) {
			conditions.push("session_id = @sessionId")
			params.sessionId = filters.sessionId
		}

		return {
			clause: `WHERE ${conditions.join(" AND ")}`,
			params,
		}
	}

	/**
	 * Get aggregated metrics for the dashboard
	 *
	 * Returns comprehensive metrics including overall stats, breakdown by model/module,
	 * and top performers for various categories.
	 */
	async getDashboardMetrics(filters?: MetricsFilter): Promise<DashboardMetricsResponse> {
		const { clause, params } = this.buildWhereClause(filters)

		// Query 1: Get detailed aggregated metrics by model and module
		const aggregationQuery = `
			WITH base_metrics AS (
				SELECT
					COALESCE(provider, 'unknown') as model,
					COALESCE(module, 'unknown') as module,
					COUNT(*) as total_requests,
					COUNTIF(error IS NULL) as successful_requests,
					COUNTIF(error IS NOT NULL) as error_count,
					SUM(COALESCE(prompt_tokens, 0)) as total_prompt_tokens,
					SUM(COALESCE(completion_tokens, 0)) as total_completion_tokens,
					AVG(latency_ms) as avg_latency_ms,
					APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] as p50_latency_ms,
					APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] as p95_latency_ms,
					APPROX_QUANTILES(latency_ms, 100)[OFFSET(99)] as p99_latency_ms,
					SUM(COALESCE(cost_estimate_usd, 0)) as total_cost_usd,
					MIN(timestamp) as first_request,
					MAX(timestamp) as last_request,
					-- Calculate throughput (requests per minute) based on time range
					SAFE_DIVIDE(
						COUNT(*),
						TIMESTAMP_DIFF(MAX(timestamp), MIN(timestamp), MINUTE) + 1
					) as throughput_rpm
				FROM ${this.fullTableName}
				${clause}
				GROUP BY model, module
			)
			SELECT * FROM base_metrics
			ORDER BY total_requests DESC
		`

		logger.info("Executing dashboard metrics query", { filters })

		const rows = await this.manager.query(aggregationQuery, params)

		// Process results into structured format
		const byModelAndModule: MetricsByModelAndModule = {}
		let overallMetrics: DetailedMetrics = this.createEmptyDetailedMetrics()

		// Track top performers
		let fastestResponse = { model: "", module: "", avgLatency: Infinity }
		let highestVolume = { model: "", module: "", requests: 0 }
		let bestSuccessRate = { model: "", module: "", successRate: 0 }

		for (const row of rows) {
			const model = row.model as string
			const module = row.module as string

			// Build metrics for this model/module combination
			const metrics: ModuleMetrics = {
				tokensEntrada: Number(row.total_prompt_tokens) || 0,
				tokensSortida: Number(row.total_completion_tokens) || 0,
				tempsMitjaResposta: (Number(row.avg_latency_ms) || 0) / 1000, // Convert to seconds
				peticionsTotals: Number(row.total_requests) || 0,
				petitionsExitoses: Number(row.successful_requests) || 0,
				costTotal: (Number(row.total_cost_usd) || 0) * USD_TO_EUR,
				latenciaP95: (Number(row.p95_latency_ms) || 0) / 1000, // Convert to seconds
				throughput: Number(row.throughput_rpm) || 0,
			}

			// Store in nested structure
			if (!byModelAndModule[model]) {
				byModelAndModule[model] = {}
			}
			byModelAndModule[model][module] = metrics

			// Aggregate into overall metrics
			overallMetrics.tokensEntrada += metrics.tokensEntrada
			overallMetrics.tokensSortida += metrics.tokensSortida
			overallMetrics.peticionsTotals += metrics.peticionsTotals
			overallMetrics.petitionsExitoses += metrics.petitionsExitoses
			overallMetrics.costTotal += metrics.costTotal
			overallMetrics.errorsTotal += Number(row.error_count) || 0
			overallMetrics.latenciaP95 = Math.max(overallMetrics.latenciaP95, metrics.latenciaP95)
			overallMetrics.throughput += metrics.throughput

			// Update top performers
			const avgLatency = metrics.tempsMitjaResposta
			if (avgLatency < fastestResponse.avgLatency && metrics.peticionsTotals > 0) {
				fastestResponse = { model, module, avgLatency }
			}

			if (metrics.peticionsTotals > highestVolume.requests) {
				highestVolume = { model, module, requests: metrics.peticionsTotals }
			}

			const successRate = metrics.peticionsTotals > 0 ? (metrics.petitionsExitoses / metrics.peticionsTotals) * 100 : 0
			if (successRate > bestSuccessRate.successRate && metrics.peticionsTotals > 0) {
				bestSuccessRate = { model, module, successRate }
			}

			// Update first/last request timestamps (handle BigQuery timestamp format)
			if (row.first_request) {
				try {
					const firstTs = row.first_request.value ? new Date(row.first_request.value).toISOString() : new Date(row.first_request).toISOString()
					if (!overallMetrics.primeraPeticio || firstTs < overallMetrics.primeraPeticio) {
						overallMetrics.primeraPeticio = firstTs
					}
				} catch (e) {
					// Ignore invalid timestamps
				}
			}
			if (row.last_request) {
				try {
					const lastTs = row.last_request.value ? new Date(row.last_request.value).toISOString() : new Date(row.last_request).toISOString()
					if (!overallMetrics.ultimaPeticio || lastTs > overallMetrics.ultimaPeticio) {
						overallMetrics.ultimaPeticio = lastTs
					}
				} catch (e) {
					// Ignore invalid timestamps
				}
			}
		}

		// Calculate derived overall metrics
		if (overallMetrics.peticionsTotals > 0) {
			// Weighted average latency
			let totalLatencyWeight = 0
			for (const model of Object.keys(byModelAndModule)) {
				for (const module of Object.keys(byModelAndModule[model])) {
					const m = byModelAndModule[model][module]
					totalLatencyWeight += m.peticionsTotals * m.tempsMitjaResposta
				}
			}
			overallMetrics.tempsMitjaResposta = totalLatencyWeight / overallMetrics.peticionsTotals

			overallMetrics.tokensEntradaMitjans = Math.round(overallMetrics.tokensEntrada / overallMetrics.peticionsTotals)
			overallMetrics.tokensSortidaMitjans = Math.round(overallMetrics.tokensSortida / overallMetrics.peticionsTotals)
			overallMetrics.taxaExit = (overallMetrics.petitionsExitoses / overallMetrics.peticionsTotals) * 100
			overallMetrics.costPerPeticio = overallMetrics.costTotal / overallMetrics.peticionsTotals
			overallMetrics.ratioTokens = overallMetrics.tokensEntrada > 0 ? overallMetrics.tokensSortida / overallMetrics.tokensEntrada : 0
		}

		return {
			overall: overallMetrics,
			byModelAndModule,
			topPerformers: {
				fastestResponse: fastestResponse.model ? fastestResponse : { model: "N/A", module: "N/A", avgLatency: 0 },
				highestVolume: highestVolume.model ? highestVolume : { model: "N/A", module: "N/A", requests: 0 },
				bestSuccessRate: bestSuccessRate.model ? bestSuccessRate : { model: "N/A", module: "N/A", successRate: 0 },
			},
			query: {
				startDate: filters?.startDate?.toISOString() || null,
				endDate: filters?.endDate?.toISOString() || null,
				datasetId: this.manager.getDatasetId(),
				tableId: this.tableId,
				generatedAt: new Date().toISOString(),
			},
		}
	}

	/**
	 * Get time series metrics for trending visualization
	 */
	async getTimeSeriesMetrics(granularity: TimeGranularity = "day", filters?: MetricsFilter): Promise<TimeSeriesDataPoint[]> {
		const { clause, params } = this.buildWhereClause(filters)

		// Map granularity to SQL truncation
		const truncFn = {
			hour: "TIMESTAMP_TRUNC(timestamp, HOUR)",
			day: "TIMESTAMP_TRUNC(timestamp, DAY)",
			week: "TIMESTAMP_TRUNC(timestamp, WEEK)",
			month: "TIMESTAMP_TRUNC(timestamp, MONTH)",
		}[granularity]

		const query = `
			SELECT
				${truncFn} as period,
				COUNT(*) as total_requests,
				COUNTIF(error IS NULL) as successful_requests,
				SUM(COALESCE(prompt_tokens, 0)) as total_prompt_tokens,
				SUM(COALESCE(completion_tokens, 0)) as total_completion_tokens,
				AVG(latency_ms) as avg_latency_ms,
				SUM(COALESCE(cost_estimate_usd, 0)) as total_cost_usd
			FROM ${this.fullTableName}
			${clause}
			GROUP BY period
			ORDER BY period ASC
		`

		const rows = await this.manager.query(query, params)

		return rows.map((row: any) => ({
			timestamp: new Date(row.period.value).toISOString(),
			peticions: Number(row.total_requests) || 0,
			tokensEntrada: Number(row.total_prompt_tokens) || 0,
			tokensSortida: Number(row.total_completion_tokens) || 0,
			latenciaMitja: (Number(row.avg_latency_ms) || 0) / 1000,
			taxaExit: row.total_requests > 0 ? ((Number(row.successful_requests) || 0) / Number(row.total_requests)) * 100 : 0,
			cost: (Number(row.total_cost_usd) || 0) * USD_TO_EUR,
		}))
	}

	/**
	 * Get metrics for a specific module across all models
	 */
	async getModuleMetrics(module: AinaModule, filters?: MetricsFilter): Promise<DetailedMetrics> {
		const enhancedFilters = { ...filters, module }
		const dashboard = await this.getDashboardMetrics(enhancedFilters)
		return dashboard.overall
	}

	/**
	 * Get metrics for a specific model across all modules
	 */
	async getModelMetrics(model: LLMModel, filters?: MetricsFilter): Promise<DetailedMetrics> {
		const enhancedFilters = { ...filters, model }
		const dashboard = await this.getDashboardMetrics(enhancedFilters)
		return dashboard.overall
	}

	/**
	 * Get comparison between models for a specific module
	 */
	async getModelComparison(module: AinaModule, filters?: MetricsFilter): Promise<Record<string, ModuleMetrics>> {
		const enhancedFilters = { ...filters, module }
		const dashboard = await this.getDashboardMetrics(enhancedFilters)

		const result: Record<string, ModuleMetrics> = {}
		for (const model of Object.keys(dashboard.byModelAndModule)) {
			if (dashboard.byModelAndModule[model][module]) {
				result[model] = dashboard.byModelAndModule[model][module]
			}
		}
		return result
	}

	/**
	 * Get comparison between modules for a specific model
	 */
	async getModuleComparison(model: LLMModel, filters?: MetricsFilter): Promise<Record<string, ModuleMetrics>> {
		const enhancedFilters = { ...filters, model }
		const dashboard = await this.getDashboardMetrics(enhancedFilters)

		return dashboard.byModelAndModule[model] || {}
	}

	/**
	 * Create empty detailed metrics object
	 */
	private createEmptyDetailedMetrics(): DetailedMetrics {
		return {
			tokensEntrada: 0,
			tokensSortida: 0,
			tempsMitjaResposta: 0,
			peticionsTotals: 0,
			petitionsExitoses: 0,
			costTotal: 0,
			latenciaP95: 0,
			throughput: 0,
			latenciaP50: 0,
			latenciaP99: 0,
			tokensEntradaMitjans: 0,
			tokensSortidaMitjans: 0,
			taxaExit: 0,
			costPerPeticio: 0,
			ratioTokens: 0,
			errorsTotal: 0,
			primeraPeticio: null,
			ultimaPeticio: null,
		}
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a MetricsEngine instance with default configuration
 */
export function createMetricsEngine(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, tableId: string = DEFAULT_TABLE_ID): MetricsEngine {
	return new MetricsEngine(projectId, datasetId, tableId)
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MetricsEngine
