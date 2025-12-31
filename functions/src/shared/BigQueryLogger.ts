/**
 * BigQueryLogger - Centralized BigQuery client and logging utilities
 *
 * This module provides:
 * - Centralized BigQuery client management (singleton pattern)
 * - BigQuery dataset and table setup for all AINA logging
 * - Logging callback factory for use with LLMService
 * - Unified access to BigQuery operations across all modules
 *
 * ALL BigQuery operations in the AINA platform should go through this module.
 *
 * @see /docs/bigquery-schema.md for schema documentation
 */

import * as logger from "firebase-functions/logger"
import * as crypto from "crypto"
import type { LLMInteractionLog } from "./LLMService"

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default GCP project ID */
export const DEFAULT_PROJECT_ID = process.env.GCLOUD_PROJECT || "aina-demostradors"

/** Default BigQuery dataset name (can be overridden via environment variable) */
export const DEFAULT_DATASET_ID = process.env.BQ_DATASET || "aina_mvp_metrics"

/** Default table name for LLM interaction logs (v2 with anonymization) */
export const DEFAULT_TABLE_ID = process.env.BQ_TABLE_ID || "llm_logs_v2"

/** Legacy table name (v1 without anonymization) - for backward compatibility */
export const LEGACY_TABLE_ID = "llm_logs"

/** Default BigQuery location for GDPR compliance */
export const DEFAULT_LOCATION = "EU"

/** Enable PII anonymization in logs (default: true for GDPR compliance) */
export const ANONYMIZE_PII = process.env.BQ_ANONYMIZE_PII !== "false"

/** Length of truncated SHA-256 hash for anonymized content */
export const HASH_TRUNCATE_LENGTH = 16

// ============================================================================
// PII ANONYMIZATION UTILITIES
// ============================================================================

/**
 * Generate a truncated SHA-256 hash for anonymizing text content
 *
 * This function creates a deterministic hash that can be used to:
 * - Track unique prompts/responses without storing actual content
 * - Correlate related interactions without exposing PII
 * - Maintain analytics capabilities while ensuring GDPR compliance
 *
 * @param text - The text to anonymize
 * @param truncateLength - Length of the truncated hash (default: 16 chars)
 * @returns Truncated SHA-256 hash prefixed with 'anon_'
 *
 * @example
 * ```typescript
 * anonymizeText("Hello world") // Returns "anon_a591a6d40bf420"
 * ```
 */
export function anonymizeText(text: string | null | undefined, truncateLength: number = HASH_TRUNCATE_LENGTH): string | null {
	if (!text) return null
	const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex")
	return `anon_${hash.substring(0, truncateLength)}`
}

/**
 * Calculate content length for analytics without storing actual content
 *
 * @param text - The text to measure
 * @returns Object with character and word counts, or null if text is empty
 */
export function getContentMetrics(text: string | null | undefined): { charCount: number; wordCount: number } | null {
	if (!text) return null
	return {
		charCount: text.length,
		wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
	}
}

/**
 * Options for configuring PII anonymization behavior
 */
export interface AnonymizationOptions {
	/** Whether to anonymize prompt content (default: true) */
	anonymizePrompt?: boolean
	/** Whether to anonymize system prompt content (default: true) */
	anonymizeSystemPrompt?: boolean
	/** Whether to anonymize response content (default: true) */
	anonymizeResponse?: boolean
	/** Whether to include content length metrics (default: true) */
	includeContentMetrics?: boolean
	/** Custom hash truncation length (default: 16) */
	hashTruncateLength?: number
}

/** Default anonymization options for GDPR compliance */
export const DEFAULT_ANONYMIZATION_OPTIONS: AnonymizationOptions = {
	anonymizePrompt: true,
	anonymizeSystemPrompt: true,
	anonymizeResponse: true,
	includeContentMetrics: true,
	hashTruncateLength: HASH_TRUNCATE_LENGTH,
}

// ============================================================================
// CENTRALIZED BIGQUERY CLIENT MANAGER
// ============================================================================

