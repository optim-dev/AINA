/**
 * RAG Process Handler
 * Handles the full RAG terminological correction pipeline:
 * - NLP lemmatization detection
 * - Hash table matching
 * - Vector search
 * - LLM-based text improvement
 */

import * as logger from "firebase-functions/logger"
import { HttpsError } from "firebase-functions/v2/https"
import { getLLMServiceForModel, createBigQueryLogger } from "../shared"
import { buildVariantsHashTable, getCatalanStem } from "./glossaryHandler"
import { createRAGProcessLogger, generateRAGProcessRequestId, getRAGProcessStats, getRecentRAGExecutions } from "./RAGProcessLogger"
import type { RAGProcessLog } from "./RAGProcessLogger"

// Initialize BigQuery logger for LLM calls
const bigQueryLogger = createBigQueryLogger()

// Initialize BigQuery logger for RAG process
const logRAGProcessToBigQuery = createRAGProcessLogger()

// Configuration
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000"

// Types
export interface RAGProcessRequest {
	text: string
	userId?: string
	sessionId?: string
	model?: string // LLM model to use (e.g., "gemini-2.5-flash", "salamandra-7b-vertex")
	options?: {
		detectionThreshold?: number // Similarity threshold for hash matching (default: 0.8)
		useLLMFallback?: boolean // Use LLM if no candidates found (default: true)
		useNLPDetection?: boolean // Use NLP lemmatization for detection (default: true)
		contextWindow?: number // Words before/after for context (default: 3)
		searchK?: number // Number of results from vector search (default: 5)
		searchThreshold?: number // Similarity threshold for vector search (default: 0.80)
	}
}

