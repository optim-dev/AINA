import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, FileText, CheckCircle, Download, Scale, Star, MessageSquare } from "lucide-react"
import { SubvencioData } from "../types"
import DocumentPreview, { PreviewData, DocumentSection } from "./DocumentPreview"
import { InformeTecnicFormData } from "./InformeTecnic"
import { logDecretValidated, logLegalValidation, logFeedback } from "../services/elaboracioMetricsService"
import { useSettingsStore } from "@/stores/settingsStore"

// =============================================================================
// VALIDATION
// =============================================================================

export interface DecretValidationResult {
	isValid: boolean
	errors: string[]
}

interface DecretProps {
	preFormData: any
	extractedData: SubvencioData
	informeTecnicData?: InformeTecnicFormData
	onFormDataChange?: (formData: DecretFormData) => void
	onDocumentDataChange?: (sections: DocumentSection[], previewData: PreviewData) => void
	isValidated?: boolean
	onValidate?: () => void
	onDownload?: () => void
	isLegalValidated?: boolean
	onLegalValidate?: (success: boolean) => void
	feedbackScore?: number
	onFeedback?: (score: 1 | 2 | 3 | 4 | 5, comments?: string) => void
}

// Validation function that can be used externally
export function validateDecretFormData(formData: DecretFormData, preFormData: any): DecretValidationResult {
	const errors: string[] = []

	// TODO: Add validation rules when steps are defined

	return {
		isValid: errors.length === 0,
		errors,
	}
}

// =============================================================================
// STEP SYSTEM TYPES
// =============================================================================

export interface StepConfig {
	id: string
	title: string
	part: "fets" | "fonaments" | "resolucio" // Part del decret
	generateContent: (formData: DecretFormData, informeTecnicData?: InformeTecnicFormData, preFormData?: any) => string
}

// Parts del decret
export type PartDecret = "fets" | "fonaments" | "resolucio"

// Step 1: Tipus beneficiari
export type TipusBeneficiariDecret = "ajuntament" | "entitat" | null

// =============================================================================
// FORM DATA TYPE
// =============================================================================

// Step 5: Organ emissor tipus
export type OrganEmissor = "oficina" | "servei" | "gerencia" | null

// Step 6: Tipus de previsió pressupostària
export type OpcioPressupost = "opcio1" | "opcio2" | null

// Fonament 2: Supera el 50% del cost?
export type OpcioSupera50 = "supera" | "no-supera" | null

// Fonaments finals: Competència segons Refosa
export type OpcioCompetencia = "mes-22000" | "menys-22000" | null

// Resolució: Pagament avançat?
export type OpcioPagamentAvancat = "avancat" | "no-avancat" | null

// Resolució Punt 5: Forma de justificació
export type OpcioFormaJustificacio = "certificacio-ens-local" | "compte-simplificat" | "compte-justificants" | "informe-auditor" | null

// Resolució Punt 5 Opció 4: Memòria econòmica abreujada o detallada?
export type OpcioMemoriaEconomicaAuditor = "abreujada" | "detallada" | null

// Add new step fields here as the form grows
export interface DecretFormData {
	// Step 1: Aprovació i inici expedient
	tipusBeneficiari: TipusBeneficiariDecret
	nomBeneficiari: string
	denominacioFinancament: string
	numeroExpedient: string
	dataSolicitudDia: string
	dataSolicitudMes: string
	dataSolicitudAny: string
	// Step 2: Objecte de la subvenció
	explicacioProjecte: string
	pressupostTotal: string
	recursosPropisImport: string
	altresFinancadorsImport: string
	subvencioSolicitadaImport: string
	// Step 4: Objectius PAM i línies estratègiques
	nomArea: string
	siglesArea: string
	descripcioLiniesEstrategiques: string
	liniaEstrategicaConcreta: string
	// Step 5: Excepcionalitat/singularitat
	organEmissorIT: OrganEmissor
	dataInformeTecnic: string
	textVoluntatDiba: string
	// Step 6: Previsió pressupostària i PES
	opcioPressupost: OpcioPressupost
	// Opció 1: Pressupost aprovat
	dataAprovacioPressupostMes: string
	dataAprovacioPressupostAny: string
	dataBOPBAprovacioDefDia: string
	dataBOPBAprovacioDefMes: string
	dataBOPBAprovacioDefAny: string
	nomBeneficiariPES: string
	importSubvencioPES: string
	dataBOPBPESDia: string
	dataBOPBPESMes: string
	dataBOPBPESAny: string
	objectePES: string
	concrecioPES: string
	// Opció 2: Modificació de crèdit
	numeroAcordPle: string
	dataAcordPle: string
	numeroModificacioCredit: string
	anyModificacioCredit: string
	importCreditExtraordinari: string
	nomAjuntamentModificacio: string
	dataBOPBActualitzacioPES: string
	objecteActualitzacioPES: string
	concrecioActualitzacioPES: string
	// Fonament 2: Ordenança General de Subvencions
	exerciciPressupost: string
	numeroModificacioCreditFonament: string
	numeroAcordPleFonament: string
	dataAcordPleFonamentDia: string
	dataAcordPleFonamentMes: string
	dataAcordPleFonamentAny: string
	dataBOPBAprovacioDefFonamentDia: string
	dataBOPBAprovacioDefFonamentMes: string
	dataBOPBAprovacioDefFonamentAny: string
	opcioSupera50: OpcioSupera50
	// Si supera 50%
	oficinaSupera50: string
	dataInformeTecnicSupera50: string
	justificacioSupera50: string
	// Si NO supera 50%
	costTotalPressupostat: string
	// Fonaments finals: Llei Associacionisme, Protecció Infància, Competència
	inclouAssociacionisme: boolean
	inclouProteccioInfancia: boolean
	opcioCompetencia: OpcioCompetencia
	organCompetenciaMenys22k: string
	// RESOLUCIÓ
	// Primer: NIF del beneficiari (ja tenim nom i tipus)
	nifBeneficiari: string
	// Segon: Aplicació pressupostària
	aplicacioPressupostariaG: string
	aplicacioPressupostariaNumeros: string
	exerciciDespesa: string
	// Tercer punt 1: Pagament avançat
	opcioPagamentAvancat: OpcioPagamentAvancat
	// Tercer punt 2: Agents finançadors i opcional obres
	altresIngressosImport: string
	altresIngressorsDescripcio: string
	esObres: boolean
	// Tercer punt 3: Despeses elegibles
	capitolDespeses: string // II, IV, VI, etc.
	despesesPersonal: string
	despesesContractacioExterna: string
	despesesMaterial: string
	despesesIndirectes: string
	despesesAltres: string
	despesesAltresDescripcio: string
	// Opcions addicionals punt 3
	especificitatDespesesOrdinaries: string // Text lliure opcional
	inclouProteccioDadesPersonals: boolean // Checkbox
	inclouDespesesIndirectes5: boolean // Checkbox
	// Tercer punt 4: Termini d'execució
	terminiExecucioInici: string // Any d'inici (ex: 2024)
	terminiExecucioFi: string // Any de fi (ex: 2024)
	// Tercer punt 5: Forma de justificació
	opcioFormaJustificacio: OpcioFormaJustificacio
	// Opció 1 (Ens locals): Opcionals
	inclouProjecteMemoriaObres: boolean
	inclouActaRecepcio: boolean
	inclouFotosImatgeCorporativa: boolean
	// Opció 4 (Informe auditor): Tipus memòria econòmica
	opcioMemoriaEconomicaAuditor: OpcioMemoriaEconomicaAuditor
	// Tercer punt 6: Termini de justificació
	terminiJustificacioVoluntari: string // Data fi període voluntari
	terminiJustificacioFinal: string // Data fi període final
	inclouProrrogaJustificacio: boolean // Opció pròrroga
}

// =============================================================================
// STEP DEFINITIONS - Organized by decree parts
// =============================================================================

// -----------------------------------------------------------------------------
// PART I: FETS (Antecedents i fets)
// -----------------------------------------------------------------------------

const STEPS_FETS: StepConfig[] = [
	{
		id: "step1-aprovacio-inici",
		title: "Aprovació i inici de l'expedient",
		part: "fets",
		generateContent: (formData, informeTecnicData, preFormData) => {
			const tipusBeneficiari = formData.tipusBeneficiari
			const nomBeneficiari = formData.nomBeneficiari || "............................................................."
			const denominacio = formData.denominacioFinancament || "............................................................."
			const expedient = formData.numeroExpedient || "202../........"

			// Build beneficiari text based on type
			let beneficiariText = ""
			if (tipusBeneficiari === "ajuntament") {
				beneficiariText = `l'Ajuntament de ${nomBeneficiari}`
			} else if (tipusBeneficiari === "entitat") {
				beneficiariText = `l'entitat ${nomBeneficiari}`
			} else {
				beneficiariText = nomBeneficiari
			}

			// Build date text
			const dia = formData.dataSolicitudDia || "...."
			const mes = formData.dataSolicitudMes || "....."
			const any = formData.dataSolicitudAny || "......."

			// Title paragraph
			const titleText = `Aprovar l'atorgament d'una subvenció per concessió directa, amb caràcter nominatiu, a ${beneficiariText}, destinada al finançament de ${denominacio}\n(Exp. ${expedient})`

			// First point: Start of expedient
			let punt1BeneficiariText = ""
			if (tipusBeneficiari === "ajuntament") {
				punt1BeneficiariText = `L'Ajuntament de ${nomBeneficiari}`
			} else if (tipusBeneficiari === "entitat") {
				punt1BeneficiariText = `L'entitat ${nomBeneficiari}`
			} else {
				punt1BeneficiariText = nomBeneficiari
			}

			const punt1Text = `<strong>1r. Inici de l'expedient</strong>\n${punt1BeneficiariText}, en data ${dia} de ${mes} de ${any}, ha formulat petició per tal que li sigui concedida una subvenció per al finançament de ${denominacio}.`

			return `${titleText}\n\n${punt1Text}`
		},
	},
	{
		id: "step2-objecte-subvencio",
		title: "Objecte de la subvenció",
		part: "fets",
		generateContent: (formData, informeTecnicData, preFormData) => {
			const explicacio = formData.explicacioProjecte || "............................................................."
			const pressupostTotal = formData.pressupostTotal || "..............."
			const recursosPropisImport = formData.recursosPropisImport || ""
			const altresFinancadorsImport = formData.altresFinancadorsImport || ""
			const subvencioSolicitada = formData.subvencioSolicitadaImport || "..............."

			// Build budget text
			let pressupostText = `L'ens declara a la sol·licitud de subvenció un pressupost de ${pressupostTotal} EUR per portar a terme l'actuació`

			// Add recursos propis if available
			const hasRecursosPropisImport = recursosPropisImport && recursosPropisImport !== "0,00"
			const hasAltresFinancadors = altresFinancadorsImport && altresFinancadorsImport !== "0,00"

			if (hasRecursosPropisImport || hasAltresFinancadors) {
				let finançamentParts: string[] = []
				if (hasRecursosPropisImport) {
					finançamentParts.push(`${recursosPropisImport} EUR són recursos propis`)
				}
				if (hasAltresFinancadors) {
					finançamentParts.push(`${altresFinancadorsImport} EUR provenen d'altres agents finançadors`)
				}
				pressupostText += `, dels quals ${finançamentParts.join(" i ")}, i els ${subvencioSolicitada} EUR restants els sol·licita a la Diputació de Barcelona.`
			} else {
				pressupostText += `, dels quals ${subvencioSolicitada} EUR els sol·licita a la Diputació de Barcelona.`
			}

			return `<strong>2n. Objecte de la subvenció</strong>\n${explicacio}\n\n${pressupostText}`
		},
	},
	{
		id: "step3-competencies-diba",
		title: "Competències de la Diputació",
		part: "fets",
		generateContent: () => {
			// Text fix sobre les competències genèriques de la Diputació
			return `<strong>3r. Competències de la Diputació de Barcelona</strong>\nLa Diputació de Barcelona, assisteix, acompanya i coopera amb els ens locals de la província de Barcelona en el foment del desenvolupament econòmic i social i en la seva planificació, d'acord amb les competències legalment atribuïdes.`
		},
	},
	{
		id: "step4-objectius-pam",
		title: "Objectius de Mandat i línies estratègiques",
		part: "fets",
		generateContent: (formData, informeTecnicData, preFormData) => {
			const nomArea = formData.nomArea || "..................................."
			const siglesArea = formData.siglesArea || "....."
			const descripcioLinies =
				formData.descripcioLiniesEstrategiques || "X línies estratègiques que configuren els programes i accions de l'Àrea i que s'estan desplegant amb les aliances dels ens locals i dels agents del teixit social"
			const liniaConcreta = formData.liniaEstrategicaConcreta || ""

			const paragraf1 = `En data 11 de juliol de 2024, la Diputació de Barcelona ha aprovat el seu Pla d'Actuació de Mandat 2024-2027 (PAM) on estableix un programa de treball amb vocació transformadora per a aquest mandat.`

			const paragraf2 = `Atès aquest PAM, el marc de referència de l'Agenda 2030 i el caràcter transversal i multidimensional de la Diputació de Barcelona, l'Àrea de ${nomArea} de la Diputació de Barcelona (${siglesArea}) té com a objectiu de mandat donar suport als municipis de la província de Barcelona mitjançant ${descripcioLinies}.`

			let result = `<strong>4t. Objectius de Mandat</strong>\n${paragraf1}\n\n${paragraf2}`

			if (liniaConcreta) {
				result += `\n\n${liniaConcreta}`
			}

			return result
		},
	},
	{
		id: "step5-excepcionalitat",
		title: "Excepcionalitat i singularitat",
		part: "fets",
		generateContent: (formData, informeTecnicData, preFormData) => {
			// Map organ type to text
			const organMap: Record<string, string> = {
				oficina: "Oficina",
				servei: "Servei",
				gerencia: "Gerència",
			}
			const organText = formData.organEmissorIT ? organMap[formData.organEmissorIT] || "............" : "............"
			const dataIT = formData.dataInformeTecnic || "..........."
			const textVoluntat = formData.textVoluntatDiba || "............................................................."

			const paragraf1 = `Segons informe tècnic emès per ${organText} de data ${dataIT}.`

			const paragraf2 = `<em>${textVoluntat}</em>`

			return `<strong>5è. Excepcionalitat i singularitat</strong>\n${paragraf1}\n\n${paragraf2}`
		},
	},
	{
		id: "step6-previsio-pressupostaria",
		title: "Previsió pressupostària i PES",
		part: "fets",
		generateContent: (formData, informeTecnicData, preFormData) => {
			if (formData.opcioPressupost === "opcio1") {
				// Opció 1: Pressupost aprovat
				const mesAprovacio = formData.dataAprovacioPressupostMes || "........."
				const anyAprovacio = formData.dataAprovacioPressupostAny || "202x"
				const diaBOPBDef = formData.dataBOPBAprovacioDefDia || "XX"
				const mesBOPBDef = formData.dataBOPBAprovacioDefMes || "........"
				const anyBOPBDef = formData.dataBOPBAprovacioDefAny || "202x"
				const nomBeneficiari = formData.nomBeneficiariPES || formData.nomBeneficiari || "........"
				const importSubvencio = formData.importSubvencioPES || ".........."
				const diaBOPBPES = formData.dataBOPBPESDia || "x"
				const mesBOPBPES = formData.dataBOPBPESMes || "........."
				const anyBOPBPES = formData.dataBOPBPESAny || "202x"
				const objectePES = formData.objectePES || "......."
				const concrecioPES = formData.concrecioPES || ""

				let paragraf1 = `En data 30 de ${mesAprovacio} de ${anyAprovacio}, el Ple de la Diputació de Barcelona va aprovar inicialment el Pressupost General de la Diputació de Barcelona per a l'exercici ${anyAprovacio}, publicant-se la seva aprovació definitiva al BOPB de ${diaBOPBDef} de ${mesBOPBDef} de ${anyBOPBDef}, on consta una subvenció nominativa a favor de ${nomBeneficiari} per un import total de ${importSubvencio} €.`

				let paragraf2 = `Aquesta subvenció per concessió directa està inclosa en el Pla estratègic de subvencions per a l'exercici ${anyBOPBPES} publicat al BOPB de ${diaBOPBPES} de ${mesBOPBPES} de ${anyBOPBPES}, amb l'objecte <em>${objectePES}</em>`

				if (concrecioPES) {
					paragraf2 += `, i en la concessió es concreta en contribuir al <em>${concrecioPES}</em>.`
				} else {
					paragraf2 += `.`
				}

				return `<strong>6è. Previsió pressupostària i PES</strong>\n${paragraf1}\n\n${paragraf2}`
			} else if (formData.opcioPressupost === "opcio2") {
				// Opció 2: Modificació de crèdit
				const numAcord = formData.numeroAcordPle || "...."
				const dataAcord = formData.dataAcordPle || "......."
				const numModificacio = formData.numeroModificacioCredit || "..."
				const anyModificacio = formData.anyModificacioCredit || "202x"
				const importCredit = formData.importCreditExtraordinari || ".............."
				const nomAjuntament = formData.nomAjuntamentModificacio || formData.nomBeneficiari || ".............."
				const dataBOPBActualitzacio = formData.dataBOPBActualitzacioPES || "......."
				const objecteActualitzacio = formData.objecteActualitzacioPES || "......"
				const concrecioActualitzacio = formData.concrecioActualitzacioPES || ""

				let paragraf1 = `Mitjançant acord de Ple núm. ${numAcord} de data ${dataAcord}, es va aprovar la modificació de crèdit ${numModificacio}/${anyModificacio} del pressupost de la Diputació de Barcelona per a l'exercici ${anyModificacio}, que entre d'altres, comportà l'aprovació d'un crèdit extraordinari per un import de ${importCredit} € per l'Ajuntament de ${nomAjuntament}.`

				let paragraf2 = `Aquesta subvenció per concessió directa, amb caràcter nominatiu, està inclosa en l'actualització del Pla Estratègic de Subvencions de la Diputació de Barcelona per a l'exercici ${anyModificacio}, publicat al BOPB de ${dataBOPBActualitzacio}, amb l'objecte <em>${objecteActualitzacio}</em>`

				if (concrecioActualitzacio) {
					paragraf2 += `, i en la concessió es concreta en contribuir al <em>${concrecioActualitzacio}</em>.`
				} else {
					paragraf2 += `.`
				}

				return `<strong>6è. Previsió pressupostària i PES</strong>\n${paragraf1}\n\n${paragraf2}`
			}

			// No option selected
			return `<strong>6è. Previsió pressupostària i PES</strong>\n<em>(Selecciona una opció al formulari)</em>`
		},
	},
]

