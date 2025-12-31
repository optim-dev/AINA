/**
 * Style Rules Engine
 *
 * Implements detection rules for:
 * - Castellanismes (Spanish borrowings)
 * - Col·loquialismes (Colloquial expressions)
 * - Registre administratiu (Administrative register violations)
 * - Ambigüitats (Ambiguities)
 * - Mètriques estilístiques (Style metrics)
 */

import type { StyleAlert, AlertSeverity, CastellanismeEntry, ColloquialismeEntry, DocumentType, TargetAudience, StyleMetrics, SyntacticComplexity } from "./types/styleTone"

// ============================================================================
// CASTELLANISMES DICTIONARY
// ============================================================================

export const CASTELLANISMES: CastellanismeEntry[] = [
	// Error severity (clearly incorrect)
	{ incorrect: "bueno", correct: "bé, d'acord", severity: "error" },
	{ incorrect: "entonces", correct: "aleshores, llavors, doncs", severity: "error" },
	{ incorrect: "desde luego", correct: "és clar, certament", severity: "error" },
	{ incorrect: "en plan", correct: "(reformular)", severity: "error" },
	{ incorrect: "o sea", correct: "és a dir, o sigui", severity: "error" },
	{ incorrect: "pues", correct: "doncs", severity: "error" },
	{ incorrect: "sin embargo", correct: "tanmateix, no obstant això", severity: "error" },
	{ incorrect: "ya que", correct: "ja que, atès que", severity: "error" },
	{ incorrect: "a lo mejor", correct: "potser, tal vegada", severity: "error" },
	{ incorrect: "por supuesto", correct: "és clar, naturalment", severity: "error" },
	{ incorrect: "además", correct: "a més, a més a més", severity: "error" },
	{ incorrect: "aunque", correct: "encara que, tot i que", severity: "error" },
	{ incorrect: "sobre todo", correct: "sobretot, especialment", severity: "error" },
	{ incorrect: "mientras", correct: "mentre, mentrestant", severity: "error" },
	{ incorrect: "incluso", correct: "fins i tot, àdhuc", severity: "error" },
	{ incorrect: "asimismo", correct: "així mateix, igualment", severity: "error" },
	{ incorrect: "no obstante", correct: "no obstant això, tanmateix", severity: "error" },
	{ incorrect: "por lo tanto", correct: "per tant, consegüentment", severity: "error" },
	{ incorrect: "en cuanto a", correct: "pel que fa a, quant a", severity: "error" },
	{ incorrect: "a pesar de", correct: "malgrat, tot i", severity: "error" },
	{ incorrect: "aposta", correct: "expressament, a propòsit", severity: "error" },
	{ incorrect: "alomillor", correct: "potser, tal vegada", severity: "error" },
	{ incorrect: "igualment", correct: "igualment (correcte), de la mateixa manera", severity: "info", notes: "Acceptable en alguns contextos" },

	// Warning severity (acceptable but not preferred)
	{ incorrect: "desarrollament", correct: "desenvolupament", severity: "warning" },
	{ incorrect: "desarrollo", correct: "desenvolupament", severity: "warning" },
	{ incorrect: "marco", correct: "marc", severity: "warning", context: "en el sentit de 'context'" },
	{ incorrect: "plazo", correct: "termini", severity: "warning" },
	{ incorrect: "tramite", correct: "tràmit", severity: "warning" },
	{ incorrect: "trámite", correct: "tràmit", severity: "warning" },
	{ incorrect: "expediente", correct: "expedient", severity: "warning" },
	{ incorrect: "recurso", correct: "recurs", severity: "warning" },
	{ incorrect: "solicitud", correct: "sol·licitud", severity: "warning" },
	{ incorrect: "denuncia", correct: "denúncia", severity: "warning" },
	{ incorrect: "procedimiento", correct: "procediment", severity: "warning" },
	{ incorrect: "requisito", correct: "requisit", severity: "warning" },
	{ incorrect: "presupuesto", correct: "pressupost", severity: "warning" },
	{ incorrect: "impuesto", correct: "impost", severity: "warning" },
	{ incorrect: "subvención", correct: "subvenció", severity: "warning" },
	{ incorrect: "ayuda", correct: "ajuda, ajut", severity: "warning", context: "en context de subvencions: 'subvenció'" },
	{ incorrect: "ayuntamiento", correct: "ajuntament", severity: "warning" },
	{ incorrect: "junta", correct: "junta (correcte)", severity: "info" },
	{ incorrect: "alcalde", correct: "alcalde/essa (normatiu)", severity: "info" },
]

