/**
 * Style and Tone Validation Types
 *
 * Types for the style and tone validation pipeline (Phase 3 of Kit Lingüístic)
 * Based on: docs/kit-validacio-estil-to-requeriments.md
 */

// ============================================================================
// ENUMS
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

export type RulePatternType = "exact" | "regex" | "semantic"

export type RuleType = "castellanisme" | "colloquialisme" | "registre" | "ambiguitat" | "metric"

// ============================================================================
// REQUEST / RESPONSE
// ============================================================================

export interface ValidateStyleToneRequest {
	text: string
	documentType?: DocumentType
	targetAudience?: TargetAudience
	originalText?: string
	sessionId?: string
	/** LLM model to use (from ModelSelection.jsx). If not specified, defaults to gemini-2.5-flash */
	model?: string
}

export interface ValidateStyleToneResponse {
	scores: StyleToneScores
	toneAnalysis: ToneAnalysis
	styleMetrics: StyleMetrics
	alerts: StyleAlert[]
	recommendations: StyleRecommendation[]
	metadata: ValidationMetadata
}

// ============================================================================
// SCORES
// ============================================================================

export interface StyleToneScores {
	/** Puntuació global ponderada (0-100) */
	overall: number
	/** Coherència estilística (objectiu: ≥90) */
	styleCoherence: number
	/** Adequació del to (objectiu: ≥85) */
	toneAdequacy: number
	/** Claredat del missatge (objectiu: ≥80) */
	clarity: number
	/** Nivell de formalitat (objectiu: ≥85) */
	formality: number
	/** Consistència terminològica (objectiu: ≥90) */
	terminologyConsistency: number
}

export const SCORE_WEIGHTS = {
	styleCoherence: 0.25,
	toneAdequacy: 0.25,
	clarity: 0.2,
	formality: 0.15,
	terminologyConsistency: 0.15,
} as const

export const SCORE_THRESHOLDS = {
	styleCoherence: { target: 90, warning: 80, error: 60 },
	toneAdequacy: { target: 85, warning: 75, error: 55 },
	clarity: { target: 80, warning: 70, error: 50 },
	formality: { target: 85, warning: 75, error: 55 },
	terminologyConsistency: { target: 90, warning: 80, error: 60 },
	overall: { target: 85, warning: 75, error: 55 },
} as const

export const ALERT_IMPACT: Record<AlertSeverity, number> = {
	error: -5,
	warning: -2,
	info: -0.5,
}

// ============================================================================
// TONE ANALYSIS
// ============================================================================

export interface ToneAnalysis {
	detectedTone: DetectedTone
	emotionalTone: EmotionalTone
	/** Objectivity score (0-100) */
	objectivity: number
	/** Model confidence (0-1) */
	confidence: number
}

// ============================================================================
// STYLE METRICS
// ============================================================================

export interface StyleMetrics {
	/** Average words per sentence */
	averageSentenceLength: number
	/** Percentage of passive voice usage (0-100) */
	passiveVoicePercentage: number
	/** Type-token ratio (0-1) */
	lexicalDiversity: number
	/** Syntactic complexity level */
	syntacticComplexity: SyntacticComplexity
	/** Readability score adapted for Catalan */
	readabilityScore: number
	/** Total sentence count */
	sentenceCount: number
	/** Total word count */
	wordCount: number
}

export const STYLE_TARGETS = {
	sentenceLength: { min: 15, max: 25, maxAllowed: 40 },
	passiveVoice: { maxPercentage: 20 },
	lexicalDiversity: { min: 0.4 },
} as const

// ============================================================================
// ALERTS
// ============================================================================

export interface StyleAlert {
	id: string
	type: AlertType
	severity: AlertSeverity
	message: string
	context: AlertContext
	suggestion?: string
	rule?: string
}