// -----------------------------------------------------------------------------
// PART II: FONAMENTS DE DRET
// -----------------------------------------------------------------------------

const STEPS_FONAMENTS: StepConfig[] = [
	// Fonament 1: Llei General de Subvencions (text fix)
	{
		id: "fonament1-lgs",
		title: "1. Llei General de Subvencions",
		part: "fonaments",
		generateContent: () => {
			return `<p>1. Vist el marc legal pel qual es regeixen les subvencions que es concreta en la Llei 38/2003, de 17 de novembre, General de Subvencions (en endavant LGS), i el seu Reglament de desenvolupament, aprovat pel Reial decret 887/2006, de 21 de juliol, (en endavant RLGS) així com als articles 118 a 129 del Reglament d'obres, activitats i serveis dels ens locals de Catalunya aprovat pel Decret 179/1995, de 13 de juny (en endavant ROAS).</p>`
		},
	},
	// Fonament 2: Ordenança General de Subvencions
	{
		id: "fonament2-ordenanca",
		title: "2. Ordenança General de Subvencions",
		part: "fonaments",
		generateContent: (formData) => {
			const paragraf1 = `<p>2. Vista l'Ordenança General de Subvencions de la Diputació de Barcelona, aprovada definitivament per acord del Ple de data 30 de març de 2017 i publicada al Butlletí Oficial de la Província del dia 9 de maig de 2017 (en endavant, l'Ordenança), que estableix al seu article 16 els supòsits que habiliten a concedir subvencions pel procediment de concessió directa, de conformitat amb allò previst a l'article 22.2 de la LGS.</p>`

			// Paragraph 2 - amb variables
			const exercici = formData.exerciciPressupost || "202x"
			const numModCredit = formData.numeroModificacioCreditFonament || "..../202x"
			const numAcordPle = formData.numeroAcordPleFonament || "...."
			const diaAcord = formData.dataAcordPleFonamentDia || "......"
			const mesAcord = formData.dataAcordPleFonamentMes || ""
			const anyAcord = formData.dataAcordPleFonamentAny || "202x"
			const diaBOPB = formData.dataBOPBAprovacioDefFonamentDia || "....."
			const mesBOPB = formData.dataBOPBAprovacioDefFonamentMes || ""
			const anyBOPB = formData.dataBOPBAprovacioDefFonamentAny || "202x"

			const dataAcord = mesAcord ? `${diaAcord} ${mesAcord} ${anyAcord}` : `${diaAcord} ${anyAcord}`
			const dataBOPB = mesBOPB ? `${diaBOPB} ${mesBOPB} ${anyBOPB}` : `${diaBOPB} ${anyBOPB}`

			const paragraf2 = `<p>Atès que en el cas concret es donen les circumstàncies previstes a l'apartat a) de l'article 16.3 de l'Ordenança per tal que es pugui procedir a la concessió d'una subvenció per concessió directa, en estar prevista la seva consignació nominativament en el Pressupost general de la Diputació de Barcelona per a l'exercici ${exercici}, en virtut de la modificació de crèdit ${numModCredit} aprovada per acord de Ple núm. ${numAcordPle} de ${dataAcord}, i publicada la seva aprovació definitiva al BOPB de ${dataBOPB}.</p>`

			const paragraf3 = `<p>Atès que segons l'apartat primer de l'article 29 de l'Ordenança, en la resolució de la concessió, a més del beneficiari, l'objecte i la quantia de la subvenció, es fixaran el termini d'execució de les actuacions subvencionades, el termini i la forma de justificació, la forma de pagament, així com la compatibilitat amb altres subvencions o ajudes rebudes per la mateixa finalitat.</p>`

			const paragraf4 = `<p>D'acord amb l'article 9-2 de l'Ordenança que estableix que les subvencions no han d'excedir, normalment, del 50% del cost de l'activitat a què s'apliquin, i en els casos en què s'ultrapassi aquest límit, se n'ha de justificar la necessitat a l'expedient.</p>`

			// Opció 1 o 2 segons si supera el 50%
			let paragrafOpcio = ""
			if (formData.opcioSupera50 === "supera") {
				const oficina = formData.oficinaSupera50 || "........"
				const dataIT = formData.dataInformeTecnicSupera50 || "............."
				const justificacio = formData.justificacioSupera50 || ".......... (La justificació tècnica en cursiva es troba a l'apartat de l'informe tècnic)"
				paragrafOpcio = `<p>L'import de la subvenció a atorgar per la Diputació de Barcelona segons el pressupost presentat, supera el 50% del cost de les actuacions, però tal i com es justifica a l'informe tècnic emès per l'Oficina de ${oficina} de data ${dataIT}, Es podrà subvencionar un import de fins a un 100% del cost total de les actuacions subvencionades, atès que per les actuacions sol·licitades concorren raons ${justificacio}.</p>`
			} else if (formData.opcioSupera50 === "no-supera") {
				const costTotal = formData.costTotalPressupostat || ".......€"
				paragrafOpcio = `<p>Atès que el cost total pressupostat és de ${costTotal}, la subvenció atorgada no excedeix del 50% del cost de l'activitat a què s'apliquin.</p>`
			}

			return `${paragraf1}${paragraf2}${paragraf3}${paragraf4}${paragrafOpcio}`
		},
	},
	// Fonament 3: Llei de Transparència (text fix)
	{
		id: "fonament3-transparencia",
		title: "3. Llei de Transparència",
		part: "fonaments",
		generateContent: () => {
			return `<p>3. Vist el que disposa l'article 55.2 de la Llei 19/2014, de 29 de desembre, de transparència, accés a la informació pública i bon govern.</p>`
		},
	},
	// Fonament 4: Publicitat subvencions (text fix)
	{
		id: "fonament4-publicitat",
		title: "4. Publicitat de subvencions",
		part: "fonaments",
		generateContent: () => {
			return `<p>4. Atès que per donar compliment al principi de publicitat previst als articles 18 i 20 LGS, així com a l'article 4 de la Resolució de 9 de desembre de 2015, de la Intervenció General de l'Administració de l'Estat, per la qual es regula el contingut i periodicitat de la informació a subministrar a la nova Base de Dades Nacional de Subvencions (publicada al BOE núm. 299, de 15 de desembre de 2015), procedeix comunicar la concessió d'aquesta subvenció a la Base de Dades Nacional de Subvencions, com a Sistema Nacional de Publicitat de Subvencions i al Registre de subvencions i ajuts de Catalunya (RAISC).</p>`
		},
	},
	// Fonament 5: Llei de protecció de dades personals (text fix)
	{
		id: "fonament5-proteccio-dades",
		title: "5. Llei de protecció de dades personals",
		part: "fonaments",
		generateContent: () => {
			return `<p>5. Vista la Llei Orgànica 3/2018, de 5 de desembre, de protecció de dades personals i garantia dels drets digitals i el Reglament 2016/679 del Parlament Europeu i del Consell, de 27 d'abril de 2016, pel que fa al tractament de les dades personals, la seva cessió i conservació.</p>`
		},
	},
	// Fonament 6: Llei de l'Associacionisme (condicional - només si és entitat)
	{
		id: "fonament6-associacionisme",
		title: "6. Llei de l'Associacionisme",
		part: "fonaments",
		generateContent: (formData) => {
			if (!formData.inclouAssociacionisme) return ""
			return `<p>6. Vist el que disposen els articles 2, 5 i 17 de la Llei 11/2023, de 27 de desembre, de foment de l'associacionisme, que va entrar en vigor el 18 de gener de 2024, i segons consta a l'expedient, el beneficiari ha presentat declaració responsable conforme compleix els requisits generals establerts a l'article 5.1 de l'esmentada llei, i en conseqüència, pot accedir a les seves mesures de foment.</p>`
		},
	},
	// Fonament 7: Llei de protecció de la infància (condicional)
	{
		id: "fonament7-proteccio-infancia",
		title: "7. Llei de protecció de la infància",
		part: "fonaments",
		generateContent: (formData) => {
			if (!formData.inclouProteccioInfancia) return ""
			return `<p>7. Vista la Llei 26/2015, de 28 de juliol, de modificació del sistema de protecció a la infància i adolescència, en relació a l'exercici de les professions, oficis i activitats que impliquin contacte habitual amb menors d'edat.</p>`
		},
	},
	// Fonament 8: Competència segons la Refosa (últim)
	{
		id: "fonament8-competencia",
		title: "8. Competència",
		part: "fonaments",
		generateContent: (formData) => {
			if (formData.opcioCompetencia === "mes-22000") {
				return `<p>8. Atès que l'adopció d'aquesta resolució és competència la Presidència de la Diputació de Barcelona, d'acord amb l'apartat 1.1.2.d) de la Refosa núm. 1/2024 sobre competències i atribucions dels òrgans de la Diputació de Barcelona, diferents del Ple, corresponents al mandat 2023-2027, aprovada per Decret núm. 16308/2023, de 19 de desembre de 2023, i publicada en el Butlletí Oficial de la Província de Barcelona el 21 de desembre de 2023.</p>`
			} else if (formData.opcioCompetencia === "menys-22000") {
				const organ = formData.organCompetenciaMenys22k || "................................................................"
				return `<p>8. Atès que l'adopció d'aquesta resolució és competència ${organ} la Diputació de Barcelona, d'acord amb l'apartat 3.1.3.b) de la Refosa núm. 1/2024 sobre competències i atribucions dels òrgans de la Diputació de Barcelona, diferents del Ple, corresponents al mandat 2023-2027, aprovada per Decret núm. 16308/2023, de 19 de desembre de 2023, i publicada en el Butlletí Oficial de la Província de Barcelona el 21 de desembre de 2023.</p>`
			}
			return ""
		},
	},
]

// -----------------------------------------------------------------------------
// PART III: RESOLUCIÓ
// -----------------------------------------------------------------------------

