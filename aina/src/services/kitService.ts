/**
 * Kit Linguistic Service
 *
 * Frontend service for interacting with Kit Lingüístic Firebase Functions
 * Includes style/tone validation, RAG terminological, and LanguageTool integration
 */

import { httpsCallable } from "firebase/functions"
import { functions } from "./firebase"

// ============================================================================
// TYPES (mirrored from backend for frontend use)
// ============================================================================

export type DocumentType = "decret" | "informe_valoracio" | "comunicacio_interna" | "notificacio_ciutada" | "generic"

export type TargetAudience = "intern" | "ciutadania" | "empreses" | "altres_administracions"

export type DetectedTone = "formal_administratiu" | "semiformal" | "informal" | "mixt"

export type EmotionalTone = "neutre" | "positiu" | "negatiu" | "assertiu"

export type SyntacticComplexity = "baixa" | "mitjana" | "alta"

export type AlertType = "castellanisme" | "colloquialisme" | "ambiguitat" | "registre_inadequat" | "frase_llarga" | "passiva_excessiva" | "repeticio"

export type AlertSeverity = "error" | "warning" | "info"

export type RecommendationCategory = "estil" | "to" | "estructura" | "claredat"

export type RecommendationPriority = "alta" | "mitjana" | "baixa"

// ============================================================================
// REQUEST / RESPONSE INTERFACES
// ============================================================================

export interface ValidateStyleToneParams {
	text: string
	documentType?: DocumentType
	targetAudience?: TargetAudience
	originalText?: string
	sessionId?: string
	model?: string
}

export interface StyleToneScores {
	overall: number
	styleCoherence: number
	toneAdequacy: number
	clarity: number
	formality: number
	terminologyConsistency: number
}

export interface ToneAnalysis {
	detectedTone: DetectedTone
	emotionalTone: EmotionalTone
	objectivity: number
	confidence: number
}

export interface StyleMetrics {
	averageSentenceLength: number
	passiveVoicePercentage: number
	lexicalDiversity: number
	syntacticComplexity: SyntacticComplexity
	readabilityScore: number
	sentenceCount: number
	wordCount: number
}

export interface AlertContext {
	text: string
	startOffset: number
	endOffset: number
	sentence: string
}

export interface StyleAlert {
	id: string
	type: AlertType
	severity: AlertSeverity
	message: string
	context: AlertContext
	suggestion?: string
	rule?: string
}

export interface RecommendationExample {
	original: string
	improved: string
}

export interface StyleRecommendation {
	id: string
	category: RecommendationCategory
	priority: RecommendationPriority
	title: string
	description: string
	examples?: RecommendationExample[]
}

export interface ValidationMetadata {
	processedAt: string
	processingTimeMs: number
	modelVersion: string
	pipelineVersion: string
	rulesApplied: number
}

export interface StyleToneValidationResult {
	scores: StyleToneScores
	toneAnalysis: ToneAnalysis
	styleMetrics: StyleMetrics
	alerts: StyleAlert[]
	recommendations: StyleRecommendation[]
	metadata: ValidationMetadata
}

export interface StyleToneHistoryItem {
	log_id: string
	document_type: string | null
	score_overall: number
	score_style_coherence: number
	score_tone_adequacy: number
	detected_tone: DetectedTone
	alerts_count_error: number
	alerts_count_warning: number
	processed_at: string
	processing_time_ms: number
}

// ============================================================================
// TEXT IMPROVEMENT TYPES
// ============================================================================

export type ImprovementCategory = "castellanismes" | "colloquialismes" | "registre" | "claredat" | "frases_llargues"

export interface ImproveTextParams {
	text: string
	alerts: StyleAlert[]
	categories?: ImprovementCategory[]
	documentType?: DocumentType
	targetAudience?: TargetAudience
	sessionId?: string
	model?: string
}

export interface ImprovementChange {
	original: string
	improved: string
	explanation: string
}

export interface ImprovementStep {
	category: ImprovementCategory
	textBefore: string
	textAfter: string
	changesApplied: number
	changes: ImprovementChange[]
	latencyMs: number
}

export interface ImprovementMetadata {
	processedAt: string
	totalProcessingTimeMs: number
	modelVersion: string
	stepsExecuted: number
}

export interface ImproveTextResult {
	originalText: string
	improvedText: string
	steps: ImprovementStep[]
	totalChanges: number
	summary: Record<ImprovementCategory, number>
	metadata: ImprovementMetadata
}

// ============================================================================
// SCORE THRESHOLDS (for UI display)
// ============================================================================

export const SCORE_THRESHOLDS = {
	styleCoherence: { target: 90, warning: 80, error: 60 },
	toneAdequacy: { target: 85, warning: 75, error: 55 },
	clarity: { target: 80, warning: 70, error: 50 },
	formality: { target: 85, warning: 75, error: 55 },
	terminologyConsistency: { target: 90, warning: 80, error: 60 },
	overall: { target: 85, warning: 75, error: 55 },
} as const

/**
 * Get score status color based on thresholds
 */
