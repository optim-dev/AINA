/**
 * StyleToneLogger - BigQuery logging for Style and Tone validations
 *
 * This module provides logging and querying for style/tone validation requests
 * Pattern follows LanguageToolLogger.ts
 *
 * Uses the centralized BigQueryClientManager from BigQueryLogger for all BigQuery operations.
 */

import * as logger from "firebase-functions/logger"
import { getBigQueryManager, DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"
import type { StyleToneLog, StyleAlert, AlertSeverity, DetectedTone } from "./types/styleTone"

// ============================================================================
// CONFIGURATION
// ============================================================================

// Re-export DEFAULT_DATASET_ID for backward compatibility
export { DEFAULT_DATASET_ID } from "../shared/BigQueryLogger"
export const STYLE_TONE_TABLE_ID = "style_tone_logs"
export const STYLE_TONE_FEEDBACK_TABLE_ID = "style_tone_feedback"

// ============================================================================
// BIGQUERY SCHEMA
// ============================================================================

export const STYLE_TONE_LOGS_SCHEMA = [
	// Identifiers
	{ name: "log_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the log entry" },
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session identifier for traceability" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User identifier" },

	// Input
	{ name: "text_hash", type: "STRING", mode: "REQUIRED", description: "SHA256 hash of the input text (for deduplication)" },
	{ name: "text_length", type: "INTEGER", mode: "REQUIRED", description: "Length of input text in characters" },
	{ name: "document_type", type: "STRING", mode: "NULLABLE", description: "Type of document being validated" },
	{ name: "target_audience", type: "STRING", mode: "NULLABLE", description: "Target audience for the document" },

	// Scores
	{ name: "score_overall", type: "FLOAT", mode: "REQUIRED", description: "Overall weighted score (0-100)" },
	{ name: "score_style_coherence", type: "FLOAT", mode: "REQUIRED", description: "Style coherence score (0-100)" },
	{ name: "score_tone_adequacy", type: "FLOAT", mode: "REQUIRED", description: "Tone adequacy score (0-100)" },
	{ name: "score_clarity", type: "FLOAT", mode: "REQUIRED", description: "Clarity score (0-100)" },
	{ name: "score_formality", type: "FLOAT", mode: "REQUIRED", description: "Formality score (0-100)" },
	{ name: "score_terminology_consistency", type: "FLOAT", mode: "REQUIRED", description: "Terminology consistency score (0-100)" },

	// Tone analysis
	{ name: "detected_tone", type: "STRING", mode: "REQUIRED", description: "Detected tone classification" },
	{ name: "emotional_tone", type: "STRING", mode: "REQUIRED", description: "Emotional tone classification" },
	{ name: "objectivity", type: "FLOAT", mode: "REQUIRED", description: "Objectivity score (0-100)" },
	{ name: "model_confidence", type: "FLOAT", mode: "REQUIRED", description: "Model confidence (0-1)" },

	// Style metrics
	{ name: "avg_sentence_length", type: "FLOAT", mode: "REQUIRED", description: "Average words per sentence" },
	{ name: "passive_voice_pct", type: "FLOAT", mode: "REQUIRED", description: "Percentage of passive voice usage" },
	{ name: "lexical_diversity", type: "FLOAT", mode: "REQUIRED", description: "Type-token ratio (0-1)" },

	// Alerts aggregated
	{ name: "alerts_count_error", type: "INTEGER", mode: "REQUIRED", description: "Number of error-level alerts" },
	{ name: "alerts_count_warning", type: "INTEGER", mode: "REQUIRED", description: "Number of warning-level alerts" },
	{ name: "alerts_count_info", type: "INTEGER", mode: "REQUIRED", description: "Number of info-level alerts" },
	{ name: "alerts_json", type: "STRING", mode: "NULLABLE", description: "JSON array of all alerts" },

	// Recommendations
	{ name: "recommendations_count", type: "INTEGER", mode: "REQUIRED", description: "Number of recommendations generated" },

	// Metadata
	{ name: "processed_at", type: "TIMESTAMP", mode: "REQUIRED", description: "When the validation was processed" },
	{ name: "processing_time_ms", type: "INTEGER", mode: "REQUIRED", description: "Processing time in milliseconds" },
	{ name: "model_version", type: "STRING", mode: "REQUIRED", description: "Version of the tone model used" },
	{ name: "pipeline_version", type: "STRING", mode: "REQUIRED", description: "Version of the validation pipeline" },
]