const STEPS_RESOLUCIO: StepConfig[] = [
	// Resolució Primer: Aprovar l'atorgament
	{
		id: "resolucio1-aprovar",
		title: "Primer - Aprovar l'atorgament",
		part: "resolucio",
		generateContent: (formData) => {
			const tipusBenef = formData.tipusBeneficiari === "entitat" ? "entitat" : "Ajuntament de"
			const nom = formData.nomBeneficiari || "......../entitat"
			const nif = formData.nifBeneficiari || "........."
			const import_text = formData.subvencioSolicitadaImport || "....................."
			const objecte = formData.denominacioFinancament || "........................"

			return `<p><strong>Primer.-</strong> APROVAR l'atorgament d'una subvenció per concessió directa, amb caràcter nominatiu, a ${
				tipusBenef === "entitat" ? "" : "l'"
			}${tipusBenef} ${nom}, amb NIF ${nif}, per un import de ${import_text} (${import_text} €), destinada al finançament de ${objecte}, d'acord amb l'apartat a) de l'article 16.3 de l'Ordenança General de Subvencions.</p>`
		},
	},
	// Resolució Segon: Autoritzar i disposar la despesa
	{
		id: "resolucio2-autoritzar",
		title: "Segon - Autoritzar i disposar la despesa",
		part: "resolucio",
		generateContent: (formData) => {
			const import_text = formData.subvencioSolicitadaImport || "....................."
			const aplicacioG = formData.aplicacioPressupostariaG || "G"
			const aplicacioNum = formData.aplicacioPressupostariaNumeros || "...../...../....."
			const exercici = formData.exerciciDespesa || formData.exerciciPressupost || "202x"

			return `<p><strong>Segon.-</strong> AUTORITZAR I DISPOSAR la despesa de ${import_text} (${import_text} €), amb càrrec a l'aplicació pressupostària ${aplicacioG}/${aplicacioNum} del pressupost de l'exercici ${exercici} per fer front a la subvenció que s'atorga.</p>`
		},
	},
	// Resolució Tercer (text base): Aprovar les condicions
	{
		id: "resolucio3-tercer-base",
		title: "Tercer - Aprovar les condicions (text base)",
		part: "resolucio",
		generateContent: () => {
			return `<p><strong>Tercer.-</strong> APROVAR les condicions a què queda subjecte la present subvenció i que es concreten en els punts següents:</p>`
		},
	},
	// Resolució Tercer - Punt 1: Objecte i acceptació
	{
		id: "resolucio3-punt1",
		title: "Tercer - Punt 1 (Objecte i acceptació)",
		part: "resolucio",
		generateContent: (formData) => {
			const objecte = formData.denominacioFinancament || ".................... "

			let paragraf1 = `<p>1.- L'objecte de la subvenció és contribuir al finançament de ${objecte}.</p>`

			// Acceptació segons pagament avançat
			let paragrafAcceptacio = ""
			if (formData.opcioPagamentAvancat === "avancat") {
				paragrafAcceptacio = `<p>El beneficiari haurà d'acceptar expressament l'atorgament d'aquesta subvenció, de conformitat amb l'establert a l'article 24.4 de l'Ordenança general de subvencions de la Diputació de Barcelona. Per a la seva acceptació es concedeix un termini de 10 dies hàbils a comptar a partir de la notificació.</p>`
			} else if (formData.opcioPagamentAvancat === "no-avancat") {
				paragrafAcceptacio = `<p>S'entendrà acceptada la subvenció si el beneficiari no ha manifestat expressament les seves objeccions en el termini d'un mes comptador des de la data de la notificació de la present resolució.</p>`
			}

			return `${paragraf1}${paragrafAcceptacio}`
		},
	},
	// Resolució Tercer - Punt 2: Agents finançadors
	{
		id: "resolucio3-punt2",
		title: "Tercer - Punt 2 (Agents finançadors)",
		part: "resolucio",
		generateContent: (formData) => {
			const costTotal = formData.pressupostTotal || ".........."
			const importDiba = formData.subvencioSolicitadaImport || ".........................."
			const recursosPropisVal = formData.recursosPropisImport || "....................."
			const subvencionsAltres = formData.altresFinancadorsImport || "0,00"
			const altresIngressosVal = formData.altresIngressosImport || "0,00"
			const altresIngressosDesc = formData.altresIngressorsDescripcio || "........................"

			let paragraf1 = `<p>2.- Segons pressupost presentat, el cost total estimat de les actuacions objecte de subvenció és de ${costTotal} €</p>`

			let paragraf2 = `<p>I els agents finançadors seran:</p>`

			// Llistat amb bullets
			let llistatFinancadors = `<ul style="list-style-type: disc; margin-left: 20px;">`
			llistatFinancadors += `<li>La Diputació de Barcelona que finançarà un màxim de ${importDiba}</li>`
			llistatFinancadors += `<li>Recursos propis amb ${recursosPropisVal}</li>`

			// Només mostrar si hi ha import
			if (parseFloat(subvencionsAltres.replace(/\./g, "").replace(",", ".")) > 0) {
				llistatFinancadors += `<li>Subvencions d'altres administracions (${subvencionsAltres})</li>`
			}

			if (parseFloat(altresIngressosVal.replace(/\./g, "").replace(",", ".")) > 0) {
				llistatFinancadors += `<li>Altres ingressos (${altresIngressosDesc})</li>`
			}
			llistatFinancadors += `</ul>`

			// Part opcional per obres
			let paragrafObres = ""
			if (formData.esObres) {
				paragrafObres = `<p>En virtut d'allò que disposa l'article 31.4 a) de la LGS, l'ens beneficiari destinarà els equipaments afectats per les obres de millora, a continuar amb les seves activitats d'interès social per un període mínim de cinc anys, i si escau, fer constar en escriptura pública aquesta circumstància així com l'import de la subvenció concedida. L'incompliment d'aquesta obligació de destí, serà causa de reintegrament en els termes d'allò establert a l'article 31.4.b) de la LGS.</p>`
			}

			return `${paragraf1}${paragraf2}${llistatFinancadors}${paragrafObres}`
		},
	},
	// Resolució Tercer - Punt 3: Despeses elegibles
	{
		id: "resolucio3-punt3",
		title: "Tercer - Punt 3 (Despeses elegibles)",
		part: "resolucio",
		generateContent: (formData) => {
			const capitol = formData.capitolDespeses || "................."

			let paragraf1 = `<p>3.- Es consideraran despeses subvencionables les despeses efectuades, de les quals o bé se'ls hagin reconegut les obligacions o bé hagin estat efectivament pagades amb anterioritat a la finalització del període de justificació, amb correspondència a la classificació econòmica de capítol ${capitol} de despeses del pressupost de despeses de l'ens local destinatari, d'acord amb el detall següent:</p>`

			// Llistat de despeses amb bullets
			let despesesLlista = `<ul style="list-style-type: disc; margin-left: 20px;">`
			if (formData.despesesPersonal && parseFloat(formData.despesesPersonal.replace(/\./g, "").replace(",", ".")) > 0) {
				despesesLlista += `<li>Personal: ${formData.despesesPersonal} €</li>`
			}
			if (formData.despesesContractacioExterna && parseFloat(formData.despesesContractacioExterna.replace(/\./g, "").replace(",", ".")) > 0) {
				despesesLlista += `<li>Contractació externa: ${formData.despesesContractacioExterna} €</li>`
			}
			if (formData.despesesMaterial && parseFloat(formData.despesesMaterial.replace(/\./g, "").replace(",", ".")) > 0) {
				despesesLlista += `<li>Material: ${formData.despesesMaterial} €</li>`
			}
			if (formData.despesesIndirectes && parseFloat(formData.despesesIndirectes.replace(/\./g, "").replace(",", ".")) > 0) {
				despesesLlista += `<li>Despeses indirectes: ${formData.despesesIndirectes} €</li>`
			}
			if (formData.despesesAltres && parseFloat(formData.despesesAltres.replace(/\./g, "").replace(",", ".")) > 0) {
				const altresDesc = formData.despesesAltresDescripcio || "Altres"
				despesesLlista += `<li>${altresDesc}: ${formData.despesesAltres} €</li>`
			}
			despesesLlista += `</ul>`

			// Especificitat despeses ordinàries (opcional)
			let paragrafEspecificitat = ""
			if (formData.especificitatDespesesOrdinaries) {
				paragrafEspecificitat = `<p>${formData.especificitatDespesesOrdinaries}</p>`
			}

			// Protecció dades personals (opcional)
			let paragrafDadesPersonals = ""
			if (formData.inclouProteccioDadesPersonals) {
				paragrafDadesPersonals = `<p>La presentació de documents acreditatius de les activitats no podran contenir dades identificatives de caràcter personal que no siguin estrictament necessàries.</p>`
			}

			// Despeses indirectes 5% (opcional)
			let paragrafDespesesIndirectes5 = ""
			if (formData.inclouDespesesIndirectes5) {
				paragrafDespesesIndirectes5 = `<p>Es podran imputar fins a un 5% de despeses indirectes, sempre que aquestes corresponguin al període en el qual efectivament s'ha dut a terme l'obra.</p>`
			}

			return `${paragraf1}${despesesLlista}${paragrafEspecificitat}${paragrafDadesPersonals}${paragrafDespesesIndirectes5}`
		},
	},
	// Resolució Tercer - Punt 4: Termini d'execució
	{
		id: "resolucio3-punt4",
		title: "Tercer - Punt 4 (Termini d'execució)",
		part: "resolucio",
		generateContent: (formData) => {
			const anyInici = formData.terminiExecucioInici || "......"
			const anyFi = formData.terminiExecucioFi || "......"

			return `<p>4.- El termini d'execució de les despeses generades per les actuacions subvencionades comprendrà el període entre l'1 de gener de ${anyInici} i el 31 de desembre de ${anyFi}.</p>`
		},
	},
	// Resolució Tercer - Punt 5: Forma de justificació
	{
		id: "resolucio3-punt5",
		title: "Tercer - Punt 5 (Forma de justificació)",
		part: "resolucio",
		generateContent: (formData) => {
			let contingut = `<p>5.- La forma de justificació serà mitjançant:</p>`

			// OPCIÓ 1: Certificació ens local
			if (formData.opcioFormaJustificacio === "certificacio-ens-local") {
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				contingut += `<li>Certificació acreditativa de justificació de subvencions per a ens locals. Aquesta ha d'incloure un certificat de l'interventor i/o secretari-interventor on consti el cost total, l'import atorgat de subvenció, l'import imputable a la Diputació i la relació de despeses on consti per a cada despesa l'agent finançador amb el desglossament dels percentatges que pertoqui, segons el finançament provingui de fons del propi ens local, la Diputació de Barcelona, altre ens o amb càrrec a subvencions rebudes d'altres ens concedents o per altres departaments de la Diputació, per a la mateixa finalitat.</li>`
				contingut += `</ul>`

				// Opcionals Opció 1
				if (formData.inclouProjecteMemoriaObres) {
					contingut += `<p>Per a les despeses d'inversió en equipaments, el projecte o memòria valorada aprovada definitivament.</p>`
				}
				if (formData.inclouActaRecepcio) {
					contingut += `<p>Acta de recepció de les obres o del subministrament i col·locació signada pel tècnic responsable de l'ajuntament.</p>`
				}

				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				contingut += `<li>Memòria de l'actuació que inclogui la descripció de les actuacions realitzades i un recull fotogràfic, on constatar l'execució de les mateixes. En aquest recull fotogràfic s'haurà de poder comprovar que les actuacions subvencionades han estat executades i són operatives per a la seva utilització.</li>`
				contingut += `</ul>`

				if (formData.inclouFotosImatgeCorporativa) {
					contingut += `<p>Fotografies on es mostri la presència de la imatge corporativa de la Diputació de Barcelona (logotip) als elements instal·lats subvencionats, en la documentació impresa i cartells o mitjans electrònics i audiovisuals, en els termes establerts per la pròpia corporació a la seva web.</p>`
				}
			}

			// OPCIÓ 2: Compte justificatiu simplificat (entitats fins 20.000€)
			else if (formData.opcioFormaJustificacio === "compte-simplificat") {
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				contingut += `<li>Memòria de l'actuació justificativa del compliment de les condicions imposades en la present resolució, així com de les activitats realitzades, els resultats obtinguts i les desviacions respecte el pressupost previst. La memòria d'actuació ha d'incloure un recull fotogràfic, on es pugui constatar la presència de la imatge corporativa de la Diputació de Barcelona.</li>`
				contingut += `<li>Memòria econòmica justificativa del cost de total de l'activitat amb el contingut establert en l'article 75.2 RLGS, on s'haurà d'aportar una relació classificada de les despeses efectivament pagades, amb identificació del creditor i del document, el seu import, data d'emissió i data de pagament.</li>`
				contingut += `</ul>`

				contingut += `<p>Respecte les despeses imputades per part del beneficiari en el compte justificatiu simplificat, i una vegada revisada la documentació presentada, el centre gestor requerirà al beneficiari una mostra dels justificants de les despeses relacionades en la memòria econòmica, per tal d'obtenir una evidència raonable de l'adequada aplicació de la subvenció.</p>`

				contingut += `<p>La mostra seleccionada estarà conformada per un percentatge de justificants de despesa superior al 10% i que representaran, almenys, el 20% de la despesa concedida.</p>`
			}

			// OPCIÓ 3: Compte justificatiu amb aportació de justificants (entitats > 20.000€)
			else if (formData.opcioFormaJustificacio === "compte-justificants") {
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				contingut += `<li>Memòria de l'actuació justificativa del compliment de les condicions imposades, així com de les activitats realitzades i els resultats obtinguts. La memòria d'actuació ha d'incloure un recull fotogràfic, on es pugui constatar la presència de la imatge corporativa de la Diputació de Barcelona.</li>`
				contingut += `<li>Presentació d'una memòria econòmica amb la relació de despeses, detall d'altres ingressos i carta de pagament, si s'escau. Seguint el model que facilitarà la Gerència de Serveis d'Esports.</li>`
				contingut += `</ul>`
			}

			// OPCIÓ 4: Informe d'auditor
			else if (formData.opcioFormaJustificacio === "informe-auditor") {
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				contingut += `<li>Memòria de l'actuació justificativa del compliment de les condicions imposades, així com de les activitats realitzades, els resultats obtinguts i les desviacions respecte el pressupost previst. La memòria haurà d'incloure un recull fotogràfic on es pugui constatar la imatge corporativa de la Diputació de Barcelona.</li>`
				contingut += `</ul>`

				// Sub-opció: Memòria econòmica abreujada o detallada
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
				if (formData.opcioMemoriaEconomicaAuditor === "abreujada") {
					contingut += `<li>Memòria econòmica abreujada justificativa del cost total de l'activitat amb el contingut mínim de l'article 74.5 RLGS: un estat representatiu de la totalitat de les despeses i dels ingressos de les activitats subvencionades, degudament agrupades, amb indicació de les quantitats inicialment pressupostades i les desviacions produïdes, així com indicació de si el cost ha estat finançat amb càrrec a la subvenció concedida per la Diputació de Barcelona, amb fons propis del beneficiari o amb càrrec a subvencions rebudes d'altres ens concedents per a la mateixa finalitat, d'acord amb el model que es facilitarà per la Gerència de Serveis d'Esports.</li>`
				} else if (formData.opcioMemoriaEconomicaAuditor === "detallada") {
					contingut += `<li>Una memòria econòmica justificativa del cost de les activitats realitzades, que contindrà: una relació classificada de les despeses i inversions de l'activitat, amb identificació del creditor i del document, el seu import, data d'emissió i, si és el cas, data de pagament. En cas que la subvenció s'atorgui conformement a un pressupost, s'indicaran les desviacions esdevingudes.</li>`
				}
				contingut += `</ul>`

				contingut += `<p>La present memòria econòmica haurà d'anar acompanyada d'un informe emès per un/a auditor/a de comptes designat/da d'acord amb allò previst a l'article 74.2 RLGS.</p>`

				contingut += `<p>En aquest informe l'auditor haurà de fer referència a:</p>`
				contingut += `<ul style="list-style-type: disc; margin-left: 20px;">
					<li>Pressupost inicial i cost final de l'activitat i haver fet les comprovacions necessàries per si hi ha hagut desviació entre ambdós imports.</li>
					<li>La correcta imputació de la despesa directa i indirecta, amb els límits assenyalats en el present decret.</li>
					<li>Si s'escau, la verificació d'haver sol·licitat tres pressupostos quan la quantia de la contractació superi l'import del contracte menor.</li>
					<li>La comprovació que s'ha fet constar la col·laboració de la Diputació de Barcelona en tota la documentació impresa, en cartells i/o mitjans electrònics i audiovisuals que facin referència a l'activitat subvencionada.</li>
					<li>Que la persona que presenta la justificació acredita poders suficients.</li>
				</ul>`

				contingut += `<p>L'auditor de comptes, que haurà d'estar inscrit en el Registre Oficial d'Auditors de Comptes, revisarà el compte justificatiu amb l'abast que s'estableix a l'Ordre EHA/1434/2007, de 17 de maig.</p>`
			}

			return contingut
		},
	},
	// Resolució Tercer - Punt 6: Termini de justificació
	{
		id: "resolucio3-punt6",
		title: "Tercer - Punt 6 (Termini de justificació)",
		part: "resolucio",
		generateContent: (formData) => {
			const terminiVoluntari = formData.terminiJustificacioVoluntari || "[DATA_VOLUNTARI]"
			const terminiFinal = formData.terminiJustificacioFinal || "[DATA_FINAL]"

			let contingut = `<p>6.- El termini de justificació s'estableix en els següents períodes:</p>`
			contingut += `<ul style="list-style-type: disc; margin-left: 20px;">`
			contingut += `<li>Un primer període voluntari fins el ${terminiVoluntari}.</li>`
			contingut += `<li>Un segon període final entre el ${terminiFinal}.</li>`
			contingut += `</ul>`
			contingut += `<p>Si transcorregut el termini de justificació de la subvenció el beneficiari no ha presentat la totalitat o una part de la documentació justificativa, i per tant, l'import justificat resulta inferior a l'import atorgat, serà requerit perquè en el termini de quinze dies presenti la justificació pendent.</p>`
			contingut += `<p>Si un cop requerit no presenta la justificació pendent es durà a terme la revocació dels imports no justificats, segons l'Ordenança General de Subvencions de la Diputació de Barcelona i els procediments administratius aplicables.</p>`

			// Opcional: Pròrroga
			if (formData.inclouProrrogaJustificacio) {
				contingut += `<p>D'acord amb el què estableixen els articles 25.2 i 25.3 de l'Ordenança, es podrà concedir una pròrroga del termini de justificació prèvia sol·licitud motivada per part del beneficiari. Aquesta pròrroga haurà d'estar aprovada abans de la finalització del termini inicial, per la qual cosa, el beneficiari haurà de sol·licitar l'ampliació del termini a través de la seu electrònica amb una antelació mínima de 15 dies hàbils abans que acabi el termini de justificació inicial.</p>`
			}

			return contingut
		},
	},
]

// -----------------------------------------------------------------------------
// TOTS ELS STEPS COMBINATS
// -----------------------------------------------------------------------------

const ALL_STEPS: StepConfig[] = [...STEPS_FETS, ...STEPS_FONAMENTS, ...STEPS_RESOLUCIO]

// =============================================================================
// STEP FORM COMPONENTS - Add new step form components here
// =============================================================================

interface StepFormProps {
	formData: DecretFormData
	setFormData: React.Dispatch<React.SetStateAction<DecretFormData>>
	extractedData: SubvencioData
	informeTecnicData?: InformeTecnicFormData
	preFormData?: any
}