/**
 * BigQueryClientManager - Singleton manager for BigQuery client access
 *
 * This class ensures a single BigQuery client instance is shared across
 * all modules, improving performance and resource utilization.
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const manager = BigQueryClientManager.getInstance()
 *
 * // Get client for queries
 * const client = await manager.getClient()
 *
 * // Execute a query
 * const [rows] = await client.query({ query: 'SELECT * FROM ...' })
 *
 * // Insert rows
 * await manager.insert('my_table', [{ field: 'value' }])
 * ```
 */
export class BigQueryClientManager {
	private static instance: BigQueryClientManager | null = null
	private client: any = null
	private projectId: string
	private datasetId: string
	private datasetEnsured: boolean = false

	private constructor(projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID) {
		this.projectId = projectId
		this.datasetId = datasetId
	}

	/**
	 * Get the singleton instance of BigQueryClientManager
	 */
	static getInstance(projectId: string = DEFAULT_PROJECT_ID, datasetId: string = DEFAULT_DATASET_ID): BigQueryClientManager {
		if (!BigQueryClientManager.instance) {
			BigQueryClientManager.instance = new BigQueryClientManager(projectId, datasetId)
		}
		return BigQueryClientManager.instance
	}

	/**
	 * Reset the singleton instance (primarily for testing)
	 */
	static resetInstance(): void {
		BigQueryClientManager.instance = null
	}

	/**
	 * Get the BigQuery client, initializing it if necessary
	 */
	async getClient(): Promise<any> {
		if (!this.client) {
			const { BigQuery } = require("@google-cloud/bigquery")
			this.client = new BigQuery({ projectId: this.projectId, location: DEFAULT_LOCATION })
			logger.debug("BigQuery client initialized", { projectId: this.projectId, location: DEFAULT_LOCATION })
		}
		return this.client
	}

	/**
	 * Get the current project ID
	 */
	getProjectId(): string {
		return this.projectId
	}

	/**
	 * Get the current dataset ID
	 */
	getDatasetId(): string {
		return this.datasetId
	}

	/**
	 * Ensure the dataset exists, creating it if necessary
	 * This is idempotent and safe to call multiple times
	 */
	async ensureDataset(): Promise<boolean> {
		if (this.datasetEnsured) {
			return true
		}

		const client = await this.getClient()
		try {
			await client.createDataset(this.datasetId, { location: DEFAULT_LOCATION })
			logger.info(`Dataset ${this.datasetId} created.`)
			this.datasetEnsured = true
			return true
		} catch (e: any) {
			if (e.code === 409) {
				// Dataset already exists
				logger.debug(`Dataset ${this.datasetId} already exists.`)
				this.datasetEnsured = true
				return true
			}
			logger.error(`Failed to create dataset ${this.datasetId}`, { error: e.message })
			throw e
		}
	}

	/**
	 * Ensure a table exists with the given schema, creating it if necessary
	 * This is idempotent and safe to call multiple times
	 */
	async ensureTable(tableId: string, schema: any[], options?: { timePartitioning?: any; clustering?: any }): Promise<boolean> {
		await this.ensureDataset()
		const client = await this.getClient()

		try {
			const tableOptions: any = { schema }

			if (options?.timePartitioning) {
				tableOptions.timePartitioning = options.timePartitioning
			}

			if (options?.clustering) {
				tableOptions.clustering = options.clustering
			}

			await client.dataset(this.datasetId).createTable(tableId, tableOptions)
			logger.info(`Table ${tableId} created.`)
			return true
		} catch (e: any) {
			if (e.code === 409) {
				logger.debug(`Table ${tableId} already exists.`)
				return false
			}
			logger.error(`Failed to create table ${tableId}`, { error: e.message })
			throw e
		}
	}

	/**
	 * Check if a table exists
	 */
	async tableExists(tableId: string): Promise<boolean> {
		try {
			const client = await this.getClient()
			const [exists] = await client.dataset(this.datasetId).table(tableId).exists()
			return exists
		} catch (error: any) {
			logger.error(`Failed to check table existence: ${tableId}`, { error: error.message })
			return false
		}
	}

