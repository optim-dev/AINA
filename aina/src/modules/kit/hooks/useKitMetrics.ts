/**
 * useKitMetrics - React hooks for Kit module metrics
 *
 * Provides access to aggregated metrics from all Kit services:
 * - LanguageTool (orthography)
 * - StyleTone (style and tone validation)
 * - RAG Process (terminology correction)
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { auth } from "@/services/firebase"
import {
	getLanguageToolStats,
	getStyleToneStats,
	getRAGProcessStats,
	getKitAggregatedMetrics,
	type LanguageToolStats,
	type StyleToneStats,
	type RAGProcessStats,
	type KitAggregatedMetrics,
} from "../lib/kitMetricsService"

// =====================================================
// Types
// =====================================================

interface UseKitMetricsState<T> {
	data: T | null
	loading: boolean
	error: Error | null
	refetch: () => Promise<void>
}

interface UseKitMetricsOptions {
	days?: number
	startDate?: Date
	endDate?: Date
	fetchOnMount?: boolean
	refetchInterval?: number
}

// =====================================================
// Individual Metric Hooks
// =====================================================

/**
 * Hook to fetch LanguageTool statistics
 */
export function useLanguageToolStats(options: UseKitMetricsOptions = {}): UseKitMetricsState<LanguageToolStats> {
	const { startDate, endDate, fetchOnMount = true, refetchInterval } = options

	const [data, setData] = useState<LanguageToolStats | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await getLanguageToolStats(startDate, endDate)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [startDate?.toISOString(), endDate?.toISOString()])

	useEffect(() => {
		if (fetchOnMount) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const intervalId = setInterval(fetchData, refetchInterval)
			return () => clearInterval(intervalId)
		}
	}, [fetchData, refetchInterval])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch StyleTone statistics
 */
export function useStyleToneStats(options: UseKitMetricsOptions = {}): UseKitMetricsState<StyleToneStats> {
	const { days = 30, fetchOnMount = true, refetchInterval } = options

	const [data, setData] = useState<StyleToneStats | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const result = await getStyleToneStats(days)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [days])

	useEffect(() => {
		if (fetchOnMount) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const intervalId = setInterval(fetchData, refetchInterval)
			return () => clearInterval(intervalId)
		}
	}, [fetchData, refetchInterval])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch RAG Process statistics
 */
export function useRAGProcessStats(options: UseKitMetricsOptions = {}): UseKitMetricsState<RAGProcessStats> {
	const { fetchOnMount = true, refetchInterval } = options

	const [data, setData] = useState<RAGProcessStats | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		const currentUser = auth.currentUser
		if (!currentUser) {
			setError(new Error("User not authenticated"))
			return
		}

		setLoading(true)
		setError(null)
		try {
			const idToken = await currentUser.getIdToken()
			const result = await getRAGProcessStats(idToken)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (fetchOnMount && auth.currentUser) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const intervalId = setInterval(fetchData, refetchInterval)
			return () => clearInterval(intervalId)
		}
	}, [fetchData, refetchInterval])

	return { data, loading, error, refetch: fetchData }
}

// =====================================================
// Aggregated Metrics Hook
// =====================================================

/**
 * Hook to fetch all Kit metrics aggregated
 * This is the main hook for the Metriques dashboard
 */
export function useKitAggregatedMetrics(options: UseKitMetricsOptions = {}): UseKitMetricsState<KitAggregatedMetrics> {
	const { days = 30, startDate, endDate, fetchOnMount = true, refetchInterval } = options

	const [data, setData] = useState<KitAggregatedMetrics | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const fetchData = useCallback(async () => {
		const currentUser = auth.currentUser
		if (!currentUser) {
			setError(new Error("User not authenticated"))
			return
		}

		setLoading(true)
		setError(null)
		try {
			const idToken = await currentUser.getIdToken()
			const result = await getKitAggregatedMetrics(idToken, { days, startDate, endDate })
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err : new Error(String(err)))
		} finally {
			setLoading(false)
		}
	}, [days, startDate?.toISOString(), endDate?.toISOString()])

	useEffect(() => {
		if (fetchOnMount && auth.currentUser) {
			fetchData()
		}
	}, [fetchData, fetchOnMount])

	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const intervalId = setInterval(fetchData, refetchInterval)
			return () => clearInterval(intervalId)
		}
	}, [fetchData, refetchInterval])

	return { data, loading, error, refetch: fetchData }
}