// Step 1: Aprovació i inici de l'expedient
function Step1Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	const mesos = [
		{ value: "gener", label: "gener" },
		{ value: "febrer", label: "febrer" },
		{ value: "març", label: "març" },
		{ value: "abril", label: "abril" },
		{ value: "maig", label: "maig" },
		{ value: "juny", label: "juny" },
		{ value: "juliol", label: "juliol" },
		{ value: "agost", label: "agost" },
		{ value: "setembre", label: "setembre" },
		{ value: "octubre", label: "octubre" },
		{ value: "novembre", label: "novembre" },
		{ value: "desembre", label: "desembre" },
	]

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>1. Aprovació i inici de l'expedient</CardTitle>
				<CardDescription>Dades del beneficiari i de la sol·licitud</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Tipus de beneficiari */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Tipus de beneficiari</Label>
					<RadioGroup value={formData.tipusBeneficiari || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, tipusBeneficiari: v as TipusBeneficiariDecret }))}>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='ajuntament' id='beneficiari-ajuntament' />
							<Label htmlFor='beneficiari-ajuntament' className='font-normal cursor-pointer'>
								Ajuntament / Ens local
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='entitat' id='beneficiari-entitat' />
							<Label htmlFor='beneficiari-entitat' className='font-normal cursor-pointer'>
								Entitat
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Nom del beneficiari */}
				<div className='space-y-2'>
					<Label htmlFor='nom-beneficiari'>{formData.tipusBeneficiari === "ajuntament" ? "Nom del municipi" : "Nom de l'entitat"}</Label>
					<Input
						id='nom-beneficiari'
						placeholder={formData.tipusBeneficiari === "ajuntament" ? "Ex: Barcelona, Sabadell..." : "Ex: Club Esportiu..."}
						value={formData.nomBeneficiari}
						onChange={(e) => setFormData((prev) => ({ ...prev, nomBeneficiari: e.target.value }))}
					/>
				</div>

				{/* Denominació del finançament */}
				<div className='space-y-2'>
					<Label htmlFor='denominacio-financament'>Denominació del finançament (títol del projecte)</Label>
					<Textarea
						id='denominacio-financament'
						placeholder="Descripció de l'actuació subvencionada..."
						value={formData.denominacioFinancament}
						onChange={(e) => setFormData((prev) => ({ ...prev, denominacioFinancament: e.target.value }))}
						className='min-h-[60px]'
					/>
				</div>

				{/* Número d'expedient */}
				<div className='space-y-2'>
					<Label htmlFor='numero-expedient'>Número d'expedient</Label>
					<Input id='numero-expedient' placeholder='202X/xxxxxxxxx' value={formData.numeroExpedient} onChange={(e) => setFormData((prev) => ({ ...prev, numeroExpedient: e.target.value }))} />
				</div>

				{/* Data de la sol·licitud */}
				<div className='space-y-2'>
					<Label className='font-semibold'>Data de la sol·licitud</Label>
					<div className='grid grid-cols-3 gap-2'>
						<div>
							<Label htmlFor='data-dia' className='text-xs text-muted-foreground'>
								Dia
							</Label>
							<Input id='data-dia' placeholder='DD' value={formData.dataSolicitudDia} onChange={(e) => setFormData((prev) => ({ ...prev, dataSolicitudDia: e.target.value }))} maxLength={2} />
						</div>
						<div>
							<Label htmlFor='data-mes' className='text-xs text-muted-foreground'>
								Mes
							</Label>
							<select
								id='data-mes'
								className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
								value={formData.dataSolicitudMes}
								onChange={(e) => setFormData((prev) => ({ ...prev, dataSolicitudMes: e.target.value }))}
							>
								<option value=''>Selecciona...</option>
								{mesos.map((mes) => (
									<option key={mes.value} value={mes.value}>
										{mes.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<Label htmlFor='data-any' className='text-xs text-muted-foreground'>
								Any
							</Label>
							<Input id='data-any' placeholder='AAAA' value={formData.dataSolicitudAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataSolicitudAny: e.target.value }))} maxLength={4} />
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// Step 2: Objecte de la subvenció
function Step2Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>2. Objecte de la subvenció</CardTitle>
				<CardDescription>Explicació del projecte i pressupost</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Explicació del projecte */}
				<div className='space-y-2'>
					<Label htmlFor='explicacio-projecte'>Explicació del projecte</Label>
					<p className='text-xs text-muted-foreground'>Descriu en què consisteix el projecte. Es pot adaptar el redactat de la motivació de l'informe tècnic.</p>
					<Textarea
						id='explicacio-projecte'
						placeholder='Descripció del projecte, objectius, actuacions previstes...'
						value={formData.explicacioProjecte}
						onChange={(e) => setFormData((prev) => ({ ...prev, explicacioProjecte: e.target.value }))}
						className='min-h-[120px]'
					/>
				</div>

				{/* Pressupost */}
				<div className='space-y-3 pt-2 border-t'>
					<Label className='font-semibold'>Dades econòmiques</Label>

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='pressupost-total' className='text-sm'>
								Pressupost total (EUR)
							</Label>
							<Input id='pressupost-total' placeholder='0,00' value={formData.pressupostTotal} onChange={(e) => setFormData((prev) => ({ ...prev, pressupostTotal: e.target.value }))} />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='subvencio-solicitada' className='text-sm'>
								Subvenció sol·licitada (EUR)
							</Label>
							<Input id='subvencio-solicitada' placeholder='0,00' value={formData.subvencioSolicitadaImport} onChange={(e) => setFormData((prev) => ({ ...prev, subvencioSolicitadaImport: e.target.value }))} />
						</div>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='recursos-propis' className='text-sm'>
								Recursos propis (EUR)
							</Label>
							<Input id='recursos-propis' placeholder='0,00' value={formData.recursosPropisImport} onChange={(e) => setFormData((prev) => ({ ...prev, recursosPropisImport: e.target.value }))} />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='altres-financadors' className='text-sm'>
								Altres finançadors (EUR)
							</Label>
							<Input id='altres-financadors' placeholder='0,00' value={formData.altresFinancadorsImport} onChange={(e) => setFormData((prev) => ({ ...prev, altresFinancadorsImport: e.target.value }))} />
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// Step 4: Objectius PAM i línies estratègiques
function Step4Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	// Línies estratègiques predefinides (de l'Informe Tècnic)
	const liniesEstrategiques: Record<string, string> = {
		linia1: `En concret, aquesta subvenció s'emmarca en la línia 1 Esport per a tothom que té la finalitat de garantir i democratitzar la pràctica de l'esport i de l'activitat física per a tothom, des de l'equitat social i de gènere i des de la inclusió social d'aquells col·lectius més vulnerables i d'altres, amb necessitats i particularitats pròpies.`,
		linia2: `En concret, aquesta subvenció s'emmarca en la línia 2 Dones i esport que té la finalitat d'impulsar l'esport femení, al llarg de tota la vida de les dones, a través de programes d'activitat física continuada, posant èmfasi en la lluita contra el sedentarisme de la població jove.`,
		linia3: `En concret, aquesta subvenció s'emmarca en la línia 3 Qualitat a l'esport que té la finalitat de facilitar l'activitat física sostenible, generadora de benestar i de qualitat de vida.`,
		linia4: `En concret, aquesta subvenció s'emmarca en la línia 4 Esport outdoor que té la finalitat de promoure entorns actius a l'espai públic, tant al medi natural com urbà.`,
		linia5: `En concret, aquesta subvenció s'emmarca en la línia 5 Xarxa d'Equipaments Esportius que té la finalitat de consolidar una xarxa d'equipaments de qualitat i modernitzada.`,
		linia6: `En concret, aquesta subvenció s'emmarca en la línia 6 Serveis d'esports municipals que té la finalitat de preservar els serveis d'esports municipals per aconseguir l'assequibilitat dels preus públics i la sostenibilitat financera dels equipaments municipals.`,
		linia7: `En concret, aquesta subvenció s'emmarca en la línia 7 Esdeveniments que té la finalitat de popularitzar les disciplines dels esdeveniments esportius més importants, tot promovent el territori de la província.`,
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>4. Objectius de Mandat i línies estratègiques</CardTitle>
				<CardDescription>PAM 2024-2027 i l'Àrea gestora</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Nom de l'Àrea */}
				<div className='grid grid-cols-3 gap-3'>
					<div className='col-span-2 space-y-2'>
						<Label htmlFor='nom-area'>Nom de l'Àrea</Label>
						<Input id='nom-area' placeholder='Ex: Esports i Activitat Física' value={formData.nomArea} onChange={(e) => setFormData((prev) => ({ ...prev, nomArea: e.target.value }))} />
					</div>
					<div className='space-y-2'>
						<Label htmlFor='sigles-area'>Sigles</Label>
						<Input id='sigles-area' placeholder='Ex: AEAF' value={formData.siglesArea} onChange={(e) => setFormData((prev) => ({ ...prev, siglesArea: e.target.value }))} />
					</div>
				</div>

				{/* Descripció línies estratègiques */}
				<div className='space-y-2'>
					<Label htmlFor='descripcio-linies'>Descripció de les línies estratègiques de l'Àrea</Label>
					<Textarea
						id='descripcio-linies'
						placeholder="Ex: 7 línies estratègiques que configuren els programes i accions de l'Àrea i que s'estan desplegant amb les aliances dels ens locals i dels agents del teixit esportiu i social"
						value={formData.descripcioLiniesEstrategiques}
						onChange={(e) => setFormData((prev) => ({ ...prev, descripcioLiniesEstrategiques: e.target.value }))}
						className='min-h-[60px]'
					/>
				</div>

				{/* Línia estratègica concreta */}
				<div className='space-y-2'>
					<Label htmlFor='linia-concreta'>Línia estratègica concreta (opcional)</Label>
					<p className='text-xs text-muted-foreground'>Concreta la línia o línies en les que s'emmarca l'objecte de la subvenció. Es pot obtenir de l'informe tècnic.</p>
					<Textarea
						id='linia-concreta'
						placeholder="En concret, aquesta subvenció s'emmarca en la línia..."
						value={formData.liniaEstrategicaConcreta}
						onChange={(e) => setFormData((prev) => ({ ...prev, liniaEstrategicaConcreta: e.target.value }))}
						className='min-h-[80px]'
					/>
					{/* Quick select from IT if available */}
					{informeTecnicData?.motivacioLiniaEstrategica && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='mt-2'
							onClick={() => {
								const linia = informeTecnicData.motivacioLiniaEstrategica
								if (linia && liniesEstrategiques[linia]) {
									setFormData((prev) => ({ ...prev, liniaEstrategicaConcreta: liniesEstrategiques[linia] }))
								}
							}}
						>
							<Sparkles className='h-4 w-4 mr-2' />
							Usar línia de l'Informe Tècnic
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// Step 5: Excepcionalitat i singularitat
function Step5Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	// Generate the "Amb aquest suport..." text from IT data
	const generateTextVoluntatFromIT = (): string => {
		if (!informeTecnicData) return ""
		const nomEntitat = informeTecnicData.motivacioNomEntitat || informeTecnicData.textNomBeneficiari || ""
		const actuacio = informeTecnicData.motivacioActuacioSubvencionada || informeTecnicData.descripcioActuacions || ""
		if (!nomEntitat && !actuacio) return ""
		return `Amb aquest suport la Diputació ajudarà a l'entitat organitzadora/ens local ${nomEntitat}, a portar a terme ${actuacio}, de manera extraordinària, tal i com justifica en la seva sol·licitud.`
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>5. Excepcionalitat i singularitat</CardTitle>
				<CardDescription>Referència a l'informe tècnic i justificació</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Organ emissor */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Òrgan emissor de l'informe tècnic</Label>
					<RadioGroup value={formData.organEmissorIT || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, organEmissorIT: v as OrganEmissor }))}>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='oficina' id='organ-oficina' />
							<Label htmlFor='organ-oficina' className='font-normal cursor-pointer'>
								Oficina
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='servei' id='organ-servei' />
							<Label htmlFor='organ-servei' className='font-normal cursor-pointer'>
								Servei
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='gerencia' id='organ-gerencia' />
							<Label htmlFor='organ-gerencia' className='font-normal cursor-pointer'>
								Gerència
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Data informe tècnic */}
				<div className='space-y-2'>
					<Label htmlFor='data-it'>Data de l'informe tècnic</Label>
					<Input id='data-it' type='date' value={formData.dataInformeTecnic} onChange={(e) => setFormData((prev) => ({ ...prev, dataInformeTecnic: e.target.value }))} />
				</div>

				{/* Text voluntat Diba */}
				<div className='space-y-2'>
					<Label htmlFor='text-voluntat'>Text de justificació</Label>
					<p className='text-xs text-muted-foreground'>Reprodueix el paràgraf de l'informe tècnic que comença amb "Amb aquest suport és voluntat de la Diputació..."</p>
					<Textarea
						id='text-voluntat'
						placeholder='Amb aquest suport la Diputació ajudarà a...'
						value={formData.textVoluntatDiba}
						onChange={(e) => setFormData((prev) => ({ ...prev, textVoluntatDiba: e.target.value }))}
						className='min-h-[100px]'
					/>
					{/* Quick fill from IT */}
					{informeTecnicData && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='mt-2'
							onClick={() => {
								const text = generateTextVoluntatFromIT()
								if (text) {
									setFormData((prev) => ({ ...prev, textVoluntatDiba: text }))
								}
							}}
						>
							<Sparkles className='h-4 w-4 mr-2' />
							Generar des de l'Informe Tècnic
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// Step 6: Previsió pressupostària i PES
function Step6Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	const mesos = [
		{ value: "gener", label: "gener" },
		{ value: "febrer", label: "febrer" },
		{ value: "març", label: "març" },
		{ value: "abril", label: "abril" },
		{ value: "maig", label: "maig" },
		{ value: "juny", label: "juny" },
		{ value: "juliol", label: "juliol" },
		{ value: "agost", label: "agost" },
		{ value: "setembre", label: "setembre" },
		{ value: "octubre", label: "octubre" },
		{ value: "novembre", label: "novembre" },
		{ value: "desembre", label: "desembre" },
	]

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>6. Previsió pressupostària i PES</CardTitle>
				<CardDescription>Inclusió en el pressupost i Pla Estratègic de Subvencions</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Tipus d'opció */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Tipus de previsió pressupostària</Label>
					<RadioGroup value={formData.opcioPressupost || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, opcioPressupost: v as OpcioPressupost }))}>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcio1' id='pressupost-opcio1' className='mt-1' />
							<Label htmlFor='pressupost-opcio1' className='font-normal cursor-pointer'>
								Opció 1: Subvenció prevista en el Pressupost aprovat i en el PES
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcio2' id='pressupost-opcio2' className='mt-1' />
							<Label htmlFor='pressupost-opcio2' className='font-normal cursor-pointer'>
								Opció 2: Subvenció via Modificació de crèdit i actualització del PES
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Opció 1: Pressupost aprovat */}
				{formData.opcioPressupost === "opcio1" && (
					<div className='space-y-4 pt-3 border-t'>
						<p className='text-sm font-medium text-muted-foreground'>Dades del Pressupost aprovat</p>

						{/* Data aprovació pressupost */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='mes-aprovacio'>Mes d'aprovació (30 de...)</Label>
								<select
									id='mes-aprovacio'
									className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
									value={formData.dataAprovacioPressupostMes}
									onChange={(e) => setFormData((prev) => ({ ...prev, dataAprovacioPressupostMes: e.target.value }))}
								>
									<option value=''>Selecciona...</option>
									{mesos.map((mes) => (
										<option key={mes.value} value={mes.value}>
											{mes.label}
										</option>
									))}
								</select>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='any-aprovacio'>Any</Label>
								<Input id='any-aprovacio' placeholder='202x' value={formData.dataAprovacioPressupostAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataAprovacioPressupostAny: e.target.value }))} maxLength={4} />
							</div>
						</div>

						{/* Data BOPB aprovació definitiva */}
						<div className='space-y-2'>
							<Label className='text-sm'>Data publicació BOPB aprovació definitiva</Label>
							<div className='grid grid-cols-3 gap-2'>
								<div>
									<Label htmlFor='dia-bopb-def' className='text-xs text-muted-foreground'>
										Dia
									</Label>
									<Input id='dia-bopb-def' placeholder='DD' value={formData.dataBOPBAprovacioDefDia} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefDia: e.target.value }))} maxLength={2} />
								</div>
								<div>
									<Label htmlFor='mes-bopb-def' className='text-xs text-muted-foreground'>
										Mes
									</Label>
									<select
										id='mes-bopb-def'
										className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
										value={formData.dataBOPBAprovacioDefMes}
										onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefMes: e.target.value }))}
									>
										<option value=''>Selecciona...</option>
										{mesos.map((mes) => (
											<option key={mes.value} value={mes.value}>
												{mes.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<Label htmlFor='any-bopb-def' className='text-xs text-muted-foreground'>
										Any
									</Label>
									<Input id='any-bopb-def' placeholder='202x' value={formData.dataBOPBAprovacioDefAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefAny: e.target.value }))} maxLength={4} />
								</div>
							</div>
						</div>

						{/* Beneficiari i import */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='beneficiari-pes'>Nom beneficiari (al pressupost)</Label>
								<Input
									id='beneficiari-pes'
									placeholder={formData.nomBeneficiari || "Nom del beneficiari"}
									value={formData.nomBeneficiariPES}
									onChange={(e) => setFormData((prev) => ({ ...prev, nomBeneficiariPES: e.target.value }))}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='import-pes'>Import subvenció (€)</Label>
								<Input id='import-pes' placeholder='0,00' value={formData.importSubvencioPES} onChange={(e) => setFormData((prev) => ({ ...prev, importSubvencioPES: e.target.value }))} />
							</div>
						</div>

						{/* Data BOPB PES */}
						<div className='space-y-2'>
							<Label className='text-sm'>Data publicació BOPB del PES</Label>
							<div className='grid grid-cols-3 gap-2'>
								<div>
									<Label htmlFor='dia-bopb-pes' className='text-xs text-muted-foreground'>
										Dia
									</Label>
									<Input id='dia-bopb-pes' placeholder='DD' value={formData.dataBOPBPESDia} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBPESDia: e.target.value }))} maxLength={2} />
								</div>
								<div>
									<Label htmlFor='mes-bopb-pes' className='text-xs text-muted-foreground'>
										Mes
									</Label>
									<select
										id='mes-bopb-pes'
										className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
										value={formData.dataBOPBPESMes}
										onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBPESMes: e.target.value }))}
									>
										<option value=''>Selecciona...</option>
										{mesos.map((mes) => (
											<option key={mes.value} value={mes.value}>
												{mes.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<Label htmlFor='any-bopb-pes' className='text-xs text-muted-foreground'>
										Any
									</Label>
									<Input id='any-bopb-pes' placeholder='202x' value={formData.dataBOPBPESAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBPESAny: e.target.value }))} maxLength={4} />
								</div>
							</div>
						</div>

						{/* Objecte PES */}
						<div className='space-y-2'>
							<Label htmlFor='objecte-pes'>Objecte (text literal del PES)</Label>
							<Textarea
								id='objecte-pes'
								placeholder="Reproduir literalment l'objecte del PES..."
								value={formData.objectePES}
								onChange={(e) => setFormData((prev) => ({ ...prev, objectePES: e.target.value }))}
								className='min-h-[60px]'
							/>
						</div>

						{/* Concreció (opcional) */}
						<div className='space-y-2'>
							<Label htmlFor='concrecio-pes'>Concreció (opcional, només si difereix del decret)</Label>
							<p className='text-xs text-muted-foreground'>Afegir només si l'objecte del PES no coincideix amb l'objecte del decret</p>
							<Textarea id='concrecio-pes' placeholder='Contribuir al...' value={formData.concrecioPES} onChange={(e) => setFormData((prev) => ({ ...prev, concrecioPES: e.target.value }))} className='min-h-[60px]' />
						</div>
					</div>
				)}

				{/* Opció 2: Modificació de crèdit */}
				{formData.opcioPressupost === "opcio2" && (
					<div className='space-y-4 pt-3 border-t'>
						<p className='text-sm font-medium text-muted-foreground'>Dades de la Modificació de crèdit</p>

						{/* Acord de Ple */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='num-acord'>Número d'acord de Ple</Label>
								<Input id='num-acord' placeholder='núm. acord' value={formData.numeroAcordPle} onChange={(e) => setFormData((prev) => ({ ...prev, numeroAcordPle: e.target.value }))} />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='data-acord'>Data de l'acord</Label>
								<Input id='data-acord' type='date' value={formData.dataAcordPle} onChange={(e) => setFormData((prev) => ({ ...prev, dataAcordPle: e.target.value }))} />
							</div>
						</div>

						{/* Modificació de crèdit */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='num-modificacio'>Núm. modificació de crèdit</Label>
								<Input id='num-modificacio' placeholder='núm.' value={formData.numeroModificacioCredit} onChange={(e) => setFormData((prev) => ({ ...prev, numeroModificacioCredit: e.target.value }))} />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='any-modificacio'>Any exercici</Label>
								<Input id='any-modificacio' placeholder='202x' value={formData.anyModificacioCredit} onChange={(e) => setFormData((prev) => ({ ...prev, anyModificacioCredit: e.target.value }))} maxLength={4} />
							</div>
						</div>

						{/* Import i Ajuntament */}
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-2'>
								<Label htmlFor='import-credit'>Import crèdit extraordinari (€)</Label>
								<Input id='import-credit' placeholder='0,00' value={formData.importCreditExtraordinari} onChange={(e) => setFormData((prev) => ({ ...prev, importCreditExtraordinari: e.target.value }))} />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='ajuntament-mod'>Nom de l'Ajuntament</Label>
								<Input
									id='ajuntament-mod'
									placeholder={formData.nomBeneficiari || "Nom del municipi"}
									value={formData.nomAjuntamentModificacio}
									onChange={(e) => setFormData((prev) => ({ ...prev, nomAjuntamentModificacio: e.target.value }))}
								/>
							</div>
						</div>

						{/* Data BOPB actualització PES */}
						<div className='space-y-2'>
							<Label htmlFor='data-bopb-actualitzacio'>Data publicació BOPB actualització PES</Label>
							<Input
								id='data-bopb-actualitzacio'
								placeholder='DD de mes de 202x'
								value={formData.dataBOPBActualitzacioPES}
								onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBActualitzacioPES: e.target.value }))}
							/>
						</div>

						{/* Objecte actualització PES */}
						<div className='space-y-2'>
							<Label htmlFor='objecte-actualitzacio'>Objecte (text literal del PES actualitzat)</Label>
							<Textarea
								id='objecte-actualitzacio'
								placeholder="Reproduir literalment l'objecte..."
								value={formData.objecteActualitzacioPES}
								onChange={(e) => setFormData((prev) => ({ ...prev, objecteActualitzacioPES: e.target.value }))}
								className='min-h-[60px]'
							/>
						</div>

						{/* Concreció actualització (opcional) */}
						<div className='space-y-2'>
							<Label htmlFor='concrecio-actualitzacio'>Concreció (opcional)</Label>
							<Textarea
								id='concrecio-actualitzacio'
								placeholder='Contribuir al...'
								value={formData.concrecioActualitzacioPES}
								onChange={(e) => setFormData((prev) => ({ ...prev, concrecioActualitzacioPES: e.target.value }))}
								className='min-h-[60px]'
							/>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// =============================================================================
