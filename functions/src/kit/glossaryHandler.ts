/**
 * Glossary Handler
 * Handles glossary management including CSV import, CRUD operations, and Firestore interactions
 */

import * as logger from "firebase-functions/logger"
import { HttpsError } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Firestore and Storage references
const db = admin.firestore()
const storage = admin.storage()

// Constants
export const GLOSSARY_COLLECTION = "glossary"
export const GLOSSARY_STORAGE_PATH = "glossary/imports"
export const VECTORIZATION_COLLECTION = "system_config"
export const VECTORIZATION_DOC = "vectorization_status"

// Types
export interface GlossaryTerm {
	id: string
	terme_recomanat: string
	variants_no_normatives: string[]
	context_d_us: string
	exemples_correctes: string[]
	exemples_incorrectes: string[]
	notes_linguistiques: string
	categoria: string
	ambit: string
	prioritat: string
	font: string
	createdAt: Date
	updatedAt: Date
}

export interface CSVRow {
	ID?: string
	"Terme recomanat"?: string
	Categoria?: string
	"Terme no normatiu o inadequat"?: string
	Àmbit?: string
	"context d'ús"?: string
	"Comentari/notes lingüístiques"?: string
	Font?: string
	"Exemple 1"?: string
	"Exemple 2"?: string
	"Exemple 3"?: string
	"Exemple incorrecte 1"?: string
	"Exemple incorrecte 2"?: string
}

export interface VectorizationStatus {
	status: "pending" | "processing" | "completed" | "failed"
	lastVectorization: Date | null
	lastGlossaryUpdate: Date | null
	glossaryEntries: number
	vectorizedEntries: number
	embeddingModel: string
	vectorDimensions: number
	indexType: string
	processingTime: string | null
	indexSize: string | null
	error: string | null
	triggeredBy: string | null
}

/**
 * Parse CSV content into rows
 * Properly handles:
 * - Quoted fields with semicolons inside
 * - Multi-line content within quoted fields
 * - Escaped quotes (doubled quotes "" inside quoted fields)
 * Based on RFC 4180 with semicolon as delimiter
 */
export function parseCSV(content: string): CSVRow[] {
	const rawRows: string[][] = []
	const delimiter = ";"

	// State machine for parsing
	let currentRow: string[] = []
	let currentField = ""
	let inQuotes = false
	let i = 0

	while (i < content.length) {
		const char = content[i]
		const nextChar = content[i + 1]

		if (inQuotes) {
			if (char === '"') {
				if (nextChar === '"') {
					// Escaped quote ("") - add single quote and skip next
					currentField += '"'
					i += 2
					continue
				} else {
					// End of quoted field
					inQuotes = false
					i++
					continue
				}
			} else {
				// Regular character inside quotes (including newlines)
				currentField += char
				i++
				continue
			}
		} else {
			// Not in quotes
			if (char === '"') {
				// Start of quoted field
				inQuotes = true
				i++
				continue
			} else if (char === delimiter) {
				// End of field
				currentRow.push(currentField.trim())
				currentField = ""
				i++
				continue
			} else if (char === "\r" && nextChar === "\n") {
				// Windows line ending - end of row
				currentRow.push(currentField.trim())
				if (currentRow.some((cell) => cell.length > 0)) {
					rawRows.push([...currentRow])
				}
				currentRow = []
				currentField = ""
				i += 2
				continue
			} else if (char === "\n") {
				// Unix line ending - end of row
				currentRow.push(currentField.trim())
				if (currentRow.some((cell) => cell.length > 0)) {
					rawRows.push([...currentRow])
				}
				currentRow = []
				currentField = ""
				i++
				continue
			} else {
				// Regular character
				currentField += char
				i++
				continue
			}
		}
	}

	// Don't forget the last field/row
	if (currentField.length > 0 || currentRow.length > 0) {
		currentRow.push(currentField.trim())
		if (currentRow.some((cell) => cell.length > 0)) {
			rawRows.push(currentRow)
		}
	}

	if (rawRows.length < 2) return []

	// First row is headers
	const headers: string[] = rawRows[0]
	const dataRows: CSVRow[] = []

	for (let rowIdx = 1; rowIdx < rawRows.length; rowIdx++) {
		const values = rawRows[rowIdx]
		const row: Record<string, string> = {}

		headers.forEach((header: string, colIdx: number) => {
			row[header] = values[colIdx] || ""
		})

		dataRows.push(row as CSVRow)
	}

	return dataRows
}

