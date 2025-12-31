/**
 * Kit Module - Firebase Cloud Functions
 *
 * This file contains only the function definitions/exports.
 * Business logic is delegated to separate handler modules:
 * - languageToolHandler.ts: LanguageTool API integration and logging
 * - glossaryHandler.ts: Glossary CRUD, CSV import, and vectorization management
 * - ragProcessHandler.ts: RAG terminological correction pipeline
 */

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https"
import * as logger from "firebase-functions/logger"

// Import handlers
import { checkLanguageToolAPI, fetchLanguageToolStats, fetchRecentCorrections, type LanguageToolRequest } from "./languageToolHandler"

import {
	importGlossaryFromCSV,
	fetchGlossaryTerms,
	saveGlossaryTermToFirestore,
	deleteGlossaryTermFromFirestore,
	fetchGlossaryImportHistory,
	fetchVectorizationStatus,
	executeVectorization,
	handleVectorizationFailure,
	type GlossaryTerm,
} from "./glossaryHandler"

import { executeRAGProcess, fetchRAGProcessHistory, fetchRAGProcessStats, getRAGServiceURL, type RAGProcessRequest } from "./ragProcessHandler"

import { validateStyleToneHandler, getStyleToneStatsHandler, getRecentValidationsHandler, improveTextHandler } from "./styleToneHandler"

import type { ValidateStyleToneRequest, ImproveTextRequest } from "./types/styleTone"

import { executeVerticalProcess, getVerticalProcessStats, type VerticalProcessRequest } from "../shared/verticalProcessHandler"

// Configuration
const REGION = "europe-west4"

// =====================================================
// LANGUAGETOOL FUNCTIONS
// =====================================================

/**
 * Firebase callable function to check text with LanguageTool
 * This abstracts the LanguageTool container location from the frontend
 * All requests are logged to BigQuery under module: "kit"
 */
export const checkLanguageTool = onCall({ region: REGION, memory: "512MiB" }, async (request) => {
	const { text, language, level, sessionId } = request.data as LanguageToolRequest

	const { result } = await checkLanguageToolAPI({ text, language, level, sessionId }, request.auth)

	return result
})

/**
 * HTTP endpoint to get LanguageTool statistics
 * GET /languageToolStats
 */
export const languageToolStats = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const startDateStr = req.query.startDate || req.body?.startDate
		const endDateStr = req.query.endDate || req.body?.endDate

		const startDate = startDateStr ? new Date(startDateStr as string) : undefined
		const endDate = endDateStr ? new Date(endDateStr as string) : undefined

		if (startDate && isNaN(startDate.getTime())) {
			res.status(400).json({ error: "Invalid startDate format" })
			return
		}
		if (endDate && isNaN(endDate.getTime())) {
			res.status(400).json({ error: "Invalid endDate format" })
			return
		}

		const stats = await fetchLanguageToolStats(startDate, endDate)

		res.json({
			status: "success",
			module: "kit",
			data: stats,
			query: {
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
			},
		})
	} catch (error: any) {
		logger.error("Failed to fetch LanguageTool stats", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * HTTP endpoint to get recent corrections
 * GET /languageToolCorrections
 */
export const languageToolCorrections = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const limit = Math.min(Number(req.query.limit) || 50, 200)
		const userId = req.query.userId as string | undefined

		const corrections = await fetchRecentCorrections(limit, userId)

		res.json({
			status: "success",
			module: "kit",
			count: corrections.length,
			data: corrections,
		})
	} catch (error: any) {
		logger.error("Failed to fetch LanguageTool corrections", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

// =====================================================
// GLOSSARY MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Upload CSV file to Firebase Storage and parse to Firestore
 * Receives base64 encoded file content
 */
export const importGlossaryCSV = onCall({ region: REGION, memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const {
		fileContent,
		fileName,
		replaceExisting = false,
	} = request.data as {
		fileContent: string
		fileName: string
		replaceExisting?: boolean
	}

	if (!fileContent || !fileName) {
		throw new HttpsError("invalid-argument", "File content and name are required")
	}

	try {
		return await importGlossaryFromCSV(fileContent, fileName, request.auth.uid, replaceExisting)
	} catch (error: any) {
		logger.error("Error importing glossary CSV", { error: error.message })
		throw new HttpsError("internal", `Error importing glossary: ${error.message}`)
	}
})

/**
 * Fetch all glossary terms from Firestore
 */
export const getGlossaryTerms = onCall({ region: REGION }, async (request) => {
	const userId = request.auth?.uid
	logger.info("Fetching glossary terms", { userId })

	try {
		return await fetchGlossaryTerms()
	} catch (error: any) {
		logger.error("Error fetching glossary terms", { error: error.message })
		throw new HttpsError("internal", `Error fetching glossary: ${error.message}`)
	}
})

/**
 * Save or update a single glossary term
 */
export const saveGlossaryTerm = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const { term } = request.data as { term: Partial<GlossaryTerm> }

	try {
		return await saveGlossaryTermToFirestore(term, request.auth.uid)
	} catch (error: any) {
		logger.error("Error saving glossary term", { error: error.message })
		throw new HttpsError("internal", `Error saving term: ${error.message}`)
	}
})

/**
 * Delete a glossary term
 */
export const deleteGlossaryTerm = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const { termId } = request.data as { termId: string }

	try {
		return await deleteGlossaryTermFromFirestore(termId, request.auth.uid)
	} catch (error: any) {
		logger.error("Error deleting glossary term", { error: error.message })
		throw new HttpsError("internal", `Error deleting term: ${error.message}`)
	}
})