	/**
	 * Insert rows into a table
	 * Handles common error cases gracefully
	 */
	async insert(tableId: string, rows: any[]): Promise<void> {
		const client = await this.getClient()
		try {
			await client.dataset(this.datasetId).table(tableId).insert(rows)
		} catch (error: any) {
			// Log partial insert errors with detailed error info
			if (error.name === "PartialFailureError") {
				const errorDetails = error.errors?.map((e: any) => ({
					row: e.row,
					errors: e.errors?.map((err: any) => ({
						reason: err.reason,
						message: err.message,
						location: err.location,
					})),
				}))
				logger.warn(`Partial insert failure for table ${tableId}`, {
					insertedRows: rows.length - (error.errors?.length || 0),
					failedRows: error.errors?.length || 0,
					errorDetails: JSON.stringify(errorDetails),
				})
				return
			}
			throw error
		}
	}

	/**
	 * Update table schema by adding new columns
	 * Note: BigQuery allows adding columns but not removing or modifying existing ones
	 */
	async updateTableSchema(tableId: string, newSchema: any[]): Promise<boolean> {
		try {
			const client = await this.getClient()
			const table = client.dataset(this.datasetId).table(tableId)
			const [metadata] = await table.getMetadata()

			// Get current column names
			const currentColumns = new Set(metadata.schema.fields.map((f: any) => f.name))

			// Find new columns to add
			const columnsToAdd = newSchema.filter((col) => !currentColumns.has(col.name))

			if (columnsToAdd.length === 0) {
				logger.debug(`Table ${tableId} schema is up to date`)
				return false
			}

			// Add new columns to existing schema
			const updatedSchema = [...metadata.schema.fields, ...columnsToAdd]

			await table.setMetadata({ schema: { fields: updatedSchema } })
			logger.info(`Table ${tableId} schema updated, added columns: ${columnsToAdd.map((c) => c.name).join(", ")}`)
			return true
		} catch (error: any) {
			logger.error(`Failed to update table schema: ${tableId}`, { error: error.message })
			throw error
		}
	}

	/**
	 * Execute a query and return results
	 * Automatically ensures the dataset exists before querying
	 */
	async query(queryString: string, params?: Record<string, any>): Promise<any[]> {
		// Ensure dataset exists before querying
		await this.ensureDataset()
		const client = await this.getClient()
		const [rows] = await client.query({ query: queryString, params, location: DEFAULT_LOCATION })
		return rows
	}

