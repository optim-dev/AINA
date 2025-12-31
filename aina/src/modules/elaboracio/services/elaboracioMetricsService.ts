/**
 * Elaboracio Metrics Service - Frontend service for decret metrics
 *
 * This service provides access to the elaboracio metrics API endpoints,
 * for logging and retrieving decret generation metrics.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ElaboracioEventType = "decret_validated" | "manual_edit" | "legal_validation" | "feedback"

export interface DecretMetricEvent {
	event_type: ElaboracioEventType
	session_id?: string
	user_id?: string
	expedient_id?: string
	beneficiari_nif?: string
	generation_time_seconds?: number
	manual_edit_count?: number
	manual_edit_section?: "fets" | "fonaments" | "resolucio"
	legal_validation_success?: boolean
	legal_validation_errors?: string[]
	feedback_score?: 1 | 2 | 3 | 4 | 5
	feedback_comments?: string
	model_used?: string
	metadata?: Record<string, any>
}

export interface ElaboracioMetrics {
	decretsGenerats: number
	decretsAmbRevisioManual: number
	percentatgeRevisioManual: number
	tempsMitjaGeneracio: number
	taxaExitValidacioLegal: number
	puntuacioMitjanaFeedback: number
	totalFeedbacks: number
}

interface ApiResponse<T> {
	status: "success" | "error"
	data?: T
	error?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:5001/aina-demostradors/europe-west4" : "https://europe-west4-aina-demostradors.cloudfunctions.net"

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
	return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get or create a session ID from sessionStorage
 */
export function getOrCreateSessionId(): string {
	const key = "elaboracio_session_id"
	let sessionId = sessionStorage.getItem(key)
	if (!sessionId) {
		sessionId = generateSessionId()
		sessionStorage.setItem(key, sessionId)
	}
	return sessionId
}

/**
 * Store the upload start time for generation time calculation
 */
export function storeUploadStartTime(): void {
	sessionStorage.setItem("elaboracio_upload_start", Date.now().toString())
}

/**
 * Get the upload start time
 */
export function getUploadStartTime(): number | null {
	const stored = sessionStorage.getItem("elaboracio_upload_start")
	return stored ? parseInt(stored, 10) : null
}

/**
 * Calculate generation time in seconds from upload start to now
 */
export function calculateGenerationTime(): number | null {
	const startTime = getUploadStartTime()
	if (!startTime) return null
	return (Date.now() - startTime) / 1000
}

/**
 * Track manual edit count
 */
let manualEditCount = 0

export function incrementManualEditCount(): number {
	return ++manualEditCount
}

export function getManualEditCount(): number {
	return manualEditCount
}

export function resetManualEditCount(): void {
	manualEditCount = 0
}

// ============================================================================
// API SERVICE
// ============================================================================

/**
 * ElaboracioMetricsService - Frontend service for logging and querying metrics
 */
class ElaboracioMetricsService {
	private baseUrl: string

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl
	}

	/**
	 * Log a decret metric event
	 */
	async logEvent(event: DecretMetricEvent): Promise<void> {
		const url = `${this.baseUrl}/elaboracioLogMetric`

		// Always include session_id
		const eventWithSession = {
			...event,
			session_id: event.session_id || getOrCreateSessionId(),
		}

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventWithSession),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: response.statusText }))
				throw new Error(errorData.error || `HTTP ${response.status}`)
			}

			console.log(`[ElaboracioMetrics] Event logged: ${event.event_type}`)
		} catch (error: any) {
			console.error(`[ElaboracioMetrics] Failed to log event: ${error.message}`)
			// Don't throw - metrics logging should not block user flow
		}
	}

	/**
	 * Log decret validation event
	 */
	async logDecretValidated(expedientId?: string, modelUsed?: string): Promise<void> {
		const generationTime = calculateGenerationTime()
		const editCount = getManualEditCount()

		await this.logEvent({
			event_type: "decret_validated",
			expedient_id: expedientId,
			generation_time_seconds: generationTime ?? undefined,
			manual_edit_count: editCount,
			model_used: modelUsed,
		})

		// Reset for next decret
		resetManualEditCount()
	}

	/**
	 * Log manual edit event
	 */
	async logManualEdit(section: "fets" | "fonaments" | "resolucio", expedientId?: string): Promise<void> {
		const editCount = incrementManualEditCount()

		await this.logEvent({
			event_type: "manual_edit",
			expedient_id: expedientId,
			manual_edit_count: editCount,
			manual_edit_section: section,
		})
	}

	/**
	 * Log legal validation event
	 */
	async logLegalValidation(success: boolean, errors?: string[], expedientId?: string): Promise<void> {
		await this.logEvent({
			event_type: "legal_validation",
			expedient_id: expedientId,
			legal_validation_success: success,
			legal_validation_errors: errors,
		})
	}

	/**
	 * Log feedback event
	 */
	async logFeedback(score: 1 | 2 | 3 | 4 | 5, comments?: string, expedientId?: string): Promise<void> {
		await this.logEvent({
			event_type: "feedback",
			expedient_id: expedientId,
			feedback_score: score,
			feedback_comments: comments,
		})
	}

	/**
	 * Get aggregated metrics
	 */
	async getMetrics(startDate?: Date, endDate?: Date): Promise<ElaboracioMetrics> {
		const params = new URLSearchParams()
		if (startDate) params.append("startDate", startDate.toISOString())
		if (endDate) params.append("endDate", endDate.toISOString())

		const queryString = params.toString()
		const url = `${this.baseUrl}/elaboracioGetMetrics${queryString ? `?${queryString}` : ""}`

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: response.statusText }))
			throw new Error(errorData.error || `HTTP ${response.status}`)
		}

		const data: ApiResponse<ElaboracioMetrics> = await response.json()

		if (data.status === "error") {
			throw new Error(data.error || "Unknown error")
		}

		return data.data as ElaboracioMetrics
	}
}

// Export singleton instance
export const elaboracioMetricsService = new ElaboracioMetricsService()

// Export convenience functions
export const logDecretValidated = elaboracioMetricsService.logDecretValidated.bind(elaboracioMetricsService)
export const logManualEdit = elaboracioMetricsService.logManualEdit.bind(elaboracioMetricsService)
export const logLegalValidation = elaboracioMetricsService.logLegalValidation.bind(elaboracioMetricsService)
export const logFeedback = elaboracioMetricsService.logFeedback.bind(elaboracioMetricsService)
export const getElaboracioMetrics = elaboracioMetricsService.getMetrics.bind(elaboracioMetricsService)
