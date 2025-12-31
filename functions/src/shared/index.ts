/**
 * Shared utilities and services for Firebase Cloud Functions
 */

// Core utilities
export * from "./utils"
export { logger, LogLevel } from "./logger"

// LLM Service - Unified wrapper for all LLM interactions
export {
	LLMService,
	LLMProvider,
	createGeminiService,
	createSalamandraService,
	createAliaService,
	getGeminiService,
	getSalamandraService,
	getLLMServiceForModel,
	createBigQueryLogger,
	createFirestoreLogger,
	estimateTokens,
	estimateTokensAdvanced,
} from "./LLMService"

export type { LLMConfig, LLMRequest, LLMRequestOptions, LLMResponse, LLMInteractionLog, TokenUsage, CostEstimate, ProviderStats } from "./LLMService"

// BigQuery Logger - Centralized BigQuery client and logging utilities
// ALL BigQuery operations should go through this module
export {
	BigQueryClientManager,
	getBigQueryManager,
	getBigQueryClient,
	setupBigQuery,
	verifyBigQueryTable,
	queryRecentLogs,
	getLogStatistics,
	LLM_LOGS_SCHEMA,
	DEFAULT_PROJECT_ID,
	DEFAULT_DATASET_ID,
	DEFAULT_TABLE_ID,
	DEFAULT_LOCATION,
} from "./BigQueryLogger"

export type { SetupBigQueryResult } from "./BigQueryLogger"

// BigQuery API - HTTP endpoints (export for main index.ts)
export { bigQueryStats, bigQueryLogs, bigQueryHealth, bigQuerySetup } from "./bigQueryApi"

// Vertical Process Handler - Full linguistic pipeline
export { executeVerticalProcess, getVerticalProcessStats, generateVerticalProcessRequestId, createVerticalProcessLogger } from "./verticalProcessHandler"

export type { VerticalProcessRequest, VerticalProcessResponse, VerticalProcessStats, VerticalProcessLog, LanguageToolResult, LanguageToolMatch, RAGResult, StyleToneResult } from "./verticalProcessHandler"

// Health checks are exported separately as Firebase functions
// import them directly from './healthCheck' or './llmHealthCheck'
