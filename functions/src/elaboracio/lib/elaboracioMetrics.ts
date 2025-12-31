/**
 * Elaboracio Metrics - BigQuery logging for Decret generation metrics
 *
 * This module provides:
 * - Table setup for elaboracio-specific metrics
 * - Logging functions for decret generation events
 * - Metrics aggregation queries
 *
 * Metrics tracked:
 * - Decrets generats automàticament (click "Validar Decret")
 * - Revisió manual requerida (edició al DocumentPreview)
 * - Temps de generació per decret
 * - Validació legal (success/failure)
 * - Feedback precisió jurídica (puntuació 1-5)
 */

import * as logger from "firebase-functions/logger"
import { BigQueryClientManager, DEFAULT_PROJECT_ID, DEFAULT_DATASET_ID } from "../../shared/BigQueryLogger"

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Table name for elaboracio decret metrics */
export const DECRET_METRICS_TABLE_ID = "elaboracio_decret_metrics"

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

/**
 * BigQuery schema for elaboracio decret metrics
 *
 * This table captures all events related to decret generation,
 * including validation, manual edits, legal validation, and feedback.
 */
export const DECRET_METRICS_SCHEMA = [
	{ name: "id", type: "STRING", mode: "REQUIRED", description: "Unique event ID" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "Event timestamp" },
	{ name: "event_type", type: "STRING", mode: "REQUIRED", description: "Event type: decret_validated, manual_edit, legal_validation, feedback" },

	// Session tracking
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session ID for tracking user journey" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User ID (anonymized)" },

	// Decret identification
	{ name: "expedient_id", type: "STRING", mode: "NULLABLE", description: "Número d'expedient" },
	{ name: "beneficiari_nif", type: "STRING", mode: "NULLABLE", description: "NIF del beneficiari (hashed)" },

	// Event-specific fields
	{ name: "generation_time_seconds", type: "FLOAT", mode: "NULLABLE", description: "Time from upload to validation (seconds)" },
	{ name: "manual_edit_count", type: "INTEGER", mode: "NULLABLE", description: "Number of manual edits made" },
	{ name: "manual_edit_section", type: "STRING", mode: "NULLABLE", description: "Section edited (fets, fonaments, resolucio)" },
	{ name: "legal_validation_success", type: "BOOLEAN", mode: "NULLABLE", description: "Legal validation passed" },
	{ name: "legal_validation_errors", type: "STRING", mode: "NULLABLE", description: "JSON array of validation errors" },
	{ name: "feedback_score", type: "INTEGER", mode: "NULLABLE", description: "Juridical accuracy feedback (1-5)" },
	{ name: "feedback_comments", type: "STRING", mode: "NULLABLE", description: "Optional feedback comments" },

	// Metadata
	{ name: "model_used", type: "STRING", mode: "NULLABLE", description: "LLM model used for extraction" },
	{ name: "metadata", type: "STRING", mode: "NULLABLE", description: "Additional JSON metadata" },
]

// ============================================================================
// TYPES
// ============================================================================

export type ElaboracioEventType = "decret_validated" | "manual_edit" | "legal_validation" | "feedback"

export interface DecretMetricEvent {
	id?: string
	timestamp?: Date
	event_type: ElaboracioEventType
	session_id?: string
	user_id?: string
	expedient_id?: string
	beneficiari_nif?: string
	generation_time_seconds?: number
	manual_edit_count?: number
	manual_edit_section?: string
	legal_validation_success?: boolean
	legal_validation_errors?: string[]
	feedback_score?: number
	feedback_comments?: string
	model_used?: string
	metadata?: Record<string, any>
}

// ============================================================================
// TABLE SETUP
// ============================================================================

/**
 * Ensure the elaboracio decret metrics table exists
 */
export async function ensureDecretMetricsTable(projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID): Promise<boolean> {
	const manager = BigQueryClientManager.getInstance(projectId, datasetId)

	return manager.ensureTable(DECRET_METRICS_TABLE_ID, DECRET_METRICS_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "timestamp",
		},
		clustering: {
			fields: ["event_type", "session_id"],
		},
	})
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
	return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Log a decret metric event to BigQuery
 */
export async function logDecretMetricEvent(event: DecretMetricEvent, projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID): Promise<void> {
	const manager = BigQueryClientManager.getInstance(projectId, datasetId)

	// Ensure table exists (idempotent)
	await ensureDecretMetricsTable(projectId, datasetId)

	const row = {
		id: event.id || generateEventId(),
		timestamp: event.timestamp || new Date(),
		event_type: event.event_type,
		session_id: event.session_id || null,
		user_id: event.user_id || null,
		expedient_id: event.expedient_id || null,
		beneficiari_nif: event.beneficiari_nif || null,
		generation_time_seconds: event.generation_time_seconds || null,
		manual_edit_count: event.manual_edit_count || null,
		manual_edit_section: event.manual_edit_section || null,
		legal_validation_success: event.legal_validation_success ?? null,
		legal_validation_errors: event.legal_validation_errors ? JSON.stringify(event.legal_validation_errors) : null,
		feedback_score: event.feedback_score || null,
		feedback_comments: event.feedback_comments || null,
		model_used: event.model_used || null,
		metadata: event.metadata ? JSON.stringify(event.metadata) : null,
	}

	try {
		await manager.insert(DECRET_METRICS_TABLE_ID, [row])
		logger.info("Decret metric event logged", { event_type: event.event_type, id: row.id })
	} catch (error: any) {
		logger.error("Failed to log decret metric event", { error: error.message, event_type: event.event_type })
		throw error
	}
}

