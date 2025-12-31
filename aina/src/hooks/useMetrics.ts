/**
 * useMetrics - React hook for consuming LLM metrics
 *
 * Provides easy access to metrics data with loading states,
 * error handling, and automatic refetching.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import metricsService from "@/services/metricsService"
import type { AinaModule, LLMModel, TimeGranularity, ModuleMetrics, DashboardMetricsResponse, TimeSeriesDataPoint, MetricsFilter } from "@/modules/shared/types"

// ============================================================================
// TYPES
// ============================================================================

interface UseMetricsState<T> {
	data: T | null
	loading: boolean
	error: Error | null
	refetch: () => Promise<void>
}

interface UseDashboardMetricsOptions {
	/** Filters to apply to the query */
	filters?: MetricsFilter
	/** Whether to fetch on mount (default: true) */
	fetchOnMount?: boolean
	/** Refetch interval in milliseconds (optional) */
	refetchInterval?: number
}

interface UseTimeSeriesOptions {
	/** Time granularity */
	granularity?: TimeGranularity
	/** Filters to apply */
	filters?: MetricsFilter
	/** Whether to fetch on mount (default: true) */
	fetchOnMount?: boolean
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch comprehensive dashboard metrics
 *
 * @param options - Configuration options
 * @returns Metrics data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data, loading, error, refetch } = useDashboardMetrics({
 *     filters: { module: "valoracio" }
 *   })
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <MetricsDisplay metrics={data} />
 *   )
 * }
 * ```
 */
export function useDashboardMetrics(options: UseDashboardMetricsOptions = {}): UseMetricsState<DashboardMetricsResponse> {
	const { filters, fetchOnMount = true, refetchInterval } = options

	const [data, setData] = useState<DashboardMetricsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await metricsService.getDashboardMetrics(filters)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [JSON.stringify(filters)])

	// Fetch on mount
	useEffect(() => {
		if (fetchOnMount) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	// Set up refetch interval if provided
	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const intervalId = setInterval(fetchData, refetchInterval)
			return () => clearInterval(intervalId)
		}
	}, [fetchData, refetchInterval])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch time series metrics for trending
 *
 * @param options - Configuration options including granularity
 * @returns Time series data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function TrendChart() {
 *   const { data, loading } = useTimeSeriesMetrics({
 *     granularity: "day",
 *     filters: { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
 *   })
 *
 *   return <LineChart data={data} />
 * }
 * ```
 */
export function useTimeSeriesMetrics(options: UseTimeSeriesOptions = {}): UseMetricsState<TimeSeriesDataPoint[]> {
	const { granularity = "day", filters, fetchOnMount = true } = options

	const [data, setData] = useState<TimeSeriesDataPoint[] | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await metricsService.getTimeSeriesMetrics(granularity, filters)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [granularity, JSON.stringify(filters)])

	useEffect(() => {
		if (fetchOnMount) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to compare models for a specific module
 *
 * @param module - The module to compare models for
 * @param filters - Optional date range filters
 * @returns Comparison data, loading state, error, and refetch function
 */
export function useModelComparison(module: AinaModule, filters?: Omit<MetricsFilter, "module" | "model">): UseMetricsState<Record<string, ModuleMetrics>> {
	const [data, setData] = useState<Record<string, ModuleMetrics> | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await metricsService.compareModelsForModule(module, filters)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [module, JSON.stringify(filters)])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to compare modules for a specific model
 *
 * @param model - The model to compare modules for
 * @param filters - Optional date range filters
 * @returns Comparison data, loading state, error, and refetch function
 */
export function useModuleComparison(model: LLMModel, filters?: Omit<MetricsFilter, "module" | "model">): UseMetricsState<Record<string, ModuleMetrics>> {
	const [data, setData] = useState<Record<string, ModuleMetrics> | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await metricsService.compareModulesForModel(model, filters)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [model, JSON.stringify(filters)])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook that transforms raw metrics into the format expected by ModelMetriques page
 *
 * This is a convenience hook that maps the API response to match
 * the existing metricsByModel structure used in the dashboard.
 *
 * @param filters - Optional filters for the query
 * @returns Transformed metrics ready for the dashboard
 */
export function useMetricsForDashboard(filters?: MetricsFilter) {
	const { data, loading, error, refetch } = useDashboardMetrics({ filters })

	// Transform byModelAndModule to the expected format
	const metricsByModel = useMemo(() => {
		if (!data) return {}
		return data.byModelAndModule
	}, [data])

	// Calculate derived values matching the dashboard expectations
	const aggregatedMetrics = useMemo(() => {
		if (!data) {
			return {
				tokensEntrada: 0,
				tokensSortida: 0,
				tempsMitjaResposta: 0,
				peticionsTotals: 0,
				petitionsExitoses: 0,
				costTotal: 0,
				latenciaP95: 0,
				throughput: 0,
			}
		}
		return {
			tokensEntrada: data.overall.tokensEntrada,
			tokensSortida: data.overall.tokensSortida,
			tempsMitjaResposta: data.overall.tempsMitjaResposta,
			peticionsTotals: data.overall.peticionsTotals,
			petitionsExitoses: data.overall.petitionsExitoses,
			costTotal: data.overall.costTotal,
			latenciaP95: data.overall.latenciaP95,
			throughput: data.overall.throughput,
		}
	}, [data])

	const topPerformers = useMemo(() => {
		if (!data) return null
		return data.topPerformers
	}, [data])

	return {
		metricsByModel,
		aggregatedMetrics,
		topPerformers,
		overall: data?.overall || null,
		loading,
		error,
		refetch,
	}
}

export default useDashboardMetrics
