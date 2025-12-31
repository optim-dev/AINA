import express from "express"
import { AppError } from "../utils/errors"
import { FileContent, LotInfo, LotExtractionRequest } from "../types"
import { getLLMServiceForModel, LLMService, ContextWindowExceededError } from "../../../shared/LLMService"
import { mapReduce } from "../../../shared/PromptChunking"

const router = express.Router({ mergeParams: true })

type Language = "ca" | "es" | "en"

function getPromptByLanguage(language: Language, specsContent: string): string {
	const prompts = {
		ca: `
    Ets un expert en anàlisi de licitacions públiques. Has de trobar TOTS els lots existents i els seus títols específics.

    DOCUMENTS D'ESPECIFICACIONS:
    ${specsContent}

    METODOLOGIA DE DETECCIÓ EXHAUSTIVA:

    1. BUSCA INDICADORS PRIMARIS DE LOTS:
       - "Lot", "Lote", "Lots", "Lotes" seguits de numeració (1, 2, A, B, I, II, etc.)
       - "Grup", "Grupo" amb numeració
       - "Apartado", "Apartat" amb numeració específica de lots
       - "Prestació", "Prestación" amb divisió en lots
       - "Paquet", "Paquete" amb numeració

    2. EXTRACCIÓ PRECISA DE TÍTOLS:
       Quan trobis una menció de lot, busca immediatament després:
       - El títol específic que segueix al número del lot
       - Descripcions que apareixen en la mateixa línia o paràgraf
       - Títols que apareixen en format: "Lot X: [TÍTOL ESPECÍFIC]"
       - Títols que apareixen com: "Lot X - [TÍTOL ESPECÍFIC]"
       - Títols en format taula o llista sota cada lot

    3. PATRONS DE CERCA ESPECÍFICS:
       - "Lot 1: Desenvolupament de plataforma web"
       - "Lote A - Serveis de consultoria IT"  
       - "Lot II. Manteniment d'infraestructures"
       - "Prestació 1: Auditoria de sistemes"
       - "Grup 1 - Formació especialitzada"

    4. CONTEXT D'IDENTIFICACIÓ:
       - Busca seccions dedicades a "divisió en lots"
       - Taules que mostren lots amb títols i pressupostos
       - Índex o sumari que llisti els lots
       - Referències a possibilitat de licitació per lots separats

    5. TÍTOLS ESPECÍFICS VS GENÈRICS:
       INCLOU (són títols vàlids de lots):
       - "Desenvolupament d'aplicació mòbil"
       - "Manteniment d'equipaments zona nord" 
       - "Consultoria en ciberseguretat"
       - "Subministrament d'ordinadors"
       - "Neteja d'edificis administratius"

       EXCLOU (NO són lots, són títols generals):
       - "Licitació per a la contractació de serveis"
       - "Procediment obert per a l'adjudicació"
       - "Contracte de serveis diversos"
       - Títols que no van precedits d'identificació de lot

    6. REGLES DE VALIDACIÓ:
       - Si trobes QUALSEVOL menció explícita de múltiples lots → busca TOTS els títols
       - Cada lot ha de tenir un identificador (número, lletra) i un títol descriptiu
       - Si només trobes "Lot 1" sense més lots → és lot únic
       - Si no trobes cap menció de lots → és lot únic

    7. CASOS ESPECIALS:
       - "Lot únic: [títol]" → 1 lot amb el títol específic
       - "Dividit en X lots:" → busca els X lots i els seus títols
       - "Possibilitat de licitació per lots" → busca els lots esmentats

    INSTRUCCIONS CRÍTIQUES:
    - EXTREU EL TÍTOL COMPLET de cada lot tal com apareix al document
    - NO omitir cap lot que tingui un títol específic
    - NO confondre títols de documents amb títols de lots
    - SI no trobes lots múltiples → retorna lot únic
    - SI trobes lots múltiples → retorna TOTS amb els seus títols reals

    FORMAT DE RESPOSTA (JSON):
    
    Per MÚLTIPLES LOTS:
    [
      {
        "lotNumber": 1,
        "title": "Títol específic del lot 1 tal com apareix al document",
        "description": "Descripció addicional si està disponible"
      },
      {
        "lotNumber": 2, 
        "title": "Títol específic del lot 2 tal com apareix al document",
        "description": "Descripció addicional si està disponible"
      }
    ]

    Per LOT ÚNIC:
    [
      {
        "lotNumber": 1,
        "title": "Lot Únic",
        "description": "Licitació amb un sol lot segons l'anàlisi del plec de condicions"
      }
    ]

    IMPORTANT: Respon NOMÉS amb el JSON. Cerca EXHAUSTIVAMENT tots els títols de lots existents.
  `,
		es: `
    Eres un experto en análisis de licitaciones públicas. Debes encontrar TODOS los lotes existentes y sus títulos específicos.

    DOCUMENTOS DE ESPECIFICACIONES:
    ${specsContent}

    METODOLOGÍA DE DETECCIÓN EXHAUSTIVA:

    1. BUSCA INDICADORES PRIMARIOS DE LOTES:
       - "Lote", "Lot", "Lotes", "Lots" seguidos de numeración (1, 2, A, B, I, II, etc.)
       - "Grupo" con numeración
       - "Apartado" con numeración específica de lotes
       - "Prestación" con división en lotes
       - "Paquete" con numeración

    2. EXTRACCIÓN PRECISA DE TÍTULOS:
       Cuando encuentres una mención de lote, busca inmediatamente después:
       - El título específico que sigue al número del lote
       - Descripciones que aparecen en la misma línea o párrafo
       - Títulos que aparecen en formato: "Lote X: [TÍTULO ESPECÍFICO]"
       - Títulos que aparecen como: "Lote X - [TÍTULO ESPECÍFICO]"
       - Títulos en formato tabla o lista bajo cada lote

    3. PATRONES DE BÚSQUEDA ESPECÍFICOS:
       - "Lote 1: Desarrollo de plataforma web"
       - "Lote A - Servicios de consultoría IT"  
       - "Lote II. Mantenimiento de infraestructuras"
       - "Prestación 1: Auditoría de sistemas"
       - "Grupo 1 - Formación especializada"

    4. CONTEXTO DE IDENTIFICACIÓN:
       - Busca secciones dedicadas a "división en lotes"
       - Tablas que muestran lotes con títulos y presupuestos
       - Índice o sumario que liste los lotes
       - Referencias a posibilidad de licitación por lotes separados

    5. TÍTULOS ESPECÍFICOS VS GENÉRICOS:
       INCLUYE (son títulos válidos de lotes):
       - "Desarrollo de aplicación móvil"
       - "Mantenimiento de equipamientos zona norte" 
       - "Consultoría en ciberseguridad"
       - "Suministro de ordenadores"
       - "Limpieza de edificios administrativos"

       EXCLUYE (NO son lotes, son títulos generales):
       - "Licitación para la contratación de servicios"
       - "Procedimiento abierto para la adjudicación"
       - "Contrato de servicios diversos"
       - Títulos que no van precedidos de identificación de lote

    6. REGLAS DE VALIDACIÓN:
       - Si encuentras CUALQUIER mención explícita de múltiples lotes → busca TODOS los títulos
       - Cada lote debe tener un identificador (número, letra) y un título descriptivo
       - Si solo encuentras "Lote 1" sin más lotes → es lote único
       - Si no encuentras ninguna mención de lotes → es lote único

    7. CASOS ESPECIALES:
       - "Lote único: [título]" → 1 lote con el título específico
       - "Dividido en X lotes:" → busca los X lotes y sus títulos
       - "Posibilidad de licitación por lotes" → busca los lotes mencionados

    INSTRUCCIONES CRÍTICAS:
    - EXTRAE EL TÍTULO COMPLETO de cada lote tal como aparece en el documento
    - NO omitir ningún lote que tenga un título específico
    - NO confundir títulos de documentos con títulos de lotes
    - SI no encuentras lotes múltiples → retorna lote único
    - SI encuentras lotes múltiples → retorna TODOS con sus títulos reales

    FORMATO DE RESPUESTA (JSON):
    
    Para MÚLTIPLES LOTES:
    [
      {
        "lotNumber": 1,
        "title": "Título específico del lote 1 tal como aparece en el documento",
        "description": "Descripción adicional si está disponible"
      },
      {
        "lotNumber": 2, 
        "title": "Título específico del lote 2 tal como aparece en el documento",
        "description": "Descripción adicional si está disponible"
      }
    ]

    Para LOTE ÚNICO:
    [
      {
        "lotNumber": 1,
        "title": "Lote Único",
        "description": "Licitación con un solo lote según el análisis del pliego de condiciones"
      }
    ]

    IMPORTANTE: Responde SOLO con el JSON. Busca EXHAUSTIVAMENTE todos los títulos de lotes existentes.
  `,
		en: `
    You are an expert in public procurement analysis. You must find ALL existing lots and their specific titles.

    SPECIFICATION DOCUMENTS:
    ${specsContent}

    EXHAUSTIVE DETECTION METHODOLOGY:

    1. SEARCH FOR PRIMARY LOT INDICATORS:
       - "Lot", "Lote", "Lots", "Lotes" followed by numbering (1, 2, A, B, I, II, etc.)
       - "Group", "Grupo" with numbering
       - "Section", "Apartado" with specific lot numbering
       - "Service", "Prestación" with lot division
       - "Package", "Paquete" with numbering

    2. PRECISE TITLE EXTRACTION:
       When you find a lot mention, search immediately after for:
       - The specific title following the lot number
       - Descriptions appearing on the same line or paragraph
       - Titles appearing in format: "Lot X: [SPECIFIC TITLE]"
       - Titles appearing as: "Lot X - [SPECIFIC TITLE]"
       - Titles in table or list format under each lot

    3. SPECIFIC SEARCH PATTERNS:
       - "Lot 1: Web platform development"
       - "Lot A - IT consulting services"  
       - "Lot II. Infrastructure maintenance"
       - "Service 1: Systems audit"
       - "Group 1 - Specialized training"

    4. IDENTIFICATION CONTEXT:
       - Search for sections dedicated to "lot division"
       - Tables showing lots with titles and budgets
       - Index or summary listing the lots
       - References to possibility of separate lot bidding

    5. SPECIFIC VS GENERIC TITLES:
       INCLUDE (valid lot titles):
       - "Mobile application development"
       - "North zone equipment maintenance" 
       - "Cybersecurity consulting"
       - "Computer supply"
       - "Administrative building cleaning"

       EXCLUDE (NOT lots, general titles):
       - "Tender for service contracting"
       - "Open procedure for award"
       - "Various services contract"
       - Titles not preceded by lot identification

    6. VALIDATION RULES:
       - If you find ANY explicit mention of multiple lots → search for ALL titles
       - Each lot must have an identifier (number, letter) and a descriptive title
       - If you only find "Lot 1" with no more lots → it's a single lot
       - If you find no lot mentions → it's a single lot

    7. SPECIAL CASES:
       - "Single lot: [title]" → 1 lot with specific title
       - "Divided into X lots:" → search for the X lots and their titles
       - "Possibility of lot-based bidding" → search for mentioned lots

    CRITICAL INSTRUCTIONS:
    - EXTRACT THE COMPLETE TITLE of each lot as it appears in the document
    - DO NOT omit any lot that has a specific title
    - DO NOT confuse document titles with lot titles
    - IF you don't find multiple lots → return single lot
    - IF you find multiple lots → return ALL with their real titles

    RESPONSE FORMAT (JSON):
    
    For MULTIPLE LOTS:
    [
      {
        "lotNumber": 1,
        "title": "Specific title of lot 1 as it appears in the document",
        "description": "Additional description if available"
      },
      {
        "lotNumber": 2, 
        "title": "Specific title of lot 2 as it appears in the document",
        "description": "Additional description if available"
      }
    ]

    For SINGLE LOT:
    [
      {
        "lotNumber": 1,
        "title": "Single Lot",
        "description": "Tender with a single lot according to specification analysis"
      }
    ]

    IMPORTANT: Respond ONLY with JSON. Search EXHAUSTIVELY for all existing lot titles.
  `,
	}

	return prompts[language]
}

