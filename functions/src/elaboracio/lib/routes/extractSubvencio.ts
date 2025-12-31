import { genkit, z } from "genkit"
import { vertexAI } from "@genkit-ai/vertexai"
import { onCallGenkit } from "firebase-functions/https"
import { enableFirebaseTelemetry } from "@genkit-ai/firebase"
import * as admin from "firebase-admin"
import * as logger from "firebase-functions/logger"

// Enable Firebase telemetry
enableFirebaseTelemetry()

// Firebase Admin is initialized in the main index.ts
const storage = admin.storage()
export const model = vertexAI.model("gemini-2.5-flash")

// Initialize Genkit with Vertex AI
const ai = genkit({
	plugins: [vertexAI({ location: "europe-west4" })],
})

// Define the subvencio data schema
// const SubvencioDataSchema = z.object({
// 	subvencio: z.object({
// 		centre_gestor: z.string(),
// 		titol_projecte_actuacio: z.string(),
// 		any_execucio_actuacions: z.string(),
// 		import_solicitat_eur: z.number(),
// 		municipi_realitzacio: z.string(),
// 	}),
// 	ens_public: z.object({
// 		nom_ens_local: z.string(),
// 		localitat: z.string(),
// 		cif_nif: z.string(),
// 		telefon_notificacions: z.string(),
// 		email_notificacions: z.string(),
// 		representant_legal: z.object({
// 			nom_cognoms: z.string(),
// 			carrec: z.string(),
// 		}),
// 		contacte_tecnic: z.object({
// 			nom_cognoms: z.string(),
// 			carrec: z.string(),
// 			email: z.string(),
// 			telefon: z.string(),
// 		}),
// 	}),
// 	modalitat_execucio: z.object({
// 		ens_public_solicitant: z.string(),
// 		ens_instrumental: z.object({
// 			te_ens_instrumental: z.boolean(),
// 			nom_rao_social: z.string(),
// 			cif_nif: z.string(),
// 		}),
// 	}),
// 	documentacio_adjunta: z.object({
// 		memoria_actuacio_annex1: z.boolean(),
// 		pressupost_annex2: z.boolean(),
// 		declaracio_responsable_requisits_annex3: z.boolean(),
// 		declaracio_responsable_proteccio_menors_annex4: z.boolean(),
// 		justificacio_excepcionalitat_annex5: z.boolean(),
// 		altra_documentacio: z.object({
// 			hi_ha_altra_documentacio: z.boolean(),
// 			llista: z.array(z.string()),
// 		}),
// 	}),
// 	destinacio_final_subvencio: z.object({
// 		existeix_transferencia_a_tercers: z.boolean(),
// 		beneficiaris: z.array(
// 			z.object({
// 				nom_ens: z.string(),
// 				nif_ens: z.string(),
// 				domicili_ens: z.string(),
// 				import_eur: z.number(),
// 			})
// 		),
// 	}),
// 	memoria_actuacio: z.object({
// 		titol_actuacions_i_municipi: z.string(),
// 		descripcio_actuacions: z.string(),
// 		objectius_resultats: z.string(),
// 		actuacions_relacionades_amb_objectius: z.string(),
// 		pla_treball_calendaritzat: z.string(),
// 	}),
// 	pressupost: z.object({
// 		ingressos: z.object({
// 			recursos_propis_eur: z.number(),
// 			subvencions_altres_admins_eur: z.number(),
// 			aportacions_privades_eur: z.number(),
// 			altres_ingressos_detall: z.string(),
// 			altres_ingressos_eur: z.number(),
// 			total_ingressos_eur: z.number(),
// 		}),
// 		despeses: z.object({
// 			personal_eur: z.number(),
// 			contractacio_externa: z.array(
// 				z.object({
// 					concepte: z.string(),
// 					import_eur: z.number(),
// 				})
// 			),
// 			material_eur: z.number(),
// 			despeses_indirectes_eur: z.number(),
// 			altres_despeses: z.array(
// 				z.object({
// 					concepte: z.string(),
// 					import_eur: z.number(),
// 				})
// 			),
// 			total_despeses_eur: z.number(),
// 		}),
// 		subvencio_solicitada_eur: z.number(),
// 	}),
// 	declaracio_responsable: z.object({
// 		al_corrents_obligacions_tributaries_seg_social: z.boolean(),
// 		al_corrents_reintegrament_subvencions: z.boolean(),
// 		compromis_execucio_projecte: z.boolean(),
// 		accepta_control_financer_diba: z.boolean(),
// 		altres_subvencions_mateixa_actuacio: z.array(
// 			z.object({
// 				entitat_concedent: z.string(),
// 				identificacio_convocatoria: z.string(),
// 				import_eur: z.number(),
// 			})
// 		),
// 		compromis_comunicar_altres_subvencions: z.boolean(),
// 		proteccio_menors: z.object({
// 			implica_contacte_habitual_menors: z.boolean(),
// 			no_implica_contacte_habitual_menors: z.boolean(),
// 			te_certificacions_personal_sense_antecedents: z.boolean(),
// 		}),
// 	}),
// 	excepcionalitat: z.object({
// 		justificacio_excepcionalitat: z.string(),
// 		sol_licitud_pagament_avancat: z.boolean(),
// 		import_pagament_avancat_eur: z.number(),
// 	}),
// 	autoritzacions: z.object({
// 		autoritza_consulta_certificats_telematics: z.boolean(),
// 		no_accepto_consulta_telematica: z.boolean(),
// 	}),
// 	proteccio_dades: z.object({
// 		informa_finalitat_tractament: z.boolean(),
// 		informa_cessions_previstes: z.boolean(),
// 		drets_interessat: z.array(z.string()),
// 		canals_exercici_drets: z.object({
// 			seu_electronica_url: z.string(),
// 			adreces_registre_diba_url: z.string(),
// 			dpd_email: z.string(),
// 			apdcat_reclamacio_url: z.string(),
// 			denuncia_url: z.string(),
// 		}),
// 	}),
// 	destinatari_final_decret: z.object({
// 		carrec_destinatari: z.string(),
// 	}),
// })

