import express from "express"
import { AppError } from "../utils/errors"
import { Language, getResponseLanguageNote } from "../utils/languagePrompts"
import { LotInfo, LotEvaluation, ComparisonRequest, ComparisonResult, ProposalComparison } from "../types"
import { getLLMServiceForModel, LLMService } from "../../../shared/LLMService"

const router = express.Router({ mergeParams: true })

/**
 * Compare proposals for a specific lot
 */
async function compareProposalsForLot(lotInfo: LotInfo, evaluatedProposals: LotEvaluation[], language: Language = "ca", llmService: LLMService): Promise<ProposalComparison> {
	console.log(`Starting comparison for lot ${lotInfo.lotNumber} with ${evaluatedProposals.length} proposals (language: ${language})`)
	const proposalEvaluations = evaluatedProposals.map((evaluacio) => {
		// Millor formatació amb informació d'empresa més rica
		const companyDisplay = evaluacio.companyName ? `EMPRESA: ${evaluacio.companyName}` : `DOCUMENT: ${evaluacio.proposalName}`

		return `
    === PROPOSTA: ${companyDisplay} ===
    INFORMACIÓ D'EMPRESA:
    - Nom identificat: ${evaluacio.companyName || "No identificat"}
    - Document original: ${evaluacio.proposalName}
    
    AVALUACIÓ INDIVIDUAL:
    ${evaluacio.criteria
			.map(
				(c) => `
      CRITERI: ${c.criterion}
      PUNTUACIÓ: ${c.score}
      JUSTIFICACIÓ: ${c.justification}
      PUNTS FORTS: ${c.strengths.join(", ")}
      MILLORES: ${c.improvements.join(", ")}
    `
			)
			.join("\n")}
    
    RESUM: ${evaluacio.summary}
    RECOMANACIÓ: ${evaluacio.recommendation}
  `
	})

	// Crear informació sobre identificació d'empreses per al context
	const companyIdentificationSummary = evaluatedProposals
		.map((prop) => {
			if (prop.companyName) {
				return `- ${prop.companyName}`
			} else {
				return `- Document "${prop.proposalName}"`
			}
		})
		.join("\n")

	const prompt = `
    Ets un expert en avaluació comparativa de licitacions públiques. Compara les següents ${evaluatedProposals.length} propostes per al lot "${lotInfo.title}" (Lot ${lotInfo.lotNumber}).

    ESTAT DE LA IDENTIFICACIÓ D'EMPRESES:
    ${companyIdentificationSummary}

    AVALUACIONS INDIVIDUALS PRÈVIES:
    ${proposalEvaluations.join("\n\n")}

    INSTRUCCIONS CRÍTIQUES:

    1. **COHERÈNCIA ABSOLUTA AMB AVALUACIONS INDIVIDUALS:**
       - Les puntuacions individuals són INALTERABLES
       - Si Proposta A té "COMPLEIX_EXITOSAMENT" i Proposta B té "REGULAR" en un criteri, A SEMPRE guanya
       - Si Proposta A té "REGULAR" i Proposta B té "INSUFICIENT", A SEMPRE guanya
       - Només quan les puntuacions són IGUALS cal analitzar els matisos

    2. **GESTIÓ DE LA IDENTIFICACIÓ D'EMPRESES:**
       - Quan mencionesles propostes, utilitza SEMPRE el nom de l'empresa quan estigui disponible
       - Si no es coneix l'empresa, indica-ho clarament amb frases com "la proposta de l'empresa no identificada" o "el document [nom]"
       - Sigues consistent en la identificació al llarg de tota la resposta
       - Considera la confiança de la identificació quan avaluïs la qualitat de la informació
       - NO inventis noms d'empresa si no estan identificats

    3. **COMPARACIÓ CRITERI PER CRITERI:**
       - Analitza cada criteri individualment
       - Identifica què destaca cada proposta dins del seu nivell de puntuació
       - Proporciona arguments específics per a cada proposta/empresa
       - Estableix un rànquing coherent amb les puntuacions

    4. **RÀNQUING GLOBAL:**
       - Calcula un rànquing global basant-te en:
         * Nombre de "COMPLEIX_EXITOSAMENT" (prioritat màxima)
         * Nombre de "REGULAR" (prioritat mitjana)
         * Nombre de "INSUFICIENT" (penalització)
         * Qualitat dels arguments dins de cada puntuació
       - El rànquing ha de ser coherent amb les puntuacions individuals
       - Pot haver-hi empats quan les puntuacions globals són similars

    5. **ARGUMENTS EQUILIBRATS:**
       - Destaca els punts forts de cada proposta/empresa
       - Sigues específic en els arguments comparatius
       - Proporciona raons objectives per al rànquing
       - Menciona quan una empresa no ha estat identificada per contextualitzar l'anàlisi

    ${getResponseLanguageNote(language)}

    FORMAT DE RESPOSTA (JSON):
    {
      "criteriaComparisons": [
        {
          "criterion": "Nom del criteri",
          "proposals": [
            {
              "proposalName": "Nom proposta/document 1",
              "companyName": "Nom empresa 1 o null",
              "score": "PUNTUACIÓ_ORIGINAL",
              "arguments": ["Argument específic 1", "Argument específic 2"],
              "position": 1
            },
            {
              "proposalName": "Nom proposta/document 2", 
              "companyName": "Nom empresa 2 o null",
              "score": "PUNTUACIÓ_ORIGINAL",
              "arguments": ["Argument específic 1", "Argument específic 2"],
              "position": 2
            }
          ]
        }
      ],
      "globalRanking": [
        {
          "proposalName": "Nom proposta/document",
          "companyName": "Nom empresa o null",
          "position": 1,
          "overallScore": "Excepcional|Molt bé|Notable|Millorable|Insuficient",
          "strengths": ["Punt fort principal 1", "Punt fort principal 2"],
          "weaknesses": ["Punt feble principal 1", "Punt feble principal 2"],
          "recommendation": "Recomanació específica per aquesta proposta/empresa, mencionant si l'empresa ha estat identificada o no"
        }
      ],
      "summary": "Resum executiu de la comparació amb recomanacions clares, mencionant les empreses quan sigui possible i notant quines no han estat identificades",
    }

    REGLES ESTRICTES:
    - MAI canviar les puntuacions individuals
    - El rànquing ha de ser matemàticament coherent amb les puntuacions
    - Proporciona arguments específics, no generals
    - Sigues objectiu però constructiu
    - Utilitza els noms d'empresa quan estiguin disponibles, i indica clarament quan no
    - Menciona la qualitat de la identificació d'empreses quan sigui rellevant
    - ${getResponseLanguageNote(language)}
  `

	try {
		console.log(`🔍 Comparing proposals for lot ${lotInfo.lotNumber} using LLMService...`)

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
			throw new Error("No comparison received")
		}

		const responseText = response.text
		const jsonMatch = responseText.match(/\{[\s\S]*\}/)
		if (!jsonMatch) {
			throw new Error("Could not extract JSON from response")
		}

		const comparison = JSON.parse(jsonMatch[0])

		return {
			lotNumber: lotInfo.lotNumber,
			lotTitle: lotInfo.title,
			proposalNames: evaluatedProposals.map((p) => p.proposalName),
			companyNames: evaluatedProposals.map((p) => p.companyName),
			criteriaComparisons: comparison.criteriaComparisons,
			globalRanking: comparison.globalRanking,
			summary: comparison.summary,
		}
	} catch (error) {
		console.error(`Error comparing proposals for lot ${lotInfo.lotNumber}:`, error)
		throw new Error("Failed to compare proposals")
	}
}

