import express from "express"
import { AppError } from "../utils/errors"
import { Language, getResponseLanguageNote } from "../utils/languagePrompts"
import { FileContent, LotInfo, EvaluationCriteria, LotEvaluation, SingleLotEvaluationRequest, SingleLotEvaluationResult } from "../types"
import { getLLMServiceForModel, LLMService } from "../../../shared/LLMService"

const router = express.Router({ mergeParams: true })

interface EnhancedCriterion {
	name: string
	description: string
	requirements: string
	context: string
}

interface LotContext {
	lotSummary: string
	mainObjectives: string[]
	keyRequirements: string[]
	expectedDeliverables: string[]
}

interface ProposalEvaluationResult {
	companyName: string
	companyReasoning: string
	criteria: EvaluationCriteria[]
	summary: string
	recommendation: string
}

/**
 * Extract lot context and criteria
 */
async function extractLotContextAndCriteria(specifications: FileContent[], lot: LotInfo, language: Language = "ca", llmService: LLMService): Promise<{ context: LotContext; criteria: EnhancedCriterion[] }> {
	const specsContent = specifications
		.map(
			(spec) => `
    === DOCUMENT: ${spec.name} ===
    ${spec.content}
  `
		)
		.join("\n\n")

	const prompt = `
    Ets un expert en anàlisi de licitacions públiques. Extreu PRIMER el context complet del lot "${lot.title}" (Lot ${lot.lotNumber}) i DESPRÉS els criteris específics d'avaluació.

    DOCUMENTS D'ESPECIFICACIONS:
    ${specsContent}

    INFORMACIÓ DEL LOT:
    - Número: ${lot.lotNumber}
    - Títol: ${lot.title}
    ${lot.description ? `- Descripció: ${lot.description}` : ""}

    TASCA 1: EXTRACCIÓ DEL CONTEXT COMPLET DEL LOT

    Analitza tot el contingut relacionat amb aquest lot i proporciona:
    1. RESUM EXTENSO del lot: què és, què ha de fer l'adjudicatari, àmbit d'actuació
    2. OBJECTIUS PRINCIPALS: finalitats clau que ha d'assolir el lot
    3. REQUERIMENTS CLAU: elements obligatoris que ha de contenir qualsevol proposta
    4. DELIVERABLES ESPERATS: què ha de lliurar l'adjudicatari

    TASCA 2: EXTRACCIÓ DELS CRITERIS SUBJECTIUS

    Després d'entendre el context, extreu els criteris SUBJECTIUS d'avaluació amb:
    1. Nom específic del criteri
    2. Descripció detallada dins del context del lot
    3. Requisits per considerar que una proposta resol aquest criteri
    4. Context per determinar si s'està tractant adequadament

    CRITERIS DE QUALIFICACIÓ PER L'AVALUACIÓ POSTERIOR:
    - INSUFICIENT: Quan NO s'aborda el criteri o la proposta no té relació amb el lot
    - REGULAR: Quan s'intenta resoldre el criteri dins del context del lot (encara que millorable)
    - COMPLEIX_EXITOSAMENT: Quan es resol el criteri amb excel·lència i innovació

    FORMAT DE RESPOSTA (JSON estricte):
    {
      "context": {
        "lotSummary": "Descripció extensa del que consisteix aquest lot, què ha de fer l'adjudicatari, àmbit d'actuació, metodologia esperada, i context general complet",
        "mainObjectives": [
          "Objectiu principal 1 del lot",
          "Objectiu principal 2 del lot",
          "Objectiu principal 3 del lot"
        ],
        "keyRequirements": [
          "Requeriment obligatori 1 que ha de complir qualsevol proposta",
          "Requeriment obligatori 2 que ha de complir qualsevol proposta",
          "Requeriment obligatori 3 que ha de complir qualsevol proposta"
        ],
        "expectedDeliverables": [
          "Deliverable específic 1 que ha de lliurar l'adjudicatari",
          "Deliverable específic 2 que ha de lliurar l'adjudicatari",
          "Deliverable específic 3 que ha de lliurar l'adjudicatari"
        ]
      },
      "criteria": [
        {
          "name": "Nom específic del criteri d'avaluació",
          "description": "Descripció detallada del què avalua aquest criteri dins del context d'aquest lot específic",
          "requirements": "Què ha de contenir una proposta per considerar que està tractant aquest criteri adequadament",
          "context": "Informació addicional per determinar si una proposta està abordant aquest criteri o l'està ignorant completament"
        }
      ]
    }

    IMPORTANT: Màxim 8 criteris que cobreixin els aspectes més importants del lot. ${getResponseLanguageNote(language)}
  `

	try {
		console.log("🔍 Extracting context and criteria using LLMService...")

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
			throw new Error("No context and criteria received")
		}

		const result = response.json || JSON.parse(response.text)

		const context: LotContext = {
			lotSummary: result.context?.lotSummary || "Resum no disponible",
			mainObjectives: result.context?.mainObjectives || [],
			keyRequirements: result.context?.keyRequirements || [],
			expectedDeliverables: result.context?.expectedDeliverables || [],
		}

		const criteria: EnhancedCriterion[] = Array.isArray(result.criteria)
			? result.criteria.slice(0, 8).map((criterion: any) => ({
					name: criterion.name || "Criteri sense nom",
					description: criterion.description || "Descripció no disponible",
					requirements: criterion.requirements || "Requisits no especificats",
					context: criterion.context || "Context no disponible",
			  }))
			: []

		return { context, criteria }
	} catch (error) {
		console.error(`Error extracting context and criteria for lot ${lot.lotNumber}:`, error)
		throw new Error("Failed to extract lot context and criteria")
	}
}