export interface DetectedCandidate {
	term: string
	position: number
	context: string // Window of words around the term
	source: "hash" | "llm" | "nlp" // How it was detected
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

export interface RAGProcessResponse {
	success: boolean
	originalText: string
	improvedText: string
	candidates: DetectedCandidate[]
	vectorResults: RAGSearchResult[]
	corrections: Array<{
		original: string
		corrected: string
		terme_recomanat: string
		confidence: number
		context: string
	}>
	stats: {
		totalCandidates: number
		nlpDetected: number
		hashDetected: number
		llmDetected: number
		correctionsApplied: number
		processingTimeMs: number
	}
}

/**
 * Tokenize text and detect candidates using hash table
 * Supports multi-word expressions (locutions) by checking n-grams
 */
export function detectCandidatesWithHash(
	text: string,
	tables: {
		exact: Map<string, { id: string; terme_recomanat: string }>
		stems: Map<string, { id: string; terme_recomanat: string }>
	},
	contextWindow: number = 3
): DetectedCandidate[] {
	const candidates: DetectedCandidate[] = []
	const words = text.split(/\s+/)
	const detectedPositions = new Set<number>() // Avoid overlapping detections

	// Check for multi-word expressions (up to 4 words)
	for (let ngramSize = 4; ngramSize >= 1; ngramSize--) {
		for (let i = 0; i <= words.length - ngramSize; i++) {
			// Skip if any position in this ngram is already detected
			let alreadyDetected = false
			for (let j = 0; j < ngramSize; j++) {
				if (detectedPositions.has(i + j)) {
					alreadyDetected = true
					break
				}
			}
			if (alreadyDetected) continue

			const ngram = words.slice(i, i + ngramSize).join(" ")
			const ngramLower = ngram.toLowerCase()

			// Check exact match first
			let match = tables.exact.get(ngramLower)

			// If no exact match, try stem match for single words
			if (!match && ngramSize === 1) {
				const stem = getCatalanStem(ngramLower)
				match = tables.stems.get(stem)
			}

			if (match) {
				// Mark all positions as detected
				for (let j = 0; j < ngramSize; j++) {
					detectedPositions.add(i + j)
				}

				// Build context window
				const startContext = Math.max(0, i - contextWindow)
				const endContext = Math.min(words.length, i + ngramSize + contextWindow)
				const context = words.slice(startContext, endContext).join(" ")

				candidates.push({
					term: ngram,
					position: i,
					context: context,
					source: "hash",
				})
			}
		}
	}

	return candidates
}

/**
 * Use LLM to detect potentially problematic terms when hash detection finds nothing
 */
export async function detectCandidatesWithLLM(text: string, contextWindow: number = 3, userId?: string, sessionId?: string, model?: string): Promise<DetectedCandidate[]> {
	const prompt = `Ets un expert lingüista en català normatiu. Analitza el següent text i identifica NOMÉS els termes o expressions que podrien ser no normatius, col·loquials, castellanismes o variants no recomanades en un context administratiu o tècnic.

TEXT:
"${text}"

INSTRUCCIONS:
1. Identifica NOMÉS termes problemàtics (no paraules correctes)
2. Busca: castellanismes, barbarismes, expressions col·loquials, termes no normatius
3. NO incloguis paraules que són correctes en català normatiu
4. Retorna un JSON amb format:

{
  "candidates": [
    {
      "term": "expressió detectada",
      "reason": "motiu breu"
    }
  ]
}

Si no trobes cap terme problemàtic, retorna: {"candidates": []}

Respon NOMÉS amb el JSON, sense explicacions addicionals.`

	try {
		const llm = getLLMServiceForModel(model)
		llm.setLogCallback(bigQueryLogger)

		const response = await llm.callModel({
			prompt,
			module: "kit",
			jsonResponse: true,
			userId,
			sessionId,
			options: {
				maxTokens: 1024,
				temperature: 0.2,
				topP: 0.95,
			},
		})

		const result = response.json || JSON.parse(response.text)
		const candidates: DetectedCandidate[] = []
		const words = text.split(/\s+/)

		if (result.candidates && Array.isArray(result.candidates)) {
			for (const candidate of result.candidates) {
				if (candidate.term) {
					// Find position in original text
					const termLower = candidate.term.toLowerCase()
					const textLower = text.toLowerCase()
					const charPosition = textLower.indexOf(termLower)

					if (charPosition !== -1) {
						// Calculate word position
						const wordsBeforeMatch = text.substring(0, charPosition).split(/\s+/).length - 1
						const position = Math.max(0, wordsBeforeMatch)

						// Build context window
						const termWordCount = candidate.term.split(/\s+/).length
						const startContext = Math.max(0, position - contextWindow)
						const endContext = Math.min(words.length, position + termWordCount + contextWindow)
						const context = words.slice(startContext, endContext).join(" ")

						candidates.push({
							term: candidate.term,
							position: position,
							context: context,
							source: "llm",
						})
					}
				}
			}
		}

		logger.info("LLM detection completed", { candidatesFound: candidates.length })
		return candidates
	} catch (error: any) {
		logger.error("LLM detection failed", { error: error.message })
		return []
	}
}

/**
 * Detect candidates using NLP lemmatization via RAG service
 * Uses spaCy's Catalan transformer model for accurate verb conjugation matching
 */
export async function detectCandidatesWithNLP(text: string, contextWindow: number = 3): Promise<DetectedCandidate[]> {
	try {
		const response = await fetch(`${RAG_SERVICE_URL}/detect-candidates`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: text,
				context_window: contextWindow,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			logger.warn("NLP detection failed, will fallback to hash", { status: response.status, error: errorText })
			return []
		}

		const result = await response.json()

		if (!result.success) {
			logger.warn("NLP detection returned error", { error: result.error })
			return []
		}

		// Convert NLP result to DetectedCandidate format
		const candidates: DetectedCandidate[] = result.candidates.map((c: any) => ({
			term: c.term,
			position: c.position,
			context: c.context,
			source: "nlp",
		}))

		logger.info("NLP detection completed", {
			candidatesFound: candidates.length,
			model: result.nlp_model_used,
		})

		return candidates
	} catch (error: any) {
		logger.warn("NLP detection request failed", { error: error.message })
		return []
	}
}

/**
 * Call RAG service to perform vector search on candidates
 */
export async function searchVectorIndex(candidates: DetectedCandidate[], searchK: number = 5, searchThreshold: number = 0.8): Promise<RAGSearchResult[]> {
	if (candidates.length === 0) {
		return []
	}

	// Prepare candidates with context for the search
	const searchCandidates = candidates.map((c) => c.context)

	try {
		const response = await fetch(`${RAG_SERVICE_URL}/search`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidates: searchCandidates,
				k: searchK,
				threshold: searchThreshold,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`RAG service error: ${response.status} - ${errorText}`)
		}

		const results: RAGSearchResult[] = await response.json()
		logger.info("Vector search completed", { resultsCount: results.length })
		return results
	} catch (error: any) {
		logger.error("Vector search failed", { error: error.message })
		throw error
	}
}