/**
 * Map category from CSV to normalized enum value
 */
export function mapCategory(categoria: string): string {
	const categoryMap: Record<string, string> = {
		verb: "verb",
		nom: "nom",
		adjectiu: "adjectiu",
		adverbi: "adverbi",
		locució: "locució",
		expressió: "expressió",
	}
	return categoryMap[categoria?.toLowerCase()] || "altres"
}

/**
 * Map ambit from CSV to normalized enum value
 */
export function mapAmbit(ambit: string): string {
	const ambitLower = ambit?.toLowerCase().trim() || ""

	// Match exact values from CSV
	if (ambitLower === "administratiu genèric") return "administratiu genèric"
	if (ambitLower === "administratiu i judicial") return "administratiu i judicial"
	if (ambitLower === "urbanisme") return "urbanisme"

	// Fallback matching for partial matches
	if (ambitLower.includes("urbanisme")) return "urbanisme"
	if (ambitLower.includes("judicial")) return "administratiu i judicial"
	if (ambitLower.includes("administratiu")) return "administratiu genèric"

	// Default to administratiu genèric
	return "administratiu genèric"
}

/**
 * Convert CSV row to GlossaryTerm
 */
export function csvRowToGlossaryTerm(row: CSVRow): Partial<GlossaryTerm> | null {
	const termeRecomanat = row["Terme recomanat"]?.trim()
	if (!termeRecomanat) return null

	const termeIncorrecte = row["Terme no normatiu o inadequat"]?.trim() || ""
	const variants = termeIncorrecte
		? termeIncorrecte
				.split(",")
				.map((v) => v.trim())
				.filter(Boolean)
		: []

	const exemplesCorrectes = [row["Exemple 1"], row["Exemple 2"], row["Exemple 3"]].filter((e) => e && e.trim() && e !== "nan").map((e) => e!.trim())

	const exemplesIncorrectes = [row["Exemple incorrecte 1"], row["Exemple incorrecte 2"]].filter((e) => e && e.trim() && e !== "nan").map((e) => e!.trim())

	return {
		id: row.ID?.trim() || `term-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		terme_recomanat: termeRecomanat,
		variants_no_normatives: variants,
		context_d_us: row["context d'ús"]?.trim() || "",
		exemples_correctes: exemplesCorrectes,
		exemples_incorrectes: exemplesIncorrectes,
		notes_linguistiques: row["Comentari/notes lingüístiques"]?.trim() || "",
		categoria: mapCategory(row.Categoria || ""),
		ambit: mapAmbit(row.Àmbit || ""),
		prioritat: "mitjana", // Default priority
		font: row.Font?.trim() || "",
	}
}

/**
 * Import CSV content and save to Firestore
 */
export async function importGlossaryFromCSV(
	fileContent: string,
	fileName: string,
	userId: string,
	replaceExisting: boolean = false
): Promise<{
	success: boolean
	importedCount: number
	totalRows: number
	errors: string[]
	storagePath: string
}> {
	const requestId = `import_${Date.now()}`
	logger.info("[IMPORT-001] Starting importGlossaryFromCSV function", {
		requestId,
		fileName,
		replaceExisting,
		userId,
		fileContentLength: fileContent?.length || 0,
	})

	logger.info("[IMPORT-002] About to decode base64 content")
	// Decode base64 content
	const csvContent = Buffer.from(fileContent, "base64").toString("utf-8")
	logger.info("[IMPORT-003] Base64 decoded successfully", {
		csvContentLength: csvContent.length,
		firstChars: csvContent.substring(0, 100),
	})

	logger.info("[IMPORT-004] About to get storage bucket")
	// Store original file in Firebase Storage
	const bucket = storage.bucket()
	logger.info("[IMPORT-005] Got storage bucket", { bucketName: bucket.name })

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const storagePath = `${GLOSSARY_STORAGE_PATH}/${timestamp}_${fileName}`
	logger.info("[IMPORT-006] Generated storage path", { storagePath, timestamp })

	try {
		logger.info("[IMPORT-007] About to get file reference from bucket")
		const file = bucket.file(storagePath)
		logger.info("[IMPORT-008] Got file reference, about to save CSV to storage")

		await file.save(csvContent, {
			metadata: {
				contentType: "text/csv",
				metadata: {
					uploadedBy: userId,
					uploadedAt: new Date().toISOString(),
					originalFileName: fileName,
				},
			},
		})

		logger.info("[IMPORT-009] CSV file stored in Firebase Storage successfully", {
			requestId,
			storagePath,
		})
	} catch (error: any) {
		logger.error("[IMPORT-ERROR-STORAGE] Error storing CSV file", {
			error: error.message,
			errorCode: error.code,
			errorStack: error.stack,
		})
		throw new Error(`Storage permission denied or error: ${error.message}`)
	}

	logger.info("[IMPORT-010] About to parse CSV content")
	// Parse CSV
	const rows = parseCSV(csvContent)
	logger.info("[IMPORT-011] CSV parsed successfully", {
		requestId,
		rowCount: rows.length,
		firstRow: rows.length > 0 ? JSON.stringify(rows[0]) : "no rows",
	})

	logger.info("[IMPORT-012] About to convert rows to glossary terms")
	// Convert to glossary terms
	const terms: Partial<GlossaryTerm>[] = []
	const errors: string[] = []

	rows.forEach((row, index) => {
		try {
			const term = csvRowToGlossaryTerm(row)
			if (term) {
				terms.push(term)
			}
		} catch (err: any) {
			errors.push(`Row ${index + 2}: ${err.message}`)
		}
	})
	logger.info("[IMPORT-013] Converted rows to terms", {
		termsCount: terms.length,
		conversionErrors: errors.length,
	})

	// If replaceExisting, delete all existing terms first
	logger.info("[IMPORT-014] Checking replaceExisting flag", { replaceExisting })
	if (replaceExisting) {
		logger.info("[IMPORT-015] replaceExisting is TRUE, will delete existing terms")
		try {
			logger.info("[IMPORT-016] About to query existing glossary collection", {
				collection: GLOSSARY_COLLECTION,
			})
			const snapshot = await db.collection(GLOSSARY_COLLECTION).get()
			logger.info("[IMPORT-017] Got existing glossary snapshot", {
				isEmpty: snapshot.empty,
				size: snapshot.size,
			})

			if (!snapshot.empty) {
				logger.info("[IMPORT-018] Snapshot not empty, will delete in batches of 400", {
					docsToDelete: snapshot.size,
				})

				// Delete in batches of 400 (Firestore limit is 500)
				const docs = snapshot.docs
				let deletedCount = 0

				for (let i = 0; i < docs.length; i += 400) {
					const batchDocs = docs.slice(i, i + 400)
					const batch = db.batch()

					logger.info(`[IMPORT-019] Creating delete batch ${Math.floor(i / 400) + 1}`, {
						batchSize: batchDocs.length,
						startIndex: i,
					})

					batchDocs.forEach((doc, idx) => {
						if (idx < 2) {
							logger.info(`[IMPORT-020] Adding doc to delete batch: ${doc.id}`)
						}
						batch.delete(doc.ref)
					})

					logger.info(`[IMPORT-021] About to commit delete batch ${Math.floor(i / 400) + 1}`, {
						batchSize: batchDocs.length,
					})
					await batch.commit()
					deletedCount += batchDocs.length
					logger.info(`[IMPORT-022] Delete batch ${Math.floor(i / 400) + 1} committed`, {
						batchSize: batchDocs.length,
						totalDeleted: deletedCount,
					})
				}

				logger.info("[IMPORT-022-DONE] All delete batches committed successfully", {
					requestId,
					deletedCount: deletedCount,
				})
			} else {
				logger.info("[IMPORT-023] No existing terms to delete (snapshot empty)")
			}
		} catch (error: any) {
			logger.error("[IMPORT-ERROR-DELETE] Error deleting existing glossary terms", {
				error: error.message,
				errorCode: error.code,
				errorDetails: error.details,
				errorStack: error.stack,
				collection: GLOSSARY_COLLECTION,
			})
			throw new Error(`Firestore delete permission denied or error: ${error.message}`)
		}
	} else {
		logger.info("[IMPORT-024] replaceExisting is FALSE, skipping deletion")
	}

	logger.info("[IMPORT-025] About to write terms to Firestore in batches")
	// Write terms to Firestore in batches (max 500 per batch)
	const now = new Date()
	let importedCount = 0

	try {
		logger.info("[IMPORT-026] Starting batch write loop", { totalTerms: terms.length })
		for (let i = 0; i < terms.length; i += 400) {
			logger.info(`[IMPORT-027] Creating batch ${Math.floor(i / 400) + 1}`, {
				startIndex: i,
				endIndex: Math.min(i + 400, terms.length),
			})
			const batch = db.batch()
			const batchTerms = terms.slice(i, i + 400)

			logger.info(`[IMPORT-028] Adding ${batchTerms.length} terms to batch`)
			batchTerms.forEach((term, idx) => {
				// Ensure ID is present
				const termId = term.id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
				const docRef = db.collection(GLOSSARY_COLLECTION).doc(termId)
				if (idx < 2) {
					logger.info(`[IMPORT-029] Adding term to batch: ${termId}`)
				}
				batch.set(docRef, {
					...term,
					id: termId,
					createdAt: now,
					updatedAt: now,
				})
			})

			logger.info(`[IMPORT-030] About to commit batch ${Math.floor(i / 400) + 1}`)
			await batch.commit()
			importedCount += batchTerms.length
			logger.info(`[IMPORT-031] Batch ${Math.floor(i / 400) + 1} committed successfully`, {
				count: batchTerms.length,
				totalImported: importedCount,
			})
		}
	} catch (error: any) {
		logger.error("[IMPORT-ERROR-WRITE] Error writing glossary terms to Firestore", {
			error: error.message,
			errorCode: error.code,
			errorDetails: error.details,
			errorStack: error.stack,
			importedSoFar: importedCount,
		})
		throw new Error(`Firestore write permission denied or error: ${error.message}`)
	}

	logger.info("[IMPORT-032] Glossary import completed successfully", {
		requestId,
		importedCount,
		errorCount: errors.length,
	})

	return {
		success: true,
		importedCount,
		totalRows: rows.length,
		errors: errors.length > 0 ? errors.slice(0, 10) : [],
		storagePath,
	}
}

/**
 * Fetch all glossary terms from Firestore
 */
export async function fetchGlossaryTerms(): Promise<{
	success: boolean
	terms: any[]
	count: number
}> {
	const snapshot = await db.collection(GLOSSARY_COLLECTION).orderBy("terme_recomanat").get()

	const terms = snapshot.docs.map((doc) => {
		const data = doc.data()
		return {
			...data,
			id: doc.id,
			createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
			updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
		}
	})

	logger.info("Glossary terms fetched", { count: terms.length })

	return {
		success: true,
		terms,
		count: terms.length,
	}
}

/**
 * Save or update a single glossary term
 */
export async function saveGlossaryTermToFirestore(
	term: Partial<GlossaryTerm>,
	userId: string
): Promise<{
	success: boolean
	term: any
}> {
	if (!term || !term.terme_recomanat) {
		throw new HttpsError("invalid-argument", "Term with terme_recomanat is required")
	}

	const termId = term.id || `term-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

	logger.info("Saving glossary term", { termId, userId })

	const now = new Date()
	const docRef = db.collection(GLOSSARY_COLLECTION).doc(termId)
	const existingDoc = await docRef.get()

	const termData = {
		...term,
		id: termId,
		updatedAt: now,
		createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : now,
	}

	await docRef.set(termData)

	logger.info("Glossary term saved", { termId })

	return {
		success: true,
		term: {
			...termData,
			createdAt: termData.createdAt instanceof Date ? termData.createdAt.toISOString() : termData.createdAt,
			updatedAt: termData.updatedAt instanceof Date ? termData.updatedAt.toISOString() : termData.updatedAt,
		},
	}
}

/**
 * Delete a glossary term
 */
export async function deleteGlossaryTermFromFirestore(
	termId: string,
	userId: string
): Promise<{
	success: boolean
	termId: string
}> {
	if (!termId) {
		throw new HttpsError("invalid-argument", "Term ID is required")
	}

	logger.info("Deleting glossary term", { termId, userId })

	await db.collection(GLOSSARY_COLLECTION).doc(termId).delete()

	logger.info("Glossary term deleted", { termId })

	return { success: true, termId }
}

/**
 * Get glossary import history from Storage
 */
export async function fetchGlossaryImportHistory(): Promise<{
	success: boolean
	history: any[]
}> {
	const bucket = storage.bucket()
	const [files] = await bucket.getFiles({ prefix: GLOSSARY_STORAGE_PATH })

	const history = await Promise.all(
		files.map(async (file) => {
			const [metadata] = await file.getMetadata()
			return {
				name: file.name,
				uploadedAt: (metadata.metadata?.uploadedAt as string) || metadata.timeCreated || new Date().toISOString(),
				uploadedBy: metadata.metadata?.uploadedBy as string | undefined,
				originalFileName: metadata.metadata?.originalFileName as string | undefined,
				size: metadata.size,
			}
		})
	)

	// Sort by upload date descending
	history.sort((a, b) => new Date(b.uploadedAt as string).getTime() - new Date(a.uploadedAt as string).getTime())

	return {
		success: true,
		history,
	}
}

/**
 * Get the current vectorization status
 */
export async function fetchVectorizationStatus(): Promise<{
	success: boolean
	status: any
}> {
	// Get vectorization status from Firestore
	const statusDoc = await db.collection(VECTORIZATION_COLLECTION).doc(VECTORIZATION_DOC).get()

	// Get glossary count
	const glossarySnapshot = await db.collection(GLOSSARY_COLLECTION).count().get()
	const glossaryCount = glossarySnapshot.data().count

	// Get last glossary update
	const lastUpdateQuery = await db.collection(GLOSSARY_COLLECTION).orderBy("updatedAt", "desc").limit(1).get()

	let lastGlossaryUpdate: Date | null = null
	if (!lastUpdateQuery.empty) {
		const lastDoc = lastUpdateQuery.docs[0].data()
		lastGlossaryUpdate = lastDoc.updatedAt?.toDate() || null
	}

	if (!statusDoc.exists) {
		// Return default status if no vectorization has been done
		return {
			success: true,
			status: {
				isVectorized: false,
				status: "pending",
				lastVectorization: null,
				lastGlossaryUpdate: lastGlossaryUpdate?.toISOString() || null,
				glossaryEntries: glossaryCount,
				vectorizedEntries: 0,
				embeddingModel: "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
				vectorDimensions: 768,
				indexType: "FAISS FlatIP",
				processingTime: null,
				indexSize: null,
				error: null,
			},
		}
	}

	const data = statusDoc.data() as VectorizationStatus

	// Handle Firestore Timestamp conversion
	let lastVectorizationISO: string | null = null
	if (data.lastVectorization) {
		const lastVec = data.lastVectorization as any
		if (typeof lastVec.toDate === "function") {
			lastVectorizationISO = lastVec.toDate().toISOString()
		} else if (lastVec instanceof Date) {
			lastVectorizationISO = lastVec.toISOString()
		} else if (typeof lastVec === "string") {
			lastVectorizationISO = lastVec
		}
	}

	return {
		success: true,
		status: {
			isVectorized: data.status === "completed",
			status: data.status,
			lastVectorization: lastVectorizationISO,
			lastGlossaryUpdate: lastGlossaryUpdate?.toISOString() || null,
			glossaryEntries: glossaryCount,
			vectorizedEntries: data.vectorizedEntries || 0,
			embeddingModel: data.embeddingModel || "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
			vectorDimensions: data.vectorDimensions || 768,
			indexType: data.indexType || "FAISS FlatIP",
			processingTime: data.processingTime || null,
			indexSize: data.indexSize || null,
			error: data.error || null,
		},
	}
}

/**
 * Trigger vectorization of the glossary
 * This calls the RAG service to rebuild the FAISS index from Firestore data
 */
export async function executeVectorization(
	userId: string,
	ragServiceUrl: string
): Promise<{
	success: boolean
	message: string
	glossaryEntries: number
	vectorizedEntries: number
	processingTime: string
}> {
	const startTime = new Date()

	logger.info("Vectorization triggered", { userId })

	// Update status to processing
	await db.collection(VECTORIZATION_COLLECTION).doc(VECTORIZATION_DOC).set(
		{
			status: "processing",
			startTime: FieldValue.serverTimestamp(),
			triggeredBy: userId,
			error: null,
		},
		{ merge: true }
	)

	// Get glossary count for the response
	const glossarySnapshot = await db.collection(GLOSSARY_COLLECTION).count().get()
	const glossaryCount = glossarySnapshot.data().count

	if (glossaryCount === 0) {
		await db.collection(VECTORIZATION_COLLECTION).doc(VECTORIZATION_DOC).set(
			{
				status: "failed",
				error: "No glossary entries found in Firestore",
				lastVectorization: FieldValue.serverTimestamp(),
			},
			{ merge: true }
		)
		throw new HttpsError("failed-precondition", "No glossary entries found to vectorize")
	}

	console.log(`Triggering vectorization for ${glossaryCount} glossary entries`)
	console.log(`RAG Service URL: ${ragServiceUrl}`)

	// Fetch all glossary terms from Firestore
	const glossaryDocs = await db.collection(GLOSSARY_COLLECTION).get()
	const glossaryTerms = glossaryDocs.docs.map((doc) => {
		const data = doc.data()
		return {
			id: doc.id,
			terme_recomanat: data.terme_recomanat || "",
			variants_no_normatives: data.variants_no_normatives || [],
			context_d_us: data.context_d_us || "",
			categoria: data.categoria || "",
			ambit: data.ambit || "",
			notes_linguistiques: data.notes_linguistiques || "",
			font: data.font || "",
			exemples_correctes: data.exemples_correctes || [],
			exemples_incorrectes: data.exemples_incorrectes || [],
		}
	})

	logger.info("Sending glossary to RAG service", { termCount: glossaryTerms.length })

	// Call the RAG service with glossary data
	const response = await fetch(`${ragServiceUrl}/vectorize`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			glossary: glossaryTerms,
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`RAG service error: ${response.status} - ${errorText}`)
	}

	const result = await response.json()

	// Calculate processing time
	const endTime = new Date()
	const processingTimeMs = endTime.getTime() - startTime.getTime()
	const processingTime = `${(processingTimeMs / 1000).toFixed(1)}s`

	// Update status with results
	await db
		.collection(VECTORIZATION_COLLECTION)
		.doc(VECTORIZATION_DOC)
		.set(
			{
				status: "completed",
				lastVectorization: FieldValue.serverTimestamp(),
				glossaryEntries: result.glossaryEntries || glossaryCount,
				vectorizedEntries: result.vectorizedEntries || glossaryCount,
				embeddingModel: result.embeddingModel || "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
				vectorDimensions: result.vectorDimensions || 768,
				indexType: result.indexType || "FAISS FlatIP",
				processingTime: result.processingTime || processingTime,
				indexSize: result.indexSize || null,
				error: null,
				triggeredBy: userId,
			},
			{ merge: true }
		)

	logger.info("Vectorization completed", {
		userId,
		glossaryEntries: result.glossaryEntries || glossaryCount,
		processingTime,
	})

	return {
		success: true,
		message: "Vectorization completed successfully",
		glossaryEntries: result.glossaryEntries || glossaryCount,
		vectorizedEntries: result.vectorizedEntries || glossaryCount,
		processingTime: result.processingTime || processingTime,
	}
}