export function getScoreStatus(score: number, metric: keyof typeof SCORE_THRESHOLDS): "success" | "warning" | "error" {
	const thresholds = SCORE_THRESHOLDS[metric]
	if (score >= thresholds.target) return "success"
	if (score >= thresholds.warning) return "warning"
	return "error"
}

/**
 * Get score color for UI
 */
export function getScoreColor(score: number, metric: keyof typeof SCORE_THRESHOLDS): string {
	const status = getScoreStatus(score, metric)
	switch (status) {
		case "success":
			return "text-green-600"
		case "warning":
			return "text-yellow-600"
		case "error":
			return "text-red-600"
	}
}

/**
 * Get severity badge variant
 */
export function getSeverityVariant(severity: AlertSeverity): "destructive" | "warning" | "secondary" {
	switch (severity) {
		case "error":
			return "destructive"
		case "warning":
			return "warning"
		case "info":
			return "secondary"
	}
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
	data: T
	timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedOrNull<T>(key: string): T | null {
	const entry = cache.get(key)
	if (!entry) return null
	if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
		cache.delete(key)
		return null
	}
	return entry.data as T
}

function setCache<T>(key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() })
}

function hashParams(params: any): string {
	return JSON.stringify(params)
}

// ============================================================================
// STYLE/TONE VALIDATION API
// ============================================================================

/**
 * Validate style and tone of a text
 *
 * @param params - Validation parameters
 * @returns Validation result with scores, alerts, and recommendations
 *
 * @example
 * ```typescript
 * const result = await validateStyleTone({
 *   text: "El desarrollament del projecte va bé.",
 *   documentType: "comunicacio_interna",
 *   targetAudience: "intern"
 * });
 *
 * console.log(result.scores.overall); // 75
 * console.log(result.alerts.length); // 1
 * ```
 */
export async function validateStyleTone(params: ValidateStyleToneParams): Promise<StyleToneValidationResult> {
	if (!params.text || params.text.trim().length === 0) {
		throw new Error("El text és obligatori")
	}

	// Check cache
	const cacheKey = `validateStyleTone:${hashParams(params)}`
	const cached = getCachedOrNull<StyleToneValidationResult>(cacheKey)
	if (cached) {
		return cached
	}

	try {
		const callable = httpsCallable<ValidateStyleToneParams, StyleToneValidationResult>(functions, "validateStyleTone")
		const result = await callable(params)

		// Cache result
		setCache(cacheKey, result.data)

		return result.data
	} catch (error: any) {
		console.error("Error validating style/tone:", error)

		// Translate common errors to Catalan
		if (error.code === "unauthenticated") {
			throw new Error("Cal iniciar sessió per validar el text")
		}
		if (error.code === "invalid-argument") {
			throw new Error("El text proporcionat no és vàlid")
		}

		throw new Error(error.message || "Error en la validació d'estil i to")
	}
}

/**
 * Get style/tone validation history for the current user
 *
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of recent validations
 */
export async function getStyleToneHistory(limit: number = 20): Promise<StyleToneHistoryItem[]> {
	try {
		const callable = httpsCallable<{ limit: number }, StyleToneHistoryItem[]>(functions, "getStyleToneHistory")
		const result = await callable({ limit })
		return result.data
	} catch (error: any) {
		console.error("Error fetching style/tone history:", error)
		throw new Error(error.message || "Error en obtenir l'historial")
	}
}

/**
 * Improve text based on validation results
 *
 * Takes the original text and alerts from validateStyleTone,
 * then applies improvements step by step for each category:
 * - Castellanismes → proper Catalan forms
 * - Col·loquialismes → formal register
 * - Registre → impersonal/formal constructions
 * - Claredat → precise language
 * - Frases llargues → shorter sentences
 *
 * @param params - Text and alerts to process
 * @returns Improved text with step-by-step changes
 *
 * @example
 * ```typescript
 * const validation = await validateStyleTone({ text: "..." });
 * const improved = await improveText({
 *   text: "...",
 *   alerts: validation.alerts
 * });
 * console.log(improved.improvedText);
 * ```
 */
export async function improveText(params: ImproveTextParams): Promise<ImproveTextResult> {
	if (!params.text || params.text.trim().length === 0) {
		throw new Error("El text és obligatori")
	}

	if (!params.alerts || !Array.isArray(params.alerts)) {
		throw new Error("Les alertes són obligatòries (del resultat de validateStyleTone)")
	}

	try {
		const callable = httpsCallable<ImproveTextParams, ImproveTextResult>(functions, "improveText")
		const result = await callable(params)
		return result.data
	} catch (error: any) {
		console.error("Error improving text:", error)

		if (error.code === "unauthenticated") {
			throw new Error("Cal iniciar sessió per millorar el text")
		}
		if (error.code === "invalid-argument") {
			throw new Error("Els paràmetres proporcionats no són vàlids")
		}

		throw new Error(error.message || "Error en la millora del text")
	}
}