/**
 * Use LLM to improve text based on vector search results
 */
export async function improveTextWithLLM(
	text: string,
	candidates: DetectedCandidate[],
	vectorResults: RAGSearchResult[],
	userId?: string,
	sessionId?: string,
	model?: string
): Promise<{ improvedText: string; corrections: Array<{ original: string; corrected: string; terme_recomanat: string; confidence: number; context: string }> }> {
	// Build correction context from vector results and store similarity scores
	const correctionContextWithScores: Array<{ context: string; candidate: DetectedCandidate; similarity: number; termeRecomanat: string }> = []

	const correctionContext = vectorResults
		.map((result, idx) => {
			const candidate = candidates[idx]
			if (result.matches && result.matches.length > 0) {
				const bestMatch = result.matches[0]
				correctionContextWithScores.push({
					context: `"${candidate?.term || result.original}" → "${bestMatch.terme_recomanat}"`,
					candidate: candidate!,
					similarity: bestMatch.similitud,
					termeRecomanat: bestMatch.terme_recomanat,
				})
				return `- "${candidate?.term || result.original}" → "${bestMatch.terme_recomanat}" (similitud: ${(bestMatch.similitud * 100).toFixed(1)}%, context: ${bestMatch.context || "N/A"})`
			}
			return null
		})
		.filter(Boolean)
		.join("\n")

	if (!correctionContext) {
		return { improvedText: text, corrections: [] }
	}

	const prompt = `Ets un expert corrector lingüístic de català. Has de millorar el text següent aplicant les correccions terminològiques proposades, mantenint el sentit i la fluïdesa natural del text.

TEXT ORIGINAL:
"${text}"

CORRECCIONS PROPOSADES (terme incorrecte → terme recomanat):
${correctionContext}

INSTRUCCIONS:
1. Aplica les correccions proposades al text
2. Mantén el sentit i l'estructura original
3. Assegura la concordança de gènere i nombre
4. Millora la fluïdesa si cal, però sense canviar el significat
5. Retorna un JSON amb format:

{
  "improvedText": "text millorat complet",
  "corrections": [
    {
      "original": "terme original",
      "corrected": "terme aplicat",
      "terme_recomanat": "terme del glossari",
      "context": "fragment de context"
    }
  ]
}

Respon NOMÉS amb el JSON, sense explicacions addicionals.`

	try {
		const llm = getLLMServiceForModel(model)
		llm.setLogCallback(bigQueryLogger)

		const response = await llm.callModel({
			prompt,
			module: "kit",
			jsonResponse: true,
			userId,
			sessionId,
			options: {
				maxTokens: 2048,
				temperature: 0.3,
				topP: 0.95,
			},
		})

		const result = response.json || JSON.parse(response.text)

		// Map corrections to include actual similarity scores from vector search
		const corrections = (result.corrections || []).map((correction: any) => {
			// Find the matching correction context to get the actual similarity score
			const matchingContext = correctionContextWithScores.find((ctx) => ctx.candidate.term.toLowerCase() === correction.original.toLowerCase() || ctx.termeRecomanat === correction.terme_recomanat)

			return {
				...correction,
				confidence: matchingContext ? matchingContext.similarity : 0.5, // Use actual similarity or fallback to 0.5
			}
		})

		return {
			improvedText: result.improvedText || text,
			corrections,
		}
	} catch (error: any) {
		logger.error("LLM text improvement failed", { error: error.message })
		return { improvedText: text, corrections: [] }
	}
}

/**
 * Log a RAG process execution to BigQuery for monitoring
 */
