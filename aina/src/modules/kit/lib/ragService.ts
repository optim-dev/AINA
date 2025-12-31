/**
 * RAG Service
 * Handles communication with Firebase functions for RAG terminological processing
 */

import { httpsCallable } from "firebase/functions"
import { functions } from "@/services/firebase"

// =====================================================
// Types
// =====================================================

export interface RAGProcessOptions {
	detectionThreshold?: number // Similarity threshold for hash matching (default: 0.8)
	useLLMFallback?: boolean // Use LLM if no candidates found (default: true)
	contextWindow?: number // Words before/after for context (default: 3)
	searchK?: number // Number of results from vector search (default: 5)
	searchThreshold?: number // Similarity threshold for vector search (default: 0.80)
}

export interface DetectedCandidate {
	term: string
	position: number
	context: string
	source: "hash" | "llm"
}

export interface VectorMatch {
	id: string
	terme_recomanat: string
	similitud: number
	context: string
	variants: string[]
	categoria: string
	ambit: string
	comentari: string
	font: string
	exemple_1: string
	exemple_2: string
	exemple_3: string
	exemple_incorrecte_1: string
	exemple_incorrecte_2: string
}

export interface RAGSearchResult {
	original: string
	matches: VectorMatch[]
}

export interface RAGCorrection {
	original: string
	corrected: string
	terme_recomanat: string
	confidence: number
	context: string
}

export interface RAGProcessStats {
	totalCandidates: number
	hashDetected: number
	llmDetected: number
	correctionsApplied: number
	processingTimeMs: number
}

export interface RAGProcessResponse {
	success: boolean
	originalText: string
	improvedText: string
	candidates: DetectedCandidate[]
	vectorResults: RAGSearchResult[]
	corrections: RAGCorrection[]
	stats: RAGProcessStats
}

export interface RAGHistoryEntry {
	id: string
	userId: string
	timestamp: string
	textLength: number
	textPreview: string
	options: RAGProcessOptions
	stats: RAGProcessStats
	candidatesCount: number
	correctionsCount: number
	success: boolean
}

export interface RAGAggregatedStats {
	totalExecutions: number
	totalCandidatesDetected: number
	totalCorrectionsApplied: number
	avgProcessingTimeMs: number
	avgCandidatesPerExecution: number
	avgCorrectionsPerExecution: number
	hashDetectionRate: number
	llmDetectionRate: number
}

// =====================================================
// Firebase Function References
// =====================================================

const processRAGTerminologicFn = httpsCallable<{ text: string; options?: RAGProcessOptions; sessionId?: string; model?: string }, RAGProcessResponse>(functions, "processRAGTerminologic")

const testRAGProcessFn = httpsCallable<{ text?: string; options?: RAGProcessOptions; sessionId?: string; model?: string }, RAGProcessResponse>(functions, "testRAGProcess")

const getRAGProcessHistoryFn = httpsCallable<{ limit?: number; userId?: string }, { success: boolean; history: RAGHistoryEntry[]; count: number }>(functions, "getRAGProcessHistory")

const getRAGProcessStatsFn = httpsCallable<void, { success: boolean; stats: RAGAggregatedStats }>(functions, "getRAGProcessStats")

// =====================================================
// Service Functions
// =====================================================

/**
 * Process text through the RAG terminological pipeline
 *
 * @param text - The text to process
 * @param options - Optional processing options
 * @param sessionId - Optional session ID for tracking
 * @param model - Optional LLM model to use (e.g., "gemini-2.5-flash", "salamandra-7b-vertex")
 * @returns RAG process response with corrections and stats
 */
export async function processRAGTerminologic(text: string, options?: RAGProcessOptions, sessionId?: string, model?: string): Promise<RAGProcessResponse> {
	const result = await processRAGTerminologicFn({
		text,
		options,
		sessionId,
		model,
	})
	return result.data
}

/**
 * Test the RAG process with sample or custom text
 * Useful for testing the pipeline without affecting real user workflows
 *
 * @param text - Optional custom text (uses default sample if not provided)
 * @param options - Optional processing options
 * @param sessionId - Optional session ID for tracking
 * @param model - Optional LLM model to use (e.g., "gemini-2.5-flash", "salamandra-7b-vertex")
 * @returns RAG process response with corrections and stats
 */
export async function testRAGProcess(text?: string, options?: RAGProcessOptions, sessionId?: string, model?: string): Promise<RAGProcessResponse> {
	const result = await testRAGProcessFn({
		text,
		options,
		sessionId,
		model,
	})
	return result.data
}

/**
 * Get RAG process execution history
 *
 * @param limit - Maximum number of entries to return (default: 20, max: 100)
 * @param userId - Optional user ID to filter by
 * @returns Array of history entries
 */
export async function getRAGProcessHistory(limit?: number, userId?: string): Promise<RAGHistoryEntry[]> {
	const result = await getRAGProcessHistoryFn({ limit, userId })
	return result.data.history
}

/**
 * Get aggregated RAG process statistics
 *
 * @returns Aggregated statistics across all executions
 */
export async function getRAGProcessStats(): Promise<RAGAggregatedStats> {
	const result = await getRAGProcessStatsFn()
	return result.data.stats
}

/**
 * Default sample text for testing the RAG process
 */
export const DEFAULT_TEST_TEXT = `En base a la instància aproximativa presentada, cal influenciar en la decisió del departament. Ademés, s'ha de tenir en compte que vàrios ciutadans s'han enterat de la situació i han cambiat d'opinió respecte al procediment.`

/**
 * Format processing time for display
 */
export function formatProcessingTime(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`
	}
	return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Calculate detection breakdown percentages
 */
export function calculateDetectionBreakdown(stats: RAGProcessStats): {
	hashPercentage: number
	llmPercentage: number
} {
	const total = stats.hashDetected + stats.llmDetected
	if (total === 0) {
		return { hashPercentage: 0, llmPercentage: 0 }
	}
	return {
		hashPercentage: Math.round((stats.hashDetected / total) * 100),
		llmPercentage: Math.round((stats.llmDetected / total) * 100),
	}
}

/**
 * Get confidence level label and color based on similarity score
 */
export function getConfidenceLevel(similarity: number): {
	label: string
	color: "green" | "yellow" | "red"
	variant: "default" | "secondary" | "destructive"
} {
	if (similarity >= 0.95) {
		return { label: "Alta", color: "green", variant: "default" }
	}
	if (similarity >= 0.85) {
		return { label: "Mitjana", color: "yellow", variant: "secondary" }
	}
	return { label: "Baixa", color: "red", variant: "destructive" }
}