/**
 * Evaluate proposal with company extraction
 */
async function evaluateProposalWithCompanyExtraction(
	lotContext: LotContext,
	enhancedCriteria: EnhancedCriterion[],
	lot: LotInfo,
	proposalContent: string,
	proposalName: string,
	language: Language = "ca",
	llmService: LLMService
): Promise<ProposalEvaluationResult> {
	const contextDescription = `
    RESUM COMPLET DEL LOT:
    ${lotContext.lotSummary}

    OBJECTIUS PRINCIPALS:
    ${lotContext.mainObjectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}

    REQUERIMENTS CLAU:
    ${lotContext.keyRequirements.map((req, i) => `${i + 1}. ${req}`).join("\n")}

    DELIVERABLES ESPERATS:
    ${lotContext.expectedDeliverables.map((del, i) => `${i + 1}. ${del}`).join("\n")}
  `

	const criteriaDescription = enhancedCriteria
		.map(
			(criterion, index) => `
    CRITERI ${index + 1}: ${criterion.name}
    DESCRIPCIÓ: ${criterion.description}
    REQUISITS PER APROVAR: ${criterion.requirements}
    CONTEXT D'AVALUACIÓ: ${criterion.context}
  `
		)
		.join("\n")

	const prompt = `
    Ets un avaluador expert de licitacions amb criteris equilibrats però rigorosos.

    CONTEXT COMPLET DEL LOT "${lot.title}" (Lot ${lot.lotNumber}):
    ${contextDescription}

    PROPOSTA A AVALUAR:
    Document: ${proposalName}
    Contingut: ${proposalContent}

    CRITERIS D'AVALUACIÓ:
    ${criteriaDescription}

    METODOLOGIA D'AVALUACIÓ EN 3 PASSOS:

    PAS 1 - VERIFICACIÓ DE COHERÈNCIA GENERAL:
    Determina si aquesta proposta està dirigida a aquest lot específic:
    - Parla dels mateixos serveis/objectius que el lot?
    - Fa referència a elements del context del lot?
    - L'enfoc general és coherent amb els requeriments?

    SI LA PROPOSTA NO ÉS COHERENT AMB EL LOT:
    → TOTS els criteris "INSUFICIENT" (proposta inadequada)

    SI LA PROPOSTA ÉS COHERENT AMB EL LOT:
    → Continua amb l'avaluació criteri per criteri

    PAS 2 - EXTRACCIÓ DE L'EMPRESA:
    1. Busca la raó social completa i exacta
    2. Identifica formes jurídiques (S.L., S.A., etc.)
    3. Si no trobes → "Empresa no identificada"
    4. Avalua confiança de la identificació

    PAS 3 - AVALUACIÓ CRITERI PER CRITERI (només si proposta coherent):

    Per cada criteri aplica aquestes regles PRECISES sobre EXPLICITESA:

    → INSUFICIENT (puntuació 1):
      - El criteri NO s'aborda EXPLÍCITAMENT a la proposta
      - Es menciona de passada però sense desenvolupament específic
      - No hi ha una secció, apartat o explicació dedicada al criteri
      - El tractament és superficial o genèric sense especificitat

    → REGULAR (puntuació 2): 
      - El criteri es tracta de forma EXPLÍCITA i específica
      - Hi ha una secció o apartat que aborda directament el criteri
      - Es desenvolupa de manera acceptable, sigui bé o regular
      - La proposta mostra que entén i resol el criteri concret

    → COMPLEIX_EXITOSAMENT (puntuació 3):
      - Tracta el criteri EXPLÍCITAMENT i amb excel·lència excepcional
      - Desenvolupament en profunditat amb innovació o valor afegit
      - Demostra expertesa superior i creativitat
      - Supera clarament les expectatives amb solucions avançades

    REGLES CLAU D'EXPLICITESA:
    - Ha de tractar-se el criteri de forma EXPLÍCITA i específica per aprovar
    - Simple menció o tractament genèric → INSUFICIENT
    - Tractament explícit acceptable → mínim REGULAR
    - Només excel·lència excepcional → COMPLEIX_EXITOSAMENT
    - Sigues rigorós amb l'explicitesa però just quan es compleix

    FORMAT DE RESPOSTA (JSON):
    {
      "companyName": "Nom exacte de l'empresa o 'Empresa no identificada'",
      "companyReasoning": "Explicació de la identificació",
      "criteria": [
        {
          "criterion": "Nom del criteri",
          "score": "INSUFICIENT|REGULAR|COMPLEIX_EXITOSAMENT",
          "justification": "Explicació precisa: si el criteri es tracta EXPLÍCITAMENT a la proposta, com es desenvolupa, i per què mereix aquesta puntuació específica basada en l'explicitesa del tractament",
          "strengths": ["Punt fort 1", "Punt fort 2"],
          "improvements": ["Millora 1", "Millora 2"],
          "references": ["Referència del text 1", "Referència 2"]
        }
      ],
      "summary": "Resum precís: coherència general amb el lot i quants criteris es tracten EXPLÍCITAMENT vs quants no s'aborden adequadament",
      "recommendation": "Recomanació basada en l'explicitesa: si la proposta tracta explícitament els criteris requerits i com compleix amb els requeriments del lot",
    }

    PRINCIPIS FONAMENTALS:
    - Requereix EXPLICITESA: cada criteri ha de tractar-se de forma específica i dedicada
    - INSUFICIENT si no es tracta explícitament, independentment de la coherència general
    - REGULAR si es tracta explícitament de manera acceptable (bé o regular)
    - COMPLEIX_EXITOSAMENT només per excel·lència excepcional
    - Sigues rigorós amb l'explicitesa però just quan es compleix
    - ${getResponseLanguageNote(language)}
  `

	try {
		console.log(`🔍 Evaluating proposal "${proposalName}" using LLMService...`)

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
			throw new Error("No evaluation received")
		}

		const responseText = response.text
		const jsonMatch = responseText.match(/\{[\s\S]*\}/)
		if (!jsonMatch) {
			throw new Error("Could not extract JSON from response")
		}

		const evaluation = JSON.parse(jsonMatch[0])

		return {
			companyName: evaluation.companyName || "Empresa no identificada",
			companyReasoning: evaluation.companyReasoning || "No s'ha proporcionat raonament",
			criteria: evaluation.criteria || [],
			summary: evaluation.summary || "Resum no disponible",
			recommendation: evaluation.recommendation || "Recomanació no disponible",
		}
	} catch (error) {
		console.error(`Error evaluating proposal "${proposalName}" for lot ${lot.lotNumber}:`, error)
		throw new Error(`Failed to evaluate proposal: ${proposalName}`)
	}
}

