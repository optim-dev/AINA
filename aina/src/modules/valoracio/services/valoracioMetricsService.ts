/**
 * Valoracio Metrics Service - Frontend service for offer evaluation metrics
 *
 * This service provides access to the valoracio metrics API endpoints,
 * for logging and retrieving offer evaluation metrics.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ValoracioEventType = "oferta_processada" | "avaluacio_completada" | "correccio_manual" | "consistencia_feedback"

export interface ValoracioMetricEvent {
	event_type: ValoracioEventType
	session_id?: string
	user_id?: string
	lot_id?: string
	oferta_id?: string
	licitacio_id?: string
	processing_time_seconds?: number
	total_criteris?: number
	criteris_avaluats?: number
	completesa_rubrica?: number
	puntuacio_sistema?: number
	puntuacio_humana?: number
	desviacio?: number
	criteri_corregit?: string
	comentari_correccio?: string
	model_used?: string
	metadata?: Record<string, any>
}

export interface ValoracioMetrics {
	documentsIngerits: number
	tempsMitjaProcessament: number
	completesaRubrica: number
	criterisPerOferta: number
	consistenciaPuntuacio: number
	percentatgeCorreccions: number
	totalCorreccions: number
	totalAvaluacions: number
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
	const key = "valoracio_session_id"
	let sessionId = sessionStorage.getItem(key)
	if (!sessionId) {
		sessionId = generateSessionId()
		sessionStorage.setItem(key, sessionId)
	}
	return sessionId
}

/**
 * Clear the current session
 */
export function clearSession(): void {
	sessionStorage.removeItem("valoracio_session_id")
	sessionStorage.removeItem("valoracio_upload_start_time")
}

/**
 * Store the upload/processing start time for timing calculation
 */
export function storeProcessingStartTime(): void {
	sessionStorage.setItem("valoracio_upload_start_time", Date.now().toString())
}

/**
 * Calculate processing time in seconds from stored start time
 */
export function calculateProcessingTime(): number | undefined {
	const startTimeStr = sessionStorage.getItem("valoracio_upload_start_time")
	if (!startTimeStr) return undefined

	const startTime = parseInt(startTimeStr, 10)
	const endTime = Date.now()
	return (endTime - startTime) / 1000
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Log a valoracio metric event
 */
async function logMetricEvent(event: ValoracioMetricEvent): Promise<void> {
	try {
		const response = await fetch(`${API_BASE_URL}/valoracioLogMetric`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(event),
		})

		if (!response.ok) {
			const error = await response.json()
			console.error("Failed to log metric:", error)
		}
	} catch (error) {
		console.error("Error logging metric:", error)
	}
}

/**
 * Log when an offer document is processed (ingested)
 */
export async function logOfertaProcessada(data: { lotId: string; ofertaId: string; licitacioId?: string; modelUsed?: string }): Promise<void> {
	const processingTime = calculateProcessingTime()

	await logMetricEvent({
		event_type: "oferta_processada",
		session_id: getOrCreateSessionId(),
		lot_id: data.lotId,
		oferta_id: data.ofertaId,
		licitacio_id: data.licitacioId,
		processing_time_seconds: processingTime,
		model_used: data.modelUsed,
	})
}

/**
 * Log when an evaluation is completed
 */
export async function logAvaluacioCompletada(data: { lotId: string; ofertaId: string; totalCriteris: number; criterisAvaluats: number; modelUsed?: string }): Promise<void> {
	const completesa = data.totalCriteris > 0 ? (data.criterisAvaluats / data.totalCriteris) * 100 : 0

	await logMetricEvent({
		event_type: "avaluacio_completada",
		session_id: getOrCreateSessionId(),
		lot_id: data.lotId,
		oferta_id: data.ofertaId,
		total_criteris: data.totalCriteris,
		criteris_avaluats: data.criterisAvaluats,
		completesa_rubrica: completesa,
		model_used: data.modelUsed,
	})
}

/**
 * Log a manual correction made by a user
 */
export async function logCorreccioManual(data: { lotId: string; ofertaId: string; criteri: string; puntuacioSistema: number; puntuacioHumana: number; comentari?: string }): Promise<void> {
	const desviacio = Math.abs(data.puntuacioHumana - data.puntuacioSistema)

	await logMetricEvent({
		event_type: "correccio_manual",
		session_id: getOrCreateSessionId(),
		lot_id: data.lotId,
		oferta_id: data.ofertaId,
		puntuacio_sistema: data.puntuacioSistema,
		puntuacio_humana: data.puntuacioHumana,
		desviacio: desviacio,
		criteri_corregit: data.criteri,
		comentari_correccio: data.comentari,
	})
}

/**
 * Log consistency feedback (system vs human comparison)
 */
export async function logConsistenciaFeedback(data: { lotId: string; ofertaId: string; puntuacioSistema: number; puntuacioHumana: number; comentari?: string }): Promise<void> {
	const desviacio = data.puntuacioHumana - data.puntuacioSistema

	await logMetricEvent({
		event_type: "consistencia_feedback",
		session_id: getOrCreateSessionId(),
		lot_id: data.lotId,
		oferta_id: data.ofertaId,
		puntuacio_sistema: data.puntuacioSistema,
		puntuacio_humana: data.puntuacioHumana,
		desviacio: desviacio,
		comentari_correccio: data.comentari,
	})
}

/**
 * Get aggregated valoracio metrics from the API
 */
export async function getValoracioMetrics(startDate?: Date, endDate?: Date): Promise<ValoracioMetrics> {
	try {
		const params = new URLSearchParams()
		if (startDate) params.append("startDate", startDate.toISOString())
		if (endDate) params.append("endDate", endDate.toISOString())

		const url = `${API_BASE_URL}/valoracioGetMetrics${params.toString() ? `?${params.toString()}` : ""}`

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result: ApiResponse<ValoracioMetrics> = await response.json()

		if (result.status === "error") {
			throw new Error(result.error || "Unknown error")
		}

		return (
			result.data || {
				documentsIngerits: 0,
				tempsMitjaProcessament: 0,
				completesaRubrica: 0,
				criterisPerOferta: 0,
				consistenciaPuntuacio: 0,
				percentatgeCorreccions: 0,
				totalCorreccions: 0,
				totalAvaluacions: 0,
			}
		)
	} catch (error) {
		console.error("Error fetching valoracio metrics:", error)
		throw error
	}
}

/**
 * Setup the valoracio metrics table
 */
export async function setupValoracioMetricsTable(): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/valoracioSetupTable`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const result = await response.json()
		return result.status === "success"
	} catch (error) {
		console.error("Error setting up valoracio metrics table:", error)
		return false
	}
}