// ============================================================================
// AGGREGATION QUERIES
// ============================================================================

/**
 * Get aggregated elaboracio metrics for dashboard
 */
export async function getElaboracioMetrics(
	projectId: string = DEFAULT_PROJECT_ID,
	datasetId: string = DEFAULT_DATASET_ID,
	startDate?: Date,
	endDate?: Date
): Promise<{
	decretsGenerats: number
	decretsAmbRevisioManual: number
	percentatgeRevisioManual: number
	tempsMitjaGeneracio: number
	taxaExitValidacioLegal: number
	puntuacioMitjanaFeedback: number
	totalFeedbacks: number
}> {
	const manager = BigQueryClientManager.getInstance(projectId, datasetId)
	const client = await manager.getClient()

	// Build date filter
	let dateFilter = ""
	const params: any = {}
	if (startDate) {
		dateFilter += " AND timestamp >= @startDate"
		params.startDate = startDate.toISOString()
	}
	if (endDate) {
		dateFilter += " AND timestamp <= @endDate"
		params.endDate = endDate.toISOString()
	}

	const query = `
    WITH decret_stats AS (
      SELECT
        COUNTIF(event_type = 'decret_validated') as decrets_generats,
        COUNT(DISTINCT CASE WHEN event_type = 'manual_edit' THEN session_id END) as sessions_amb_revisio,
        COUNTIF(event_type = 'manual_edit') as total_edits,
        AVG(CASE WHEN event_type = 'decret_validated' AND generation_time_seconds IS NOT NULL THEN generation_time_seconds END) as temps_mitja_generacio,
        COUNTIF(event_type = 'legal_validation' AND legal_validation_success = TRUE) as legal_success,
        COUNTIF(event_type = 'legal_validation') as legal_total,
        AVG(CASE WHEN event_type = 'feedback' AND feedback_score IS NOT NULL THEN feedback_score END) as puntuacio_mitja,
        COUNTIF(event_type = 'feedback' AND feedback_score IS NOT NULL) as total_feedbacks
      FROM \`${projectId}.${datasetId}.${DECRET_METRICS_TABLE_ID}\`
      WHERE 1=1 ${dateFilter}
    ),
    decrets_with_edits AS (
      SELECT COUNT(DISTINCT d.session_id) as decrets_amb_revisio
      FROM \`${projectId}.${datasetId}.${DECRET_METRICS_TABLE_ID}\` d
      WHERE d.event_type = 'decret_validated'
        AND EXISTS (
          SELECT 1 FROM \`${projectId}.${datasetId}.${DECRET_METRICS_TABLE_ID}\` e
          WHERE e.session_id = d.session_id AND e.event_type = 'manual_edit'
        )
        ${dateFilter.replace(/timestamp/g, "d.timestamp")}
    )
    SELECT
      COALESCE(s.decrets_generats, 0) as decrets_generats,
      COALESCE(dwe.decrets_amb_revisio, 0) as decrets_amb_revisio,
      CASE WHEN s.decrets_generats > 0 THEN ROUND((dwe.decrets_amb_revisio / s.decrets_generats) * 100, 2) ELSE 0 END as percentatge_revisio,
      COALESCE(s.temps_mitja_generacio, 0) as temps_mitja_generacio,
      CASE WHEN s.legal_total > 0 THEN ROUND((s.legal_success / s.legal_total) * 100, 2) ELSE 0 END as taxa_exit_legal,
      COALESCE(s.puntuacio_mitja, 0) as puntuacio_mitja,
      COALESCE(s.total_feedbacks, 0) as total_feedbacks
    FROM decret_stats s
    CROSS JOIN decrets_with_edits dwe
  `

	try {
		const [rows] = await client.query({ query, params })
		const row = rows[0] || {}

		return {
			decretsGenerats: row.decrets_generats || 0,
			decretsAmbRevisioManual: row.decrets_amb_revisio || 0,
			percentatgeRevisioManual: row.percentatge_revisio || 0,
			tempsMitjaGeneracio: row.temps_mitja_generacio || 0,
			taxaExitValidacioLegal: row.taxa_exit_legal || 0,
			puntuacioMitjanaFeedback: row.puntuacio_mitja || 0,
			totalFeedbacks: row.total_feedbacks || 0,
		}
	} catch (error: any) {
		logger.error("Failed to get elaboracio metrics", { error: error.message })
		// Return zeros if table doesn't exist yet
		return {
			decretsGenerats: 0,
			decretsAmbRevisioManual: 0,
			percentatgeRevisioManual: 0,
			tempsMitjaGeneracio: 0,
			taxaExitValidacioLegal: 0,
			puntuacioMitjanaFeedback: 0,
			totalFeedbacks: 0,
		}
	}
}