/**
 * Get glossary import history from Storage
 */
export const getGlossaryImportHistory = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const result = await fetchGlossaryImportHistory()
		res.json(result)
	} catch (error: any) {
		logger.error("Error fetching import history", { error: error.message })
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// =====================================================
// VECTORIZATION MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get the current vectorization status
 */
export const getVectorizationStatus = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	try {
		return await fetchVectorizationStatus()
	} catch (error: any) {
		logger.error("Error fetching vectorization status", { error: error.message })
		throw new HttpsError("internal", `Error fetching status: ${error.message}`)
	}
})

/**
 * Trigger vectorization of the glossary
 * This calls the RAG service to rebuild the FAISS index from Firestore data
 */
export const triggerVectorization = onCall({ region: REGION, memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const userId = request.auth.uid

	try {
		return await executeVectorization(userId, getRAGServiceURL())
	} catch (error: any) {
		logger.error("Vectorization failed", { error: error.message, userId })
		await handleVectorizationFailure(error.message)
		throw new HttpsError("internal", `Vectorization failed: ${error.message}`)
	}
})

// =====================================================
// RAG TERMINOLOGIC PROCESS FUNCTIONS
// =====================================================

/**
 * Main RAG Process callable function
 * Executes the full RAG terminological correction pipeline:
 * 1. Detect problematic terms using NLP lemmatization or hash table (fast)
 * 1.2. If no candidates, use LLM for detection (fallback)
 * 2-3. Vector search with context window
 * 4. LLM-based text improvement with glossary results
 */
export const processRAGTerminologic = onCall({ region: REGION, memory: "1GiB", timeoutSeconds: 120 }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const { text, options = {}, model } = request.data as RAGProcessRequest & { model?: string }
	const userId = request.auth.uid
	const sessionId = request.data.sessionId

	try {
		return await executeRAGProcess(text, userId, sessionId, options, model)
	} catch (error: any) {
		logger.error("RAG process failed", { error: error.message, userId })
		throw new HttpsError("internal", `RAG process failed: ${error.message}`)
	}
})

/**
 * Get RAG process execution history
 * Returns recent RAG process executions for monitoring
 */
export const getRAGProcessHistory = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const { limit = 20, userId: filterUserId } = request.data as { limit?: number; userId?: string }

	try {
		return await fetchRAGProcessHistory(limit, filterUserId)
	} catch (error: any) {
		logger.error("Error fetching RAG process history", { error: error.message })
		throw new HttpsError("internal", `Error fetching history: ${error.message}`)
	}
})

