/**
 * Glossary Service
 * Handles communication with Firebase functions for glossary management
 */

import { httpsCallable } from "firebase/functions"
import { functions } from "@/services/firebase"
import { GlossaryTerm, Category, Ambit, Priority } from "../types/glossary"

// Firebase function references
const importGlossaryCSVFn = httpsCallable<{ fileContent: string; fileName: string; replaceExisting?: boolean }, { success: boolean; importedCount: number; totalRows: number; errors: string[]; storagePath: string }>(
	functions,
	"importGlossaryCSV"
)

const getGlossaryTermsFn = httpsCallable<void, { success: boolean; terms: any[]; count: number }>(functions, "getGlossaryTerms")

const saveGlossaryTermFn = httpsCallable<{ term: Partial<GlossaryTerm> }, { success: boolean; term: any }>(functions, "saveGlossaryTerm")

const deleteGlossaryTermFn = httpsCallable<{ termId: string }, { success: boolean; termId: string }>(functions, "deleteGlossaryTerm")

/**
 * Convert API response to GlossaryTerm type
 */
function mapToGlossaryTerm(data: any): GlossaryTerm {
	return {
		id: data.id,
		terme_recomanat: data.terme_recomanat || "",
		variants_no_normatives: data.variants_no_normatives || [],
		context_d_us: data.context_d_us || "",
		exemples_correctes: data.exemples_correctes || [],
		exemples_incorrectes: data.exemples_incorrectes || [],
		notes_linguistiques: data.notes_linguistiques || "",
		categoria: (data.categoria as Category) || Category.ALTRES,
		ambit: (data.ambit as Ambit) || Ambit.ADMINISTRATIU_GENERIC,
		prioritat: (data.prioritat as Priority) || Priority.MITJANA,
		font: data.font || "",
		createdAt: new Date(data.createdAt),
		updatedAt: new Date(data.updatedAt),
	}
}

/**
 * Import a CSV file containing glossary terms
 * @param file The CSV file to import
 * @param replaceExisting If true, deletes all existing terms before import
 */
export async function importGlossaryCSV(
	file: File,
	replaceExisting: boolean = false
): Promise<{
	success: boolean
	importedCount: number
	totalRows: number
	errors: string[]
}> {
	// Read file as base64
	const fileContent = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result as string
			// Extract base64 content (remove data URL prefix if present)
			const base64 = result.includes(",") ? result.split(",")[1] : result
			resolve(base64)
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})

	const result = await importGlossaryCSVFn({
		fileContent,
		fileName: file.name,
		replaceExisting,
	})

	return result.data
}

/**
 * Fetch all glossary terms from Firestore
 */
export async function fetchGlossaryTerms(): Promise<GlossaryTerm[]> {
	const result = await getGlossaryTermsFn()
	return result.data.terms.map(mapToGlossaryTerm)
}

/**
 * Save a glossary term (create or update)
 */
export async function saveGlossaryTerm(term: Partial<GlossaryTerm>): Promise<GlossaryTerm> {
	// Prepare term for API (convert dates to ISO strings)
	const termData = {
		...term,
		createdAt: term.createdAt instanceof Date ? term.createdAt.toISOString() : term.createdAt,
		updatedAt: term.updatedAt instanceof Date ? term.updatedAt.toISOString() : term.updatedAt,
	}

	const result = await saveGlossaryTermFn({ term: termData as any })
	return mapToGlossaryTerm(result.data.term)
}

/**
 * Delete a glossary term
 */
export async function deleteGlossaryTermById(termId: string): Promise<boolean> {
	const result = await deleteGlossaryTermFn({ termId })
	return result.data.success
}

/**
 * Export terms to JSON format for download
 */
export function exportTermsToJSON(terms: GlossaryTerm[]): void {
	const dataStr = JSON.stringify(terms, null, 2)
	const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
	const exportFileDefaultName = `glossari-${new Date().toISOString().split("T")[0]}.json`

	const linkElement = document.createElement("a")
	linkElement.setAttribute("href", dataUri)
	linkElement.setAttribute("download", exportFileDefaultName)
	linkElement.click()
}

/**
 * Export terms to CSV format for download
 * Uses same format as termes.csv for compatibility
 */
export function exportTermsToCSV(terms: GlossaryTerm[]): void {
	const headers = [
		"ID",
		"Terme recomanat",
		"Categoria",
		"Terme no normatiu o inadequat",
		"Àmbit",
		"context d'ús",
		"Comentari/notes lingüístiques",
		"Font",
		"Exemple 1",
		"Exemple 2",
		"Exemple 3",
		"Exemple incorrecte 1",
		"Exemple incorrecte 2",
	]

	/**
	 * Escape a cell value for CSV:
	 * - Wrap in quotes if contains delimiter, quotes, or newlines
	 * - Double any internal quotes
	 */
	const escapeCSVCell = (value: string): string => {
		const str = String(value || "")
		// Check if the value needs quoting
		if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
			return `"${str.replace(/"/g, '""')}"`
		}
		return str
	}

	const rows = terms.map((term) => [
		term.id,
		term.terme_recomanat,
		term.categoria,
		term.variants_no_normatives?.join(", ") || "",
		term.ambit,
		term.context_d_us || "",
		term.notes_linguistiques || "",
		term.font || "",
		term.exemples_correctes?.[0] || "",
		term.exemples_correctes?.[1] || "",
		term.exemples_correctes?.[2] || "",
		term.exemples_incorrectes?.[0] || "",
		term.exemples_incorrectes?.[1] || "",
	])

	const csvContent = [headers.join(";"), ...rows.map((row) => row.map(escapeCSVCell).join(";"))].join("\n")

	// Add BOM for Excel UTF-8 compatibility
	const BOM = "\uFEFF"
	const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const exportFileDefaultName = `glossari-${new Date().toISOString().split("T")[0]}.csv`

	const linkElement = document.createElement("a")
	linkElement.setAttribute("href", url)
	linkElement.setAttribute("download", exportFileDefaultName)
	linkElement.click()

	URL.revokeObjectURL(url)
}