// ============================================================================
// COL·LOQUIALISMES DICTIONARY
// ============================================================================

export const COLLOQUIALISMES: ColloquialismeEntry[] = [
	// Always inappropriate
	{ colloquial: "un munt de", formal: "nombrosos/es, una quantitat considerable de", severity: "warning", applicableContexts: [] },
	{ colloquial: "un grapat de", formal: "diversos/es, un nombre considerable de", severity: "warning", applicableContexts: [] },
	{ colloquial: "passar de", formal: "desestimar, no atendre", severity: "warning", applicableContexts: [] },
	{ colloquial: "al loro", formal: "atent/a, vigilant", severity: "error", applicableContexts: [] },
	{ colloquial: "vale", formal: "d'acord, entesos", severity: "warning", applicableContexts: [] },
	{ colloquial: "guai", formal: "excel·lent, molt bé", severity: "error", applicableContexts: [] },
	{ colloquial: "molar", formal: "agradar, ser satisfactori", severity: "error", applicableContexts: [] },
	{ colloquial: "flipar", formal: "sorprendre's, impressionar-se", severity: "error", applicableContexts: [] },
	{ colloquial: "currar", formal: "treballar", severity: "warning", applicableContexts: [] },
	{ colloquial: "pasta", formal: "diners, import", severity: "warning", applicableContexts: [] },
	{ colloquial: "papers", formal: "documents, documentació", severity: "warning", applicableContexts: [] },
	{ colloquial: "papeleo", formal: "tràmits, documentació", severity: "warning", applicableContexts: [] },
	{ colloquial: "lio", formal: "problema, dificultat, complicació", severity: "warning", applicableContexts: [] },
	{ colloquial: "pal·lo", formal: "problema, inconvenient", severity: "warning", applicableContexts: [] },
	{ colloquial: "moguda", formal: "situació, circumstància", severity: "warning", applicableContexts: [] },
	{ colloquial: "marrón", formal: "problema, responsabilitat", severity: "warning", applicableContexts: [] },
	{ colloquial: "tio", formal: "(eliminar o substituir per nom)", severity: "error", applicableContexts: [] },
	{ colloquial: "tia", formal: "(eliminar o substituir per nom)", severity: "error", applicableContexts: [] },
	{ colloquial: "penya", formal: "persones, gent", severity: "warning", applicableContexts: [] },

	// Context-dependent (only in formal documents)
	{ colloquial: "bé,", formal: "(eliminar a inici de frase)", severity: "info", applicableContexts: ["decret", "notificacio_ciutada"] },
	{ colloquial: "doncs bé", formal: "per tant, en conseqüència", severity: "info", applicableContexts: ["decret"] },
	{ colloquial: "hola", formal: "(usar fórmula formal)", severity: "warning", applicableContexts: ["decret", "notificacio_ciutada"] },
	{ colloquial: "bon dia", formal: "(usar fórmula formal en decrets)", severity: "info", applicableContexts: ["decret"] },
]

// ============================================================================
// REGISTRE PATTERNS
// ============================================================================

interface RegistrePattern {
	pattern: RegExp
	message: string
	suggestion: string
	severity: AlertSeverity
	applicableDocTypes: DocumentType[]
}