export async function logRAGProcessExecution(userId: string, request: RAGProcessRequest, response: RAGProcessResponse): Promise<void> {
	try {
		// Extract configuration with defaults (matching executeRAGProcess defaults)
		const options = request.options || {}
		const configDetectionThreshold = options.detectionThreshold ?? 0.8
		const configSearchThreshold = options.searchThreshold ?? 0.8
		const configSearchK = options.searchK ?? 5
		const configContextWindow = options.contextWindow ?? 3
		const configUseLLMFallback = options.useLLMFallback ?? true
		const configUseNLPDetection = options.useNLPDetection ?? true

		const log: RAGProcessLog = {
			requestId: generateRAGProcessRequestId(),
			timestamp: new Date(),
			userId,
			sessionId: request.sessionId,
			module: "kit",
			originalText: request.text,
			textLength: request.text.length,
			// Configuration options (explicit fields)
			configDetectionThreshold,
			configSearchThreshold,
			configSearchK,
			configContextWindow,
			configUseLLMFallback,
			configUseNLPDetection,
			// Detection results
			candidatesCount: response.candidates.length,
			nlpDetectedCount: response.stats.nlpDetected,
			hashDetectedCount: response.stats.hashDetected,
			llmDetectedCount: response.stats.llmDetected,
			candidates: response.candidates.map((c) => ({
				term: c.term,
				context: c.context,
				position: c.position,
				source: c.source,
			})),
			vectorResultsCount: response.vectorResults.length,
			vectorResults: response.vectorResults,
			correctionsCount: response.corrections.length,
			corrections: response.corrections.map((c) => ({
				original: c.original,
				corrected: c.corrected,
				terme_recomanat: c.terme_recomanat,
				confidence: c.confidence,
				context: c.context,
			})),
			improvedText: response.improvedText,
			success: response.success,
			processingTimeMs: response.stats.processingTimeMs,
		}

		await logRAGProcessToBigQuery(log)
	} catch (error: any) {
		logger.warn("Failed to log RAG process execution to BigQuery", { error: error.message })
	}
}

/**
 * Execute the full RAG terminological correction pipeline
 */
export async function executeRAGProcess(text: string, userId: string, sessionId?: string, options: RAGProcessRequest["options"] = {}, model?: string): Promise<RAGProcessResponse> {
	const startTime = Date.now()

	if (!text || typeof text !== "string" || text.trim().length === 0) {
		throw new HttpsError("invalid-argument", "Text is required and must be a non-empty string")
	}

	const { useLLMFallback = true, useNLPDetection = true, contextWindow = 3, searchK = 5, searchThreshold = 0.8 } = options

	logger.info("Starting RAG terminologic process", {
		userId,
		textLength: text.length,
		options,
		model,
	})

	let candidates: DetectedCandidate[] = []
	let nlpDetectedCount = 0
	let hashDetectedCount = 0
	let llmDetectedCount = 0

	// PHASE 1: Detect candidates using NLP lemmatization (primary method)
	if (useNLPDetection) {
		candidates = await detectCandidatesWithNLP(text, contextWindow)
		nlpDetectedCount = candidates.length
		logger.info("Phase 1 - NLP detection", {
			candidatesFound: candidates.length,
		})
	}

	// PHASE 1.1: Fallback to hash table if NLP found nothing or was disabled
	if (candidates.length === 0) {
		const hashTables = await buildVariantsHashTable()
		candidates = detectCandidatesWithHash(text, hashTables, contextWindow)
		hashDetectedCount = candidates.length
		logger.info("Phase 1.1 - Hash detection fallback", {
			candidatesFound: candidates.length,
		})
	}

	// PHASE 1.2: LLM fallback if still no candidates found
	if (candidates.length === 0 && useLLMFallback) {
		logger.info("No candidates from NLP/hash, using LLM fallback")
		candidates = await detectCandidatesWithLLM(text, contextWindow, userId, sessionId, model)
		llmDetectedCount = candidates.length
	}

	// If still no candidates, return early
	if (candidates.length === 0) {
		const processingTimeMs = Date.now() - startTime
		return {
			success: true,
			originalText: text,
			improvedText: text,
			candidates: [],
			vectorResults: [],
			corrections: [],
			stats: {
				totalCandidates: 0,
				nlpDetected: 0,
				hashDetected: 0,
				llmDetected: 0,
				correctionsApplied: 0,
				processingTimeMs,
			},
		}
	}

	// PHASE 2-3: Vector search with context
	logger.info("Phase 2-3 - Vector search", {
		candidatesCount: candidates.length,
	})
	const vectorResults = await searchVectorIndex(candidates, searchK, searchThreshold)

	// PHASE 4: LLM-based text improvement
	logger.info("Phase 4 - LLM text improvement")
	const { improvedText, corrections } = await improveTextWithLLM(text, candidates, vectorResults, userId, sessionId, model)

	const processingTimeMs = Date.now() - startTime

	const response: RAGProcessResponse = {
		success: true,
		originalText: text,
		improvedText,
		candidates,
		vectorResults,
		corrections,
		stats: {
			totalCandidates: candidates.length,
			nlpDetected: nlpDetectedCount,
			hashDetected: hashDetectedCount,
			llmDetected: llmDetectedCount,
			correctionsApplied: corrections.length,
			processingTimeMs,
		},
	}

	// Log execution for monitoring
	await logRAGProcessExecution(userId, { text, options }, response)

	logger.info("RAG process completed", {
		userId,
		candidatesFound: candidates.length,
		correctionsApplied: corrections.length,
		processingTimeMs,
	})

	return response
}