/**
 * Get aggregated RAG process statistics
 */
export const getRAGProcessStats = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	try {
		return await fetchRAGProcessStats()
	} catch (error: any) {
		logger.error("Error fetching RAG process stats", { error: error.message })
		throw new HttpsError("internal", `Error fetching stats: ${error.message}`)
	}
})

/**
 * Test the RAG process with sample text
 * Provides a convenient way to test the full pipeline from the frontend
 */
export const testRAGProcess = onCall({ region: REGION, memory: "1GiB", timeoutSeconds: 120 }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const {
		text = "En base a la instància aproximativa presentada, cal influenciar en la decisió del departament. Ademés, s'ha de tenir en compte que vàrios ciutadans s'han enterat de la situació.",
		options = {},
		model,
	} = request.data as { text?: string; options?: RAGProcessRequest["options"]; model?: string }

	const userId = request.auth.uid
	const sessionId = request.data.sessionId

	logger.info("Testing RAG process", { userId, textLength: text.length })

	try {
		return await executeRAGProcess(text, userId, sessionId, options, model)
	} catch (error: any) {
		logger.error("RAG test failed", { error: error.message, userId })
		throw new HttpsError("internal", `RAG test failed: ${error.message}`)
	}
})

// =====================================================
// STYLE AND TONE VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate style and tone of a text
 * Phase 3 of the Kit Lingüístic pipeline
 *
 * Detects:
 * - Castellanismes (Spanish borrowings)
 * - Col·loquialismes (Colloquial expressions)
 * - Registre inadequat (Inappropriate register)
 * - Ambigüitats (Ambiguities)
 * - Style metrics (sentence length, passive voice, lexical diversity)
 *
 * Returns scores, alerts, and recommendations
 */
export const validateStyleTone = onCall({ region: REGION, memory: "512MiB", timeoutSeconds: 60 }, async (request) => {
	const data = request.data as ValidateStyleToneRequest

	const { result } = await validateStyleToneHandler(data, request.auth)

	return result
})

/**
 * HTTP endpoint for style/tone validation (for MCP/external access)
 * POST /kit/validate-style-tone
 */