const SubvencioDataSchema = z.object({
	dades_generals: z.object({
		// Fonts: [8, 31, 97, 121]
		codi_bdns: z.string().nullable().describe("Codi ID BDNS si apareix a la capçalera"),
		codi_convocatoria: z.string().nullable().describe("Codi de la convocatòria"),
		centre_gestor: z.string().nullable().describe("Centre gestor de la subvenció"),
		area_servei: z.string().nullable().describe("Àrea o servei de la Diputació (ex: Esports i Activitat Física)"),
		titol_projecte: z.string().nullable().describe("Títol del Projecte/Actuació (ex: ADEQUACIÓ PISCINA MUNICIPAL)"),
		any_execucio: z.string().nullable().describe("Any d'execució de les actuacions"),
		municip_actuacio: z.string().nullable().describe("Municipi on es realitzen les actuacions"),
	}),

	ens_solicitant: z.object({
		// Fonts: [12, 32, 101, 125]
		nom_ens: z.string().describe("Nom de l'ens local (Ajuntament)"),
		nif: z.string().describe("NIF de l'ens (ex: P0820300B)"),
		adreca: z.object({
			domicili: z.string().nullable(),
			localitat: z.string().nullable(),
			codi_postal: z.string().nullable(),
		}),
		contacte: z.object({
			telefon: z.string().nullable(),
			email: z.string().nullable().describe("Correu electrònic principal de contacte"),
		}),
		representant_legal: z.object({
			// Fonts: [12, 36, 125]
			nom_cognoms: z.string().describe("Nom de l'alcalde o representant que signa"),
			carrec: z.string().nullable().describe("Càrrec (ex: Alcalde)"),
		}),
	}),

	// Font: [37, 40]
	modalitat_execucio: z.object({
		es_ens_instrumental: z.boolean().describe("Si s'ha marcat la casella d'Ens instrumental"),
		dades_ens_instrumental: z
			.object({
				nom_rao_social: z.string().nullable(),
				nif: z.string().nullable(),
			})
			.optional(),
	}),

	// Font: [41-46] - Checkbox detection
	documentacio_adjunta_check: z.object({
		annex_1_memoria: z.boolean().describe("X Memòria de l'actuació"),
		annex_2_pressupost: z.boolean().describe("X Pressupost de l'activitat"),
		annex_3_declaracio_subvencions: z.boolean().describe("X Declaració responsable requisits"),
		annex_4_menors: z.boolean().describe("X Declaració protecció menors"),
		annex_5_excepcionalitat: z.boolean().describe("X Justificació de l'excepcionalitat"),
	}),

	// Destinació final de la subvenció
	destinacio_final_subvencio: z
		.object({
			existeix_transferencia_a_tercers: z.boolean().describe("Si existeix transferència a tercers"),
			beneficiaris: z
				.array(
					z.object({
						nom_ens: z.string().describe("Nom de l'ens beneficiari"),
						nif_ens: z.string().nullable().describe("NIF de l'ens beneficiari"),
						domicili_ens: z.string().nullable().describe("Domicili de l'ens beneficiari"),
						import_eur: z.number().describe("Import en euros"),
					})
				)
				.optional()
				.describe("Llista de beneficiaris amb els seus imports"),
		})
		.optional(),

	// Contingut extret de l'ANNEX 1
	memoria_actuacio: z
		.object({
			// Fonts: [102-106]
			titol_actuacions_i_municipi: z.string().nullable().describe("Títol de les actuacions i municipi"),
			descripcio_actuacions: z.string().nullable().describe("Text sota 'DESCRIPCIÓ DE LES ACTUACIONS'"),
			// Fonts: [107-111]
			objectius_resultats: z.string().nullable().describe("Text sota 'OBJECTIUS O RESULTATS'"),
			actuacions_relacionades_objectius: z.string().nullable().describe("Actuacions relacionades amb els objectius"),
			pla_treball_calendaritzat: z.string().nullable().describe("Pla de treball calendaritzat"),
		})
		.optional(),

	// Contingut extret de l'ANNEX 2
	pressupost: z.object({
		ingressos: z.object({
			// Fonts: [13, 128]
			recursos_propis: z
				.object({
					import_eur: z.number().nullable().describe("Import total recursos propis"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció del concepte d'ingrés propi"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de recursos propis si hi ha múltiples línies"),
				})
				.describe("Recursos propis de l'ens"),
			subvencions_altres_admins: z
				.object({
					import_eur: z.number().nullable().describe("Total subvencions d'altres administracions"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Nom de la subvenció o administració (PUOSC, AMB, Generalitat, etc.)"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Llista detallada de cada subvenció d'altres administracions"),
				})
				.describe("Subvencions d'altres administracions públiques"),
			aportacions_privades: z
				.object({
					import_eur: z.number().nullable().describe("Total aportacions privades"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Nom o descripció de l'aportació privada"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de les aportacions privades"),
				})
				.optional()
				.describe("Aportacions privades (patrocinis, donacions, etc.)"),
			altres_ingressos: z
				.object({
					import_eur: z.number().nullable().describe("Total altres ingressos"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció de l'ingrés"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall d'altres ingressos"),
				})
				.optional()
				.describe("Altres ingressos no classificats"),
			total_ingressos_eur: z.number().describe("Total Ingressos previstos (sense la subvenció sol·licitada)"),
		}),
		despeses: z.object({
			// Fonts: [14, 129]
			personal: z
				.object({
					import_eur: z.number().nullable().describe("Total despeses de personal"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció del concepte de personal (salaris, seguretat social, etc.)"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de les despeses de personal"),
				})
				.describe("Despeses de personal"),
			contractacio_externa: z
				.object({
					import_eur: z.number().nullable().describe("Total contractació externa"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció del servei contractat (ex: Servei ambulància, Servei muntatge, etc.)"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de cada contractació externa amb concepte i import"),
				})
				.describe("Contractació externa d'obres/serveis"),
			material: z
				.object({
					import_eur: z.number().nullable().describe("Total despeses de material"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció del material"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de les despeses de material"),
				})
				.describe("Despeses de material"),
			despeses_indirectes: z
				.object({
					import_eur: z.number().nullable().describe("Total despeses indirectes"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció de la despesa indirecta"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall de les despeses indirectes"),
				})
				.optional()
				.describe("Despeses indirectes"),
			altres_despeses: z
				.object({
					import_eur: z.number().nullable().describe("Total altres despeses"),
					detall: z
						.array(
							z.object({
								concepte: z.string().describe("Descripció de la despesa (ex: Subvenció directa extraordinària al Club...)"),
								import_eur: z.number().describe("Import en euros"),
							})
						)
						.optional()
						.describe("Detall d'altres despeses amb concepte i import"),
				})
				.optional()
				.describe("Altres despeses no classificades"),
			total_despeses_eur: z.number().describe("Total Despeses previstes"),
		}),
		resum: z.object({
			subvencio_solicitada_eur: z.number().describe("Camp 'SUBVENCIÓ SOL·LICITADA (diferència entre ingressos i despeses)'"),
		}),
	}),

	// // Contingut extret de l'ANNEX 3
	// declaracio_responsable: z.object({
	// 	// Fonts: [147-148]
	// 	altres_subvencions_concurrents: z
	// 		.array(
	// 			z.object({
	// 				entitat_concedent: z.string(),
	// 				convocatoria: z.string().nullable(),
	// 				import: z.number(),
	// 			})
	// 		)
	// 		.describe("Taula del punt 5 de la declaració responsable sobre altres subvencions sol·licitades per la mateixa actuació"),
	// }),

	// // Contingut extret de l'ANNEX 4
	// proteccio_menors: z.object({
	// 	// Fonts: [162-163]
	// 	contacte_habitual: z.enum(["NO", "SI"]).nullable().describe("Si marca 'No implica contacte habitual' (NO) o 'Implica contacte' (SI)"),
	// }),

	// Contingut extret de l'ANNEX 5
	excepcionalitat: z
		.object({
			// Font: [180]
			justificacio_text: z.string().nullable().describe("Text explicatiu de la justificació de l'excepcionalitat i urgència"),
		})
		.optional(),

	// proteccio_dades: z.object({
	// 	// Fonts: [67-70]
	// 	autoritza_consulta_tributaria: z.boolean().describe("True per defecte, False si marca la casella 'NO ACCEPTO'"),
	// }),
})

// Define the input schema
const ExtractSubvencioInputSchema = z.object({
	filePath: z.string().describe("The Firebase Storage path to the subvencio PDF file"),
})

// Define the extraction flow
const extractSubvencioFlow = ai.defineFlow(
	{
		name: "extractSubvencioFlow",
		inputSchema: ExtractSubvencioInputSchema,
		outputSchema: SubvencioDataSchema,
	},
	async (input) => {
		try {
			logger.info("Starting subvencio extraction", { filePath: input.filePath })

			// Download the PDF from Firebase Storage
			const bucket = storage.bucket()
			const file = bucket.file(input.filePath)
			const [buffer] = await file.download()
			const [metadata] = await file.getMetadata()

			logger.info("Downloaded file from storage", {
				filePath: input.filePath,
				size: buffer.length,
				contentType: metadata.contentType,
			})

			// Convert buffer to base64 for multimodal input
			const base64Data = buffer.toString("base64")

			// Create the prompt for extraction
			const prompt = `
Ets un expert en anàlisi de documents administratius i sol·licituds de subvencions. Has d'extreure tota la informació estructurada d'aquest document PDF de sol·licitud de subvenció.

TASCA: Extreu TOTA la informació present al document i estructura-la segons el format JSON especificat.

INSTRUCCIONS CRÍTIQUES:
1. Extreu TOTS els camps que puguis identificar al document
2. Si un camp NO està present o NO es pot determinar, deixa-lo buit ("" per strings, 0 per números, false per booleans, [] per arrays)
3. Sigues PRECÍS amb els imports numèrics - extreu els valors exactes
4. Per als camps de text, extreu el contingut COMPLET tal com apareix
5. Per als camps booleanos, determina si la casella està marcada o si el text indica afirmació/negació
6. Respecta l'estructura JSON exacta especificada

CAMPS PRINCIPALS A EXTREURE:

**DADES GENERALS:**
- Codi BDNS (si apareix a la capçalera)
- Codi de la convocatòria
- Centre gestor de la subvenció
- Àrea o servei de la Diputació (ex: Esports i Activitat Física)
- Títol del projecte o actuació
- Any d'execució de les actuacions
- Municipi on es realitzen les actuacions

**ENS SOL·LICITANT:**
- Nom de l'ens local (Ajuntament)
- NIF de l'ens
- Adreça: domicili, localitat, codi postal
- Contacte: telèfon i email
- Representant legal: nom, cognoms i càrrec

**MODALITAT D'EXECUCIÓ:**
- Si s'ha marcat la casella d'Ens instrumental
- Dades de l'ens instrumental (nom, NIF) si escau

**DOCUMENTACIÓ ADJUNTA (checkboxes):**
- Annex 1: Memòria de l'actuació
- Annex 2: Pressupost de l'activitat
- Annex 3: Declaració responsable requisits
- Annex 4: Declaració protecció menors
- Annex 5: Justificació de l'excepcionalitat

**DESTINACIÓ FINAL DE LA SUBVENCIÓ:**
- Si existeix transferència a tercers
- Llista de beneficiaris amb els seus imports (nom, NIF, domicili, import)

**MEMÒRIA D'ACTUACIÓ (ANNEX 1):**
- Títol de les actuacions i municipi
- Descripció de les actuacions
- Objectius o resultats esperats
- Actuacions relacionades amb objectius
- Pla de treball calendaritzat

**PRESSUPOST (ANNEX 2 - MOLT IMPORTANT - EXTREU TOTES LES FILES DE LES TAULES):**

Per a la secció "PREVISIÓ D'INGRESSOS":
- Extreu CADA fila de la taula com un element separat dins del camp "detall"
- Cada categoria (recursos_propis, subvencions_altres_admins, aportacions_privades, altres_ingressos) té:
  - import_eur: el total de la categoria
  - detall: array amb TOTES les files individuals amb {concepte, import_eur}
- Exemples de conceptes: "Recursos propis", "PUOSC", "Subvenció AMB", "Generalitat", etc.
- Total d'ingressos previstos

Per a la secció "PREVISIÓ DE DESPESES":
- Extreu CADA fila de la taula com un element separat dins del camp "detall"
- Cada categoria (personal, contractacio_externa, material, despeses_indirectes, altres_despeses) té:
  - import_eur: el total de la categoria
  - detall: array amb TOTES les files individuals amb {concepte, import_eur}
- Exemples de conceptes de contractació externa: "Servei ambulància", "Servei muntatge i desmuntatge publicitat", etc.
- Exemples d'altres despeses: "Subvenció directa extraordinària al Club...", etc.
- Total de despeses previstes

IMPORTANT: No agrupis les files. Cada línia de la taula del document ha de ser un element separat a l'array "detall".

RESUM PRESSUPOST:
- Subvenció sol·licitada (diferència entre ingressos i despeses)

**EXCEPCIONALITAT (ANNEX 5, si escau):**
- Justificació de l'excepcionalitat i urgència (text explicatiu)

RETORNA ÚNICAMENT el JSON estructurat amb TOTA la informació extreta. No afegeixis comentaris ni explicacions.
`
			console.log("Prompt created for subvencio extraction")
			// Call Gemini 2.0 Flash with multimodal input
			const llmResponse = await ai.generate({
				model: model,
				prompt: [
					{
						text: prompt,
					},
					{
						media: {
							contentType: metadata.contentType || "application/pdf",
							url: `data:${metadata.contentType || "application/pdf"};base64,${base64Data}`,
						},
					},
				],
				config: {
					temperature: 0.1,
					maxOutputTokens: 8192,
				},
				output: {
					format: "json",
					schema: SubvencioDataSchema,
				},
			})

			logger.info("Successfully extracted subvencio data")

			// Parse and return the structured data - output is already typed by schema
			return llmResponse.output!
		} catch (error) {
			logger.error("Error extracting subvencio data", { error })
			throw error
		}
	}
)

// Export the Cloud Function
export const extractSubvencio = onCallGenkit(
	{
		enforceAppCheck: false,
		cors: true,
		memory: "512MiB",
	},
	extractSubvencioFlow
)