/**
 * Get RAG process execution history from BigQuery
 */
export async function fetchRAGProcessHistory(
	limit: number = 20,
	filterUserId?: string
): Promise<{
	success: boolean
	history: any[]
	count: number
}> {
	try {
		const history = await getRecentRAGExecutions("aina-demostradors", undefined, undefined, limit, filterUserId)

		return {
			success: true,
			history: history.map((entry) => ({
				id: entry.requestId,
				userId: entry.userId,
				timestamp: entry.timestamp,
				originalText: entry.originalText,
				improvedText: entry.improvedText,
				candidatesCount: entry.candidatesCount,
				correctionsCount: entry.correctionsCount,
				corrections: entry.corrections,
				processingTimeMs: entry.processingTimeMs,
				success: entry.success,
			})),
			count: history.length,
		}
	} catch (error: any) {
		logger.error("Failed to fetch RAG process history from BigQuery", { error: error.message })
		return {
			success: false,
			history: [],
			count: 0,
		}
	}
}

/**
 * Get aggregated RAG process statistics from BigQuery
 */
export async function fetchRAGProcessStats(): Promise<{
	success: boolean
	stats: any
}> {
	try {
		const stats = await getRAGProcessStats()

		return {
			success: true,
			stats: {
				totalExecutions: stats.totalExecutions,
				totalCandidatesDetected: stats.totalCandidatesDetected,
				totalCorrectionsApplied: stats.totalCorrectionsApplied,
				avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs),
				avgCandidatesPerExecution: Math.round(stats.avgCandidatesPerExecution * 10) / 10,
				avgCorrectionsPerExecution: Math.round(stats.avgCorrectionsPerExecution * 10) / 10,
				nlpDetectionRate: stats.detectionMethodDistribution.nlp,
				hashDetectionRate: stats.detectionMethodDistribution.hash,
				llmDetectionRate: stats.detectionMethodDistribution.llm,
				executionsByDay: stats.executionsByDay,
				topTermsCorrections: stats.topTermsCorrections,
			},
		}
	} catch (error: any) {
		logger.error("Failed to fetch RAG process stats from BigQuery", { error: error.message })
		return {
			success: false,
			stats: {
				totalExecutions: 0,
				totalCandidatesDetected: 0,
				totalCorrectionsApplied: 0,
				avgProcessingTimeMs: 0,
				avgCandidatesPerExecution: 0,
				avgCorrectionsPerExecution: 0,
				nlpDetectionRate: 0,
				hashDetectionRate: 0,
				llmDetectionRate: 0,
				executionsByDay: [],
				topTermsCorrections: [],
			},
		}
	}
}

/**
 * Get RAG Service URL for external configuration
 */
export function getRAGServiceURL(): string {
	return RAG_SERVICE_URL
}