export interface AlertContext {
	/** Problematic fragment */
	text: string
	startOffset: number
	endOffset: number
	/** Full sentence for context */
	sentence: string
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export interface StyleRecommendation {
	id: string
	category: RecommendationCategory
	priority: RecommendationPriority
	title: string
	description: string
	examples?: RecommendationExample[]
}

export interface RecommendationExample {
	original: string
	improved: string
}

// ============================================================================
// METADATA
// ============================================================================

export interface ValidationMetadata {
	processedAt: string
	processingTimeMs: number
	modelVersion: string
	pipelineVersion: string
	rulesApplied: number
}

// ============================================================================
// RULES (Firestore)
// ============================================================================

export interface StyleRule {
	id: string
	type: RuleType
	/** Detection pattern (regex or exact text) */
	pattern?: string
	patternType: RulePatternType
	enabled: boolean
	severity: AlertSeverity
	message: string
	suggestion?: string
	/** Empty array = applies to all */
	applicableDocTypes: DocumentType[]
	/** Empty array = applies to all */
	applicableAudiences: TargetAudience[]
	createdAt: Date
	updatedAt: Date
	createdBy: string
	version: number
}

// ============================================================================
// DICTIONARIES
// ============================================================================

export interface CastellanismeEntry {
	incorrect: string
	correct: string
	severity: AlertSeverity
	context?: string
	notes?: string
}

export interface ColloquialismeEntry {
	colloquial: string
	formal: string
	severity: AlertSeverity
	applicableContexts: DocumentType[]
}

// ============================================================================
// LOGGING (BigQuery)
// ============================================================================

export interface StyleToneLog {
	logId: string
	sessionId?: string
	userId?: string
	textHash: string
	textLength: number
	documentType?: DocumentType
	targetAudience?: TargetAudience
	scoreOverall: number
	scoreStyleCoherence: number
	scoreToneAdequacy: number
	scoreClarity: number
	scoreFormality: number
	scoreTerminologyConsistency: number
	detectedTone: DetectedTone
	emotionalTone: EmotionalTone
	objectivity: number
	modelConfidence: number
	avgSentenceLength: number
	passiveVoicePct: number
	lexicalDiversity: number
	alertsCountError: number
	alertsCountWarning: number
	alertsCountInfo: number
	alertsJson: string
	recommendationsCount: number
	processedAt: Date
	processingTimeMs: number
	modelVersion: string
	pipelineVersion: string
}

// ============================================================================
// FEEDBACK
// ============================================================================

export type FeedbackTarget = "alert" | "recommendation" | "overall"
export type FeedbackRating = "positive" | "negative"

export interface StyleToneFeedback {
	feedbackId: string
	logId: string
	userId?: string
	feedbackTarget: FeedbackTarget
	targetId?: string
	rating: FeedbackRating
	comment?: string
	suggestedCorrection?: string
	originalText?: string
	alertOrRecommendationJson?: string
	submittedAt: Date
	reviewed: boolean
	reviewedAt?: Date
	reviewedBy?: string
	actionTaken?: string
}

// ============================================================================
// TEXT IMPROVEMENT
// ============================================================================

/** Categories of improvements that can be applied */
export type ImprovementCategory = "castellanismes" | "colloquialismes" | "registre" | "claredat" | "frases_llargues"

/** Request to improve text based on validation results */
export interface ImproveTextRequest {
	/** Original text to improve */
	text: string
	/** Validation alerts to address */
	alerts: StyleAlert[]
	/** Which categories to improve (if not specified, all applicable will be processed) */
	categories?: ImprovementCategory[]
	/** Document type for context */
	documentType?: DocumentType
	/** Target audience for context */
	targetAudience?: TargetAudience
	/** Session tracking */
	sessionId?: string
	/** LLM model to use (from ModelSelection.jsx). If not specified, defaults to gemini-2.5-flash */
	model?: string
}

/** Result of a single improvement step */
export interface ImprovementStep {
	/** Category addressed in this step */
	category: ImprovementCategory
	/** Text before this improvement */
	textBefore: string
	/** Text after this improvement */
	textAfter: string
	/** Number of changes made */
	changesApplied: number
	/** Details of each change */
	changes: ImprovementChange[]
	/** LLM latency for this step */
	latencyMs: number
}

/** Detail of a single change within an improvement step */
export interface ImprovementChange {
	/** Original text fragment */
	original: string
	/** Improved text fragment */
	improved: string
	/** Explanation of the change */
	explanation: string
}

/** Full response from text improvement */
export interface ImproveTextResponse {
	/** Original input text */
	originalText: string
	/** Final improved text after all steps */
	improvedText: string
	/** Ordered list of improvement steps applied */
	steps: ImprovementStep[]
	/** Total number of changes across all steps */
	totalChanges: number
	/** Summary of improvements by category */
	summary: Record<ImprovementCategory, number>
	/** Processing metadata */
	metadata: ImprovementMetadata
}

export interface ImprovementMetadata {
	processedAt: string
	totalProcessingTimeMs: number
	modelVersion: string
	stepsExecuted: number
}