/**
 * Handle vectorization failure
 */
export async function handleVectorizationFailure(errorMessage: string): Promise<void> {
	await db.collection(VECTORIZATION_COLLECTION).doc(VECTORIZATION_DOC).set(
		{
			status: "failed",
			error: errorMessage,
			lastVectorization: FieldValue.serverTimestamp(),
		},
		{ merge: true }
	)
}

/**
 * Build a hash table of non-normative variants from the glossary
 * Returns a Map where key = variant (lowercase), value = glossary term id and terme_recomanat
 * Also returns a stem map for fuzzy matching
 */
export async function buildVariantsHashTable(): Promise<{
	exact: Map<string, { id: string; terme_recomanat: string }>
	stems: Map<string, { id: string; terme_recomanat: string }>
}> {
	const exact = new Map<string, { id: string; terme_recomanat: string }>()
	const stems = new Map<string, { id: string; terme_recomanat: string }>()

	const glossaryDocs = await db.collection(GLOSSARY_COLLECTION).get()

	for (const doc of glossaryDocs.docs) {
		const data = doc.data()
		const termeRecomanat = data.terme_recomanat || ""
		const variants = data.variants_no_normatives || []

		// Add each variant to the hash table (lowercase for case-insensitive matching)
		for (const variant of variants) {
			if (variant && typeof variant === "string") {
				const normalizedVariant = variant.toLowerCase().trim()
				const entry = {
					id: doc.id,
					terme_recomanat: termeRecomanat,
				}

				exact.set(normalizedVariant, entry)

				// Also add stem for single words
				if (!normalizedVariant.includes(" ")) {
					const stem = getCatalanStem(normalizedVariant)
					// Only add to stem map if it's different from the original
					// and doesn't conflict (or we accept the conflict as a candidate)
					if (stem !== normalizedVariant) {
						stems.set(stem, entry)
					}
				}
			}
		}
	}

	logger.info("Hash tables built", { exactCount: exact.size, stemCount: stems.size })
	return { exact, stems }
}

