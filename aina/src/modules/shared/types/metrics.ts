/**
 * Metrics types for LLM dashboard and reporting
 */

import type { AinaModule, LLMModel } from "./aina"

/** Time granularity for time series queries */
export type TimeGranularity = "hour" | "day" | "week" | "month"

/**
 * Base metrics structure aligned with dashboard expectations
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
 * Top performers information
 */
export interface TopPerformers {
	fastestResponse: { model: string; module: string; avgLatency: number }
	highestVolume: { model: string; module: string; requests: number }
	bestSuccessRate: { model: string; module: string; successRate: number }
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
	topPerformers: TopPerformers
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
}
