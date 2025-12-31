/**
 * Style and Tone Validation Handler
 *
 * Implements the validateStyleTone callable function and HTTP endpoint
 * Phase 3 of the Kit Lingüístic pipeline
 *
 * Uses LLM (Gemini) for linguistic detection:
 * - Castellanismes, col·loquialismes, registre inadequat, ambigüitats
 * Uses local computation for metrics:
 * - Sentence length, passive voice, lexical diversity
 */

import * as logger from "firebase-functions/logger"
import { HttpsError } from "firebase-functions/v2/https"

import type {
	ValidateStyleToneRequest,
	ValidateStyleToneResponse,
	StyleToneScores,
	ToneAnalysis,
	StyleMetrics,
	StyleAlert,
	StyleRecommendation,
	ValidationMetadata,
	DetectedTone,
	EmotionalTone,
	StyleToneLog,
	AlertType,
	AlertSeverity,
	SCORE_WEIGHTS,
	ALERT_IMPACT,
	ImproveTextRequest,
	ImproveTextResponse,
	ImprovementStep,
	ImprovementChange,
	ImprovementCategory,
	ImprovementMetadata,
} from "./types/styleTone"

import { calculateStyleMetrics, generateMetricAlerts } from "./styleRulesEngine"

import { createStyleToneLogger, generateLogId, hashText, countAlertsBySeverity, getStyleToneStats, getRecentValidations } from "./StyleToneLogger"

import { getLLMServiceForModel, LLMService } from "../shared/LLMService"

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ID = "aina-demostradors"
const PIPELINE_VERSION = "2.0.0"

// Initialize loggers
const logStyleTone = createStyleToneLogger(PROJECT_ID)

// ============================================================================
// LLM-BASED DETECTION
// ============================================================================

/**
 * LLM response shape for linguistic issue detection
 */