/**
 * Hook that combines all metrics for the Metriques dashboard
 * Returns individual stats + computed values for display
 */
export function useKitMetricsForDashboard(options: UseKitMetricsOptions = {}) {
	const { days = 30 } = options

	// Fetch all metrics in parallel
	const languageTool = useLanguageToolStats(options)
	const styleTone = useStyleToneStats({ ...options, days })
	const ragProcess = useRAGProcessStats(options)

	// Combined loading state
	const loading = languageTool.loading || styleTone.loading || ragProcess.loading

	// Combined error (return first error found)
	const error = languageTool.error || styleTone.error || ragProcess.error

	// Combined refetch
	const refetch = useCallback(async () => {
		await Promise.all([languageTool.refetch(), styleTone.refetch(), ragProcess.refetch()])
	}, [languageTool.refetch, styleTone.refetch, ragProcess.refetch])

	// Computed metrics for main cards
	const mainMetrics = useMemo(() => {
		const lt = languageTool.data
		const st = styleTone.data
		const rp = ragProcess.data

		// Terminology correction rate (from RAG)
		const terminologyCorrectionRate = rp && rp.totalCandidatesDetected > 0 ? ((rp.totalCorrectionsApplied / rp.totalCandidatesDetected) * 100).toFixed(1) : "-"

		// Orthography precision (from LanguageTool success rate)
		const orthographyPrecision = lt ? ((lt.successfulRequests / lt.totalRequests) * 100 || 0).toFixed(1) : "-"

		// Terminology coherence (from StyleTone avgStyleCoherence or RAG stats)
		const terminologyCoherence = st ? st.avgStyleCoherence.toFixed(1) : "-"

		// Style adequacy (from StyleTone overall score normalized to 5)
		const styleAdequacy = st ? ((st.avgOverallScore / 100) * 5).toFixed(1) : "-"

		return {
			terminologyCorrectionRate,
			orthographyPrecision,
			terminologyCoherence,
			styleAdequacy,
		}
	}, [languageTool.data, styleTone.data, ragProcess.data])

	// Additional metrics
	const additionalMetrics = useMemo(() => {
		const lt = languageTool.data
		const st = styleTone.data
		const rp = ragProcess.data

		return {
			toneConsistency: st ? st.avgToneAdequacy.toFixed(1) : "-",
			satisfactionScore: "-", // TODO: Implement feedback
			feedbackScore: "-", // TODO: Implement feedback
			errorsDetected: lt ? lt.totalErrorsDetected.toLocaleString() : "-",
			autoCorrections: rp ? `${((rp.totalCorrectionsApplied / (rp.totalExecutions || 1)) * 100).toFixed(0)}%` : "-",
			glossaryUpdates: "-", // TODO: Track from glossary handler
			vectorDBEvents: "-", // TODO: Track from vectorization
			rlhfFeedback: "-", // TODO: Implement RLHF
		}
	}, [languageTool.data, styleTone.data, ragProcess.data])

	// LLM metrics (from global metrics service, but for now use RAG stats)
	const llmMetrics = useMemo(() => {
		const rp = ragProcess.data
		const lt = languageTool.data
		const st = styleTone.data

		// Calculate average latency across services
		const avgLatencyMs = ((rp?.avgProcessingTimeMs || 0) + (lt?.avgLatencyMs || 0) + (st?.avgProcessingTimeMs || 0)) / (rp ? 1 : 0) + (lt ? 1 : 0) + (st ? 1 : 0) || 0

		return {
			avgResponseTime: avgLatencyMs ? (avgLatencyMs / 1000).toFixed(2) : "-",
			successRate: rp && rp.totalExecutions > 0 ? (((rp.successfulExecutions || rp.totalExecutions) / rp.totalExecutions) * 100).toFixed(1) : "-",
			totalRequests: (rp?.totalExecutions || 0) + (lt?.totalRequests || 0) + (st?.totalValidations || 0),
			p95Latency: "-", // TODO: Calculate from raw data
		}
	}, [ragProcess.data, languageTool.data, styleTone.data])

	return {
		// Raw data
		languageTool: languageTool.data,
		styleTone: styleTone.data,
		ragProcess: ragProcess.data,

		// Computed metrics for dashboard
		mainMetrics,
		additionalMetrics,
		llmMetrics,

		// State
		loading,
		error,
		refetch,
	}
}

export default useKitAggregatedMetrics