// FONAMENT FORM COMPONENTS
// =============================================================================

// Fonament 2: Ordenança General de Subvencions
function Fonament2Form({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	const mesos = [
		{ value: "gener", label: "gener" },
		{ value: "febrer", label: "febrer" },
		{ value: "març", label: "març" },
		{ value: "abril", label: "abril" },
		{ value: "maig", label: "maig" },
		{ value: "juny", label: "juny" },
		{ value: "juliol", label: "juliol" },
		{ value: "agost", label: "agost" },
		{ value: "setembre", label: "setembre" },
		{ value: "octubre", label: "octubre" },
		{ value: "novembre", label: "novembre" },
		{ value: "desembre", label: "desembre" },
	]

	return (
		<div className='space-y-4 border-t pt-4 mt-3'>
			<h3 className='font-semibold text-sm'>2. Ordenança General de Subvencions</h3>

			{/* Exercici pressupost */}
			<div className='space-y-2'>
				<Label htmlFor='exercici-pressupost'>Exercici pressupost</Label>
				<Input id='exercici-pressupost' placeholder='2024' value={formData.exerciciPressupost} onChange={(e) => setFormData((prev) => ({ ...prev, exerciciPressupost: e.target.value }))} className='max-w-[100px]' />
			</div>

			{/* Modificació de crèdit */}
			<div className='space-y-2'>
				<Label htmlFor='num-modif-credit-fonament'>Núm. modificació de crèdit</Label>
				<Input
					id='num-modif-credit-fonament'
					placeholder='1234/2024'
					value={formData.numeroModificacioCreditFonament}
					onChange={(e) => setFormData((prev) => ({ ...prev, numeroModificacioCreditFonament: e.target.value }))}
				/>
			</div>

			{/* Acord Ple */}
			<div className='space-y-2'>
				<Label htmlFor='num-acord-ple-fonament'>Núm. acord de Ple</Label>
				<Input
					id='num-acord-ple-fonament'
					placeholder='123'
					value={formData.numeroAcordPleFonament}
					onChange={(e) => setFormData((prev) => ({ ...prev, numeroAcordPleFonament: e.target.value }))}
					className='max-w-[100px]'
				/>
			</div>

			{/* Data Acord Ple */}
			<div className='space-y-2'>
				<Label>Data acord de Ple</Label>
				<div className='flex gap-2 items-center'>
					<Input placeholder='dia' value={formData.dataAcordPleFonamentDia} onChange={(e) => setFormData((prev) => ({ ...prev, dataAcordPleFonamentDia: e.target.value }))} className='w-16' />
					<span>de</span>
					<select className='border rounded px-2 py-1.5 text-sm' value={formData.dataAcordPleFonamentMes} onChange={(e) => setFormData((prev) => ({ ...prev, dataAcordPleFonamentMes: e.target.value }))}>
						<option value=''>mes</option>
						{mesos.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
					<span>de</span>
					<Input placeholder='any' value={formData.dataAcordPleFonamentAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataAcordPleFonamentAny: e.target.value }))} className='w-20' />
				</div>
			</div>

			{/* Data BOPB aprovació definitiva */}
			<div className='space-y-2'>
				<Label>Data BOPB aprovació definitiva</Label>
				<div className='flex gap-2 items-center'>
					<Input placeholder='dia' value={formData.dataBOPBAprovacioDefFonamentDia} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefFonamentDia: e.target.value }))} className='w-16' />
					<span>de</span>
					<select className='border rounded px-2 py-1.5 text-sm' value={formData.dataBOPBAprovacioDefFonamentMes} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefFonamentMes: e.target.value }))}>
						<option value=''>mes</option>
						{mesos.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
					<span>de</span>
					<Input placeholder='any' value={formData.dataBOPBAprovacioDefFonamentAny} onChange={(e) => setFormData((prev) => ({ ...prev, dataBOPBAprovacioDefFonamentAny: e.target.value }))} className='w-20' />
				</div>
				<p className='text-xs text-muted-foreground'>
					Consultar:{" "}
					<a href='https://seuelectronica.diba.cat/serveis-de-la-seu/inf_eco_fin/Pressupost/PT_Land_Execucio.asp' target='_blank' rel='noopener noreferrer' className='text-blue-600 underline'>
						BOPB amb aprovacions
					</a>
				</p>
			</div>

			{/* Opció: Supera el 50%? */}
			<div className='space-y-3 p-3 bg-white rounded border'>
				<Label className='font-medium'>L'import de la subvenció supera el 50% del cost de les actuacions?</Label>
				<RadioGroup value={formData.opcioSupera50 || ""} onValueChange={(value) => setFormData((prev) => ({ ...prev, opcioSupera50: value as OpcioSupera50 }))}>
					<div className='flex items-start space-x-2'>
						<RadioGroupItem value='supera' id='supera-50' className='mt-1' />
						<Label htmlFor='supera-50' className='text-sm font-normal'>
							Sí, supera el 50% (cal justificar)
						</Label>
					</div>
					<div className='flex items-start space-x-2'>
						<RadioGroupItem value='no-supera' id='no-supera-50' className='mt-1' />
						<Label htmlFor='no-supera-50' className='text-sm font-normal'>
							No supera el 50%
						</Label>
					</div>
				</RadioGroup>

				{/* Camps si SUPERA el 50% */}
				{formData.opcioSupera50 === "supera" && (
					<div className='space-y-3 pt-3 border-t'>
						<div className='space-y-2'>
							<Label htmlFor='oficina-supera'>Nom de l'Oficina emissora de l'IT</Label>
							<Input id='oficina-supera' placeholder='Oficina de...' value={formData.oficinaSupera50} onChange={(e) => setFormData((prev) => ({ ...prev, oficinaSupera50: e.target.value }))} />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='data-it-supera'>Data de l'informe tècnic</Label>
							<Input id='data-it-supera' placeholder='DD/MM/AAAA' value={formData.dataInformeTecnicSupera50} onChange={(e) => setFormData((prev) => ({ ...prev, dataInformeTecnicSupera50: e.target.value }))} />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='justificacio-supera'>Justificació (raons de l'excepcionalitat)</Label>
							<Textarea
								id='justificacio-supera'
								placeholder="Text de justificació tècnica de l'informe..."
								value={formData.justificacioSupera50}
								onChange={(e) => setFormData((prev) => ({ ...prev, justificacioSupera50: e.target.value }))}
								className='min-h-[80px]'
							/>
							<p className='text-xs text-muted-foreground italic'>La justificació es troba a l'apartat corresponent de l'informe tècnic</p>
						</div>
					</div>
				)}

				{/* Camps si NO supera el 50% */}
				{formData.opcioSupera50 === "no-supera" && (
					<div className='space-y-3 pt-3 border-t'>
						<div className='space-y-2'>
							<Label htmlFor='cost-total'>Cost total pressupostat</Label>
							<div className='flex items-center gap-2'>
								<Input id='cost-total' placeholder='10.000,00' value={formData.costTotalPressupostat} onChange={(e) => setFormData((prev) => ({ ...prev, costTotalPressupostat: e.target.value }))} />
								<span>€</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

// Fonaments finals: Associacionisme, Protecció Infància, Competència
function FonamentsFinals({ formData, setFormData }: StepFormProps) {
	return (
		<div className='space-y-4 border-t pt-4 mt-3'>
			<h3 className='font-semibold text-sm'>Fonaments addicionals i Competència</h3>

			{/* Llei de l'Associacionisme - Checkbox */}
			<div className='space-y-2'>
				<div className='flex items-center space-x-2'>
					<input
						type='checkbox'
						id='inclou-associacionisme'
						checked={formData.inclouAssociacionisme}
						onChange={(e) => setFormData((prev) => ({ ...prev, inclouAssociacionisme: e.target.checked }))}
						className='w-4 h-4 rounded border-gray-300'
					/>
					<Label htmlFor='inclou-associacionisme' className='font-normal cursor-pointer'>
						Incloure Llei de l'Associacionisme (només si el beneficiari és una entitat)
					</Label>
				</div>
				<p className='text-xs text-muted-foreground ml-6'>Si el beneficiari ha presentat declaració responsable segons l'article 5.1 de la Llei 11/2023</p>
			</div>

			{/* Llei de protecció de la infància - Checkbox */}
			<div className='space-y-2'>
				<div className='flex items-center space-x-2'>
					<input
						type='checkbox'
						id='inclou-proteccio-infancia'
						checked={formData.inclouProteccioInfancia}
						onChange={(e) => setFormData((prev) => ({ ...prev, inclouProteccioInfancia: e.target.checked }))}
						className='w-4 h-4 rounded border-gray-300'
					/>
					<Label htmlFor='inclou-proteccio-infancia' className='font-normal cursor-pointer'>
						Incloure Llei de protecció de la infància (si implica contacte habitual amb menors)
					</Label>
				</div>
				<p className='text-xs text-muted-foreground ml-6'>Si l'activitat implica professions, oficis o activitats amb contacte habitual amb menors d'edat</p>
			</div>

			{/* Competència segons la Refosa - OBLIGATORI */}
			<div className='space-y-3 p-3 bg-white rounded border'>
				<Label className='font-medium'>Competència segons la Refosa (OBLIGATORI)</Label>
				<RadioGroup value={formData.opcioCompetencia || ""} onValueChange={(value) => setFormData((prev) => ({ ...prev, opcioCompetencia: value as OpcioCompetencia }))}>
					<div className='flex items-start space-x-2'>
						<RadioGroupItem value='mes-22000' id='mes-22k' className='mt-1' />
						<Label htmlFor='mes-22k' className='text-sm font-normal'>
							Import superior a 22.000€ - Competència de la Presidència
						</Label>
					</div>
					<div className='flex items-start space-x-2'>
						<RadioGroupItem value='menys-22000' id='menys-22k' className='mt-1' />
						<Label htmlFor='menys-22k' className='text-sm font-normal'>
							Import igual o inferior a 22.000€ - Competència d'altre òrgan
						</Label>
					</div>
				</RadioGroup>

				{/* Si import <= 22.000€, cal especificar l'òrgan */}
				{formData.opcioCompetencia === "menys-22000" && (
					<div className='space-y-2 pt-3 border-t'>
						<Label htmlFor='organ-menys-22k'>Nom de l'òrgan competent</Label>
						<Input
							id='organ-menys-22k'
							placeholder='Exemple: de la Vicepresidència de...'
							value={formData.organCompetenciaMenys22k}
							onChange={(e) => setFormData((prev) => ({ ...prev, organCompetenciaMenys22k: e.target.value }))}
						/>
						<p className='text-xs text-muted-foreground'>Text que substituirà "................................................................" a la resolució</p>
					</div>
				)}
			</div>
		</div>
	)
}

// Formulari per a la Resolució (Part III)
function ResoluciForm({ formData, setFormData, extractedData, informeTecnicData }: StepFormProps) {
	// Nota: Si inclouAssociacionisme és true, opcioPagamentAvancat ha de ser "avancat"
	// Això es gestiona automàticament a l'estat inicial i aquí sincronitzem si canvia el checkbox
	useEffect(() => {
		if (formData.inclouAssociacionisme && formData.opcioPagamentAvancat !== "avancat") {
			setFormData((prev) => ({ ...prev, opcioPagamentAvancat: "avancat" }))
		}
	}, [formData.inclouAssociacionisme, formData.opcioPagamentAvancat, setFormData])

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>Dades per a la Resolució</CardTitle>
				<CardDescription>Informació necessària pels punts Primer, Segon i Tercer de la resolució</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* NIF del beneficiari */}
				<div className='space-y-2'>
					<Label htmlFor='nif-beneficiari'>NIF del beneficiari</Label>
					<Input id='nif-beneficiari' placeholder='P1234567A o A12345678' value={formData.nifBeneficiari} onChange={(e) => setFormData((prev) => ({ ...prev, nifBeneficiari: e.target.value }))} />
					<p className='text-xs text-muted-foreground'>Es mostrarà al punt PRIMER de la resolució</p>
				</div>

				{/* Aplicació pressupostària */}
				<div className='space-y-2'>
					<Label>Aplicació pressupostària</Label>
					<div className='flex items-center gap-2'>
						<Input id='aplicacio-g' placeholder='G' value={formData.aplicacioPressupostariaG} onChange={(e) => setFormData((prev) => ({ ...prev, aplicacioPressupostariaG: e.target.value }))} className='w-20' />
						<span>/</span>
						<Input
							id='aplicacio-numeros'
							placeholder='12345/67890/98765'
							value={formData.aplicacioPressupostariaNumeros}
							onChange={(e) => setFormData((prev) => ({ ...prev, aplicacioPressupostariaNumeros: e.target.value }))}
							className='flex-1'
						/>
					</div>
					<p className='text-xs text-muted-foreground'>Es mostrarà al punt SEGON de la resolució</p>
				</div>

				{/* Exercici de la despesa */}
				<div className='space-y-2'>
					<Label htmlFor='exercici-despesa'>Exercici de la despesa</Label>
					<Input id='exercici-despesa' placeholder='2024' value={formData.exerciciDespesa} onChange={(e) => setFormData((prev) => ({ ...prev, exerciciDespesa: e.target.value }))} />
					<p className='text-xs text-muted-foreground'>Es mostrarà al punt SEGON de la resolució</p>
				</div>

				{/* Opció de pagament avançat */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Opció de pagament (punt TERCER de la resolució)</Label>
					{formData.inclouAssociacionisme && (
						<div className='p-3 bg-amber-50 border border-amber-200 rounded text-sm'>
							<p className='font-medium text-amber-900'>⚠️ Pagament avançat obligatori</p>
							<p className='text-amber-700 mt-1'>Quan s'inclou la Llei de l'Associacionisme (declaració responsable), és obligatori el pagament avançat d'un mínim del 50% de la subvenció.</p>
						</div>
					)}
					<RadioGroup value={formData.opcioPagamentAvancat || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, opcioPagamentAvancat: v as OpcioPagamentAvancat }))} disabled={formData.inclouAssociacionisme}>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='avancat' id='pagament-avancat' disabled={formData.inclouAssociacionisme} />
							<div>
								<Label htmlFor='pagament-avancat' className='font-normal cursor-pointer'>
									Pagament avançat (amb acceptació expressa)
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>El beneficiari ha d'acceptar expressament l'atorgament en un termini de 10 dies hàbils</p>
							</div>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='no-avancat' id='pagament-no-avancat' disabled={formData.inclouAssociacionisme} />
							<div>
								<Label htmlFor='pagament-no-avancat' className='font-normal cursor-pointer'>
									Sense pagament avançat (acceptació tàcita)
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>S'entendrà acceptada si no hi ha objeccions en un mes des de la notificació</p>
							</div>
						</div>
					</RadioGroup>
				</div>

				{/* Separador visual */}
				<div className='border-t pt-4 mt-4'>
					<h3 className='font-semibold text-sm mb-3'>Punt 2: Agents finançadors</h3>

					{/* Nota informativa */}
					<div className='text-xs text-muted-foreground mb-3 p-2 bg-blue-50 border border-blue-200 rounded'>
						<p className='font-medium text-blue-900'>ℹ️ Nota:</p>
						<p className='text-blue-700'>Els imports del pressupost (cost total, Diputació, recursos propis, subvencions altres admins) ja estan omplerts automàticament. Només cal emplenar altres ingressos si escau.</p>
					</div>

					{/* Altres ingressos */}
					<div className='space-y-2'>
						<Label htmlFor='altres-ingressos'>Altres ingressos (import)</Label>
						<div className='flex items-center gap-2'>
							<Input id='altres-ingressos' placeholder='0,00' value={formData.altresIngressosImport} onChange={(e) => setFormData((prev) => ({ ...prev, altresIngressosImport: e.target.value }))} />
							<span>€</span>
						</div>
					</div>

					<div className='space-y-2 mt-2'>
						<Label htmlFor='altres-ingressos-desc'>Descripció altres ingressos</Label>
						<Input
							id='altres-ingressos-desc'
							placeholder='Ex: Patrocinadors privats, donacions...'
							value={formData.altresIngressorsDescripcio}
							onChange={(e) => setFormData((prev) => ({ ...prev, altresIngressorsDescripcio: e.target.value }))}
						/>
						<p className='text-xs text-muted-foreground'>Només es mostrarà si l'import és superior a 0</p>
					</div>

					{/* Checkbox per obres */}
					<div className='space-y-2 mt-4 p-3 bg-white rounded border'>
						<div className='flex items-start space-x-2'>
							<input type='checkbox' id='es-obres' checked={formData.esObres} onChange={(e) => setFormData((prev) => ({ ...prev, esObres: e.target.checked }))} className='w-4 h-4 rounded border-gray-300 mt-1' />
							<div className='flex-1'>
								<Label htmlFor='es-obres' className='font-normal cursor-pointer'>
									Les actuacions inclouen obres (equipaments)
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>Si es marca, s'afegirà el text sobre la destinació dels equipaments per un mínim de 5 anys segons l'article 31.4 de la LGS</p>
							</div>
						</div>
					</div>
				</div>

				{/* Separador visual per punt 3 */}
				<div className='border-t pt-4 mt-4'>
					<h3 className='font-semibold text-sm mb-3'>Punt 3: Despeses elegibles</h3>

					{/* Nota informativa */}
					<div className='text-xs text-muted-foreground mb-3 p-2 bg-blue-50 border border-blue-200 rounded'>
						<p className='font-medium text-blue-900'>ℹ️ Nota:</p>
						<p className='text-blue-700'>Les despeses ja estan omplerts automàticament des del pressupost extret. Cal revisar i especificar el capítol de despeses.</p>
					</div>

					{/* Capítol de despeses */}
					<div className='space-y-2 mb-3'>
						<Label htmlFor='capitol-despeses'>Capítol de despeses (II, IV, VI, etc.)</Label>
						<Input id='capitol-despeses' placeholder='Ex: II, IV, VI' value={formData.capitolDespeses} onChange={(e) => setFormData((prev) => ({ ...prev, capitolDespeses: e.target.value }))} />
						<p className='text-xs text-muted-foreground'>Especifiqueu els capítols de classificació econòmica aplicables</p>
					</div>

					{/* Despeses - Grid de 2 columnes */}
					<div className='grid grid-cols-2 gap-3 mb-3'>
						<div className='space-y-2'>
							<Label htmlFor='despeses-personal'>Personal</Label>
							<div className='flex items-center gap-2'>
								<Input id='despeses-personal' placeholder='0,00' value={formData.despesesPersonal} onChange={(e) => setFormData((prev) => ({ ...prev, despesesPersonal: e.target.value }))} />
								<span className='text-xs'>€</span>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='despeses-contractacio'>Contractació externa</Label>
							<div className='flex items-center gap-2'>
								<Input id='despeses-contractacio' placeholder='0,00' value={formData.despesesContractacioExterna} onChange={(e) => setFormData((prev) => ({ ...prev, despesesContractacioExterna: e.target.value }))} />
								<span className='text-xs'>€</span>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='despeses-material'>Material</Label>
							<div className='flex items-center gap-2'>
								<Input id='despeses-material' placeholder='0,00' value={formData.despesesMaterial} onChange={(e) => setFormData((prev) => ({ ...prev, despesesMaterial: e.target.value }))} />
								<span className='text-xs'>€</span>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='despeses-indirectes'>Despeses indirectes</Label>
							<div className='flex items-center gap-2'>
								<Input id='despeses-indirectes' placeholder='0,00' value={formData.despesesIndirectes} onChange={(e) => setFormData((prev) => ({ ...prev, despesesIndirectes: e.target.value }))} />
								<span className='text-xs'>€</span>
							</div>
						</div>
					</div>

					{/* Altres despeses */}
					<div className='space-y-2 mb-3'>
						<Label htmlFor='despeses-altres'>Altres despeses (import)</Label>
						<div className='flex items-center gap-2'>
							<Input id='despeses-altres' placeholder='0,00' value={formData.despesesAltres} onChange={(e) => setFormData((prev) => ({ ...prev, despesesAltres: e.target.value }))} />
							<span>€</span>
						</div>
					</div>

					<div className='space-y-2 mb-3'>
						<Label htmlFor='despeses-altres-desc'>Descripció altres despeses</Label>
						<Input
							id='despeses-altres-desc'
							placeholder='Ex: Serveis complementaris...'
							value={formData.despesesAltresDescripcio}
							onChange={(e) => setFormData((prev) => ({ ...prev, despesesAltresDescripcio: e.target.value }))}
						/>
					</div>

					{/* Camp opcional: Especificitat despeses ordinàries */}
					<div className='space-y-2 mb-3 p-3 bg-amber-50 border border-amber-200 rounded'>
						<Label htmlFor='especificitat-ordinaries' className='font-medium'>
							Especificitat sobre despeses ordinàries (OPCIONAL)
						</Label>
						<Textarea
							id='especificitat-ordinaries'
							placeholder='Ex: Text específic sobre percentatges acceptats de despeses ordinàries...'
							value={formData.especificitatDespesesOrdinaries}
							onChange={(e) => setFormData((prev) => ({ ...prev, especificitatDespesesOrdinaries: e.target.value }))}
							className='min-h-[60px]'
						/>
						<p className='text-xs text-muted-foreground'>Text lliure que s'afegirà després del llistat de despeses</p>
					</div>

					{/* Checkboxes opcionals */}
					<div className='space-y-3 p-3 bg-white rounded border'>
						<p className='text-sm font-medium'>Textos opcionals addicionals</p>

						<div className='flex items-start space-x-2'>
							<input
								type='checkbox'
								id='inclou-proteccio-dades'
								checked={formData.inclouProteccioDadesPersonals}
								onChange={(e) => setFormData((prev) => ({ ...prev, inclouProteccioDadesPersonals: e.target.checked }))}
								className='w-4 h-4 rounded border-gray-300 mt-1'
							/>
							<div className='flex-1'>
								<Label htmlFor='inclou-proteccio-dades' className='font-normal cursor-pointer'>
									Incloure text sobre protecció de dades personals
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>Afegeix: "La presentació de documents acreditatius no podran contenir dades identificatives que no siguin estrictament necessàries"</p>
							</div>
						</div>

						<div className='flex items-start space-x-2'>
							<input
								type='checkbox'
								id='inclou-indirectes-5'
								checked={formData.inclouDespesesIndirectes5}
								onChange={(e) => setFormData((prev) => ({ ...prev, inclouDespesesIndirectes5: e.target.checked }))}
								className='w-4 h-4 rounded border-gray-300 mt-1'
							/>
							<div className='flex-1'>
								<Label htmlFor='inclou-indirectes-5' className='font-normal cursor-pointer'>
									Incloure text sobre 5% despeses indirectes
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>Afegeix: "Es podran imputar fins a un 5% de despeses indirectes del període de l'obra"</p>
							</div>
						</div>
					</div>
				</div>

				{/* Separador visual per punt 4 */}
				<div className='border-t pt-4 mt-4'>
					<h3 className='font-semibold text-sm mb-3'>Punt 4: Termini d'execució</h3>

					{/* Nota informativa */}
					<div className='text-xs text-muted-foreground mb-3 p-2 bg-blue-50 border border-blue-200 rounded'>
						<p className='font-medium text-blue-900'>ℹ️ Nota:</p>
						<p className='text-blue-700'>Especifiqueu el període d'execució de les despeses (normalment correspon a l'exercici de la subvenció)</p>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='termini-inici'>Any d'inici (1 de gener de...)</Label>
							<Input id='termini-inici' placeholder='2024' value={formData.terminiExecucioInici} onChange={(e) => setFormData((prev) => ({ ...prev, terminiExecucioInici: e.target.value }))} />
						</div>

						<div className='space-y-2'>
							<Label htmlFor='termini-fi'>Any de finalització (31 de desembre de...)</Label>
							<Input id='termini-fi' placeholder='2024' value={formData.terminiExecucioFi} onChange={(e) => setFormData((prev) => ({ ...prev, terminiExecucioFi: e.target.value }))} />
						</div>
					</div>
				</div>

				{/* Separador visual per punt 5 */}
				<div className='border-t pt-4 mt-4'>
					<h3 className='font-semibold text-sm mb-3'>Punt 5: Forma de justificació</h3>

					{/* Nota informativa */}
					<div className='text-xs text-muted-foreground mb-3 p-2 bg-blue-50 border border-blue-200 rounded'>
						<p className='font-medium text-blue-900'>ℹ️ Nota:</p>
						<p className='text-blue-700'>Seleccioneu la forma de justificació segons el tipus de beneficiari i l'import de la subvenció (segons informe tècnic)</p>
					</div>

					<RadioGroup value={formData.opcioFormaJustificacio || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, opcioFormaJustificacio: v as OpcioFormaJustificacio }))} className='space-y-3'>
						{/* Opció 1: Ens locals */}
						<div className='p-3 border rounded bg-white'>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='certificacio-ens-local' id='justif-ens-local' className='mt-1' />
								<div className='flex-1'>
									<Label htmlFor='justif-ens-local' className='font-medium cursor-pointer'>
										Certificació de funcionari públic (ens locals)
									</Label>
									<p className='text-xs text-muted-foreground mt-1'>Per a subvencions a ens locals - Certificació de Secretari i/o Interventor</p>
								</div>
							</div>

							{/* Opcions addicionals Opció 1 */}
							{formData.opcioFormaJustificacio === "certificacio-ens-local" && (
								<div className='mt-3 pt-3 border-t space-y-2'>
									<p className='text-xs font-medium text-zinc-600'>Opcions addicionals (segons IT):</p>
									<div className='flex items-center space-x-2'>
										<input
											type='checkbox'
											id='projecte-memoria-obres'
											checked={formData.inclouProjecteMemoriaObres}
											onChange={(e) => setFormData((prev) => ({ ...prev, inclouProjecteMemoriaObres: e.target.checked }))}
											className='w-4 h-4 rounded border-gray-300'
										/>
										<Label htmlFor='projecte-memoria-obres' className='text-xs font-normal cursor-pointer'>
											Incloure projecte o memòria valorada (inversió en equipaments)
										</Label>
									</div>
									<div className='flex items-center space-x-2'>
										<input
											type='checkbox'
											id='acta-recepcio'
											checked={formData.inclouActaRecepcio}
											onChange={(e) => setFormData((prev) => ({ ...prev, inclouActaRecepcio: e.target.checked }))}
											className='w-4 h-4 rounded border-gray-300'
										/>
										<Label htmlFor='acta-recepcio' className='text-xs font-normal cursor-pointer'>
											Incloure acta de recepció de les obres
										</Label>
									</div>
									<div className='flex items-center space-x-2'>
										<input
											type='checkbox'
											id='fotos-imatge'
											checked={formData.inclouFotosImatgeCorporativa}
											onChange={(e) => setFormData((prev) => ({ ...prev, inclouFotosImatgeCorporativa: e.target.checked }))}
											className='w-4 h-4 rounded border-gray-300'
										/>
										<Label htmlFor='fotos-imatge' className='text-xs font-normal cursor-pointer'>
											Incloure fotografies amb imatge corporativa DIBA
										</Label>
									</div>
								</div>
							)}
						</div>

						{/* Opció 2: Compte simplificat (entitats fins 20.000€) */}
						<div className='p-3 border rounded bg-white'>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='compte-simplificat' id='justif-simplificat' className='mt-1' />
								<div className='flex-1'>
									<Label htmlFor='justif-simplificat' className='font-medium cursor-pointer'>
										Compte justificatiu simplificat (entitats)
									</Label>
									<p className='text-xs text-muted-foreground mt-1'>Per a imports fins a 20.000€ - Memòria d'actuació i relació de despeses</p>
								</div>
							</div>
						</div>

						{/* Opció 3: Compte amb justificants (entitats > 20.000€) */}
						<div className='p-3 border rounded bg-white'>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='compte-justificants' id='justif-justificants' className='mt-1' />
								<div className='flex-1'>
									<Label htmlFor='justif-justificants' className='font-medium cursor-pointer'>
										Compte justificatiu amb aportació de justificants (entitats)
									</Label>
									<p className='text-xs text-muted-foreground mt-1'>Per a imports superiors a 20.000€ - Memòria amb relació de despeses i justificants</p>
								</div>
							</div>
						</div>

						{/* Opció 4: Informe d'auditor */}
						<div className='p-3 border rounded bg-white'>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='informe-auditor' id='justif-auditor' className='mt-1' />
								<div className='flex-1'>
									<Label htmlFor='justif-auditor' className='font-medium cursor-pointer'>
										Informe d'auditor (entitats)
									</Label>
									<p className='text-xs text-muted-foreground mt-1'>Amb informe emès per auditor de comptes inscrit al ROAC</p>
								</div>
							</div>

							{/* Sub-opció per memòria econòmica */}
							{formData.opcioFormaJustificacio === "informe-auditor" && (
								<div className='mt-3 pt-3 border-t space-y-2'>
									<p className='text-xs font-medium text-zinc-600'>Tipus de memòria econòmica:</p>
									<RadioGroup
										value={formData.opcioMemoriaEconomicaAuditor || ""}
										onValueChange={(v) => setFormData((prev) => ({ ...prev, opcioMemoriaEconomicaAuditor: v as OpcioMemoriaEconomicaAuditor }))}
										className='space-y-1'
									>
										<div className='flex items-center space-x-2'>
											<RadioGroupItem value='abreujada' id='memoria-abreujada' />
											<Label htmlFor='memoria-abreujada' className='text-xs font-normal cursor-pointer'>
												Memòria econòmica abreujada (art. 74.5 RLGS)
											</Label>
										</div>
										<div className='flex items-center space-x-2'>
											<RadioGroupItem value='detallada' id='memoria-detallada' />
											<Label htmlFor='memoria-detallada' className='text-xs font-normal cursor-pointer'>
												Memòria econòmica detallada (relació classificada de despeses)
											</Label>
										</div>
									</RadioGroup>
								</div>
							)}
						</div>
					</RadioGroup>
				</div>

				{/* Separador visual per punt 6 */}
				<div className='border-t pt-4 mt-4'>
					<h3 className='font-semibold text-sm mb-3'>Punt 6: Termini de justificació</h3>

					{/* Nota: Dades auto-emplenades des de l'IT */}
					{informeTecnicData?.consideracionsTerminiOpcio === "opcioB" && (
						<div className='text-xs text-muted-foreground mb-3 p-2 bg-green-50 border border-green-200 rounded'>
							<p className='font-medium text-green-900'>✅ Dades carregades des de l'Informe Tècnic</p>
							<p className='text-green-700'>Els terminis s'han emplenat automàticament des de les consideracions de l'IT. Podeu modificar-los si cal.</p>
						</div>
					)}

					{informeTecnicData?.consideracionsTerminiOpcio === "opcioA" && (
						<div className='text-xs text-muted-foreground mb-3 p-2 bg-amber-50 border border-amber-200 rounded'>
							<p className='font-medium text-amber-900'>⚠️ Termini únic a l'IT</p>
							<p className='text-amber-700'>L'IT indica un termini únic (sense període voluntari/final). Si voleu dos períodes, empleneu els camps manualment.</p>
						</div>
					)}

					{!informeTecnicData?.consideracionsTerminiOpcio && (
						<div className='text-xs text-muted-foreground mb-3 p-2 bg-blue-50 border border-blue-200 rounded'>
							<p className='font-medium text-blue-900'>ℹ️ Nota:</p>
							<p className='text-blue-700'>No s'ha trobat informació de terminis a l'IT. Empleneu els camps manualment.</p>
						</div>
					)}

					{/* Període voluntari */}
					<div className='space-y-2 mb-3'>
						<Label htmlFor='termini-voluntari'>Període voluntari (fins el...)</Label>
						<Input
							id='termini-voluntari'
							placeholder='Ex: 30 de juny de 2025'
							value={formData.terminiJustificacioVoluntari}
							onChange={(e) => setFormData((prev) => ({ ...prev, terminiJustificacioVoluntari: e.target.value }))}
						/>
						<p className='text-xs text-muted-foreground'>Data límit del primer període voluntari de justificació</p>
					</div>

					{/* Període final */}
					<div className='space-y-2 mb-3'>
						<Label htmlFor='termini-final'>Període final (entre el...)</Label>
						<Input
							id='termini-final'
							placeholder="Ex: l'1 de juliol i el 31 de desembre de 2025"
							value={formData.terminiJustificacioFinal}
							onChange={(e) => setFormData((prev) => ({ ...prev, terminiJustificacioFinal: e.target.value }))}
						/>
						<p className='text-xs text-muted-foreground'>Rang de dates del segon període final de justificació</p>
					</div>

					{/* Checkbox pròrroga */}
					<div className='p-3 bg-white rounded border'>
						<div className='flex items-start space-x-2'>
							<input
								type='checkbox'
								id='prorroga-justificacio'
								checked={formData.inclouProrrogaJustificacio}
								onChange={(e) => setFormData((prev) => ({ ...prev, inclouProrrogaJustificacio: e.target.checked }))}
								className='w-4 h-4 rounded border-gray-300 mt-1'
							/>
							<div className='flex-1'>
								<Label htmlFor='prorroga-justificacio' className='font-normal cursor-pointer'>
									Incloure possibilitat de pròrroga del termini
								</Label>
								<p className='text-xs text-muted-foreground mt-1'>Afegeix el text sobre la possibilitat de sol·licitar una pròrroga del termini de justificació (arts. 25.2 i 25.3 Ordenança)</p>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Helper function to parse date string (format: DD/MM/YYYY or similar)