export const STYLE_TONE_FEEDBACK_SCHEMA = [
	{ name: "feedback_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the feedback" },
	{ name: "log_id", type: "STRING", mode: "REQUIRED", description: "Reference to the original log entry" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User who submitted the feedback" },

	{ name: "feedback_target", type: "STRING", mode: "REQUIRED", description: "Type of feedback: alert, recommendation, or overall" },
	{ name: "target_id", type: "STRING", mode: "NULLABLE", description: "ID of the specific alert or recommendation" },

	{ name: "rating", type: "STRING", mode: "REQUIRED", description: "Positive or negative rating" },
	{ name: "comment", type: "STRING", mode: "NULLABLE", description: "Optional user comment" },
	{ name: "suggested_correction", type: "STRING", mode: "NULLABLE", description: "User-suggested correction" },

	{ name: "original_text", type: "STRING", mode: "NULLABLE", description: "The original text that was validated" },
	{ name: "alert_or_recommendation_json", type: "STRING", mode: "NULLABLE", description: "JSON of the alert or recommendation" },

	{ name: "submitted_at", type: "TIMESTAMP", mode: "REQUIRED", description: "When the feedback was submitted" },

	{ name: "reviewed", type: "BOOLEAN", mode: "REQUIRED", description: "Whether the feedback has been reviewed" },
	{ name: "reviewed_at", type: "TIMESTAMP", mode: "NULLABLE", description: "When the feedback was reviewed" },
	{ name: "reviewed_by", type: "STRING", mode: "NULLABLE", description: "Who reviewed the feedback" },
	{ name: "action_taken", type: "STRING", mode: "NULLABLE", description: "Action taken based on feedback" },
]

// ============================================================================
// STATS INTERFACE
// ============================================================================

export interface StyleToneStats {
	totalValidations: number
	avgOverallScore: number
	avgStyleCoherence: number
	avgToneAdequacy: number
	avgProcessingTimeMs: number
	toneDistribution: Record<DetectedTone, number>
	documentTypeDistribution: Record<string, number>
	alertsByType: Record<string, number>
	alertsBySeverity: Record<AlertSeverity, number>
	validationsByDay: Array<{ date: string; count: number; avgScore: number }>
	topAlertRules: Array<{ rule: string; count: number }>
}

// ============================================================================
// SETUP FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

export async function setupStyleToneTables(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID): Promise<{ logsCreated: boolean; feedbackCreated: boolean }> {
	const manager = getBigQueryManager(projectId, datasetId)

	let logsCreated = false
	let feedbackCreated = false

	// Create logs table
	logsCreated = await manager.ensureTable(STYLE_TONE_TABLE_ID, STYLE_TONE_LOGS_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "processed_at",
		},
		clustering: {
			fields: ["user_id", "document_type"],
		},
	})

	// Create feedback table
	feedbackCreated = await manager.ensureTable(STYLE_TONE_FEEDBACK_TABLE_ID, STYLE_TONE_FEEDBACK_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "submitted_at",
		},
	})

	return { logsCreated, feedbackCreated }
}

// ============================================================================
// LOGGER FACTORY (Using centralized BigQueryClientManager)
// ============================================================================

/**
 * Create a BigQuery logging callback for Style/Tone validation
 * Uses the centralized BigQueryClientManager for all operations.
 */
export function createStyleToneLogger(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID): (log: StyleToneLog) => Promise<void> {
	let initialized = false
	const manager = getBigQueryManager(projectId, datasetId)

	return async (log: StyleToneLog) => {
		try {
			// Ensure tables exist on first use
			if (!initialized) {
				await setupStyleToneTables(projectId, datasetId)
				initialized = true
			}

			// Transform log to BigQuery row format
			const row = {
				log_id: log.logId,
				session_id: log.sessionId || null,
				user_id: log.userId || null,
				text_hash: log.textHash,
				text_length: log.textLength,
				document_type: log.documentType || null,
				target_audience: log.targetAudience || null,
				score_overall: log.scoreOverall,
				score_style_coherence: log.scoreStyleCoherence,
				score_tone_adequacy: log.scoreToneAdequacy,
				score_clarity: log.scoreClarity,
				score_formality: log.scoreFormality,
				score_terminology_consistency: log.scoreTerminologyConsistency,
				detected_tone: log.detectedTone,
				emotional_tone: log.emotionalTone,
				objectivity: log.objectivity,
				model_confidence: log.modelConfidence,
				avg_sentence_length: log.avgSentenceLength,
				passive_voice_pct: log.passiveVoicePct,
				lexical_diversity: log.lexicalDiversity,
				alerts_count_error: log.alertsCountError,
				alerts_count_warning: log.alertsCountWarning,
				alerts_count_info: log.alertsCountInfo,
				alerts_json: log.alertsJson || null,
				recommendations_count: log.recommendationsCount,
				processed_at: log.processedAt.toISOString(),
				processing_time_ms: log.processingTimeMs,
				model_version: log.modelVersion,
				pipeline_version: log.pipelineVersion,
			}

			await manager.insert(STYLE_TONE_TABLE_ID, [row])

			logger.info("Style/Tone validation logged to BigQuery", {
				logId: log.logId,
				scoreOverall: log.scoreOverall,
			})
		} catch (e: any) {
			// Don't fail the request if logging fails
			logger.error("Failed to log style/tone validation to BigQuery", {
				error: e.message,
				logId: log.logId,
			})
		}
	}
}