// ============================================================================
// LANGUAGETOOL API (existing, re-exported for convenience)
// ============================================================================

export interface LanguageToolMatch {
	message: string
	offset: number
	length: number
	replacements: Array<{ value: string }>
	rule: {
		id: string
		description?: string
		category: {
			id: string
			name: string
		}
	}
	context: {
		text: string
		offset: number
		length: number
	}
}

export interface LanguageToolResult {
	matches: LanguageToolMatch[]
	language: {
		name: string
		code: string
	}
}

export interface CheckLanguageToolParams {
	text: string
	language?: string
	level?: "default" | "picky"
	sessionId?: string
}

/**
 * Check text with LanguageTool (spelling/grammar)
 */
export async function checkLanguageTool(params: CheckLanguageToolParams): Promise<LanguageToolResult> {
	if (!params.text || params.text.trim().length === 0) {
		throw new Error("El text és obligatori")
	}

	try {
		const callable = httpsCallable<CheckLanguageToolParams, LanguageToolResult>(functions, "checkLanguageTool")
		const result = await callable(params)
		return result.data
	} catch (error: any) {
		console.error("Error checking with LanguageTool:", error)
		throw new Error(error.message || "Error en la correcció ortogràfica")
	}
}

// ============================================================================
// RAG TERMINOLOGIC API (existing, re-exported for convenience)
// ============================================================================

export interface RAGProcessOptions {
	skipVectorSearch?: boolean
	skipLLMRewrite?: boolean
	maxTerms?: number
}

export interface RAGProcessParams {
	text: string
	sessionId?: string
	options?: RAGProcessOptions
}

export interface RAGCandidate {
	original: string
	context: string
	source: "nlp" | "hash" | "llm"
}

export interface RAGMatch {
	term: string
	recommended: string
	similarity: number
	context?: string
}

export interface RAGProcessResult {
	success: boolean
	originalText: string
	improvedText: string
	candidates: RAGCandidate[]
	matches: RAGMatch[]
	processingTimeMs: number
	llmUsed: boolean
}

/**
 * Process text with RAG terminological correction
 */
export async function processRAGTerminologic(params: RAGProcessParams): Promise<RAGProcessResult> {
	if (!params.text || params.text.trim().length === 0) {
		throw new Error("El text és obligatori")
	}

	try {
		const callable = httpsCallable<RAGProcessParams, RAGProcessResult>(functions, "processRAGTerminologic")
		const result = await callable(params)
		return result.data
	} catch (error: any) {
		console.error("Error in RAG process:", error)
		throw new Error(error.message || "Error en el processament terminològic")
	}
}

// ============================================================================
// FULL PIPELINE API
// ============================================================================

export interface FullPipelineResult {
	// Phase 1: LanguageTool
	languageTool?: LanguageToolResult

	// Phase 2: RAG Terminologic
	ragTerminologic?: RAGProcessResult

	// Phase 3: Style/Tone
	styleTone: StyleToneValidationResult

	// Combined
	originalText: string
	finalText: string
	totalProcessingTimeMs: number
}

/**
 * Run full Kit Lingüístic pipeline
 * Phase 1: LanguageTool (optional)
 * Phase 2: RAG Terminologic (optional)
 * Phase 3: Style/Tone validation
 *
 * @param text - Text to process
 * @param options - Pipeline options
 * @returns Full pipeline result
 */
export async function runFullPipeline(
	text: string,
	options: {
		skipLanguageTool?: boolean
		skipRAG?: boolean
		documentType?: DocumentType
		targetAudience?: TargetAudience
		sessionId?: string
	} = {}
): Promise<FullPipelineResult> {
	const startTime = Date.now()
	let currentText = text

	const result: FullPipelineResult = {
		originalText: text,
		finalText: text,
		styleTone: {} as StyleToneValidationResult,
		totalProcessingTimeMs: 0,
	}

	// Phase 1: LanguageTool
	if (!options.skipLanguageTool) {
		try {
			result.languageTool = await checkLanguageTool({
				text: currentText,
				language: "ca",
				level: "picky",
				sessionId: options.sessionId,
			})
			// Note: LanguageTool doesn't auto-correct, just provides suggestions
		} catch (e) {
			console.warn("LanguageTool phase failed, continuing:", e)
		}
	}

	// Phase 2: RAG Terminologic
	if (!options.skipRAG) {
		try {
			result.ragTerminologic = await processRAGTerminologic({
				text: currentText,
				sessionId: options.sessionId,
			})
			if (result.ragTerminologic.success && result.ragTerminologic.improvedText) {
				currentText = result.ragTerminologic.improvedText
			}
		} catch (e) {
			console.warn("RAG phase failed, continuing:", e)
		}
	}

	// Phase 3: Style/Tone validation
	result.styleTone = await validateStyleTone({
		text: currentText,
		originalText: text,
		documentType: options.documentType,
		targetAudience: options.targetAudience,
		sessionId: options.sessionId,
	})

	result.finalText = currentText
	result.totalProcessingTimeMs = Date.now() - startTime

	return result
}
