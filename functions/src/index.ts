import * as admin from "firebase-admin"

// Initialize Firebase Admin SDK
// Explicitly set credential to application default to ensure it picks up the service account
admin.initializeApp({
	credential: admin.credential.applicationDefault(),
	storageBucket: process.env.STORAGE_BUCKET,
})

// Export Cloud Functions by module
export * from "./valoracio"
export * from "./elaboracio"
export * from "./kit"
export * from "./auth"

// Export shared health check functions
export * from "./shared/healthCheck"
export * from "./shared/llmHealthCheck"

// Export LLM API endpoints (unified LLM interface with model selection)
export { askLLM, llmStats } from "./shared/llmApi"

// Export BigQuery API endpoints
export { bigQueryStats, bigQueryLogs, bigQueryHealth, bigQuerySetup } from "./shared/bigQueryApi"

// Export Metrics API endpoints (dashboard metrics engine)
export { metricsForDashboard, metricsTimeSeries, metricsComparison } from "./shared/metricsApi"