async function extractLotsFromSpecifications(specifications: FileContent[], language: Language = "ca", llmService: LLMService): Promise<LotInfo[]> {
	const specsContent = specifications
		.map(
			(spec) => `
    === DOCUMENT: ${spec.name} ===
    ${spec.content}
  `
		)
		.join("\n\n")

	const prompt = getPromptByLanguage(language, specsContent)

	try {
		console.log("🔍 Performing exhaustive lots title extraction using LLMService...")

		const response = await llmService.callModel({
			prompt,
			module: "valoracio",
			jsonResponse: true,
			options: {
				temperature: 0.1,
				maxTokens: 4096,
			},
		})

		if (!response?.text) {
			throw new Error("No response received for lots extraction")
		}

		try {
			const cleanedResponse = response.text.replace(/```json\n?|\n?```/g, "").trim()
			const lots = response.json || JSON.parse(cleanedResponse)

			if (Array.isArray(lots) && lots.length > 0) {
				const processedLots = lots
					.map((lot, index) => {
						const lotNumber = lot.lotNumber || index + 1
						let title = lot.title || `Lot ${lotNumber}`

						title = title.trim()

						if (title.length < 5 && lots.length === 1) {
							title = "Lot Únic"
						}

						if (isInvalidLotTitle(title, lots.length)) {
							title = `Lot ${lotNumber}`
						}

						return {
							lotNumber,
							title,
							description: lot.description?.trim() || undefined,
						}
					})
					.filter((lot, index, array) => {
						return !isDuplicateLot(lot, array, index)
					})

				if (processedLots.length === 1 && processedLots[0].title === "Lot Únic") {
					console.log("📄 Single lot detected")
					return processedLots
				}

				if (processedLots.length > 1) {
					const hasSpecificTitles = processedLots.some((lot) => lot.title !== "Lot Únic" && lot.title !== `Lot ${lot.lotNumber}` && !isGenericLotTitle(lot.title))

					if (hasSpecificTitles) {
						console.log(`✅ Successfully extracted ${processedLots.length} lots with specific titles: ${processedLots.map((l) => `"${l.title}"`).join(", ")}`)
						return processedLots
					}
				}

				console.log("📄 No distinct multiple lots found, defaulting to single lot")
				return [
					{
						lotNumber: 1,
						title: "Lot Únic",
						description: "Licitació amb un sol lot segons l'anàlisi del plec de condicions",
					},
				]
			}
		} catch (parseError) {
			console.warn("Error parsing lots JSON, using fallback extraction:", parseError)

			const fallbackLots = extractLotsFromTextFallback(response.text)
			if (fallbackLots.length > 1) {
				console.log(`📝 Fallback extraction found ${fallbackLots.length} lots`)
				return fallbackLots
			}
		}

		console.log("📄 No multiple lots detected, defaulting to single lot")
		return [
			{
				lotNumber: 1,
				title: "Lot Únic",
				description: "Licitació amb un sol lot segons l'anàlisi automàtica",
			},
		]
	} catch (error) {
		// Handle context window exceeded error with map-reduce
		if (error instanceof ContextWindowExceededError) {
			console.log("⚠️  Context window exceeded, using map-reduce strategy...")
			console.log(`📊 Document size: ${error.promptTokens} tokens, limit: ${error.maxTokens} tokens`)

			try {
				// Use map-reduce to process document in chunks
				const mapInstruction = getPromptByLanguage(language, "CHUNK_CONTENT").replace("CHUNK_CONTENT", "{{CHUNK}}").replace("DOCUMENTS D'ESPECIFICACIONS:", "SECCIÓ DEL DOCUMENT:")

				const reduceInstruction = `
Combina tots els lots extrets de les diferents seccions del document.

REGLES DE COMBINACIÓ:
1. Elimina lots duplicats (mateix número i títol similar)
2. Si un lot apareix amb més detalls en una secció, usa aquesta versió
3. Mantén la numeració original dels lots
4. Si no hi ha lots múltiples identificats, retorna un sol lot únic

Retorna NOMÉS un array JSON amb els lots finals.
Format: [{"lotNumber": 1, "title": "...", "description": "..."}]
				`.trim()

				const result = await mapReduce(
					llmService,
					specsContent,
					{
						mapInstruction,
						reduceInstruction,
					}
					// Uses env var defaults for chunk size, strategy, and overlap
				)

				if (result.json && Array.isArray(result.json)) {
					const lots = result.json.map((lot: any, index: number) => ({
						lotNumber: lot.lotNumber || index + 1,
						title: (lot.title || `Lot ${lot.lotNumber || index + 1}`).trim(),
						description: lot.description?.trim() || undefined,
					}))

					console.log(`✅ Map-reduce extraction completed: ${lots.length} lot(s) identified`)
					return lots.length > 0
						? lots
						: [
								{
									lotNumber: 1,
									title: "Lot Únic",
									description: "Licitació amb un sol lot segons l'anàlisi automàtica per chunks",
								},
						  ]
				}
			} catch (mapReduceError) {
				console.error("Error in map-reduce extraction:", mapReduceError)
			}
		}

		console.error("Error extracting lots:", error)
		return [
			{
				lotNumber: 1,
				title: "Lot Únic",
				description: "Licitació amb un sol lot (error en l'anàlisi automàtica)",
			},
		]
	}
}