/**
 * Simple Catalan stemmer to handle basic morphological variations
 * Used to match conjugated verbs to their infinitive forms in the glossary
 */
export function getCatalanStem(text: string): string {
	// Normalize and lowercase
	let stem = text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")

	// Don't stem short words or multi-word expressions
	if (stem.length < 4 || stem.includes(" ")) return stem

	// Common suffixes to strip (greedy approach)
	// Order matters: longest first to avoid partial matches
	const suffixes = [
		// Verb conjugations and complex suffixes
		"ment",
		"ssin",
		"ssis",
		"ssen",
		"sseu",
		"sses",
		"rien",
		"ries",
		"rieu",
		"riem",
		"ran",
		"rem",
		"reu",
		"ras",
		"ven",
		"ves",
		"vem",
		"veu",
		"vau",
		"van",
		"ren",
		"res",
		"reu",
		"ides",
		"ides",
		"ida",
		"its",
		"ades",
		"ats",
		"ada",
		"ant",
		"ent",
		// Infinitives
		"ar",
		"er",
		"ir",
		"re",
		// Simple endings
		"en",
		"an",
		"em",
		"am",
		"eu",
		"au",
		"es",
		"os",
		"as",
		"is",
		"ns",
		"rs",
		"a",
		"e",
		"o",
		"i",
		"s",
		"n",
		"r",
	]

	for (const suffix of suffixes) {
		if (stem.endsWith(suffix)) {
			const potential = stem.slice(0, -suffix.length)
			// Keep at least 3 characters to avoid over-stemming
			if (potential.length >= 3) {
				return potential
			}
		}
	}

	return stem
}