// ============================================================================
// QUERY FUNCTIONS (Using centralized BigQueryClientManager)
// ============================================================================

/**
 * Get style/tone validation statistics
 */
export async function getStyleToneStats(projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, days: number = 30): Promise<StyleToneStats> {
	const manager = getBigQueryManager(projectId, datasetId)
	const table = manager.getFullTableName(STYLE_TONE_TABLE_ID)

	const query = `
		WITH recent_logs AS (
			SELECT *
			FROM ${table}
			WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
		),
		daily_stats AS (
			SELECT
				DATE(processed_at) as date,
				COUNT(*) as count,
				AVG(score_overall) as avg_score
			FROM recent_logs
			GROUP BY DATE(processed_at)
			ORDER BY date DESC
		),
		tone_counts AS (
			SELECT detected_tone, COUNT(*) as count
			FROM recent_logs
			GROUP BY detected_tone
		),
		doctype_counts AS (
			SELECT COALESCE(document_type, 'unknown') as doc_type, COUNT(*) as count
			FROM recent_logs
			GROUP BY document_type
		),
		severity_counts AS (
			SELECT
				SUM(alerts_count_error) as errors,
				SUM(alerts_count_warning) as warnings,
				SUM(alerts_count_info) as infos
			FROM recent_logs
		)
		SELECT
			(SELECT COUNT(*) FROM recent_logs) as total_validations,
			(SELECT AVG(score_overall) FROM recent_logs) as avg_overall_score,
			(SELECT AVG(score_style_coherence) FROM recent_logs) as avg_style_coherence,
			(SELECT AVG(score_tone_adequacy) FROM recent_logs) as avg_tone_adequacy,
			(SELECT AVG(processing_time_ms) FROM recent_logs) as avg_processing_time_ms
	`

	try {
		const client = await manager.getClient()
		const [rows] = await client.query({ query })

		// For simplicity, return basic stats. Full implementation would run multiple queries.
		const row = rows[0] || {}

		return {
			totalValidations: row.total_validations || 0,
			avgOverallScore: Math.round((row.avg_overall_score || 0) * 10) / 10,
			avgStyleCoherence: Math.round((row.avg_style_coherence || 0) * 10) / 10,
			avgToneAdequacy: Math.round((row.avg_tone_adequacy || 0) * 10) / 10,
			avgProcessingTimeMs: Math.round(row.avg_processing_time_ms || 0),
			toneDistribution: { formal_administratiu: 0, semiformal: 0, informal: 0, mixt: 0 },
			documentTypeDistribution: {},
			alertsByType: {},
			alertsBySeverity: { error: 0, warning: 0, info: 0 },
			validationsByDay: [],
			topAlertRules: [],
		}
	} catch (e: any) {
		logger.error("Failed to get style/tone stats", { error: e.message })
		return {
			totalValidations: 0,
			avgOverallScore: 0,
			avgStyleCoherence: 0,
			avgToneAdequacy: 0,
			avgProcessingTimeMs: 0,
			toneDistribution: { formal_administratiu: 0, semiformal: 0, informal: 0, mixt: 0 },
			documentTypeDistribution: {},
			alertsByType: {},
			alertsBySeverity: { error: 0, warning: 0, info: 0 },
			validationsByDay: [],
			topAlertRules: [],
		}
	}
}

/**
 * Get recent validations for a user
 */
export async function getRecentValidations(userId: string, projectId: string = "aina-demostradors", datasetId: string = DEFAULT_DATASET_ID, limit: number = 20): Promise<any[]> {
	const manager = getBigQueryManager(projectId, datasetId)
	const table = manager.getFullTableName(STYLE_TONE_TABLE_ID)

	const query = `
		SELECT
			log_id,
			document_type,
			score_overall,
			score_style_coherence,
			score_tone_adequacy,
			detected_tone,
			alerts_count_error,
			alerts_count_warning,
			processed_at,
			processing_time_ms
		FROM ${table}
		WHERE user_id = @userId
		ORDER BY processed_at DESC
		LIMIT @limit
	`

	try {
		const client = await manager.getClient()
		const options = {
			query,
			params: { userId, limit },
		}
		const [rows] = await client.query(options)
		return rows
	} catch (e: any) {
		logger.error("Failed to get recent validations", { error: e.message, userId })
		return []
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique log ID
 */
export function generateLogId(): string {
	return `st_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Calculate SHA256 hash of text
 */
export function hashText(text: string): string {
	const crypto = require("crypto")
	return crypto.createHash("sha256").update(text).digest("hex")
}

/**
 * Count alerts by severity
 */
export function countAlertsBySeverity(alerts: StyleAlert[]): Record<AlertSeverity, number> {
	return {
		error: alerts.filter((a) => a.severity === "error").length,
		warning: alerts.filter((a) => a.severity === "warning").length,
		info: alerts.filter((a) => a.severity === "info").length,
	}
}
