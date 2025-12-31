/**
 * Valoracio Metrics - BigQuery logging for Offer evaluation metrics
 *
 * This module provides:
 * - Table setup for valoracio-specific metrics
 * - Logging functions for offer evaluation events
 * - Metrics aggregation queries
 *
 * Metrics tracked (Automatic):
 * - Documents Ingerits (ofertes processades)
 * - Temps Mitjà de Processament per Oferta
 * - Completesa de la Rúbrica d'Avaluació (%)
 * - Nombre de Criteris Avaluats per Oferta
 *
 * Metrics tracked (Human Feedback):
 * - Consistència de Puntuació (sistema vs humà)
 * - Correccions o Ajustaments Manuals (%)
 */

import * as logger from "firebase-functions/logger"
import { BigQueryClientManager, DEFAULT_PROJECT_ID, DEFAULT_DATASET_ID } from "../../shared/BigQueryLogger"

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Table name for valoracio metrics */
export const VALORACIO_METRICS_TABLE_ID = "valoracio_oferta_metrics"

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

/**
 * BigQuery schema for valoracio offer metrics
 *
 * This table captures all events related to offer evaluation,
 * including document processing, rubric completion, and human feedback.
 */
export const VALORACIO_METRICS_SCHEMA = [
	{ name: "id", type: "STRING", mode: "REQUIRED", description: "Unique event ID" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "Event timestamp" },
	{ name: "event_type", type: "STRING", mode: "REQUIRED", description: "Event type: oferta_processada, avaluacio_completada, correccio_manual, consistencia_feedback" },

	// Session tracking
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session ID for tracking user journey" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User ID (anonymized)" },

	// Document identification
	{ name: "lot_id", type: "STRING", mode: "NULLABLE", description: "Lot identifier" },
	{ name: "oferta_id", type: "STRING", mode: "NULLABLE", description: "Offer identifier" },
	{ name: "licitacio_id", type: "STRING", mode: "NULLABLE", description: "Tender/procurement identifier" },

	// Automatic metrics
	{ name: "processing_time_seconds", type: "FLOAT", mode: "NULLABLE", description: "Time to process the offer (seconds)" },
	{ name: "total_criteris", type: "INTEGER", mode: "NULLABLE", description: "Total criteria in rubric" },
	{ name: "criteris_avaluats", type: "INTEGER", mode: "NULLABLE", description: "Criteria successfully evaluated" },
	{ name: "completesa_rubrica", type: "FLOAT", mode: "NULLABLE", description: "Rubric completeness percentage (0-100)" },

	// Human feedback metrics
	{ name: "puntuacio_sistema", type: "FLOAT", mode: "NULLABLE", description: "System-generated score" },
	{ name: "puntuacio_humana", type: "FLOAT", mode: "NULLABLE", description: "Human-adjusted score" },
	{ name: "desviacio", type: "FLOAT", mode: "NULLABLE", description: "Deviation between system and human score" },
	{ name: "criteri_corregit", type: "STRING", mode: "NULLABLE", description: "Criterion that was corrected" },
	{ name: "comentari_correccio", type: "STRING", mode: "NULLABLE", description: "Correction comment/reason" },

	// Metadata
	{ name: "model_used", type: "STRING", mode: "NULLABLE", description: "LLM model used for evaluation" },
	{ name: "metadata", type: "STRING", mode: "NULLABLE", description: "Additional JSON metadata" },
]

// ============================================================================
// TYPES
// ============================================================================

export type ValoracioEventType = "oferta_processada" | "avaluacio_completada" | "correccio_manual" | "consistencia_feedback"

