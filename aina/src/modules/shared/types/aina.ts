/**
 * Shared AINA types used across all frontend modules
 */

/** Available AINA modules that can make LLM calls */
export type AinaModule = "valoracio" | "elaboracio" | "kit"

/** Available LLM models */
export type LLMModel = "salamandra-7b-vertex" | "salamandra-ta-7b-local" | "gemini-2.5-flash" | "alia-40b-vertex"

/** Array of all available AINA modules */
export const AINA_MODULES: AinaModule[] = ["valoracio", "elaboracio", "kit"]

/** Array of all available LLM models */
export const LLM_MODELS: LLMModel[] = ["salamandra-7b-vertex", "salamandra-ta-7b-local", "gemini-2.5-flash", "alia-40b-vertex"]

/** Display names for AINA modules */
export const MODULE_LABELS: Record<AinaModule | "all", string> = {
	all: "Tots els mòduls",
	valoracio: "Valoració d'Ofertes",
	elaboracio: "Elaboració Decrets",
	kit: "Kit Lingüístic",
}

/** Display names for LLM models */
export const MODEL_LABELS: Record<LLMModel | "all", string> = {
	all: "Tots els models",
	"salamandra-7b-vertex": "Salamandra 7B Vertex AI",
	"salamandra-ta-7b-local": "SalamandraTA 7B Local",
	"gemini-2.5-flash": "Gemini 2.5 Flash",
	"alia-40b-vertex": "ALIA 40B Vertex AI",
}
