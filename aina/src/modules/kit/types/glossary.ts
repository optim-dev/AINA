/**
 * Tipus per al Glossari Lingüístic AINA
 * Basat en plantilla_glossari_AINA.csv
 */

export interface GlossaryTerm {
	id: string
	terme_recomanat: string
	variants_no_normatives?: string[]
	context_d_us?: string
	exemples_correctes: string[]
	exemples_incorrectes: string[]
	notes_linguistiques?: string
	categoria: Category
	ambit: Ambit
	prioritat: Priority
	font?: string
	createdAt: Date
	updatedAt: Date
}

export enum Category {
	VERB = "verb",
	NOM = "nom",
	ADJECTIU = "adjectiu",
	ADVERBI = "adverbi",
	LOCUCION = "locució",
	EXPRESSIO = "expressió",
	ALTRES = "altres",
}

export enum Ambit {
	ADMINISTRATIU_GENERIC = "administratiu genèric",
	ADMINISTRATIU_JUDICIAL = "administratiu i judicial",
	URBANISME = "urbanisme",
	TECNIC = "tècnic",
	LEGAL = "legal",
	FINANCER = "financer",
	EDUCATIU = "educatiu",
}

export enum Priority {
	ALTA = "alta",
	MITJANA = "mitjana",
	BAIXA = "baixa",
}

export interface GlossaryFilters {
	searchTerm?: string
	categoria?: Category
	ambit?: Ambit
	prioritat?: Priority
}

export interface GlossaryStats {
	totalTerms: number
	termsByCategory: Record<Category, number>
	termsByAmbit: Record<Ambit, number>
	termsByPriority: Record<Priority, number>
	recentlyAdded: number
	recentlyUpdated: number
}