interface LLMDetectionResult {
	issues: Array<{
		type: "castellanisme" | "colloquialisme" | "registre_inadequat" | "ambiguitat"
		severity: "error" | "warning" | "info"
		text: string
		sentence: string
		suggestion: string
		explanation: string
	}>
	toneAnalysis: {
		detectedTone: "formal_administratiu" | "semiformal" | "informal" | "mixt"
		emotionalTone: "neutre" | "positiu" | "negatiu" | "assertiu"
		objectivity: number
	}
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
	return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Detect linguistic issues using LLM
 * Returns alerts for: castellanismes, col·loquialismes, registre_inadequat, ambigüitats
 * Also returns tone analysis from the LLM
 */
async function detectIssuesWithLLM(
	text: string,
	llmService: LLMService,
	documentType?: string,
	targetAudience?: string,
	userId?: string,
	sessionId?: string
): Promise<{ alerts: StyleAlert[]; llmToneAnalysis: LLMDetectionResult["toneAnalysis"] | null }> {
	const systemPrompt = `Ets un expert en lingüística catalana especialitzat en textos administratius.
Analitza el text proporcionat i detecta problemes de registre i estil.

CATEGORIES DE PROBLEMES A DETECTAR:

1. **castellanisme**: Paraules o expressions provinents del castellà que tenen equivalent català normatiu.
   - Exemples: "entonces" → "aleshores/llavors", "bueno" → "bé", "además" → "a més"
   - Severitat: "error" si és clarament incorrecte, "warning" si és acceptable però no preferit

2. **colloquialisme**: Expressions massa informals per a un registre administratiu.
   - Exemples: "un munt de" → "nombrosos", "vale" → "d'acord", "guai" → "excel·lent"
   - Severitat: "error" si és molt informal, "warning" si és moderadament informal

3. **registre_inadequat**: Ús de formes personals o informals en lloc de les formals/impersonals.
   - Exemples: "et comuniquem" → "Es comunica", tractament de "tu" en lloc de "vostè"
   - Severitat: "warning" normalment

4. **ambiguitat**: Expressions vagues o imprecises que poden generar confusió.
   - Exemples: "aviat", "alguns", "properament" sense concretar
   - Severitat: "info" normalment

ANÀLISI DE TO:
- detectedTone: "formal_administratiu" (molt formal), "semiformal", "mixt", "informal"
- emotionalTone: "neutre", "positiu", "negatiu", "assertiu"
- objectivity: 0-100 (100 = completament objectiu)

Respon NOMÉS amb JSON vàlid.`

	const userPrompt = `Analitza aquest text${documentType ? ` (tipus: ${documentType})` : ""}${targetAudience ? ` (audiència: ${targetAudience})` : ""}:

"""
${text}
"""

Retorna un JSON amb l'estructura:
{
  "issues": [
    {
      "type": "castellanisme|colloquialisme|registre_inadequat|ambiguitat",
      "severity": "error|warning|info",
      "text": "el fragment problemàtic exacte",
      "sentence": "la frase completa on apareix",
      "suggestion": "la correcció o alternativa suggerida",
      "explanation": "breu explicació del problema"
    }
  ],
  "toneAnalysis": {
    "detectedTone": "formal_administratiu|semiformal|informal|mixt",
    "emotionalTone": "neutre|positiu|negatiu|assertiu",
    "objectivity": 85
  }
}

Si no hi ha cap problema, retorna: {"issues": [], "toneAnalysis": {...}}`

	try {
		const response = await llmService.callModel({
			prompt: userPrompt,
			systemPrompt,
			jsonResponse: true,
			module: "kit",
			userId,
			sessionId,
			context: { documentType, targetAudience, textLength: text.length },
			options: {
				maxTokens: 2000,
				temperature: 0.1,
			},
		})

		const parsed = response.json as LLMDetectionResult

		if (!parsed || !Array.isArray(parsed.issues)) {
			logger.warn("LLM returned invalid structure, using empty alerts", { response: response.text })
			return { alerts: [], llmToneAnalysis: null }
		}

		// Convert LLM response to StyleAlert[]
		const alerts: StyleAlert[] = parsed.issues.map((issue) => {
			// Find the position of the text in the original
			const startOffset = text.indexOf(issue.text)
			const endOffset = startOffset >= 0 ? startOffset + issue.text.length : 0

			return {
				id: generateAlertId(),
				type: issue.type as AlertType,
				severity: issue.severity as AlertSeverity,
				message: issue.explanation,
				context: {
					text: issue.text,
					startOffset: startOffset >= 0 ? startOffset : 0,
					endOffset,
					sentence: issue.sentence,
				},
				suggestion: issue.suggestion,
				rule: `llm_${issue.type}`,
			}
		})

		return { alerts, llmToneAnalysis: parsed.toneAnalysis || null }
	} catch (error: any) {
		logger.error("LLM detection failed", { error: error.message })
		// Return empty alerts on LLM failure (graceful degradation)
		return { alerts: [], llmToneAnalysis: null }
	}
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

const WEIGHTS: typeof SCORE_WEIGHTS = {
	styleCoherence: 0.25,
	toneAdequacy: 0.25,
	clarity: 0.2,
	formality: 0.15,
	terminologyConsistency: 0.15,
}

const IMPACT: typeof ALERT_IMPACT = {
	error: -5,
	warning: -2,
	info: -0.5,
}

/**
 * Calculate base scores from metrics and alerts
 */
function calculateScores(metrics: StyleMetrics, alerts: StyleAlert[]): StyleToneScores {
	// Start with base scores of 100
	let styleCoherence = 100
	let toneAdequacy = 100
	let clarity = 100
	let formality = 100
	let terminologyConsistency = 100

	// Apply penalties from alerts
	for (const alert of alerts) {
		const penalty = IMPACT[alert.severity]

		switch (alert.type) {
			case "castellanisme":
			case "colloquialisme":
				formality += penalty
				terminologyConsistency += penalty
				break
			case "registre_inadequat":
				toneAdequacy += penalty
				formality += penalty
				break
			case "ambiguitat":
				clarity += penalty
				break
			case "frase_llarga":
			case "passiva_excessiva":
				styleCoherence += penalty
				clarity += penalty
				break
			case "repeticio":
				styleCoherence += penalty
				break
		}
	}

	// Apply metric-based adjustments

	// Sentence length penalty
	if (metrics.averageSentenceLength > 30) {
		const penalty = Math.min(15, (metrics.averageSentenceLength - 25) * 1.5)
		clarity -= penalty
		styleCoherence -= penalty / 2
	}

	// Passive voice penalty
	if (metrics.passiveVoicePercentage > 20) {
		const penalty = Math.min(10, (metrics.passiveVoicePercentage - 20) * 0.5)
		styleCoherence -= penalty
	}

	// Low lexical diversity penalty
	if (metrics.lexicalDiversity < 0.4 && metrics.wordCount > 50) {
		const penalty = Math.min(10, (0.4 - metrics.lexicalDiversity) * 25)
		styleCoherence -= penalty
	}

	// Readability bonus/penalty
	if (metrics.readabilityScore > 70) {
		clarity += 5
	} else if (metrics.readabilityScore < 40) {
		clarity -= 10
	}

	// Clamp scores to 0-100
	styleCoherence = Math.max(0, Math.min(100, styleCoherence))
	toneAdequacy = Math.max(0, Math.min(100, toneAdequacy))
	clarity = Math.max(0, Math.min(100, clarity))
	formality = Math.max(0, Math.min(100, formality))
	terminologyConsistency = Math.max(0, Math.min(100, terminologyConsistency))

	// Calculate overall score
	const overall = styleCoherence * WEIGHTS.styleCoherence + toneAdequacy * WEIGHTS.toneAdequacy + clarity * WEIGHTS.clarity + formality * WEIGHTS.formality + terminologyConsistency * WEIGHTS.terminologyConsistency

	return {
		overall: Math.round(overall * 10) / 10,
		styleCoherence: Math.round(styleCoherence * 10) / 10,
		toneAdequacy: Math.round(toneAdequacy * 10) / 10,
		clarity: Math.round(clarity * 10) / 10,
		formality: Math.round(formality * 10) / 10,
		terminologyConsistency: Math.round(terminologyConsistency * 10) / 10,
	}
}

// ============================================================================
// TONE ANALYSIS (LLM-ENHANCED)
// ============================================================================

/**
 * Analyze tone using LLM results with fallback to heuristics
 * If LLM provides tone analysis, use it; otherwise use rule-based heuristics
 */
function analyzeTone(text: string, alerts: StyleAlert[], metrics: StyleMetrics, llmToneAnalysis?: LLMDetectionResult["toneAnalysis"] | null): ToneAnalysis {
	// If LLM provided tone analysis, use it with high confidence
	if (llmToneAnalysis) {
		return {
			detectedTone: llmToneAnalysis.detectedTone as DetectedTone,
			emotionalTone: llmToneAnalysis.emotionalTone as EmotionalTone,
			objectivity: Math.round(llmToneAnalysis.objectivity),
			confidence: 0.9, // High confidence when using LLM
		}
	}

	// Fallback to rule-based heuristics
	// Count informal indicators
	const informalAlerts = alerts.filter((a) => a.type === "colloquialisme" || a.type === "registre_inadequat").length

	const castellanismeCount = alerts.filter((a) => a.type === "castellanisme").length

	// Determine detected tone based on alerts
	let detectedTone: DetectedTone
	const totalIssues = informalAlerts + castellanismeCount

	if (totalIssues === 0 && metrics.syntacticComplexity !== "baixa") {
		detectedTone = "formal_administratiu"
	} else if (totalIssues <= 2) {
		detectedTone = "semiformal"
	} else if (totalIssues <= 5) {
		detectedTone = "mixt"
	} else {
		detectedTone = "informal"
	}

	// Determine emotional tone (simplified)
	let emotionalTone: EmotionalTone = "neutre"

	// Look for positive/negative indicators (simplified)
	const positivePatterns = /\b(excel·lent|satisfactori|favorable|positiu|èxit)\b/gi
	const negativePatterns = /\b(rebutj|deneg|inadmissible|desfavorable|negatiu)\b/gi

	if (positivePatterns.test(text)) {
		emotionalTone = "positiu"
	} else if (negativePatterns.test(text)) {
		emotionalTone = "negatiu"
	}

	// Check for assertive tone
	const assertivePatterns = /\b(ha de|cal que|s'ha de|és obligatori|imprescindible)\b/gi
	if (assertivePatterns.test(text)) {
		emotionalTone = "assertiu"
	}

	// Calculate objectivity (higher = more objective)
	// Subjective indicators: first person, emotional words
	const subjectivePatterns = /\b(jo|nosaltres|crec|penso|opino|sembla)\b/gi
	const subjectiveMatches = text.match(subjectivePatterns) || []
	const objectivity = Math.max(0, 100 - subjectiveMatches.length * 10)

	// Lower confidence for rule-based fallback
	const confidence = 0.6

	return {
		detectedTone,
		emotionalTone,
		objectivity: Math.round(objectivity),
		confidence,
	}
}

// ============================================================================
// RECOMMENDATIONS GENERATION
// ============================================================================

/**
 * Generate recommendations based on alerts and metrics
 */
function generateRecommendations(alerts: StyleAlert[], metrics: StyleMetrics, scores: StyleToneScores): StyleRecommendation[] {
	const recommendations: StyleRecommendation[] = []
	let recId = 1

	// High priority: too many errors
	const errorCount = alerts.filter((a) => a.severity === "error").length
	if (errorCount >= 3) {
		recommendations.push({
			id: `rec_${recId++}`,
			category: "to",
			priority: "alta",
			title: "Revisió urgent de registre",
			description: `S'han detectat ${errorCount} errors greus de registre. Es recomana revisar el document complet per assegurar l'adequació al to administratiu.`,
		})
	}

	// Castellanismes present
	const castellanismes = alerts.filter((a) => a.type === "castellanisme")
	if (castellanismes.length > 0) {
		const examples = castellanismes.slice(0, 2).map((a) => ({
			original: a.context.text,
			improved: a.suggestion?.split(",")[0] || "corregir",
		}))

		recommendations.push({
			id: `rec_${recId++}`,
			category: "to",
			priority: castellanismes.length > 3 ? "alta" : "mitjana",
			title: "Corregir castellanismes",
			description: `S'han detectat ${castellanismes.length} castellanismes que cal substituir per les formes catalanes correctes.`,
			examples,
		})
	}

	// Col·loquialismes present
	const colloquialismes = alerts.filter((a) => a.type === "colloquialisme")
	if (colloquialismes.length > 0) {
		recommendations.push({
			id: `rec_${recId++}`,
			category: "estil",
			priority: colloquialismes.length > 3 ? "alta" : "mitjana",
			title: "Formalitzar expressions",
			description: `S'han detectat ${colloquialismes.length} expressions col·loquials inadequades per al registre administratiu.`,
			examples: colloquialismes.slice(0, 2).map((a) => ({
				original: a.context.text,
				improved: a.suggestion || "reformular",
			})),
		})
	}

	// Sentence length issues
	if (metrics.averageSentenceLength > 30) {
		recommendations.push({
			id: `rec_${recId++}`,
			category: "claredat",
			priority: metrics.averageSentenceLength > 40 ? "alta" : "mitjana",
			title: "Simplificar frases",
			description: `La longitud mitjana de les frases és de ${metrics.averageSentenceLength} paraules. L'objectiu és 15-25 paraules per millorar la llegibilitat.`,
		})
	}

	// Passive voice
	if (metrics.passiveVoicePercentage > 30) {
		recommendations.push({
			id: `rec_${recId++}`,
			category: "estil",
			priority: "mitjana",
			title: "Reduir veu passiva",
			description: `El ${metrics.passiveVoicePercentage}% de les frases utilitzen veu passiva. Considerar reformular amb veu activa per millorar la claredat.`,
		})
	}

	// Low scores
	if (scores.clarity < 70) {
		recommendations.push({
			id: `rec_${recId++}`,
			category: "claredat",
			priority: "alta",
			title: "Millorar claredat",
			description: "La puntuació de claredat és baixa. Revisar l'estructura de les frases i eliminar ambigüitats.",
		})
	}

	// Sort by priority
	const priorityOrder = { alta: 0, mitjana: 1, baixa: 2 }
	recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

	return recommendations
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Validate style and tone of a text
 * Accepts optional 'model' in request to specify which LLM to use
 */
export async function validateStyleToneHandler(
	request: ValidateStyleToneRequest,
	auth?: { uid?: string }
): Promise<{
	result: ValidateStyleToneResponse
	logId: string
	processingTimeMs: number
}> {
	const startTime = Date.now()
	const logId = generateLogId()

	// Validate input
	if (!request.text || typeof request.text !== "string" || request.text.trim().length === 0) {
		throw new HttpsError("invalid-argument", "Text is required and must be a non-empty string")
	}

	const { text, documentType, targetAudience, sessionId, model } = request

	// Get LLM service for the selected model
	const llmService = getLLMServiceForModel(model)
	const modelVersion = `${model || "gemini-2.5-flash"}-llm-v1`

	logger.info("Style/Tone validation requested", {
		logId,
		textLength: text.length,
		documentType,
		targetAudience,
		userId: auth?.uid,
		model: model || "gemini-2.5-flash",
	})

	try {
		// 1. Calculate style metrics (local computation)
		const styleMetrics = calculateStyleMetrics(text)

		// 2. Detect linguistic issues using LLM (castellanismes, col·loquialismes, registre, ambiguities)
		const { alerts: llmAlerts, llmToneAnalysis } = await detectIssuesWithLLM(text, llmService, documentType, targetAudience, auth?.uid, sessionId)

		// 3. Generate metric-based alerts (local computation: frase_llarga, passiva_excessiva, repeticio)
		const metricAlerts = generateMetricAlerts(styleMetrics)

		// 4. Combine LLM alerts with metric alerts
		const allAlerts = [...llmAlerts, ...metricAlerts]

		// Sort by severity (error > warning > info)
		const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 }
		allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

		// 5. Calculate scores
		const scores = calculateScores(styleMetrics, allAlerts)

		// 6. Analyze tone (use LLM result if available, fallback to heuristics)
		const toneAnalysis = analyzeTone(text, allAlerts, styleMetrics, llmToneAnalysis)

		// 7. Generate recommendations
		const recommendations = generateRecommendations(allAlerts, styleMetrics, scores)

		const processingTimeMs = Date.now() - startTime

		// 8. Build response
		const metadata: ValidationMetadata = {
			processedAt: new Date().toISOString(),
			processingTimeMs,
			modelVersion,
			pipelineVersion: PIPELINE_VERSION,
			rulesApplied: llmAlerts.length, // LLM-detected issues count
		}

		const result: ValidateStyleToneResponse = {
			scores,
			toneAnalysis,
			styleMetrics,
			alerts: allAlerts,
			recommendations,
			metadata,
		}

		// 9. Log to BigQuery (async, don't block response)
		const alertCounts = countAlertsBySeverity(allAlerts)

		const log: StyleToneLog = {
			logId,
			sessionId,
			userId: auth?.uid,
			textHash: hashText(text),
			textLength: text.length,
			documentType,
			targetAudience,
			scoreOverall: scores.overall,
			scoreStyleCoherence: scores.styleCoherence,
			scoreToneAdequacy: scores.toneAdequacy,
			scoreClarity: scores.clarity,
			scoreFormality: scores.formality,
			scoreTerminologyConsistency: scores.terminologyConsistency,
			detectedTone: toneAnalysis.detectedTone,
			emotionalTone: toneAnalysis.emotionalTone,
			objectivity: toneAnalysis.objectivity,
			modelConfidence: toneAnalysis.confidence,
			avgSentenceLength: styleMetrics.averageSentenceLength,
			passiveVoicePct: styleMetrics.passiveVoicePercentage,
			lexicalDiversity: styleMetrics.lexicalDiversity,
			alertsCountError: alertCounts.error,
			alertsCountWarning: alertCounts.warning,
			alertsCountInfo: alertCounts.info,
			alertsJson: JSON.stringify(allAlerts),
			recommendationsCount: recommendations.length,
			processedAt: new Date(),
			processingTimeMs,
			modelVersion,
			pipelineVersion: PIPELINE_VERSION,
		}

		// Log async (don't await)
		logStyleTone(log).catch((e) => {
			logger.error("Failed to log to BigQuery", { error: e.message, logId })
		})

		logger.info("Style/Tone validation completed", {
			logId,
			scoreOverall: scores.overall,
			alertsCount: allAlerts.length,
			llmAlertsCount: llmAlerts.length,
			metricAlertsCount: metricAlerts.length,
			recommendationsCount: recommendations.length,
			processingTimeMs,
		})

		return { result, logId, processingTimeMs }
	} catch (error: any) {
		logger.error("Style/Tone validation failed", {
			logId,
			error: error.message,
			stack: error.stack,
		})
		throw new HttpsError("internal", `Validation failed: ${error.message}`)
	}
}

/**
 * Get style/tone statistics
 */
export async function getStyleToneStatsHandler(days: number = 30) {
	return getStyleToneStats(PROJECT_ID, undefined, days)
}

/**
 * Get recent validations for a user
 */
export async function getRecentValidationsHandler(userId: string, limit: number = 20) {
	return getRecentValidations(userId, PROJECT_ID, undefined, limit)
}

// ============================================================================
// TEXT IMPROVEMENT WITH LLM
// ============================================================================

/**
 * Map alert types to improvement categories
 */
function alertTypeToCategory(alertType: AlertType): ImprovementCategory | null {
	switch (alertType) {
		case "castellanisme":
			return "castellanismes"
		case "colloquialisme":
			return "colloquialismes"
		case "registre_inadequat":
			return "registre"
		case "ambiguitat":
			return "claredat"
		case "frase_llarga":
			return "frases_llargues"
		default:
			return null
	}
}

/**
 * LLM response shape for text improvement
 */
interface LLMImprovementResult {
	improvedText: string
	changes: Array<{
		original: string
		improved: string
		explanation: string
	}>
}

/**
 * Apply a single category of improvements using LLM
 */
async function applyImprovementStep(
	text: string,
	category: ImprovementCategory,
	relevantAlerts: StyleAlert[],
	llmService: LLMService,
	documentType?: string,
	targetAudience?: string,
	userId?: string,
	sessionId?: string
): Promise<ImprovementStep> {
	const startTime = Date.now()

	// Build category-specific system prompt
	const categoryPrompts: Record<ImprovementCategory, string> = {
		castellanismes: `Ets un expert en lingüística catalana. La teva tasca és NOMÉS corregir els castellanismes del text.

INSTRUCCIONS:
- Substitueix NOMÉS les paraules o expressions del castellà per les formes catalanes correctes
- NO canviïs res més del text (estructura, puntuació, altres paraules)
- Mantén el to i l'estil original
- Si una paraula no és un castellanisme, deixa-la tal qual

EXEMPLES DE CORRECCIONS:
- "entonces" → "aleshores" / "llavors"
- "bueno" → "bé" / "d'acord"
- "además" → "a més"
- "incluso" → "fins i tot"
- "desde luego" → "és clar"`,

		colloquialismes: `Ets un expert en registre formal català. La teva tasca és NOMÉS formalitzar les expressions col·loquials.

INSTRUCCIONS:
- Substitueix NOMÉS les expressions massa informals per formes més formals
- NO canviïs res més del text
- Mantén el significat original
- Adequa el to al registre administratiu

EXEMPLES DE CORRECCIONS:
- "un munt de" → "nombrosos" / "molts"
- "vale" → "d'acord"
- "guai" → "excel·lent" / "molt bé"
- "pasta" (diners) → "diners"
- "flipar" → "sorprendre's"`,

		registre: `Ets un expert en redacció administrativa catalana. La teva tasca és NOMÉS adequar el registre del text.

INSTRUCCIONS:
- Substitueix formes personals o informals per formes impersonals i formals
- Canvia el tractament de "tu" a "vostè" si cal
- Usa construccions impersonals ("es comunica", "s'informa")
- NO canviïs el contingut, només la forma

EXEMPLES DE CORRECCIONS:
- "et comuniquem" → "es comunica"
- "has de portar" → "cal presentar" / "s'ha de presentar"
- "et recordem" → "es recorda"`,

		claredat: `Ets un expert en redacció clara i precisa. La teva tasca és NOMÉS eliminar ambigüitats.

INSTRUCCIONS:
- Substitueix expressions vagues per formulacions precises
- Concreta dates, terminis i quantitats si el context ho permet
- NO inventes informació, només suggereix estructures més clares
- Mantén el significat original

EXEMPLES DE CORRECCIONS:
- "aviat" → "en el termini de X dies" (si es pot deduir)
- "alguns documents" → "els documents requerits"
- "properament" → "durant el mes de..."`,

		frases_llargues: `Ets un expert en redacció concisa. La teva tasca és NOMÉS dividir les frases massa llargues.

INSTRUCCIONS:
- Divideix les frases de més de 35-40 paraules en frases més curtes
- Mantén la coherència i els connectors adequats
- NO canviïs el contingut ni el vocabulari
- L'objectiu és tenir frases de 15-25 paraules

TÈCNIQUES:
- Divideix en dues frases amb punt i seguit
- Usa connectors: "A més,", "Per tant,", "D'altra banda,"
- Converteix subordinades en frases independents`,
	}

	const systemPrompt = `${categoryPrompts[category]}

Respon NOMÉS amb JSON vàlid amb l'estructura:
{
  "improvedText": "el text complet amb les correccions aplicades",
  "changes": [
    {
      "original": "fragment original",
      "improved": "fragment corregit",
      "explanation": "breu explicació del canvi"
    }
  ]
}

Si no cal fer cap canvi, retorna:
{
  "improvedText": "el text original sense canvis",
  "changes": []
}`

	// Include the specific issues detected for this category
	const issuesContext =
		relevantAlerts.length > 0
			? `\n\nPROBLEMES DETECTATS (corregeix aquests específicament):\n${relevantAlerts.map((a) => `- "${a.context.text}": ${a.message}${a.suggestion ? ` → Suggeriment: ${a.suggestion}` : ""}`).join("\n")}`
			: ""

	const userPrompt = `Millora el següent text aplicant NOMÉS correccions de la categoria "${category}":${issuesContext}

TEXT A MILLORAR:
"""
${text}
"""`

	try {
		const response = await llmService.callModel({
			prompt: userPrompt,
			systemPrompt,
			jsonResponse: true,
			module: "kit",
			userId,
			sessionId,
			context: { category, documentType, targetAudience, alertsCount: relevantAlerts.length },
			options: {
				maxTokens: 3000,
				temperature: 0.2, // Low temperature for consistent corrections
			},
		})

		const latencyMs = Date.now() - startTime
		const parsed = response.json as LLMImprovementResult

		if (!parsed || !parsed.improvedText) {
			logger.warn("LLM returned invalid improvement structure", { category, response: response.text })
			return {
				category,
				textBefore: text,
				textAfter: text,
				changesApplied: 0,
				changes: [],
				latencyMs,
			}
		}

		const changes: ImprovementChange[] = (parsed.changes || []).map((c) => ({
			original: c.original,
			improved: c.improved,
			explanation: c.explanation,
		}))

		return {
			category,
			textBefore: text,
			textAfter: parsed.improvedText,
			changesApplied: changes.length,
			changes,
			latencyMs,
		}
	} catch (error: any) {
		logger.error("LLM improvement step failed", { category, error: error.message })
		return {
			category,
			textBefore: text,
			textAfter: text,
			changesApplied: 0,
			changes: [],
			latencyMs: Date.now() - startTime,
		}
	}
}

/**
 * Improve text based on validation results
 * Applies improvements step by step, one category at a time
 * Accepts optional 'model' in request to specify which LLM to use
 */
export async function improveTextHandler(
	request: ImproveTextRequest,
	auth?: { uid?: string }
): Promise<{
	result: ImproveTextResponse
	processingTimeMs: number
}> {
	const startTime = Date.now()

	// Validate input
	if (!request.text || typeof request.text !== "string" || request.text.trim().length === 0) {
		throw new HttpsError("invalid-argument", "Text is required and must be a non-empty string")
	}

	const { text, alerts, categories, documentType, targetAudience, sessionId, model } = request

	// Get LLM service for the selected model
	const llmService = getLLMServiceForModel(model)
	const modelVersion = `${model || "gemini-2.5-flash"}-llm-v1`

	logger.info("Text improvement requested", {
		textLength: text.length,
		alertsCount: alerts.length,
		requestedCategories: categories,
		userId: auth?.uid,
		model: model || "gemini-2.5-flash",
	})

	// Determine which categories to process based on alerts
	const alertsByCategory = new Map<ImprovementCategory, StyleAlert[]>()

	for (const alert of alerts) {
		const category = alertTypeToCategory(alert.type)
		if (category) {
			const existing = alertsByCategory.get(category) || []
			existing.push(alert)
			alertsByCategory.set(category, existing)
		}
	}

	// Filter to requested categories if specified
	let categoriesToProcess: ImprovementCategory[]
	if (categories && categories.length > 0) {
		categoriesToProcess = categories.filter((c) => alertsByCategory.has(c))
	} else {
		categoriesToProcess = Array.from(alertsByCategory.keys())
	}

	// Define processing order (most impactful first)
	const categoryOrder: ImprovementCategory[] = ["castellanismes", "colloquialismes", "registre", "claredat", "frases_llargues"]
	categoriesToProcess.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))

	logger.info("Processing improvement categories", {
		categories: categoriesToProcess,
		alertsPerCategory: Object.fromEntries(Array.from(alertsByCategory.entries()).map(([k, v]) => [k, v.length])),
	})

	// Apply improvements sequentially, each step builds on the previous
	let currentText = text
	const steps: ImprovementStep[] = []
	const summary: Record<ImprovementCategory, number> = {
		castellanismes: 0,
		colloquialismes: 0,
		registre: 0,
		claredat: 0,
		frases_llargues: 0,
	}

	for (const category of categoriesToProcess) {
		const relevantAlerts = alertsByCategory.get(category) || []

		logger.info(`Applying improvement step: ${category}`, {
			alertsCount: relevantAlerts.length,
			currentTextLength: currentText.length,
		})

		const step = await applyImprovementStep(currentText, category, relevantAlerts, llmService, documentType, targetAudience, auth?.uid, sessionId)

		steps.push(step)
		summary[category] = step.changesApplied

		// Update text for next step (sequential improvement)
		if (step.changesApplied > 0) {
			currentText = step.textAfter
		}

		logger.info(`Completed improvement step: ${category}`, {
			changesApplied: step.changesApplied,
			latencyMs: step.latencyMs,
		})
	}

	const processingTimeMs = Date.now() - startTime
	const totalChanges = steps.reduce((sum, s) => sum + s.changesApplied, 0)

	const metadata: ImprovementMetadata = {
		processedAt: new Date().toISOString(),
		totalProcessingTimeMs: processingTimeMs,
		modelVersion,
		stepsExecuted: steps.length,
	}

	const result: ImproveTextResponse = {
		originalText: text,
		improvedText: currentText,
		steps,
		totalChanges,
		summary,
		metadata,
	}

	logger.info("Text improvement completed", {
		totalChanges,
		stepsExecuted: steps.length,
		processingTimeMs,
		textLengthBefore: text.length,
		textLengthAfter: currentText.length,
	})

	return { result, processingTimeMs }
}