export interface ValoracioMetricEvent {
	id?: string
	timestamp?: Date
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

// ============================================================================
// TABLE SETUP
// ============================================================================

/**
 * Ensure the valoracio metrics table exists
 */
export async function ensureValoracioMetricsTable(projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID): Promise<boolean> {
	const manager = BigQueryClientManager.getInstance(projectId, datasetId)

	return manager.ensureTable(VALORACIO_METRICS_TABLE_ID, VALORACIO_METRICS_SCHEMA, {
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
 * Log a valoracio metric event to BigQuery
 */
export async function logValoracioMetricEvent(event: ValoracioMetricEvent, projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID): Promise<void> {
	const manager = BigQueryClientManager.getInstance(projectId, datasetId)

	// Ensure table exists (idempotent)
	await ensureValoracioMetricsTable(projectId, datasetId)

	const row = {
		id: event.id || generateEventId(),
		timestamp: event.timestamp || new Date(),
		event_type: event.event_type,
		session_id: event.session_id || null,
		user_id: event.user_id || null,
		lot_id: event.lot_id || null,
		oferta_id: event.oferta_id || null,
		licitacio_id: event.licitacio_id || null,
		processing_time_seconds: event.processing_time_seconds || null,
		total_criteris: event.total_criteris || null,
		criteris_avaluats: event.criteris_avaluats || null,
		completesa_rubrica: event.completesa_rubrica || null,
		puntuacio_sistema: event.puntuacio_sistema ?? null,
		puntuacio_humana: event.puntuacio_humana ?? null,
		desviacio: event.desviacio ?? null,
		criteri_corregit: event.criteri_corregit || null,
		comentari_correccio: event.comentari_correccio || null,
		model_used: event.model_used || null,
		metadata: event.metadata ? JSON.stringify(event.metadata) : null,
	}

	try {
		await manager.insert(VALORACIO_METRICS_TABLE_ID, [row])
		logger.info("Valoracio metric event logged", { event_type: event.event_type, id: row.id })
	} catch (error: any) {
		logger.error("Failed to log valoracio metric event", { error: error.message, event_type: event.event_type })
		throw error
	}
}

// ============================================================================
// AGGREGATION QUERIES
// ============================================================================

/**
 * Get aggregated valoracio metrics for dashboard
 */
export async function getValoracioMetrics(
	projectId: string = DEFAULT_PROJECT_ID,
	datasetId: string = DEFAULT_DATASET_ID,
	startDate?: Date,
	endDate?: Date
): Promise<{
	documentsIngerits: number
	tempsMitjaProcessament: number
	completesaRubrica: number
	criterisPerOferta: number
	consistenciaPuntuacio: number
	percentatgeCorreccions: number
	totalCorreccions: number
	totalAvaluacions: number
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
    WITH valoracio_stats AS (
      SELECT
        -- Documents processats
        COUNTIF(event_type = 'oferta_processada') as documents_ingerits,
        
        -- Temps mitjà de processament
        AVG(CASE WHEN event_type = 'oferta_processada' AND processing_time_seconds IS NOT NULL 
            THEN processing_time_seconds END) as temps_mitja_processament,
        
        -- Completesa de rúbrica
        AVG(CASE WHEN event_type = 'avaluacio_completada' AND completesa_rubrica IS NOT NULL 
            THEN completesa_rubrica END) as completesa_rubrica,
        
        -- Criteris per oferta
        AVG(CASE WHEN event_type = 'avaluacio_completada' AND criteris_avaluats IS NOT NULL 
            THEN criteris_avaluats END) as criteris_per_oferta,
        
        -- Consistència (100 - desviació mitjana)
        100 - COALESCE(AVG(CASE WHEN event_type = 'consistencia_feedback' AND desviacio IS NOT NULL 
            THEN ABS(desviacio) END), 0) as consistencia_puntuacio,
        
        -- Correccions manuals
        COUNTIF(event_type = 'correccio_manual') as total_correccions,
        COUNTIF(event_type = 'avaluacio_completada') as total_avaluacions
      FROM \`${projectId}.${datasetId}.${VALORACIO_METRICS_TABLE_ID}\`
      WHERE 1=1 ${dateFilter}
    )
    SELECT
      COALESCE(documents_ingerits, 0) as documents_ingerits,
      COALESCE(temps_mitja_processament, 0) as temps_mitja_processament,
      COALESCE(completesa_rubrica, 0) as completesa_rubrica,
      COALESCE(criteris_per_oferta, 0) as criteris_per_oferta,
      COALESCE(consistencia_puntuacio, 0) as consistencia_puntuacio,
      COALESCE(total_correccions, 0) as total_correccions,
      COALESCE(total_avaluacions, 0) as total_avaluacions,
      CASE WHEN total_avaluacions > 0 
        THEN ROUND((total_correccions / total_avaluacions) * 100, 2) 
        ELSE 0 END as percentatge_correccions
    FROM valoracio_stats
  `

	try {
		const [rows] = await client.query({ query, params })
		const row = rows[0] || {}

		return {
			documentsIngerits: row.documents_ingerits || 0,
			tempsMitjaProcessament: row.temps_mitja_processament || 0,
			completesaRubrica: row.completesa_rubrica || 0,
			criterisPerOferta: row.criteris_per_oferta || 0,
			consistenciaPuntuacio: row.consistencia_puntuacio || 0,
			percentatgeCorreccions: row.percentatge_correccions || 0,
			totalCorreccions: row.total_correccions || 0,
			totalAvaluacions: row.total_avaluacions || 0,
		}
	} catch (error: any) {
		logger.error("Failed to get valoracio metrics", { error: error.message })
		// Return zeros if table doesn't exist yet
		return {
			documentsIngerits: 0,
			tempsMitjaProcessament: 0,
			completesaRubrica: 0,
			criterisPerOferta: 0,
			consistenciaPuntuacio: 0,
			percentatgeCorreccions: 0,
			totalCorreccions: 0,
			totalAvaluacions: 0,
		}
	}
}