/**
 * POST endpoint to compare proposals
 * Accepts optional 'model' in request body to specify which LLM to use
 */
router.post("/", async (req: express.Request<{ lang?: string }>, res, next) => {
	try {
		console.log("=== COMPARE PROPOSALS DEBUG ===")
		console.log("Request params:", JSON.stringify(req.params))
		console.log("Request baseUrl:", req.baseUrl)
		console.log("==============================")

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

		const { specifications, lotInfo, evaluatedProposals }: ComparisonRequest = req.body

		console.log("Received comparison request:", {
			hasSpecifications: specifications && Array.isArray(specifications),
			specificationsLength: specifications?.length || 0,
			hasLotInfo: !!lotInfo,
			lotInfo: lotInfo,
			hasEvaluatedProposals: evaluatedProposals && Array.isArray(evaluatedProposals),
			evaluatedProposalsLength: evaluatedProposals?.length || 0,
			evaluatedProposals: evaluatedProposals?.map((p) => ({
				name: p.proposalName,
				company: p.companyName,
				lotNumber: p.lotNumber,
			})),
		})

		if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
			throw new AppError("Specification documents are required", 400)
		}

		if (!lotInfo) {
			throw new AppError("Lot information is required", 400)
		}

		if (!evaluatedProposals || !Array.isArray(evaluatedProposals) || evaluatedProposals.length < 2) {
			throw new AppError("At least 2 evaluated proposals are required", 400)
		}

		// Log informatiu sobre la identificació d'empreses
		const companiesIdentified = evaluatedProposals.filter((p) => p.companyName && p.companyName.trim().length > 0).length

		console.log(`🔍 Comparing ${evaluatedProposals.length} proposals for lot ${lotInfo.lotNumber} (language: ${lang})`)
		console.log(`🏢 Company identification: ${companiesIdentified}/${evaluatedProposals.length} enterprises identified`)

		const comparison = await compareProposalsForLot(lotInfo, evaluatedProposals, lang, llmService)

		const result: ComparisonResult = {
			comparison,
			timestamp: new Date().toISOString(),
		}

		console.log(`✅ Comparison completed for lot ${lotInfo.lotNumber}`)
		res.json(result)
	} catch (error) {
		next(error)
	}
})

export default router