export const REGISTRE_PATTERNS: RegistrePattern[] = [
	// Informal addressing (tu form)
	{
		pattern: /\b(et|t'|tens|pots|has de|vols|fas|dius|veus)\b/gi,
		message: "Ús del tractament informal (tu) en lloc del formal (vostè)",
		suggestion: "Utilitzar formes de vostè: li, té, pot, ha de, vol, fa, diu, veu",
		severity: "warning",
		applicableDocTypes: ["decret", "notificacio_ciutada"],
	},
	// Missing impersonal forms
	{
		pattern: /\b(et comuniquem|t'informem|et notifiquem)\b/gi,
		message: "Forma personal inadequada per a registre administratiu",
		suggestion: "Utilitzar forma impersonal: 'Es comunica', 'S'informa', 'Es notifica'",
		severity: "warning",
		applicableDocTypes: ["decret", "notificacio_ciutada", "informe_valoracio"],
	},
	// Generic "usuario" instead of specific
	{
		pattern: /\b(l'usuari|els usuaris)\b/gi,
		message: "Terme genèric 'usuari' poc adequat en context administratiu",
		suggestion: "Utilitzar 'la persona interessada', 'la persona sol·licitant'",
		severity: "info",
		applicableDocTypes: ["decret", "notificacio_ciutada"],
	},
]

// ============================================================================
// AMBIGUITY PATTERNS
// ============================================================================

interface AmbiguityPattern {
	pattern: RegExp
	message: string
	suggestion: string
	severity: AlertSeverity
}

export const AMBIGUITY_PATTERNS: AmbiguityPattern[] = [
	// Vague temporal references
	{
		pattern: /\b(pròximament|properament|aviat|en breu)\b/gi,
		message: "Referència temporal vaga que pot generar ambigüitat",
		suggestion: "Especificar una data concreta o un termini definit",
		severity: "info",
	},
	// Vague quantity references
	{
		pattern: /\b(alguns|algunes|diversos|diverses|varis|vàries|certs|certes)\b/gi,
		message: "Quantificador vague en context que pot requerir precisió",
		suggestion: "Considerar especificar la quantitat exacta si és rellevant",
		severity: "info",
	},
	// Ambiguous pronouns (simple detection)
	{
		pattern: /\.\s*[A-Z][^.]*\b(aquest|aquesta|aquell|aquella|això|allò)\b[^.]*\.\s*[A-Z][^.]*\b(el qual|la qual|els quals|les quals)\b/gi,
		message: "Possible pronom amb referent ambigu",
		suggestion: "Revisar que el referent del pronom sigui clar",
		severity: "info",
	},
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
	return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Find sentence containing a match
 */
function findSentence(text: string, startOffset: number): string {
	// Find sentence boundaries
	const sentences = text.split(/(?<=[.!?])\s+/)
	let currentOffset = 0

	for (const sentence of sentences) {
		const sentenceEnd = currentOffset + sentence.length
		if (startOffset >= currentOffset && startOffset < sentenceEnd) {
			return sentence.trim()
		}
		currentOffset = sentenceEnd + 1 // +1 for the space after punctuation
	}

	// Fallback: return surrounding context
	const start = Math.max(0, startOffset - 50)
	const end = Math.min(text.length, startOffset + 50)
	return text.substring(start, end)
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect castellanismes in text
 */
export function detectCastellanismes(text: string): StyleAlert[] {
	const alerts: StyleAlert[] = []

	for (const entry of CASTELLANISMES) {
		const pattern = new RegExp(`\\b${escapeRegex(entry.incorrect)}\\b`, "gi")
		let match: RegExpExecArray | null

		while ((match = pattern.exec(text)) !== null) {
			alerts.push({
				id: generateAlertId(),
				type: "castellanisme",
				severity: entry.severity,
				message: `Castellanisme detectat: '${match[0]}'`,
				context: {
					text: match[0],
					startOffset: match.index,
					endOffset: match.index + match[0].length,
					sentence: findSentence(text, match.index),
				},
				suggestion: `Substituir per: ${entry.correct}`,
				rule: `castellanisme_${entry.incorrect}`,
			})
		}
	}

	return alerts
}

/**
 * Detect col·loquialismes in text
 */
export function detectColloquialismes(text: string, documentType?: DocumentType): StyleAlert[] {
	const alerts: StyleAlert[] = []

	for (const entry of COLLOQUIALISMES) {
		// Check if this rule applies to the document type
		if (entry.applicableContexts.length > 0 && documentType && !entry.applicableContexts.includes(documentType)) {
			continue
		}

		const pattern = new RegExp(`\\b${escapeRegex(entry.colloquial)}\\b`, "gi")
		let match: RegExpExecArray | null

		while ((match = pattern.exec(text)) !== null) {
			alerts.push({
				id: generateAlertId(),
				type: "colloquialisme",
				severity: entry.severity,
				message: `Expressió col·loquial: '${match[0]}'`,
				context: {
					text: match[0],
					startOffset: match.index,
					endOffset: match.index + match[0].length,
					sentence: findSentence(text, match.index),
				},
				suggestion: entry.formal,
				rule: `colloquialisme_${entry.colloquial.replace(/\s+/g, "_")}`,
			})
		}
	}

	return alerts
}

/**
 * Detect registre administratiu violations
 */
export function detectRegistreViolations(text: string, documentType?: DocumentType): StyleAlert[] {
	const alerts: StyleAlert[] = []

	for (const rule of REGISTRE_PATTERNS) {
		// Check if this rule applies to the document type
		if (rule.applicableDocTypes.length > 0 && documentType && !rule.applicableDocTypes.includes(documentType)) {
			continue
		}

		let match: RegExpExecArray | null
		const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)

		while ((match = pattern.exec(text)) !== null) {
			alerts.push({
				id: generateAlertId(),
				type: "registre_inadequat",
				severity: rule.severity,
				message: rule.message,
				context: {
					text: match[0],
					startOffset: match.index,
					endOffset: match.index + match[0].length,
					sentence: findSentence(text, match.index),
				},
				suggestion: rule.suggestion,
				rule: `registre_${match[0].toLowerCase().replace(/\s+/g, "_")}`,
			})
		}
	}

	return alerts
}

/**
 * Detect ambiguities
 */
export function detectAmbiguities(text: string): StyleAlert[] {
	const alerts: StyleAlert[] = []

	for (const rule of AMBIGUITY_PATTERNS) {
		let match: RegExpExecArray | null
		const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)

		while ((match = pattern.exec(text)) !== null) {
			alerts.push({
				id: generateAlertId(),
				type: "ambiguitat",
				severity: rule.severity,
				message: rule.message,
				context: {
					text: match[0],
					startOffset: match.index,
					endOffset: match.index + match[0].length,
					sentence: findSentence(text, match.index),
				},
				suggestion: rule.suggestion,
				rule: `ambiguitat_${match[0].substring(0, 20).replace(/\s+/g, "_")}`,
			})
		}
	}

	return alerts
}

// ============================================================================
// STYLE METRICS CALCULATION
// ============================================================================

/**
 * Split text into sentences
 */
export function splitSentences(text: string): string[] {
	return text
		.split(/[.!?]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

/**
 * Split text into words
 */
export function splitWords(text: string): string[] {
	return text
		.split(/\s+/)
		.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
		.filter((w) => w.length > 0)
}

/**
 * Detect passive voice patterns in Catalan
 */
export function countPassiveConstructions(text: string): number {
	// Catalan passive patterns: "és/són/va ser/han estat + participi"
	const passivePatterns = [
		/\b(és|són|va ser|van ser|ha estat|han estat|serà|seran|seria|serien)\s+\w+(at|ada|ats|ades|it|ida|its|ides|ut|uda|uts|udes)\b/gi,
		/\b(es|s')\s*\w+(a|en)\b/gi, // Pronominal passive: "es fa", "s'aprova"
	]

	let count = 0
	for (const pattern of passivePatterns) {
		const matches = text.match(pattern)
		if (matches) {
			count += matches.length
		}
	}

	return count
}

/**
 * Calculate lexical diversity (type-token ratio)
 */
export function calculateLexicalDiversity(words: string[]): number {
	if (words.length === 0) return 0

	const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
	return uniqueWords.size / words.length
}

/**
 * Calculate readability score adapted for Catalan
 * Uses a simplified Flesch-Szigriszt formula adaptation
 */
export function calculateReadabilityScore(sentences: string[], words: string[]): number {
	if (sentences.length === 0 || words.length === 0) return 0

	const avgSentenceLength = words.length / sentences.length
	const avgSyllables = estimateAverageSyllables(words)

	// Adapted Flesch formula for Catalan
	// Higher score = easier to read (0-100 scale)
	const score = 206.835 - 1.015 * avgSentenceLength - 62.3 * avgSyllables

	// Normalize to 0-100
	return Math.max(0, Math.min(100, score))
}

/**
 * Estimate average syllables per word (simplified for Catalan)
 */
function estimateAverageSyllables(words: string[]): number {
	if (words.length === 0) return 0

	let totalSyllables = 0

	for (const word of words) {
		// Count vowel groups as syllables (simplified)
		const vowelGroups = word.match(/[aeiouàèéíòóúïü]+/gi) || []
		totalSyllables += Math.max(1, vowelGroups.length)
	}

	return totalSyllables / words.length
}

/**
 * Determine syntactic complexity based on sentence structure
 */
export function determineSyntacticComplexity(sentences: string[]): SyntacticComplexity {
	if (sentences.length === 0) return "baixa"

	const avgLength = sentences.reduce((sum, s) => sum + splitWords(s).length, 0) / sentences.length

	// Count subordinate clauses indicators
	const subordinatePatterns = /\b(que|què|perquè|ja que|atès que|mentre|quan|si|on|com|encara que|tot i que|malgrat que)\b/gi
	const totalSubordinates = sentences.reduce((count, s) => {
		const matches = s.match(subordinatePatterns)
		return count + (matches ? matches.length : 0)
	}, 0)

	const avgSubordinates = totalSubordinates / sentences.length

	if (avgLength > 30 || avgSubordinates > 2) {
		return "alta"
	} else if (avgLength > 20 || avgSubordinates > 1) {
		return "mitjana"
	}

	return "baixa"
}

/**
 * Calculate all style metrics
 */
export function calculateStyleMetrics(text: string): StyleMetrics {
	const sentences = splitSentences(text)
	const words = splitWords(text)

	const sentenceCount = sentences.length
	const wordCount = words.length
	const averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0

	const passiveCount = countPassiveConstructions(text)
	const passiveVoicePercentage = sentenceCount > 0 ? (passiveCount / sentenceCount) * 100 : 0

	const lexicalDiversity = calculateLexicalDiversity(words)
	const syntacticComplexity = determineSyntacticComplexity(sentences)
	const readabilityScore = calculateReadabilityScore(sentences, words)

	return {
		averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
		passiveVoicePercentage: Math.round(passiveVoicePercentage * 10) / 10,
		lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
		syntacticComplexity,
		readabilityScore: Math.round(readabilityScore),
		sentenceCount,
		wordCount,
	}
}

/**
 * Generate alerts from style metrics
 */
export function generateMetricAlerts(metrics: StyleMetrics): StyleAlert[] {
	const alerts: StyleAlert[] = []

	// Long sentences alert
	if (metrics.averageSentenceLength > 40) {
		alerts.push({
			id: generateAlertId(),
			type: "frase_llarga",
			severity: "warning",
			message: `Longitud mitjana de frases excessiva: ${metrics.averageSentenceLength} paraules`,
			context: {
				text: `${metrics.averageSentenceLength} paraules/frase`,
				startOffset: 0,
				endOffset: 0,
				sentence: "Mètrica global del document",
			},
			suggestion: "L'objectiu és 15-25 paraules per frase. Considerar dividir frases llargues.",
			rule: "metric_sentence_length",
		})
	}

	// Excessive passive voice
	if (metrics.passiveVoicePercentage > 30) {
		alerts.push({
			id: generateAlertId(),
			type: "passiva_excessiva",
			severity: "warning",
			message: `Ús excessiu de veu passiva: ${metrics.passiveVoicePercentage}%`,
			context: {
				text: `${metrics.passiveVoicePercentage}% veu passiva`,
				startOffset: 0,
				endOffset: 0,
				sentence: "Mètrica global del document",
			},
			suggestion: "L'objectiu és menys del 20%. Considerar reformular amb veu activa.",
			rule: "metric_passive_voice",
		})
	}

	// Low lexical diversity
	if (metrics.lexicalDiversity < 0.3 && metrics.wordCount > 50) {
		alerts.push({
			id: generateAlertId(),
			type: "repeticio",
			severity: "info",
			message: `Diversitat lèxica baixa: ${metrics.lexicalDiversity}`,
			context: {
				text: `Ràtio type-token: ${metrics.lexicalDiversity}`,
				startOffset: 0,
				endOffset: 0,
				sentence: "Mètrica global del document",
			},
			suggestion: "Considerar variar el vocabulari per evitar repeticions excessives.",
			rule: "metric_lexical_diversity",
		})
	}

	return alerts
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Run all detection rules on text
 */
export function detectAllIssues(text: string, documentType?: DocumentType, targetAudience?: TargetAudience): StyleAlert[] {
	const allAlerts: StyleAlert[] = []

	// 1. Detect castellanismes
	allAlerts.push(...detectCastellanismes(text))

	// 2. Detect col·loquialismes
	allAlerts.push(...detectColloquialismes(text, documentType))

	// 3. Detect registre violations
	allAlerts.push(...detectRegistreViolations(text, documentType))

	// 4. Detect ambiguities
	allAlerts.push(...detectAmbiguities(text))

	// 5. Calculate metrics and generate metric-based alerts
	const metrics = calculateStyleMetrics(text)
	allAlerts.push(...generateMetricAlerts(metrics))

	// Sort by severity (error > warning > info)
	const severityOrder: Record<AlertSeverity, number> = { error: 0, warning: 1, info: 2 }
	allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

	return allAlerts
}

// ============================================================================
// HELPER
// ============================================================================

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
