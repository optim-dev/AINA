/**
 * Metrics Service - Frontend service for consuming LLM metrics from backend
 *
 * This service provides typed access to the metrics API endpoints,
 * with support for both emulator and production environments.
 */

import type { AinaModule, LLMModel, TimeGranularity, ModuleMetrics, DetailedMetrics, MetricsByModelAndModule, TimeSeriesDataPoint, DashboardMetricsResponse, MetricsFilter } from "@/modules/shared/types"

// Re-export types from shared for convenience
export type { AinaModule, LLMModel, TimeGranularity, ModuleMetrics, DetailedMetrics, MetricsByModelAndModule, TimeSeriesDataPoint, DashboardMetricsResponse, MetricsFilter } from "@/modules/shared/types"

/**
 * API response wrapper
 */
interface ApiResponse<T> {
	status: "success" | "error"
	data?: T
	error?: string
	code?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:5001/aina-demostradors/europe-west4" : "https://europe-west4-aina-demostradors.cloudfunctions.net"

// ============================================================================
// METRICS SERVICE CLASS
// ============================================================================

/**
 * MetricsService provides frontend access to LLM metrics
 */
class MetricsService {
	private baseUrl: string

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl
	}

	/**
	 * Build query string from filter parameters
	 */
	private buildQueryString(filters?: MetricsFilter, extras?: Record<string, string>): string {
		const params = new URLSearchParams()

		if (filters?.startDate) {
			params.append("startDate", filters.startDate.toISOString())
		}
		if (filters?.endDate) {
			params.append("endDate", filters.endDate.toISOString())
		}
		if (filters?.module) {
			const modules = Array.isArray(filters.module) ? filters.module.join(",") : filters.module
			params.append("module", modules)
		}
		if (filters?.model) {
			const models = Array.isArray(filters.model) ? filters.model.join(",") : filters.model
			params.append("model", models)
		}
		if (extras) {
			Object.entries(extras).forEach(([key, value]) => {
				params.append(key, value)
			})
		}

		const queryString = params.toString()
		return queryString ? `?${queryString}` : ""
	}

	/**
	 * Make a fetch request to the API
	 */
	private async fetchApi<T>(endpoint: string, queryString: string = ""): Promise<T> {
		const url = `${this.baseUrl}/${endpoint}${queryString}`

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
		}

		const data: ApiResponse<T> = await response.json()

		if (data.status === "error") {
			throw new Error(data.error || "Unknown error")
		}

		return data.data as T
	}

	/**
	 * Get comprehensive dashboard metrics
	 *
	 * @param filters - Optional filters for date range, module, model
	 * @returns DashboardMetricsResponse with overall metrics, breakdown by model/module, and top performers
	 *
	 * @example
	 * ```typescript
	 * // Get all metrics
	 * const metrics = await metricsService.getDashboardMetrics()
	 *
	 * // Get metrics for specific module
	 * const valoracioMetrics = await metricsService.getDashboardMetrics({
	 *   module: "valoracio"
	 * })
	 *
	 * // Get metrics for last 7 days
	 * const weeklyMetrics = await metricsService.getDashboardMetrics({
	 *   startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
	 * })
	 * ```
	 */
	async getDashboardMetrics(filters?: MetricsFilter): Promise<DashboardMetricsResponse> {
		const queryString = this.buildQueryString(filters)
		return this.fetchApi<DashboardMetricsResponse>("metricsForDashboard", queryString)
	}

	/**
	 * Get time series metrics for trending visualization
	 *
	 * @param granularity - Time granularity: "hour", "day", "week", or "month"
	 * @param filters - Optional filters for date range, module, model
	 * @returns Array of time series data points
	 *
	 * @example
	 * ```typescript
	 * // Get daily metrics for the last month
	 * const timeSeries = await metricsService.getTimeSeriesMetrics("day", {
	 *   startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
	 * })
	 *
	 * // Get hourly metrics for today
	 * const hourlyData = await metricsService.getTimeSeriesMetrics("hour", {
	 *   startDate: new Date(new Date().setHours(0, 0, 0, 0))
	 * })
	 * ```
	 */
	async getTimeSeriesMetrics(granularity: TimeGranularity = "day", filters?: MetricsFilter): Promise<TimeSeriesDataPoint[]> {
		const queryString = this.buildQueryString(filters, { granularity })
		return this.fetchApi<TimeSeriesDataPoint[]>("metricsTimeSeries", queryString)
	}

	/**
	 * Compare models for a specific module
	 *
	 * @param module - The module to compare models for
	 * @param filters - Optional date range filters
	 * @returns Metrics for each model in the specified module
	 *
	 * @example
	 * ```typescript
	 * const comparison = await metricsService.compareModelsForModule("valoracio")
	 * // Returns: { "gemini-2.5-flash": {...}, "salamandra-7b-vertex": {...} }
	 * ```
	 */
	async compareModelsForModule(module: AinaModule, filters?: Omit<MetricsFilter, "module" | "model">): Promise<Record<string, ModuleMetrics>> {
		const params = new URLSearchParams()
		params.append("type", "models")
		params.append("module", module)
		if (filters?.startDate) params.append("startDate", filters.startDate.toISOString())
		if (filters?.endDate) params.append("endDate", filters.endDate.toISOString())

		return this.fetchApi<Record<string, ModuleMetrics>>("metricsComparison", `?${params.toString()}`)
	}

	/**
	 * Compare modules for a specific model
	 *
	 * @param model - The model to compare modules for
	 * @param filters - Optional date range filters
	 * @returns Metrics for each module using the specified model
	 *
	 * @example
	 * ```typescript
	 * const comparison = await metricsService.compareModulesForModel("gemini-2.5-flash")
	 * // Returns: { "valoracio": {...}, "elaboracio": {...}, "kit": {...} }
	 * ```
	 */
	async compareModulesForModel(model: LLMModel, filters?: Omit<MetricsFilter, "module" | "model">): Promise<Record<string, ModuleMetrics>> {
		const params = new URLSearchParams()
		params.append("type", "modules")
		params.append("model", model)
		if (filters?.startDate) params.append("startDate", filters.startDate.toISOString())
		if (filters?.endDate) params.append("endDate", filters.endDate.toISOString())

		return this.fetchApi<Record<string, ModuleMetrics>>("metricsComparison", `?${params.toString()}`)
	}

	/**
	 * Get metrics for a specific module
	 *
	 * @param module - The module to get metrics for
	 * @param filters - Optional date range filters
	 * @returns Detailed metrics for the module
	 */
	async getModuleMetrics(module: AinaModule, filters?: Omit<MetricsFilter, "module">): Promise<DetailedMetrics> {
		const metrics = await this.getDashboardMetrics({ ...filters, module })
		return metrics.overall
	}

	/**
	 * Get metrics for a specific model
	 *
	 * @param model - The model to get metrics for
	 * @param filters - Optional date range filters
	 * @returns Detailed metrics for the model
	 */
	async getModelMetrics(model: LLMModel, filters?: Omit<MetricsFilter, "model">): Promise<DetailedMetrics> {
		const metrics = await this.getDashboardMetrics({ ...filters, model })
		return metrics.overall
	}
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

/** Default metrics service instance */
export const metricsService = new MetricsService()

/** Factory function for custom configuration */
export function createMetricsService(baseUrl?: string): MetricsService {
	return new MetricsService(baseUrl)
}

export default metricsService