function parseDateString(dateStr: string): { dia: string; mes: string; any: string } {
	if (!dateStr) return { dia: "", mes: "", any: "" }

	const mesos = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"]

	// Try DD/MM/YYYY format
	const parts = dateStr.split(/[\/\-]/)
	if (parts.length === 3) {
		const dia = parts[0]
		const mesNum = parseInt(parts[1], 10)
		const any = parts[2]
		return {
			dia,
			mes: mesNum >= 1 && mesNum <= 12 ? mesos[mesNum - 1] : "",
			any,
		}
	}
	return { dia: "", mes: "", any: "" }
}

export default function Decret({
	preFormData,
	extractedData,
	informeTecnicData,
	onFormDataChange,
	onDocumentDataChange,
	isValidated = false,
	onValidate,
	onDownload,
	isLegalValidated = false,
	onLegalValidate,
	feedbackScore,
	onFeedback,
}: DecretProps) {
	// Get selected model for metrics
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// UI state for feedback modal
	const [showFeedbackModal, setShowFeedbackModal] = useState(false)
	const [tempFeedbackScore, setTempFeedbackScore] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
	const [feedbackComments, setFeedbackComments] = useState("")
	const [isValidating, setIsValidating] = useState(false)
	const [isLegalValidating, setIsLegalValidating] = useState(false)
	// UI state for legal validation modal
	const [showLegalValidationModal, setShowLegalValidationModal] = useState(false)
	// Store submitted feedback to display on screen
	const [submittedFeedback, setSubmittedFeedback] = useState<{ score: number; comments?: string } | null>(null)
	// Store legal validation result to display on screen
	const [submittedLegalValidation, setSubmittedLegalValidation] = useState<{ success: boolean } | null>(null)

	// Parse date from preFormData
	const parsedDate = parseDateString(preFormData?.dataPresentacio || "")

	// Determine tipus beneficiari from preFormData
	const initialTipusBeneficiari: TipusBeneficiariDecret = preFormData?.tipusBeneficiari === "entitat" ? "entitat" : preFormData?.tipusBeneficiari ? "ajuntament" : null

	// Mapa de línies estratègiques per obtenir el text de la línia seleccionada a l'IT
	const liniesEstrategiquesMap: Record<string, string> = {
		linia1: `En concret, aquesta subvenció s'emmarca en la línia 1 Esport per a tothom que té la finalitat de garantir i democratitzar la pràctica de l'esport i de l'activitat física per a tothom, des de l'equitat social i de gènere i des de la inclusió social d'aquells col·lectius més vulnerables i d'altres, amb necessitats i particularitats pròpies (joves, diversitat funcional, gent gran, etc.).`,
		linia2: `En concret, aquesta subvenció s'emmarca en la línia 2 Dones i esport que té la finalitat d'impulsar l'esport femení, al llarg de tota la vida de les dones, a través de programes d'activitat física continuada, posant èmfasi en la lluita contra el sedentarisme de la població jove.`,
		linia3: `En concret, aquesta subvenció s'emmarca en la línia 3 Qualitat a l'esport que té la finalitat de facilitar l'activitat física sostenible, generadora de benestar i de qualitat de vida. Una pràctica esportiva en igualtat i lliure de tota discriminació i abusos, tot actuant contra el masclisme i la violència de gènere, promovent la coeducació no sexista i fomentant l'esport femení.`,
		linia4: `En concret, aquesta subvenció s'emmarca en la línia 4 Esport outdoor que té la finalitat de promoure entorns actius a l'espai públic, tant al medi natural com urbà, facilitant la sostenibilitat dels esdeveniments i reduint el seu cost ambiental mitjançant la modernització de les instal·lacions. Fer de l'ecosistema esportiu municipal un entorn en valors cívics i democràtics, enriquint la vida comunitària dels barris, col·laborant amb els centres i entitats i prevenint problemes de convivència i d'exclusió social.`,
		linia5: `En concret, aquesta subvenció s'emmarca en la línia 5 Xarxa d'Equipaments Esportius que té la finalitat de consolidar una xarxa d'equipaments de qualitat i modernitzada que acompleixi condicions idònies d'atenció ciutadana i seguretat personal i col·lectiva, per a la pràctica física i esportiva.`,
		linia6: `En concret, aquesta subvenció s'emmarca en la línia 6 Serveis d'esports municipals que té la finalitat de preservar els serveis d'esports municipals per aconseguir l'assequibilitat dels preus públics i la sostenibilitat financera dels equipaments municipals, fent front a l'increment de la despesa operativa (cost energètic i gestió d'instal·lacions) i vetllant per l'equilibri econòmic dels models de gestió.`,
		linia7: `En concret, aquesta subvenció s'emmarca en la línia 7 Esdeveniments que té la finalitat de popularitzar les disciplines dels esdeveniments esportius més importants, tot promovent el territori de la província. És per aquest motiu, que es motiva continuar amb el projecte pels propers anys 2024, 2025, 2026 i 2027.`,
	}

	// Obtenir la línia estratègica de l'Informe Tècnic
	const liniaDesdeIT = informeTecnicData?.motivacioLiniaEstrategica
	const liniaEstrategicaInicial = liniaDesdeIT ? liniesEstrategiquesMap[liniaDesdeIT] || "" : ""

	const [formData, setFormData] = useState<DecretFormData>({
		// Step 1: Aprovació i inici expedient
		tipusBeneficiari: initialTipusBeneficiari,
		nomBeneficiari: preFormData?.nomEntitat || informeTecnicData?.textNomBeneficiari || extractedData.ens_solicitant?.nom_ens || "",
		denominacioFinancament: informeTecnicData?.descripcioActuacions || extractedData.dades_generals?.titol_projecte || "",
		numeroExpedient: preFormData?.numeroExpedient || "",
		dataSolicitudDia: parsedDate.dia,
		dataSolicitudMes: parsedDate.mes,
		dataSolicitudAny: parsedDate.any,
		// Step 2: Objecte de la subvenció
		explicacioProjecte: informeTecnicData?.motivacioJustificacioExcepcionalitat || informeTecnicData?.descripcioActuacions || extractedData.memoria_actuacio?.descripcio_actuacions || "",
		pressupostTotal: preFormData?.importTotalActuacio || extractedData.pressupost?.despeses?.total_despeses_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		recursosPropisImport: extractedData.pressupost?.ingressos?.recursos_propis?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		altresFinancadorsImport: extractedData.pressupost?.ingressos?.subvencions_altres_admins?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		subvencioSolicitadaImport: preFormData?.importTotalSubvencio || extractedData.pressupost?.resum?.subvencio_solicitada_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		// Step 4: Objectius PAM i línies estratègiques
		nomArea: "Esports i Activitat Física",
		siglesArea: "AEAF",
		descripcioLiniesEstrategiques: "7 línies estratègiques que configuren els programes i accions de l'Àrea i que s'estan desplegant amb les aliances dels ens locals i dels agents del teixit esportiu i social",
		liniaEstrategicaConcreta: liniaEstrategicaInicial,
		// Step 5: Excepcionalitat/singularitat
		organEmissorIT: null,
		dataInformeTecnic: "",
		textVoluntatDiba: "",
		// Step 6: Previsió pressupostària i PES
		opcioPressupost: null,
		// Opció 1: Pressupost aprovat
		dataAprovacioPressupostMes: "",
		dataAprovacioPressupostAny: "",
		dataBOPBAprovacioDefDia: "",
		dataBOPBAprovacioDefMes: "",
		dataBOPBAprovacioDefAny: "",
		nomBeneficiariPES: "",
		importSubvencioPES: "",
		dataBOPBPESDia: "",
		dataBOPBPESMes: "",
		dataBOPBPESAny: "",
		objectePES: "",
		concrecioPES: "",
		// Opció 2: Modificació de crèdit
		numeroAcordPle: "",
		dataAcordPle: "",
		numeroModificacioCredit: "",
		anyModificacioCredit: "",
		importCreditExtraordinari: "",
		nomAjuntamentModificacio: "",
		dataBOPBActualitzacioPES: "",
		objecteActualitzacioPES: "",
		concrecioActualitzacioPES: "",
		// Fonament 2: Ordenança General de Subvencions
		exerciciPressupost: "",
		numeroModificacioCreditFonament: "",
		numeroAcordPleFonament: "",
		dataAcordPleFonamentDia: "",
		dataAcordPleFonamentMes: "",
		dataAcordPleFonamentAny: "",
		dataBOPBAprovacioDefFonamentDia: "",
		dataBOPBAprovacioDefFonamentMes: "",
		dataBOPBAprovacioDefFonamentAny: "",
		opcioSupera50: null,
		// Si supera 50%
		oficinaSupera50: "",
		dataInformeTecnicSupera50: "",
		justificacioSupera50: informeTecnicData?.motivacioJustificacioExcepcionalitat || "",
		// Si NO supera 50%
		costTotalPressupostat: "",
		// Fonaments finals: Llei Associacionisme, Protecció Infància, Competència
		inclouAssociacionisme: initialTipusBeneficiari === "entitat",
		inclouProteccioInfancia: false,
		opcioCompetencia: null,
		organCompetenciaMenys22k: "",
		// Part III: Resolució
		nifBeneficiari: extractedData.ens_solicitant?.nif || "",
		aplicacioPressupostariaG: "G",
		aplicacioPressupostariaNumeros: "",
		exerciciDespesa: "",
		// Regla: Si inclouAssociacionisme true → opció pagament avançat automàtic
		opcioPagamentAvancat: initialTipusBeneficiari === "entitat" ? "avancat" : null,
		// Tercer punt 2: Agents finançadors
		altresIngressosImport: extractedData.pressupost?.ingressos?.altres_ingressos?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		altresIngressorsDescripcio: "",
		esObres: false,
		// Tercer punt 3: Despeses elegibles
		capitolDespeses: "",
		despesesPersonal: extractedData.pressupost?.despeses?.personal?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		despesesContractacioExterna: extractedData.pressupost?.despeses?.contractacio_externa?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		despesesMaterial: extractedData.pressupost?.despeses?.material?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		despesesIndirectes: extractedData.pressupost?.despeses?.despeses_indirectes?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		despesesAltres: extractedData.pressupost?.despeses?.altres_despeses?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
		despesesAltresDescripcio: "",
		especificitatDespesesOrdinaries: "",
		inclouProteccioDadesPersonals: false,
		inclouDespesesIndirectes5: false,
		// Tercer punt 4: Termini d'execució
		terminiExecucioInici: preFormData?.exerciciSubvencio || "",
		terminiExecucioFi: preFormData?.exerciciSubvencio || "",
		// Tercer punt 5: Forma de justificació
		opcioFormaJustificacio: initialTipusBeneficiari === "ajuntament" ? "certificacio-ens-local" : null,
		inclouProjecteMemoriaObres: false,
		inclouActaRecepcio: false,
		inclouFotosImatgeCorporativa: false,
		opcioMemoriaEconomicaAuditor: null,
		// Tercer punt 6: Termini de justificació (llegit de l'IT)
		terminiJustificacioVoluntari:
			informeTecnicData?.consideracionsTerminiSubOpcio === "B1"
				? informeTecnicData?.consideracionsTerminiB1DataParcial || ""
				: informeTecnicData?.consideracionsTerminiSubOpcio === "B2"
				? `${informeTecnicData?.consideracionsTerminiB2DataParcialInici || ""} i ${informeTecnicData?.consideracionsTerminiB2DataParcialFi || ""}`
				: "",
		terminiJustificacioFinal:
			informeTecnicData?.consideracionsTerminiFinalDataInici && informeTecnicData?.consideracionsTerminiFinalDataFi
				? `${informeTecnicData.consideracionsTerminiFinalDataInici} i el ${informeTecnicData.consideracionsTerminiFinalDataFi}`
				: "",
		inclouProrrogaJustificacio: false,
	})

	// Notify parent of form data changes for validation
	useEffect(() => {
		if (onFormDataChange) {
			onFormDataChange(formData)
		}
	}, [formData, onFormDataChange])

	// Generate document sections from all steps, organized by parts
	const documentSections = useMemo(() => {
		const fetsSteps = STEPS_FETS.map((step) => ({
			id: step.id,
			title: step.title,
			part: step.part as "fets" | "fonaments" | "resolucio",
			content: step.generateContent(formData, informeTecnicData, preFormData),
		})).filter((section) => section.content)

		const fonamentsSteps = STEPS_FONAMENTS.map((step) => ({
			id: step.id,
			title: step.title,
			part: step.part as "fets" | "fonaments" | "resolucio",
			content: step.generateContent(formData, informeTecnicData, preFormData),
		})).filter((section) => section.content)

		const resolucioSteps = STEPS_RESOLUCIO.map((step) => ({
			id: step.id,
			title: step.title,
			part: step.part as "fets" | "fonaments" | "resolucio",
			content: step.generateContent(formData, informeTecnicData, preFormData),
		})).filter((section) => section.content)

		return {
			fets: fetsSteps,
			fonaments: fonamentsSteps,
			resolucio: resolucioSteps,
			all: [...fetsSteps, ...fonamentsSteps, ...resolucioSteps],
		}
	}, [formData, informeTecnicData, preFormData])

	const previewData: PreviewData = useMemo(
		() => ({
			numExpedient: preFormData?.numeroExpedient || "202X/xxxxxxxxx",
			nomBeneficiari: preFormData?.nomEntitat || informeTecnicData?.textNomBeneficiari || extractedData.ens_solicitant?.nom_ens || "",
			nif: preFormData?.nif || extractedData.ens_solicitant?.nif || "",
			actuacioObjecte: preFormData?.actuacioObjecte || extractedData.dades_generals?.titol_projecte || "",
			importTotalActuacio: preFormData?.importTotalActuacio || extractedData.pressupost?.despeses?.total_despeses_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
			importTotalSubvencio: preFormData?.importTotalSubvencio || extractedData.pressupost?.resum?.subvencio_solicitada_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
			importPagamentAvancat: preFormData?.importPagamentAvancat || "",
			dataPresentacio: preFormData?.dataPresentacio || "",
			// Budget data
			budget: {
				ingressos: {
					recursosPropisEur: extractedData.pressupost?.ingressos?.recursos_propis?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					subvencionsAltresEur: extractedData.pressupost?.ingressos?.subvencions_altres_admins?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					aportacionsPrivadesEur: extractedData.pressupost?.ingressos?.aportacions_privades?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					altresIngressosEur: extractedData.pressupost?.ingressos?.altres_ingressos?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					totalIngressosEur: extractedData.pressupost?.ingressos?.total_ingressos_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
				},
				despeses: {
					personalEur: extractedData.pressupost?.despeses?.personal?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					despesesIndirectesEur: extractedData.pressupost?.despeses?.despeses_indirectes?.import_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
					totalDespesesEur: extractedData.pressupost?.despeses?.total_despeses_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
				},
				subvencioSolEur: extractedData.pressupost?.resum?.subvencio_solicitada_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "0,00",
			},
		}),
		[extractedData, preFormData, informeTecnicData]
	)

	const handleDocumentChange = (sections: Array<{ id: string; title: string; content: string }>) => {
		// Handle manual edits to the document if needed
		console.log("Decret document sections updated:", sections)
	}

	// Notify parent of document data changes for download
	useEffect(() => {
		if (onDocumentDataChange && documentSections.all.length > 0) {
			onDocumentDataChange(documentSections.all, previewData)
		}
	}, [documentSections, previewData, onDocumentDataChange])

	// Handler for validation
	const handleValidate = async () => {
		if (onValidate) {
			setIsValidating(true)
			try {
				// Log the decret validation metric
				await logDecretValidated(preFormData?.numeroExpedient, selectedModel)
				onValidate()
			} finally {
				setIsValidating(false)
			}
		}
	}

	// Handler for legal validation
	const handleLegalValidation = async (success: boolean) => {
		setIsLegalValidating(true)
		try {
			// Log the legal validation metric
			await logLegalValidation(success, success ? undefined : ["Manual validation failure"], preFormData?.numeroExpedient)
			if (onLegalValidate) {
				onLegalValidate(success)
			}
			// Store legal validation result to display on screen
			setSubmittedLegalValidation({ success })
			setShowLegalValidationModal(false)
		} finally {
			setIsLegalValidating(false)
		}
	}

	// Handler for feedback submission
	const handleSubmitFeedback = async () => {
		if (tempFeedbackScore) {
			await logFeedback(tempFeedbackScore, feedbackComments || undefined, preFormData?.numeroExpedient)
			if (onFeedback) {
				onFeedback(tempFeedbackScore, feedbackComments)
			}
			// Store feedback to display on screen
			setSubmittedFeedback({ score: tempFeedbackScore, comments: feedbackComments || undefined })
			setShowFeedbackModal(false)
			setTempFeedbackScore(null)
			setFeedbackComments("")
		}
	}

	return (
		<div className='space-y-6'>
			{/* Header Card with title and validate button */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='flex items-center gap-2'>
								Decret d'Atorgament
								{isValidated && <CheckCircle className='h-5 w-5 text-green-500' />}
							</CardTitle>
							<CardDescription>Completa el decret de concessió de la subvenció</CardDescription>
						</div>
						{isValidated ? (
							<div className='flex items-center gap-2 flex-wrap'>
								<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>Validat</span>

								{/* Legal Validation Button */}
								{!isLegalValidated ? (
									<Button onClick={() => setShowLegalValidationModal(true)} variant='outline' size='sm' className='text-blue-600 border-blue-300 hover:bg-blue-50'>
										<Scale className='h-4 w-4 mr-1' />
										Validar Citacions Legals
									</Button>
								) : (
									<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
										<Scale className='h-3 w-3 mr-1' />
										Citacions Verificades
									</span>
								)}

								{/* Feedback Button */}
								{!(feedbackScore || submittedFeedback) ? (
									<Button onClick={() => setShowFeedbackModal(true)} variant='outline' size='sm' className='text-amber-600 border-amber-300 hover:bg-amber-50'>
										<Star className='h-4 w-4 mr-1' />
										Valorar Precisió
									</Button>
								) : (
									<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
										<Star className='h-3 w-3 mr-1' />
										Valorat: {feedbackScore || submittedFeedback?.score}/5
									</span>
								)}

								{onDownload && (
									<Button onClick={onDownload} variant='outline' size='sm'>
										<Download className='h-4 w-4 mr-2' />
										Descarregar Decret (.docx)
									</Button>
								)}
							</div>
						) : (
							<Button onClick={handleValidate} className='bg-blue-600 hover:bg-blue-700' disabled={isValidating}>
								{isValidating ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <CheckCircle className='h-4 w-4 mr-2' />}
								Validar Decret
							</Button>
						)}
					</div>
				</CardHeader>
			</Card>

			{/* Feedback Modal */}
			{showFeedbackModal && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
					<Card className='w-full max-w-md'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<MessageSquare className='h-5 w-5' />
								Valoració de Precisió Jurídica
							</CardTitle>
							<CardDescription>Indica la teva valoració sobre l'exactitud jurídica del decret generat</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<Label className='text-sm font-medium mb-2 block'>Puntuació (1-5)</Label>
								<div className='flex gap-2'>
									{([1, 2, 3, 4, 5] as const).map((score) => (
										<Button
											key={score}
											variant={tempFeedbackScore === score ? "default" : "outline"}
											size='sm'
											className={`w-10 h-10 ${tempFeedbackScore === score ? "bg-amber-500 hover:bg-amber-600" : ""}`}
											onClick={() => setTempFeedbackScore(score)}
										>
											{score}
										</Button>
									))}
								</div>
								<p className='text-xs text-muted-foreground mt-1'>1 = Molt imprecís, 5 = Molt precís</p>
							</div>
							<div>
								<Label htmlFor='feedback-comments' className='text-sm font-medium'>
									Comentaris (opcional)
								</Label>
								<Textarea
									id='feedback-comments'
									placeholder='Afegeix comentaris sobre la qualitat del decret...'
									value={feedbackComments}
									onChange={(e) => setFeedbackComments(e.target.value)}
									className='mt-1'
									rows={3}
								/>
							</div>
							<div className='flex justify-end gap-2 pt-2'>
								<Button
									variant='outline'
									onClick={() => {
										setShowFeedbackModal(false)
										setTempFeedbackScore(null)
										setFeedbackComments("")
									}}
								>
									Cancel·lar
								</Button>
								<Button onClick={handleSubmitFeedback} disabled={!tempFeedbackScore} className='bg-amber-500 hover:bg-amber-600'>
									Enviar Valoració
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Legal Validation Modal */}
			{showLegalValidationModal && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
					<Card className='w-full max-w-md'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Scale className='h-5 w-5' />
								Validació de Citacions Legals
							</CardTitle>
							<CardDescription>Verifica que les citacions d'articles i clàusules legals del decret són correctes</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='p-4 bg-slate-50 rounded-lg border'>
								<p className='text-sm text-slate-600'>Has revisat les citacions legals del decret (articles, lleis, decrets, ordenances)?</p>
								<ul className='text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside'>
									<li>Números d'articles correctes</li>
									<li>Noms de lleis i dates de publicació</li>
									<li>Referències a BOE/BOPB/DOGC</li>
								</ul>
							</div>
							<div className='flex justify-end gap-2 pt-2'>
								<Button variant='outline' onClick={() => setShowLegalValidationModal(false)}>
									Cancel·lar
								</Button>
								<Button onClick={() => handleLegalValidation(false)} variant='outline' disabled={isLegalValidating} className='text-red-600 border-red-300 hover:bg-red-50'>
									{isLegalValidating ? <Loader2 className='h-4 w-4 mr-1 animate-spin' /> : null}
									Hi ha errors
								</Button>
								<Button onClick={() => handleLegalValidation(true)} disabled={isLegalValidating} className='bg-green-600 hover:bg-green-700'>
									{isLegalValidating ? <Loader2 className='h-4 w-4 mr-1 animate-spin' /> : null}
									Tot correcte
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Validation Results Display */}
			{(submittedFeedback || submittedLegalValidation) && (
				<Card className='border-slate-200 bg-slate-50'>
					<CardContent className='py-3'>
						<div className='flex flex-col gap-3'>
							{/* Legal Validation Result */}
							{submittedLegalValidation && (
								<div className={`flex items-center gap-3 p-2 rounded-lg ${submittedLegalValidation.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
									<Scale className={`h-5 w-5 ${submittedLegalValidation.success ? "text-green-600" : "text-red-600"}`} />
									<div className='flex-1'>
										<p className={`text-sm font-medium ${submittedLegalValidation.success ? "text-green-800" : "text-red-800"}`}>
											Validació de citacions legals: {submittedLegalValidation.success ? "Correcte ✓" : "Amb errors ✗"}
										</p>
										<p className={`text-xs ${submittedLegalValidation.success ? "text-green-600" : "text-red-600"}`}>
											{submittedLegalValidation.success ? "Totes les citacions d'articles i lleis han estat verificades" : "Cal revisar les citacions abans de finalitzar"}
										</p>
									</div>
								</div>
							)}

							{/* Feedback Result */}
							{submittedFeedback && (
								<div className='flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200'>
									<div className='flex items-center gap-0.5'>
										{[1, 2, 3, 4, 5].map((star) => (
											<Star key={star} className={`h-4 w-4 ${star <= submittedFeedback.score ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
										))}
									</div>
									<div className='flex-1'>
										<p className='text-sm font-medium text-amber-800'>Valoració de precisió jurídica: {submittedFeedback.score}/5</p>
										{submittedFeedback.comments && <p className='text-xs text-amber-600 mt-0.5 italic'>"{submittedFeedback.comments}"</p>}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			<div className='grid grid-cols-2 gap-6 h-[calc(100vh-280px)]'>
				{/* Left side: Form with all steps */}
				<div className='space-y-4 overflow-y-auto pr-2'>
					{/* ================================================================= */}
					{/* PART I: FETS */}
					{/* ================================================================= */}
					<div className='bg-zinc-50 p-3 rounded-lg border'>
						<h2 className='text-sm font-bold text-zinc-600 mb-3'>PART I: FETS</h2>

						{/* Step 1: Aprovació i inici de l'expedient */}
						<Step1Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />

						{/* Step 2: Objecte de la subvenció */}
						<Step2Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />

						{/* Step 4: Objectius PAM i línies estratègiques */}
						<Step4Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />

						{/* Step 5: Excepcionalitat i singularitat */}
						<Step5Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />

						{/* Step 6: Previsió pressupostària i PES */}
						<Step6Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />
					</div>

					{/* ================================================================= */}
					{/* PART II: FONAMENTS DE DRET */}
					{/* ================================================================= */}
					<div className='bg-zinc-50 p-3 rounded-lg border'>
						<h2 className='text-sm font-bold text-zinc-600 mb-3'>PART II: FONAMENTS DE DRET</h2>

						{/* Fonament 1: Llei General de Subvencions - Text fix, no cal formulari */}
						<div className='text-sm text-muted-foreground border-t pt-3'>
							<p className='font-medium text-zinc-700'>1. Llei General de Subvencions</p>
							<p className='text-xs italic mt-1'>Text fix - es genera automàticament</p>
						</div>

						{/* Fonament 2: Ordenança General de Subvencions */}
						<Fonament2Form formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />

						{/* Fonament 3: Llei de Transparència - Text fix, no cal formulari */}
						<div className='text-sm text-muted-foreground border-t pt-3 mt-3'>
							<p className='font-medium text-zinc-700'>3. Llei de Transparència</p>
							<p className='text-xs italic mt-1'>Text fix - es genera automàticament</p>
						</div>

						{/* Fonament 4: Publicitat de subvencions - Text fix, no cal formulari */}
						<div className='text-sm text-muted-foreground border-t pt-3 mt-3'>
							<p className='font-medium text-zinc-700'>4. Publicitat de subvencions</p>
							<p className='text-xs italic mt-1'>Text fix - es genera automàticament</p>
						</div>

						{/* Fonament 5: Llei de protecció de dades personals - Text fix, no cal formulari */}
						<div className='text-sm text-muted-foreground border-t pt-3 mt-3'>
							<p className='font-medium text-zinc-700'>5. Llei de protecció de dades personals</p>
							<p className='text-xs italic mt-1'>Text fix - es genera automàticament</p>
						</div>

						{/* Fonaments 6, 7, 8: Associacionisme, Protecció Infància, Competència */}
						<FonamentsFinals formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />
					</div>

					{/* ================================================================= */}
					{/* PART III: RESOLUCIÓ */}
					{/* ================================================================= */}
					<div className='bg-zinc-50 p-3 rounded-lg border'>
						<h2 className='text-sm font-bold text-zinc-600 mb-3'>PART III: RESOLUCIÓ</h2>

						{/* Text introductori - Text fix, no cal formulari */}
						<div className='text-sm text-muted-foreground border-b pb-3'>
							<p className='font-medium text-zinc-700'>Text introductori</p>
							<p className='text-xs italic mt-1'>Text fix - "En virtut de tot això, es proposa l'adopció de la següent: RESOLUCIÓ"</p>
						</div>

						{/* Formulari per punts Primer, Segon i Tercer (punt 1 i punt 2) */}
						<ResoluciForm formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />
					</div>
				</div>

				{/* Right side: Generated document preview */}
				<div className='overflow-y-auto pl-2'>
					<DocumentPreview sections={documentSections.all} onChange={handleDocumentChange} data={previewData} documentType='decret' expedientId={preFormData?.numeroExpedient} />
				</div>
			</div>
		</div>
	)
}