function extractLotsFromTextFallback(text: string): LotInfo[] {
	const lots: LotInfo[] = []
	const lines = text.split("\n")

	const lotPatterns = [
		/lot\s*(\d+|[a-z]|[ivx]+)[\s\-:\.]*([^"'\n]{10,80})/gi,
		/lote\s*(\d+|[a-z]|[ivx]+)[\s\-:\.]*([^"'\n]{10,80})/gi,
		/grup\s*(\d+|[a-z])[\s\-:\.]*([^"'\n]{10,80})/gi,
		/prestaci[oó]n?\s*(\d+|[a-z])[\s\-:\.]*([^"'\n]{10,80})/gi,
	]

	for (const line of lines) {
		const trimmed = line.trim()
		if (trimmed.length < 15 || trimmed.length > 150) continue

		for (const pattern of lotPatterns) {
			const matches = [...trimmed.matchAll(pattern)]
			matches.forEach((match) => {
				const lotId = match[1]?.trim()
				const title = match[2]?.trim()

				if (lotId && title && title.length > 10 && !isGenericLotTitle(title)) {
					const lotNumber = isNaN(parseInt(lotId)) ? lots.length + 1 : parseInt(lotId)

					lots.push({
						lotNumber,
						title: cleanLotTitle(title),
						description: undefined,
					})
				}
			})
		}

		if (lots.length >= 10) break
	}

	return lots.slice(0, 8)
}

function cleanLotTitle(title: string): string {
	return title
		.replace(/^[\s\-:\.]+|[\s\-:\.]+$/g, "")
		.replace(/["'"""'']/g, "")
		.replace(/\s{2,}/g, " ")
		.trim()
}

function isInvalidLotTitle(title: string, totalLots: number): boolean {
	if (totalLots === 1) return false

	const invalidPatterns = [/^licitaci[oó]n?\s+/i, /^contracte\s+/i, /^procediment\s+/i, /^expedient\s+/i, /^plec\s+de\s+/i, /^document\s+/i, /^objecte\s+del\s+contracte/i]

	return invalidPatterns.some((pattern) => pattern.test(title))
}

function isGenericLotTitle(title: string): boolean {
	const genericTerms = ["lot únic", "lote único", "lot general", "servei general", "prestació general", "contracte", "licitació", "procediment"]

	const lowerTitle = title.toLowerCase()
	return genericTerms.some((term) => lowerTitle === term || lowerTitle.startsWith(term + " ") || lowerTitle.endsWith(" " + term))
}

function isDuplicateLot(lot: LotInfo, allLots: LotInfo[], currentIndex: number): boolean {
	for (let i = 0; i < currentIndex; i++) {
		const otherLot = allLots[i]

		if (lot.title.toLowerCase().trim() === otherLot.title.toLowerCase().trim()) {
			return true
		}

		const similarity = calculateTitleSimilarity(lot.title, otherLot.title)
		if (similarity > 0.8) {
			return true
		}
	}

	return false
}

function calculateTitleSimilarity(title1: string, title2: string): number {
	const clean1 = title1
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.trim()
	const clean2 = title2
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.trim()

	if (clean1 === clean2) return 1

	const words1 = clean1.split(/\s+/)
	const words2 = clean2.split(/\s+/)

	const commonWords = words1.filter((word) => word.length > 2 && words2.includes(word)).length

	const totalUniqueWords = new Set([...words1, ...words2]).size

	return commonWords / totalUniqueWords
}

router.post("/", async (req: express.Request<{ lang?: string }>, res, next) => {
	try {
		console.log("=== EXTRACT LOTS DEBUG ===")
		console.log("Request params:", JSON.stringify(req.params))
		console.log("Request path:", req.path)
		console.log("Request baseUrl:", req.baseUrl)
		console.log("Request originalUrl:", req.originalUrl)
		console.log("=========================")

		// Get language from route parameters - check both params and baseUrl
		let lang: Language = "ca"

		if (req.params.lang && ["ca", "es", "en"].includes(req.params.lang)) {
			lang = req.params.lang as Language
		} else {
			// Try to extract from baseUrl if params doesn't have it
			const match = req.baseUrl.match(/\/(ca|es|en)\//)
			if (match && match[1]) {
				lang = match[1] as Language
			}
		}

		console.log(`Using language: ${lang}`)

		// Get model from request body or query string, default to gemini-2.5-flash
		const modelId = req.body.model || req.query.model || "gemini-2.5-flash"
		console.log(`Using LLM model: ${modelId}`)

		// Get LLM service for the selected model
		const llmService = getLLMServiceForModel(modelId as string)

		const { specifications }: LotExtractionRequest = req.body

		if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
			throw new AppError("Specification documents are required", 400)
		}

		console.log(`🚀 Starting exhaustive lots extraction with title detection (language: ${lang})...`)

		const extractedLots = await extractLotsFromSpecifications(specifications, lang, llmService)

		const lotsDescription = extractedLots.length > 1 ? `${extractedLots.length} lots` : "1 lot"

		console.log(`✅ Extraction completed: ${lotsDescription} identified`)

		extractedLots.forEach((lot, index) => {
			console.log(`📋 Lot ${lot.lotNumber}: "${lot.title}"${lot.description ? ` - ${lot.description}` : ""}`)
		})

		res.json(extractedLots)
	} catch (error) {
		next(error)
	}
})

export default router