	/**
	 * Get the full table reference string for use in queries
	 */
	getFullTableName(tableId: string): string {
		return `\`${this.projectId}.${this.datasetId}.${tableId}\``
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the BigQuery client manager singleton
 * This is the primary way to access BigQuery throughout the application
 */
export function getBigQueryManager(projectId?: string, datasetId?: string): BigQueryClientManager {
	return BigQueryClientManager.getInstance(projectId || DEFAULT_PROJECT_ID, datasetId || DEFAULT_DATASET_ID)
}

/**
 * Get a BigQuery client directly (convenience wrapper)
 * For most use cases, prefer using BigQueryClientManager methods directly
 */
export async function getBigQueryClient(projectId?: string): Promise<any> {
	const manager = getBigQueryManager(projectId)
	return manager.getClient()
}

// ============================================================================
// LLM LOGS BIGQUERY SCHEMA DEFINITION
// ============================================================================

/**
 * BigQuery schema for LLM interaction logs (v2 - with PII anonymization)
 *
 * This schema does NOT store raw prompt/response text for GDPR compliance.
 * Instead, it stores:
 * - SHA-256 truncated hashes for correlation
 * - Character/word counts for analytics
 * - All other metadata (tokens, latency, cost, etc.)
 *
 * @see LEGACY_LLM_LOGS_SCHEMA for backward compatibility with v1
 */
export const LLM_LOGS_SCHEMA = [
	{ name: "request_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the request (format: req_{timestamp}_{random})" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "When the request was initiated" },
	{ name: "provider", type: "STRING", mode: "REQUIRED", description: "LLM provider (gemini, salamandra, gemini-2.5-flash, etc.)" },
	{ name: "model_version", type: "STRING", mode: "REQUIRED", description: "Model version string (e.g., gemini-2.5-flash, BSC-LT/salamandra-7b-instruct)" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User identifier for the request" },
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session identifier for grouping related requests" },
	{ name: "module", type: "STRING", mode: "NULLABLE", description: "AINA module that made the request (valoracio, elaboracio, kit)" },
	// Anonymized content fields (SHA-256 truncated hashes for GDPR compliance)
	{ name: "prompt_hash", type: "STRING", mode: "NULLABLE", description: "Anonymized SHA-256 hash of the user's input prompt (format: anon_{hash16})" },
	{ name: "system_prompt_hash", type: "STRING", mode: "NULLABLE", description: "Anonymized SHA-256 hash of the system prompt (format: anon_{hash16})" },
	{ name: "response_hash", type: "STRING", mode: "NULLABLE", description: "Anonymized SHA-256 hash of the LLM response (format: anon_{hash16})" },
	// Content metrics (for analytics without storing actual content)
	{ name: "prompt_char_count", type: "INTEGER", mode: "NULLABLE", description: "Character count of the original prompt" },
	{ name: "prompt_word_count", type: "INTEGER", mode: "NULLABLE", description: "Word count of the original prompt" },
	{ name: "response_char_count", type: "INTEGER", mode: "NULLABLE", description: "Character count of the original response" },
	{ name: "response_word_count", type: "INTEGER", mode: "NULLABLE", description: "Word count of the original response" },
	// Token usage
	{ name: "prompt_tokens", type: "INTEGER", mode: "NULLABLE", description: "Number of tokens in the prompt" },
	{ name: "completion_tokens", type: "INTEGER", mode: "NULLABLE", description: "Number of tokens in the completion/response" },
	{ name: "total_tokens", type: "INTEGER", mode: "NULLABLE", description: "Total tokens used (prompt + completion)" },
	{ name: "latency_ms", type: "INTEGER", mode: "NULLABLE", description: "Request latency in milliseconds" },
	{ name: "error", type: "STRING", mode: "NULLABLE", description: "Error message if the request failed" },
	{ name: "error_stack", type: "STRING", mode: "NULLABLE", description: "Error stack trace if available" },
	{ name: "cost_estimate_usd", type: "FLOAT", mode: "NULLABLE", description: "Estimated cost in USD based on token usage" },
	{ name: "options_json", type: "STRING", mode: "NULLABLE", description: "Serialized JSON of LLMRequestOptions (maxTokens, temperature, etc.)" },
	{ name: "context_json", type: "STRING", mode: "NULLABLE", description: "Serialized JSON of additional context metadata" },
	{ name: "anonymized", type: "BOOLEAN", mode: "NULLABLE", description: "Whether PII was anonymized in this log entry" },
]

/**
 * Legacy BigQuery schema for LLM interaction logs (v1 - with raw text)
 *
 * WARNING: This schema stores raw prompt/response text which may contain PII.
 * Only use for backward compatibility with existing tables.
 * New deployments should use LLM_LOGS_SCHEMA (v2).
 *
 * @deprecated Use LLM_LOGS_SCHEMA for new deployments
 */
export const LEGACY_LLM_LOGS_SCHEMA = [
	{ name: "request_id", type: "STRING", mode: "REQUIRED", description: "Unique identifier for the request" },
	{ name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED", description: "When the request was initiated" },
	{ name: "provider", type: "STRING", mode: "REQUIRED", description: "LLM provider" },
	{ name: "model_version", type: "STRING", mode: "REQUIRED", description: "Model version string" },
	{ name: "user_id", type: "STRING", mode: "NULLABLE", description: "User identifier" },
	{ name: "session_id", type: "STRING", mode: "NULLABLE", description: "Session identifier" },
	{ name: "module", type: "STRING", mode: "NULLABLE", description: "AINA module" },
	{ name: "prompt", type: "STRING", mode: "NULLABLE", description: "The user's input prompt (DEPRECATED - contains PII)" },
	{ name: "system_prompt", type: "STRING", mode: "NULLABLE", description: "System prompt (DEPRECATED - may contain PII)" },
	{ name: "response", type: "STRING", mode: "NULLABLE", description: "The LLM's response (DEPRECATED - may contain PII)" },
	{ name: "prompt_tokens", type: "INTEGER", mode: "NULLABLE", description: "Number of tokens in the prompt" },
	{ name: "completion_tokens", type: "INTEGER", mode: "NULLABLE", description: "Number of tokens in the completion" },
	{ name: "total_tokens", type: "INTEGER", mode: "NULLABLE", description: "Total tokens used" },
	{ name: "latency_ms", type: "INTEGER", mode: "NULLABLE", description: "Request latency in milliseconds" },
	{ name: "error", type: "STRING", mode: "NULLABLE", description: "Error message if failed" },
	{ name: "error_stack", type: "STRING", mode: "NULLABLE", description: "Error stack trace" },
	{ name: "cost_estimate_usd", type: "FLOAT", mode: "NULLABLE", description: "Estimated cost in USD" },
	{ name: "options_json", type: "STRING", mode: "NULLABLE", description: "Serialized LLMRequestOptions" },
	{ name: "context_json", type: "STRING", mode: "NULLABLE", description: "Additional context metadata" },
]

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

export interface SetupBigQueryResult {
	datasetId: string
	tableId: string
	datasetCreated: boolean
	tableCreated: boolean
}

/**
 * Setup BigQuery dataset and table for LLM interaction logging
 *
 * This should be called once during deployment or initialization.
 * It creates the dataset and table if they don't exist, and is idempotent
 * (safe to call multiple times).
 *
 * Uses the centralized BigQueryClientManager for all operations.
 *
 * @param projectId - GCP project ID (optional, uses default credentials if not provided)
 * @param datasetId - BigQuery dataset ID (defaults to BQ_DATASET env var or 'aina_mvp_metrics')
 * @param tableId - BigQuery table ID (defaults to 'llm_logs')
 * @returns Object containing dataset and table IDs, plus creation status
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * await setupBigQuery()
 *
 * // With explicit project
 * await setupBigQuery('aina-demostradors')
 *
 * // With custom dataset and table
 * await setupBigQuery('my-project', 'my_metrics', 'my_llm_logs')
 * ```
 */
export async function setupBigQuery(projectId?: string, datasetId: string = DEFAULT_DATASET_ID, tableId: string = DEFAULT_TABLE_ID): Promise<SetupBigQueryResult> {
	const manager = getBigQueryManager(projectId, datasetId)

	let datasetCreated = false
	let tableCreated = false

	// 1. Ensure the Dataset exists
	try {
		await manager.ensureDataset()
		// Note: ensureDataset doesn't tell us if it was created, so we assume it was if no error
	} catch (e: any) {
		throw e
	}

	// 2. Create the Table if it doesn't exist, or update schema if it does
	tableCreated = await manager.ensureTable(tableId, LLM_LOGS_SCHEMA, {
		timePartitioning: {
			type: "DAY",
			field: "timestamp", // Partition by timestamp for efficient queries
		},
	})

	// 3. If table already existed, try to update schema with new columns
	if (!tableCreated) {
		try {
			await manager.updateTableSchema(tableId, LLM_LOGS_SCHEMA)
		} catch (e: any) {
			// Log but don't fail - schema update is best effort
			logger.warn(`Could not update table schema for ${tableId}`, { error: e.message })
		}
	}

	return { datasetId, tableId, datasetCreated, tableCreated }
}

/**
 * Verify that the BigQuery table exists and is accessible
 * Uses the centralized BigQueryClientManager
 *
 * @param projectId - GCP project ID (optional)
 * @param datasetId - BigQuery dataset ID
 * @param tableId - BigQuery table ID
 * @returns true if the table exists and is accessible
 */
export async function verifyBigQueryTable(projectId?: string, datasetId: string = DEFAULT_DATASET_ID, tableId: string = DEFAULT_TABLE_ID): Promise<boolean> {
	try {
		const manager = getBigQueryManager(projectId, datasetId)
		return await manager.tableExists(tableId)
	} catch (error: any) {
		logger.error("Failed to verify BigQuery table", { error: error.message })
		return false
	}
}

// ============================================================================
// LOGGER FACTORY
// ============================================================================

/**
 * Create a BigQuery logging callback for use with LLMService
 *
 * This factory creates a callback function that can be passed to
 * LLMService.setLogCallback() to automatically log all LLM interactions
 * to BigQuery.
 *
 * Automatically selects the appropriate table and schema based on ANONYMIZE_PII:
 * - ANONYMIZE_PII=true (default): Uses llm_logs_v2 with anonymized hashes
 * - ANONYMIZE_PII=false: Uses llm_logs (legacy) with raw text
 *
 * Uses the centralized BigQueryClientManager for all operations.
 *
 * @param projectId - GCP project ID (optional, uses default credentials if not provided)
 * @param datasetId - BigQuery dataset ID (defaults to BQ_DATASET env var or 'aina_mvp_metrics')
 * @param anonymizationOptions - Options for fine-tuning anonymization behavior
 * @returns Callback function for LLMService.setLogCallback()
 *
 * @example
 * ```typescript
 * // Anonymization controlled by BQ_ANONYMIZE_PII env var
 * const llmService = getSalamandraService()
 * llmService.setLogCallback(createBigQueryLogger())
 * ```
 */
export function createBigQueryLogger(projectId?: string, datasetId: string = DEFAULT_DATASET_ID, anonymizationOptions: AnonymizationOptions = DEFAULT_ANONYMIZATION_OPTIONS): (log: LLMInteractionLog) => Promise<void> {
	let initialized = false
	const manager = getBigQueryManager(projectId, datasetId)

	// Merge with defaults
	const options: AnonymizationOptions = {
		...DEFAULT_ANONYMIZATION_OPTIONS,
		...anonymizationOptions,
	}

	// Determine if anonymization is enabled (respects environment variable)
	const shouldAnonymize = ANONYMIZE_PII && (options.anonymizePrompt || options.anonymizeSystemPrompt || options.anonymizeResponse)

	// Select table based on anonymization setting
	const tableId = shouldAnonymize ? DEFAULT_TABLE_ID : LEGACY_TABLE_ID
	const schema = shouldAnonymize ? LLM_LOGS_SCHEMA : LEGACY_LLM_LOGS_SCHEMA

	return async (log: LLMInteractionLog) => {
		try {
			// Ensure table exists on first use
			if (!initialized) {
				await manager.ensureDataset()
				await manager.ensureTable(tableId, schema, {
					timePartitioning: { type: "DAY", field: "timestamp" },
				})
				initialized = true
			}

			let logEntry: Record<string, any>

			if (shouldAnonymize) {
				// Anonymized log entry (v2 schema)
				const promptMetrics = options.includeContentMetrics ? getContentMetrics(log.prompt) : null
				const responseMetrics = options.includeContentMetrics ? getContentMetrics(log.response) : null

				logEntry = {
					request_id: log.requestId,
					timestamp: log.timestamp.toISOString(),
					provider: log.provider,
					model_version: log.modelVersion,
					user_id: log.userId || null,
					session_id: log.sessionId || null,
					module: log.module || null,
					// Anonymized content hashes (SHA-256 truncated)
					prompt_hash: options.anonymizePrompt ? anonymizeText(log.prompt, options.hashTruncateLength) : null,
					system_prompt_hash: options.anonymizeSystemPrompt ? anonymizeText(log.systemPrompt, options.hashTruncateLength) : null,
					response_hash: options.anonymizeResponse ? anonymizeText(log.response, options.hashTruncateLength) : null,
					// Content metrics for analytics
					prompt_char_count: promptMetrics?.charCount || null,
					prompt_word_count: promptMetrics?.wordCount || null,
					response_char_count: responseMetrics?.charCount || null,
					response_word_count: responseMetrics?.wordCount || null,
					// Token usage
					prompt_tokens: log.usage.promptTokens,
					completion_tokens: log.usage.completionTokens,
					total_tokens: log.usage.totalTokens,
					latency_ms: log.latencyMs,
					error: log.error || null,
					error_stack: log.errorStack || null,
					cost_estimate_usd: log.costEstimate?.totalCost || 0,
					options_json: JSON.stringify(log.options),
					context_json: log.context ? JSON.stringify(log.context) : null,
					anonymized: true,
				}
			} else {
				// Legacy log entry with raw text (v1 schema)
				logEntry = {
					request_id: log.requestId,
					timestamp: log.timestamp.toISOString(),
					provider: log.provider,
					model_version: log.modelVersion,
					user_id: log.userId || null,
					session_id: log.sessionId || null,
					module: log.module || null,
					prompt: log.prompt,
					system_prompt: log.systemPrompt || null,
					response: log.response,
					prompt_tokens: log.usage.promptTokens,
					completion_tokens: log.usage.completionTokens,
					total_tokens: log.usage.totalTokens,
					latency_ms: log.latencyMs,
					error: log.error || null,
					error_stack: log.errorStack || null,
					cost_estimate_usd: log.costEstimate?.totalCost || 0,
					options_json: JSON.stringify(log.options),
					context_json: log.context ? JSON.stringify(log.context) : null,
				}
			}

			await manager.insert(tableId, [logEntry])

			logger.debug("LLM interaction logged to BigQuery", {
				requestId: log.requestId,
				tableId,
				anonymized: shouldAnonymize,
			})
		} catch (error: any) {
			// Log error but don't throw - logging should not break the main flow
			logger.error("Failed to log to BigQuery", {
				error: error.message,
				requestId: log.requestId,
				code: error.code,
			})
		}
	}
}

/**
 * Create a LEGACY BigQuery logging callback (v1 schema with raw text)
 *
 * WARNING: This logger stores raw prompt/response text which may contain PII.
 * Only use for backward compatibility with existing llm_logs table.
 * For new deployments, use createBigQueryLogger() instead.
 *
 * @deprecated Use createBigQueryLogger for new deployments
 * @param projectId - GCP project ID
 * @param datasetId - BigQuery dataset ID
 * @param tableId - BigQuery table ID (defaults to 'llm_logs')
 * @returns Callback function for LLMService.setLogCallback()
 */
export function createLegacyBigQueryLogger(projectId?: string, datasetId: string = DEFAULT_DATASET_ID, tableId: string = LEGACY_TABLE_ID): (log: LLMInteractionLog) => Promise<void> {
	let initialized = false
	const manager = getBigQueryManager(projectId, datasetId)

	return async (log: LLMInteractionLog) => {
		try {
			// Ensure table exists on first use (using legacy schema)
			if (!initialized) {
				await manager.ensureDataset()
				await manager.ensureTable(tableId, LEGACY_LLM_LOGS_SCHEMA, {
					timePartitioning: { type: "DAY", field: "timestamp" },
				})
				initialized = true
			}

			// Legacy log entry with raw text (PII warning)
			const logEntry = {
				request_id: log.requestId,
				timestamp: log.timestamp.toISOString(),
				provider: log.provider,
				model_version: log.modelVersion,
				user_id: log.userId || null,
				session_id: log.sessionId || null,
				module: log.module || null,
				prompt: log.prompt,
				system_prompt: log.systemPrompt || null,
				response: log.response,
				prompt_tokens: log.usage.promptTokens,
				completion_tokens: log.usage.completionTokens,
				total_tokens: log.usage.totalTokens,
				latency_ms: log.latencyMs,
				error: log.error || null,
				error_stack: log.errorStack || null,
				cost_estimate_usd: log.costEstimate?.totalCost || 0,
				options_json: JSON.stringify(log.options),
				context_json: log.context ? JSON.stringify(log.context) : null,
			}

			await manager.insert(tableId, [logEntry])

			logger.debug("LLM interaction logged to BigQuery (legacy)", {
				requestId: log.requestId,
				tableId,
			})
		} catch (error: any) {
			logger.error("Failed to log to BigQuery (legacy)", {
				error: error.message,
				requestId: log.requestId,
				code: error.code,
			})
		}
	}
}

// ============================================================================
// QUERY HELPERS (Using centralized manager)
// ============================================================================

/**
 * Query recent LLM logs from BigQuery
 * Uses the centralized BigQueryClientManager
 *
 * @param projectId - GCP project ID
 * @param datasetId - BigQuery dataset ID
 * @param tableId - BigQuery table ID
 * @param limit - Maximum number of rows to return
 * @param filters - Optional filters (userId, sessionId, provider, etc.)
 * @returns Array of log entries
 */
export async function queryRecentLogs(
	projectId: string,
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = DEFAULT_TABLE_ID,
	limit: number = 100,
	filters?: {
		userId?: string
		sessionId?: string
		provider?: string
		startDate?: Date
		endDate?: Date
		onlyErrors?: boolean
	}
): Promise<any[]> {
	const manager = getBigQueryManager(projectId, datasetId)

	let query = `
		SELECT *
		FROM ${manager.getFullTableName(tableId)}
		WHERE 1=1
	`

	const params: Record<string, any> = {}

	if (filters?.userId) {
		query += ` AND user_id = @userId`
		params.userId = filters.userId
	}

	if (filters?.sessionId) {
		query += ` AND session_id = @sessionId`
		params.sessionId = filters.sessionId
	}

	if (filters?.provider) {
		query += ` AND provider = @provider`
		params.provider = filters.provider
	}

	if (filters?.startDate) {
		query += ` AND timestamp >= @startDate`
		params.startDate = filters.startDate.toISOString()
	}

	if (filters?.endDate) {
		query += ` AND timestamp <= @endDate`
		params.endDate = filters.endDate.toISOString()
	}

	if (filters?.onlyErrors) {
		query += ` AND error IS NOT NULL`
	}

	query += ` ORDER BY timestamp DESC LIMIT @limit`
	params.limit = limit

	const client = await manager.getClient()
	const [rows] = await client.query({ query, params })

	return rows
}

/**
 * Get aggregated statistics from BigQuery logs
 * Uses the centralized BigQueryClientManager
 *
 * @param projectId - GCP project ID
 * @param datasetId - BigQuery dataset ID
 * @param tableId - BigQuery table ID
 * @param startDate - Start of the time range
 * @param endDate - End of the time range
 * @returns Aggregated statistics
 */
export async function getLogStatistics(
	projectId: string,
	datasetId: string = DEFAULT_DATASET_ID,
	tableId: string = DEFAULT_TABLE_ID,
	startDate?: Date,
	endDate?: Date
): Promise<{
	totalRequests: number
	successfulRequests: number
	failedRequests: number
	totalTokens: number
	avgLatencyMs: number
	totalCostUsd: number
	byProvider: Record<string, { count: number; tokens: number; cost: number }>
}> {
	const manager = getBigQueryManager(projectId, datasetId)

	let whereClause = "WHERE 1=1"
	const params: Record<string, any> = {}

	if (startDate) {
		whereClause += ` AND timestamp >= @startDate`
		params.startDate = startDate.toISOString()
	}

	if (endDate) {
		whereClause += ` AND timestamp <= @endDate`
		params.endDate = endDate.toISOString()
	}

	const query = `
		SELECT
			COUNT(*) as total_requests,
			COUNTIF(error IS NULL) as successful_requests,
			COUNTIF(error IS NOT NULL) as failed_requests,
			SUM(COALESCE(total_tokens, 0)) as total_tokens,
			AVG(latency_ms) as avg_latency_ms,
			SUM(COALESCE(cost_estimate_usd, 0)) as total_cost_usd,
			provider,
			COUNT(*) as provider_count,
			SUM(COALESCE(total_tokens, 0)) as provider_tokens,
			SUM(COALESCE(cost_estimate_usd, 0)) as provider_cost
		FROM ${manager.getFullTableName(tableId)}
		${whereClause}
		GROUP BY provider
	`

	const client = await manager.getClient()
	const [rows] = await client.query({ query, params })

	// Aggregate results
	let totalRequests = 0
	let successfulRequests = 0
	let failedRequests = 0
	let totalTokens = 0
	let totalLatency = 0
	let totalCostUsd = 0
	const byProvider: Record<string, { count: number; tokens: number; cost: number }> = {}

	for (const row of rows) {
		totalRequests += Number(row.total_requests) || 0
		successfulRequests += Number(row.successful_requests) || 0
		failedRequests += Number(row.failed_requests) || 0
		totalTokens += Number(row.total_tokens) || 0
		totalLatency += (Number(row.avg_latency_ms) || 0) * (Number(row.total_requests) || 0)
		totalCostUsd += Number(row.total_cost_usd) || 0

		if (row.provider) {
			byProvider[row.provider] = {
				count: Number(row.provider_count) || 0,
				tokens: Number(row.provider_tokens) || 0,
				cost: Number(row.provider_cost) || 0,
			}
		}
	}

	return {
		totalRequests,
		successfulRequests,
		failedRequests,
		totalTokens,
		avgLatencyMs: totalRequests > 0 ? totalLatency / totalRequests : 0,
		totalCostUsd,
		byProvider,
	}
}