function groupProposalsByName(proposals: FileContent[]): Map<string, FileContent[]> {
	const grouped = new Map<string, FileContent[]>()

	proposals.forEach((proposal) => {
		const baseName = proposal.name.replace(/\s*\(.*?\)\s*/g, "").trim()

		if (!grouped.has(baseName)) {
			grouped.set(baseName, [])
		}
		grouped.get(baseName)!.push(proposal)
	})

	return grouped
}

/**
 * POST endpoint to evaluate a single lot
 * Accepts optional 'model' in request body to specify which LLM to use
 */
router.post("/", async (req: express.Request<{ lang?: string }>, res, next) => {
	try {
		console.log("=== EVALUATE LOT DEBUG ===")
		console.log("Request params:", JSON.stringify(req.params))
		console.log("Request baseUrl:", req.baseUrl)
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

		const { specifications, proposals, lotInfo }: SingleLotEvaluationRequest = req.body

		if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
			throw new AppError("Specification documents are required", 400)
		}

		if (!proposals || !Array.isArray(proposals)) {
			throw new AppError("Proposals array is required", 400)
		}

		if (!lotInfo) {
			throw new AppError("Lot information is required", 400)
		}

		console.log(`🚀 Starting precise evaluation for lot ${lotInfo.lotNumber}: ${lotInfo.title} (language: ${lang})`)

		console.log(`🔍 Extracting context and criteria for lot ${lotInfo.lotNumber}...`)
		const { context: lotContext, criteria: enhancedCriteria } = await extractLotContextAndCriteria(specifications, lotInfo, lang, llmService)

		if (enhancedCriteria.length === 0) {
			throw new AppError(`No criteria found for lot ${lotInfo.lotNumber}`, 400)
		}

		console.log(`📊 Found ${enhancedCriteria.length} criteria for lot ${lotInfo.lotNumber}`)
		console.log(`📝 Lot context: ${lotContext.mainObjectives.length} objectives, ${lotContext.keyRequirements.length} requirements`)

		const groupedProposals = groupProposalsByName(proposals)
		const lotEvaluations: LotEvaluation[] = []

		if (groupedProposals.size === 0) {
			lotEvaluations.push({
				lotNumber: lotInfo.lotNumber,
				lotTitle: lotInfo.title,
				proposalName: "",
				companyName: null,
				hasProposal: false,
				criteria: [],
				summary: `No s'ha presentat proposta per al lot ${lotInfo.lotNumber}`,
				recommendation: "Aquest lot no ha rebut cap proposta. Cal considerar relicitar aquest lot específic.",
			})
		} else {
			for (const [proposalName, proposalFiles] of groupedProposals) {
				console.log(`📋 Precise evaluation of proposal "${proposalName}" for lot ${lotInfo.lotNumber}`)

				const proposalContent = proposalFiles.map((p) => `=== ${p.name} ===\n${p.content}`).join("\n\n")

				const evaluation = await evaluateProposalWithCompanyExtraction(lotContext, enhancedCriteria, lotInfo, proposalContent, proposalName, lang, llmService)

				const scoreDistribution = {
					insuficient: evaluation.criteria.filter((c) => c.score === "INSUFICIENT").length,
					regular: evaluation.criteria.filter((c) => c.score === "REGULAR").length,
					exitosos: evaluation.criteria.filter((c) => c.score === "COMPLEIX_EXITOSAMENT").length,
				}

				console.log(`🏢 Evaluation completed for "${proposalName}": ${scoreDistribution.exitosos} excellent, ${scoreDistribution.regular} regular, ${scoreDistribution.insuficient} insufficient`)

				lotEvaluations.push({
					lotNumber: lotInfo.lotNumber,
					lotTitle: lotInfo.title,
					proposalName,
					companyName: evaluation.companyName === "Empresa no identificada" ? null : evaluation.companyName,
					hasProposal: true,
					criteria: evaluation.criteria,
					summary: evaluation.summary,
					recommendation: evaluation.recommendation,
				})
			}
		}

		const result: SingleLotEvaluationResult = {
			lotNumber: lotInfo.lotNumber,
			lotTitle: lotInfo.title,
			evaluations: lotEvaluations,
			extractedCriteria: enhancedCriteria.length,
			processingTime: Date.now(),
		}

		console.log(`✅ Lot ${lotInfo.lotNumber} precise evaluation completed successfully`)
		res.json(result)
	} catch (error) {
		next(error)
	}
})

export default router