export const validateStyleToneHttp = onRequest({ region: REGION, cors: true, memory: "512MiB", timeoutSeconds: 60 }, async (req, res) => {
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		const data = req.body as ValidateStyleToneRequest

		if (!data.text) {
			res.status(400).json({ error: "Text is required" })
			return
		}

		const { result, logId, processingTimeMs } = await validateStyleToneHandler(data)

		res.json({
			status: "success",
			logId,
			processingTimeMs,
			data: result,
		})
	} catch (error: any) {
		logger.error("Style/Tone validation HTTP failed", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * Get style/tone validation statistics
 * GET /styleToneStats?days=30
 */
export const styleToneStats = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const days = Math.min(Number(req.query.days) || 30, 365)
		const stats = await getStyleToneStatsHandler(days)

		res.json({
			status: "success",
			module: "kit",
			data: stats,
			query: { days },
		})
	} catch (error: any) {
		logger.error("Failed to fetch style/tone stats", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * Get recent style/tone validations for a user
 */
export const getStyleToneHistory = onCall({ region: REGION }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const { limit = 20 } = request.data as { limit?: number }

	try {
		return await getRecentValidationsHandler(request.auth.uid, limit)
	} catch (error: any) {
		logger.error("Error fetching style/tone history", { error: error.message })
		throw new HttpsError("internal", `Error fetching history: ${error.message}`)
	}
})

// =====================================================
// TEXT IMPROVEMENT FUNCTIONS
// =====================================================

/**
 * Firebase callable function to improve text based on validation results
 *
 * This function takes the original text and the alerts from validateStyleTone,
 * then applies improvements step by step for each category:
 * - Castellanismes → proper Catalan forms
 * - Col·loquialismes → formal register
 * - Registre → impersonal/formal constructions
 * - Claredat → precise language
 * - Frases llargues → shorter sentences
 *
 * Each category is processed in a separate LLM call to ensure quality.
 */
export const improveText = onCall({ region: REGION, memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
	const data = request.data as ImproveTextRequest

	const { result } = await improveTextHandler(data, request.auth)

	return result
})

/**
 * HTTP endpoint for text improvement (for MCP/external access)
 * POST /kit/improve-text
 *
 * Body:
 * {
 *   "text": "text to improve",
 *   "alerts": [...], // from validateStyleTone
 *   "categories": ["castellanismes", "colloquialismes"], // optional filter
 *   "documentType": "informe_valoracio", // optional
 *   "targetAudience": "ciutadania" // optional
 * }
 */
export const improveTextHttp = onRequest({ region: REGION, cors: true, memory: "512MiB", timeoutSeconds: 120 }, async (req, res) => {
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		const data = req.body as ImproveTextRequest

		if (!data.text) {
			res.status(400).json({ error: "Text is required" })
			return
		}

		if (!data.alerts || !Array.isArray(data.alerts)) {
			res.status(400).json({ error: "Alerts array is required (from validateStyleTone result)" })
			return
		}

		const { result, processingTimeMs } = await improveTextHandler(data)

		res.json({
			status: "success",
			processingTimeMs,
			data: result,
		})
	} catch (error: any) {
		logger.error("Text improvement HTTP failed", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

// =====================================================
// VERTICAL PROCESS FUNCTIONS
// =====================================================

/**
 * Firebase callable function for full vertical linguistic processing
 *
 * Orchestrates the complete linguistic processing pipeline:
 * Step 1: Orthographic and syntactic correction (LanguageTool)
 * Step 2: RAG terminological correction
 * Step 3: Style and tone validation
 *
 * All three steps are executed sequentially, with text flowing from
 * one step to the next. Each step's results are returned along with
 * a summary of all interventions.
 */
export const processVertical = onCall({ region: REGION, memory: "1GiB", timeoutSeconds: 180 }, async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const data = request.data as VerticalProcessRequest

	const { result } = await executeVerticalProcess(data, request.auth)

	return result
})

/**
 * HTTP endpoint for vertical processing (for MCP/external access)
 * POST /kit/process-vertical
 *
 * Body:
 * {
 *   "text": "text to process",
 *   "language": "ca", // optional, default: "ca"
 *   "sessionId": "session123", // optional
 *   "options": {
 *     "languageToolLevel": "picky", // optional: "default" | "picky"
 *     "skipLanguageTool": false, // optional
 *     "skipRAG": false, // optional
 *     "skipStyleTone": false, // optional
 *     "documentType": "informe_valoracio", // optional
 *     "targetAudience": "ciutadania" // optional
 *   }
 * }
 *
 * Returns complete results from all three processing steps plus summary
 */
export const processVerticalHttp = onRequest({ region: REGION, cors: true, memory: "1GiB", timeoutSeconds: 180 }, async (req, res) => {
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed. Use POST." })
		return
	}

	try {
		const data = req.body as VerticalProcessRequest

		if (!data.text) {
			res.status(400).json({ error: "Text is required" })
			return
		}

		const { result, requestId } = await executeVerticalProcess(data)

		res.json({
			status: "success",
			requestId,
			data: result,
		})
	} catch (error: any) {
		logger.error("Vertical process HTTP failed", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})

/**
 * Get vertical process statistics
 * GET /verticalProcessStats?days=30
 */
export const verticalProcessStats = onRequest({ region: REGION, cors: true }, async (req, res) => {
	try {
		const days = Math.min(Number(req.query.days) || 30, 365)
		const stats = await getVerticalProcessStats(days)

		res.json({
			status: "success",
			module: "kit",
			data: stats,
			query: { days },
		})
	} catch (error: any) {
		logger.error("Failed to fetch vertical process stats", { error: error.message })
		res.status(500).json({
			status: "error",
			error: error.message,
		})
	}
})
