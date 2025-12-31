import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react"
import { SubvencioData } from "../types"
import DocumentPreview, { PreviewData, DocumentSection } from "./DocumentPreview"
import { functions } from "@/services/firebase"
import { httpsCallable } from "firebase/functions"
import { useSettingsStore } from "@/stores/settingsStore"

// Re-export types needed by other components
export type { PreviewData, DocumentSection } from "./DocumentPreview"

export interface InformeTecnicValidationResult {
	isValid: boolean
	errors: string[]
}

interface InformeTecnicProps {
	preFormData: any
	extractedData: SubvencioData
	onFormDataChange?: (formData: InformeTecnicFormData) => void
	onDocumentDataChange?: (documentSections: DocumentSection[], previewData: PreviewData) => void
	initialFormData?: InformeTecnicFormData | null
}

// Validation function that can be used externally
export function validateInformeTecnicFormData(formData: InformeTecnicFormData, preFormData: any): InformeTecnicValidationResult {
	const errors: string[] = []
	const tipusBeneficiari = preFormData?.tipusBeneficiari
	return {
		isValid: true,
		errors,
	}
	// Step 1: Tipus de subvenció
	if (!formData.tipusSubvencio) {
		errors.push("Has de seleccionar el tipus de subvenció (nominativa o no nominativa)")
	}
	if (!formData.textNomBeneficiari?.trim()) {
		errors.push("El nom del beneficiari és obligatori")
	}
	if (formData.tipusSubvencio === "no-nominativa" && !formData.textOrdreInici?.trim()) {
		errors.push("La data de l'ordre d'inici és obligatòria per subvencions no nominatives")
	}

	// Step 2: Declaració responsable (només entitats)
	if (tipusBeneficiari === "entitat" && !formData.declaracioResponsable) {
		errors.push("Has de seleccionar una opció de declaració responsable per a entitats")
	}

	// Step 3: Descripció de les actuacions
	if (!formData.descripcioActuacions?.trim()) {
		errors.push("La descripció de les actuacions és obligatòria")
	}

	// Step 4: Objecte de la subvenció
	if (!formData.objecteNomEntitat?.trim()) {
		errors.push("El nom de l'entitat per a l'objecte de la subvenció és obligatori")
	}
	if (!formData.objecteAny?.trim()) {
		errors.push("L'any d'execució és obligatori")
	}

	// Step 5: Motivació de la concessió
	if (!formData.motivacioLiniaEstrategica) {
		errors.push("Has de seleccionar una línia estratègica")
	}

	// Step 6: Excepcionalitat (només no nominatives)
	if (formData.tipusSubvencio === "no-nominativa") {
		if (!formData.excepcionalitatActuacioSingular?.trim()) {
			errors.push("L'actuació singular és obligatòria per subvencions no nominatives")
		}
		if (!formData.excepcionalitatRaonsInteres?.trim()) {
			errors.push("Les raons d'interès són obligatòries per subvencions no nominatives")
		}
	}

	// Step 7: Compromisos
	if (!formData.compromisosOpcio) {
		errors.push("Has de seleccionar una opció de compromisos")
	}
	if (formData.compromisosOpcio === "opcioB" && !formData.compromisosJustificacio100?.trim()) {
		errors.push("La justificació del 100% és obligatòria quan es selecciona l'opció B")
	}

	// Step 8: Consideracions
	if (!formData.consideracionseDespesesTipus) {
		errors.push("Has de seleccionar el tipus de despeses elegibles")
	}
	if (!formData.consideracionseDespesesIndirectes) {
		errors.push("Has de seleccionar si s'accepten despeses indirectes")
	}
	if (!formData.consideracionsExecucioDataInici?.trim()) {
		errors.push("La data d'inici d'execució és obligatòria")
	}
	if (!formData.consideracionsExecucioDataFi?.trim()) {
		errors.push("La data de fi d'execució és obligatòria")
	}
	if (!formData.consideracionsAcreditacioEconomicaSuposit) {
		errors.push("Has de seleccionar un supòsit d'acreditació econòmica")
	}
	if (!formData.consideracionsTerminiOpcio) {
		errors.push("Has de seleccionar una opció de termini de justificació")
	}
	if (!formData.consideracionsePagamentOpcio) {
		errors.push("Has de seleccionar una opció de pagament")
	}

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
	generateContent: (formData: InformeTecnicFormData, tipusBeneficiari?: string) => string
}

export type TipusSubvencio = "nominativa" | "no-nominativa" | null
export type DeclaracioResponsable = "presenta-declaracio" | "no-compleix" | "email-no-interesada" | null
export type LiniaEstrategica = "linia1" | "linia2" | "linia3" | "linia4" | "linia5" | "linia6" | "linia7" | null
export type OpcioImportSubvencio = "opcioA" | "opcioB" | null

// Step 7: Consideracions types
export type DespesesElegiblesTipus = "activitats" | "inversions" | null
export type DespesesIndirectes = "accepta" | "no-accepta" | null
export type AcreditacioTecnicaInclouFotos = "si" | null
export type AcreditacioEconomicaSuposit = "suposit1" | "suposit2" | "suposit3" | null
export type Suposit1Transfereix = "si" | null
export type Suposit3Opcio = "opcioA" | "opcioB" | "opcioC" | null
export type TerminiJustificacioOpcio = "opcioA" | "opcioB" | null
export type TerminiJustificacioSubOpcio = "B1" | "B2" | null
export type PagamentOpcio = "opcioA" | "opcioB" | "opcioC" | "opcioD" | null

// Supòsit 1: Beneficiari entitat col·laboradora
export interface Suposit1Beneficiari {
	nomEns: string
	nifEns: string
	domiciliEns: string
	import: string
}

// Add new step fields here as the form grows
export interface InformeTecnicFormData {
	// Step 1: Tipus de subvenció
	tipusSubvencio: TipusSubvencio
	textNomBeneficiari: string
	textOrdreInici: string
	// Step 2: Declaració responsable (només entitats)
	declaracioResponsable: DeclaracioResponsable
	// Step 3: Descripció de les actuacions
	descripcioActuacions: string
	// Step 4: Resultat objecte de la subvenció
	objecteNomEntitat: string
	objecteAny: string
	// Step 5: Motivació de la concessió
	motivacioLiniaEstrategica: LiniaEstrategica
	motivacioNomEntitat: string
	motivacioActuacioSubvencionada: string
	motivacioJustificacioExcepcionalitat: string
	// Step 6: Excepcionalitat de la concessió (només no nominatives)
	excepcionalitatActuacioSingular: string
	excepcionalitatRaonsInteres: string
	// Step 7: Compromisos assumits per la Corporació
	compromisosOpcio: OpcioImportSubvencio
	compromisosImportSubvencio: string
	compromisosCostTotal: string
	compromisosJustificacio100: string
	// Step 8: Consideracions a tenir en compte per a la concessió de la subvenció
	// Despeses elegibles
	consideracionseDespesesTipus: DespesesElegiblesTipus
	consideracionseDespesesIndirectes: DespesesIndirectes
	// Execució
	consideracionsExecucioDataInici: string
	consideracionsExecucioDataFi: string
	// Acreditació tècnica
	consideracionsAcreditacioTecnicaFotos: AcreditacioTecnicaInclouFotos
	// Acreditació econòmica
	consideracionsAcreditacioEconomicaSuposit: AcreditacioEconomicaSuposit
	consideracionsSuposit1Transfereix: Suposit1Transfereix
	consideracionsSuposit1Beneficiaris: Suposit1Beneficiari[]
	consideracionsSuposit3Opcio: Suposit3Opcio
	// Terminis de justificació
	consideracionsTerminiOpcio: TerminiJustificacioOpcio
	consideracionsTerminiADataInici: string
	consideracionsTerminiADataFi: string
	consideracionsTerminiSubOpcio: TerminiJustificacioSubOpcio
	consideracionsTerminiB1DataParcial: string
	consideracionsTerminiB2DataParcialInici: string
	consideracionsTerminiB2DataParcialFi: string
	consideracionsTerminiFinalDataInici: string
	consideracionsTerminiFinalDataFi: string
	// Pagament
	consideracionsePagamentOpcio: PagamentOpcio
	consideracionsePagamentOpcioCMotivacio: string
	consideracionsePagamentOpcioDMotivacio: string
	consideracionsePagamentRestaImport: boolean
}

// =============================================================================
// STEP DEFINITIONS - Add new steps here
// =============================================================================

const STEPS: StepConfig[] = [
	{
		id: "step1-antecedents",
		title: "Antecedents",
		generateContent: (formData, tipusBeneficiari) => {
			let antecedentsText = ""

			// Main antecedents text
			if (formData.tipusSubvencio === "nominativa") {
				const beneficiari = formData.textNomBeneficiari || "........................................."
				antecedentsText = `El pressupost general de la Diputació de Barcelona inclou la concessió d'una subvenció consignada nominativament a ${beneficiari}. Als efectes d'atorgar la concessió d'aquest ajut amb caràcter extraordinari, s'emet aquest informe tècnic.`
			} else if (formData.tipusSubvencio === "no-nominativa") {
				const data = formData.textOrdreInici || "XX de XXXX de 202X"
				const motiu = formData.textNomBeneficiari || "....................."
				antecedentsText = `D'acord amb l'ordre d'inici del Diputat delegat de l'Àrea d'Esports i Activitat Física, de ${data}, en que autoritza que es tramiti la sol·licitud als efectes d'atorgar la concessió d'un ajut econòmic per a ${motiu} de caràcter extraordinari, s'emet aquest informe tècnic.`
			}

			// Add declaració responsable if entitat
			if (tipusBeneficiari === "entitat" && formData.declaracioResponsable) {
				const beneficiari = formData.textNomBeneficiari || "L'entitat beneficiària"
				let declaracioText = ""

				switch (formData.declaracioResponsable) {
					case "presenta-declaracio":
						declaracioText = `${beneficiari} ha presentat una declaració responsable conforme compleix amb els requisits que estableix l'article 5.1. i 28 en el cas de fundacions de la Llei 11/2023, de 27 de desembre, de foment de l'associacionisme per poder ser destinatària de les mesures de foment, segons consta a l'expedient.`
						break
					case "no-compleix":
						declaracioText = `${beneficiari} ha manifestat que no compleix amb els requisits que estableix l'article 5.1. i 28 en el cas de fundacions de la Llei 11/2023, de 27 de desembre, de foment de l'associacionisme per poder ser destinatàries de les mesures de foment, segons consta a l'expedient.`
						break
					case "email-no-interesada":
						declaracioText = `${beneficiari} ha manifestat per correu electrònic que no està interessada en les mesures de foment previstes a la Llei 11/2023, de 27 de desembre, de foment de l'associacionisme, segons consta a l'expedient.`
						break
				}

				if (declaracioText) {
					antecedentsText += `\n\n${declaracioText}`
				}
			}

			return antecedentsText
		},
	},
	{
		id: "step2-resultat-objecte",
		title: "Objecte de la subvenció",
		generateContent: (formData) => {
			const entitat = formData.objecteNomEntitat || "............................................................."
			const any = formData.objecteAny || "202x"
			return `L'objecte de la subvenció és donar suport econòmic extraordinari a ${entitat} durant l'any ${any}.`
		},
	},
	{
		id: "step3-descripcio-actuacions",
		title: "Descripció de les actuacions",
		generateContent: (formData) => {
			if (!formData.descripcioActuacions) return ""
			return `Les actuacions consisteixen en ${formData.descripcioActuacions}`
		},
	},
	{
		id: "step4-motivacio-concessio",
		title: "Motivació de la concessió de la subvenció",
		generateContent: (formData) => {
			// Paràgrafs fixos per a tota Diba
			const paragraf1 = `La Diputació de Barcelona, assisteix i coopera amb els ens locals de la província de Barcelona en el foment del desenvolupament econòmic i social i en la seva planificació, d'acord amb les competències legalment atribuïdes.`

			const paragraf2 = `En data 11 de juliol de 2024, la Diputació de Barcelona ha aprovat el seu Pla d'Actuació de Mandat 2024-2027 (PAM) on estableix un programa de treball amb vocació transformadora per a aquest mandat.`

			// Paràgraf fix per a Esports
			const paragraf3 = `Atès aquest PAM, el marc de referència de l'Agenda 2030 i el caràcter transversal i multidimensional de la Diputació de Barcelona, l'Àrea d'Esports i Activitat Física de la Diputació de Barcelona (AEAF) té com a objectiu de mandat donar suport als municipis de la província de Barcelona mitjançant 7 línies estratègiques que configuren els programes i accions de l'Àrea i que s'estan desplegant amb les aliances dels ens locals i dels agents del teixit esportiu i social.`

			// Text de la línia estratègica seleccionada
			const liniesEstrategiques: Record<string, string> = {
				linia1: `En concret, aquesta subvenció s'emmarca en la línia 1 Esport per a tothom que té la finalitat de garantir i democratitzar la pràctica de l'esport i de l'activitat física per a tothom, des de l'equitat social i de gènere i des de la inclusió social d'aquells col·lectius més vulnerables i d'altres, amb necessitats i particularitats pròpies (joves, diversitat funcional, gent gran, etc.).`,
				linia2: `En concret, aquesta subvenció s'emmarca en la línia 2 Dones i esport que té la finalitat d'impulsar l'esport femení, al llarg de tota la vida de les dones, a través de programes d'activitat física continuada, posant èmfasi en la lluita contra el sedentarisme de la població jove.`,
				linia3: `En concret, aquesta subvenció s'emmarca en la línia 3 Qualitat a l'esport que té la finalitat de facilitar l'activitat física sostenible, generadora de benestar i de qualitat de vida. Una pràctica esportiva en igualtat i lliure de tota discriminació i abusos, tot actuant contra el masclisme i la violència de gènere, promovent la coeducació no sexista i fomentant l'esport femení.`,
				linia4: `En concret, aquesta subvenció s'emmarca en la línia 4 Esport outdoor que té la finalitat de promoure entorns actius a l'espai públic, tant al medi natural com urbà, facilitant la sostenibilitat dels esdeveniments i reduint el seu cost ambiental mitjançant la modernització de les instal·lacions. Fer de l'ecosistema esportiu municipal un entorn en valors cívics i democràtics, enriquint la vida comunitària dels barris, col·laborant amb els centres i entitats i prevenint problemes de convivència i d'exclusió social.`,
				linia5: `En concret, aquesta subvenció s'emmarca en la línia 5 Xarxa d'Equipaments Esportius que té la finalitat de consolidar una xarxa d'equipaments de qualitat i modernitzada que acompleixi condicions idònies d'atenció ciutadana i seguretat personal i col·lectiva, per a la pràctica física i esportiva.`,
				linia6: `En concret, aquesta subvenció s'emmarca en la línia 6 Serveis d'esports municipals que té la finalitat de preservar els serveis d'esports municipals per aconseguir l'assequibilitat dels preus públics i la sostenibilitat financera dels equipaments municipals, fent front a l'increment de la despesa operativa (cost energètic i gestió d'instal·lacions) i vetllant per l'equilibri econòmic dels models de gestió.`,
				linia7: `En concret, aquesta subvenció s'emmarca en la línia 7 Esdeveniments que té la finalitat de popularitzar les disciplines dels esdeveniments esportius més importants, tot promovent el territori de la província. És per aquest motiu, que es motiva continuar amb el projecte pels propers anys 2024, 2025, 2026 i 2027. En aquest període, es planteja mantenir aquestes fites amb alguna variació, com és l'edat del públic destinatari, que en aquest cas serà per adolescents i joves entre 12 i 20 anys.`,
			}

			const liniaText = formData.motivacioLiniaEstrategica ? liniesEstrategiques[formData.motivacioLiniaEstrategica] : ""

			// Text de justificació excepcionalitat
			const nomEntitat = formData.motivacioNomEntitat || "............................................................."
			const actuacio = formData.motivacioActuacioSubvencionada || "............................................................."
			const justificacio = formData.motivacioJustificacioExcepcionalitat || ""

			let excepcionalitat = ""
			if (justificacio) {
				excepcionalitat = `\n\nAixí doncs, ${nomEntitat} sol·licita un ajut econòmic extraordinari per ${actuacio}.\n\nJustificació de l'excepcionalitat: ${justificacio}`
			}

			// Text final fix
			const textFinal = `\n\nAmb aquest suport la Diputació ajudarà a l'entitat organitzadora/ens local ${nomEntitat}, a portar a terme ${actuacio}, de manera extraordinària, tal i com justifica en la seva sol·licitud.`

			return `${paragraf1}\n\n${paragraf2}\n\n${paragraf3}${liniaText ? `\n\n${liniaText}` : ""}${excepcionalitat}${textFinal}`
		},
	},
	{
		id: "step5-excepcionalitat-concessio",
		title: "Excepcionalitat de la concessió de la subvenció",
		generateContent: (formData) => {
			// Només mostrar per a subvencions no nominatives
			if (formData.tipusSubvencio !== "no-nominativa") return ""

			const introText = `Per al cas d'atorgament de subvencions per concessió directa NO nominatives, s'ha de justificar de forma veraç, objectiva i qualificable de forma indubtable perquè concorren raons d'interès públic, social i econòmic que dificulten la seva concessió per concurrència competitiva (arts. 16.3 c) i 26.2 de l'Ordenança General de Subvencions).`

			const actuacioSingular = formData.excepcionalitatActuacioSingular || "............................."
			const raonsInteres = formData.excepcionalitatRaonsInteres || "............................."

			const textActuacio = `Aquesta actuació és considera excepcional, i no és objecte de concurrència, atès que ${actuacioSingular}.`

			const textRaons = `Es tracta d'una actuació singular, en la qual concorren raons d'interès públic, social, econòmic i esportiu que dificulten la seva concessió per concurrència competitiva, donat que ${raonsInteres}.`

			const textFinal = `En el cas concret objecte de sol·licitud i pels motius esmentats, concorren raons d'interès públic i social que justifiquen la concessió de la subvenció.`

			return `${introText}\n\n${textActuacio}\n\n${textRaons}\n\n${textFinal}`
		},
	},
	{
		id: "step6-compromisos-corporacio",
		title: "Compromisos assumits per la Corporació",
		generateContent: (formData) => {
			const importSubvencio = formData.compromisosImportSubvencio || "............................."
			const costTotal = formData.compromisosCostTotal || "xxxxxxxxx"

			const introText = `Es proposa la concessió d'una subvenció directa per un import total de ${importSubvencio} EUR amb càrrec a l'aplicació pressupostària corresponent del vigent pressupost.`

			if (formData.compromisosOpcio === "opcioA") {
				return `${introText}\n\nEl cost total pressupostat és de ${costTotal} EUR i d'acord amb l'article 9.2 de l'Ordenança General de Subvencions de la Diputació de Barcelona la subvenció no excedeix el 50% del cost de l'activitat/obra.`
			} else if (formData.compromisosOpcio === "opcioB") {
				const justificacio = formData.compromisosJustificacio100 || "d'un projecte pilot o concorren raons d'interès econòmic, social, etc....pels municipis que acolliran els esdeveniments, etc..."
				return `${introText}\n\nNota.- Al proposar subvencionar quanties superiors al 50%, s'han de justificar molt bé els motius, en especialment tenint en compte que es tracta d'entitats, per donar compliment a l'article 9.2 de l'Ordenança general de subvencions, que estableix:\n"9.2. Les subvencions no han d'excedir, normalment, del 50% del cost de l'activitat a què s'apliquin. En els casos en què s'ultrapassi aquest límit, se n'ha de justificar la necessitat a l'expedient"\n\nEs podrà subvencionar un import de fins a un 100% del cost total de les actuacions subvencionades, atès que les actuacions sol·licitades formen part ${justificacio}.`
			}

			return introText
		},
	},
	{
		id: "step7-consideracions-concessio",
		title: "Consideracions a tenir en compte per a la concessió de la subvenció",
		generateContent: (formData) => {
			const sections: string[] = []

			// 1. Identificació i senyalització (text fix)
			sections.push(
				`<strong>Identificació i senyalització:</strong>\nL'entitat / ens local farà constar la col·laboració de la Diputació de Barcelona en l'activitat/obra subvencionada, incloent el logotip de la Diputació en tot el material de difusió de l'esdeveniment/l'obra ja fos gràfic, electrònic i/o audiovisual (cartells, anuncis, web, etc.). Així mateix, facilitarà la instal·lació de material d'imatge corporativa (banderoles, pancartes, cartell d'obra...) durant l'esdevenir de les activitats/obres subvencionades.`
			)

			// 2. Despeses elegibles
			let despesesText = `<strong>Despeses elegibles:</strong>\n`
			if (formData.consideracionseDespesesTipus === "activitats") {
				despesesText += `Per al cas de subvencions relatives a activitats (OAE):\nSeran elegibles les despeses de personal i despeses corrents en béns i serveis, sempre i quan estiguin directament vinculades a l'activitat subvencionada.`
			} else if (formData.consideracionseDespesesTipus === "inversions") {
				despesesText += `Per al cas de subvencions relatives a inversions (OEE):\nSeran elegibles les despeses vinculades amb l'execució d'obres sempre i quan estiguin directament vinculades a l'activitat subvencionada.`
			}
			if (formData.consideracionseDespesesIndirectes === "accepta") {
				despesesText += `\n\nPer al cas d'acceptar despeses indirectes:\nEs podran imputar fins a un 5% de despeses indirectes, sempre que aquestes corresponguin al període en el qual efectivament s'ha dut a terme l'activitat/l'obra.`
			} else if (formData.consideracionseDespesesIndirectes === "no-accepta") {
				despesesText += `\n\nPer al cas de no acceptar despeses indirectes:\nNo es podran imputar fins a un 5% de despeses indirectes, sempre que aquestes corresponguin al període en el qual efectivament s'ha dut a terme l'activitat/l'obra.`
			}
			if (formData.consideracionseDespesesTipus || formData.consideracionseDespesesIndirectes) {
				sections.push(despesesText)
			}

			// 3. Termini d'execució
			if (formData.consideracionsExecucioDataInici && formData.consideracionsExecucioDataFi) {
				sections.push(`<strong>Termini d'execució:</strong>\nL'execució de les actuacions s'estableix entre ${formData.consideracionsExecucioDataInici} i ${formData.consideracionsExecucioDataFi}.`)
			}

			// 4. Forma de justificació
			let justificacioText = `<strong>Forma de justificació:</strong>\nLa justificació de les actuacions haurà de dur-se a terme mitjançant la següent documentació:`

			// Acreditació tècnica
			justificacioText += `\n\n<em>Acreditació tècnica:</em>\nMemòria de l'actuació justificativa del compliment de les condicions imposades, així com de les activitats/obres realitzades i els resultats obtinguts i si s'escau les desviacions respecte el pressupost previst.`
			if (formData.consideracionsAcreditacioTecnicaFotos === "si") {
				justificacioText += `\nLa memòria d'actuació ha d'incloure un recull fotogràfic, on es pugui constatar la presència de la imatge corporativa de la Diputació de Barcelona.`
			}

			// Acreditació econòmica
			justificacioText += `\n\n<em>Acreditació econòmica:</em>`
			if (formData.consideracionsAcreditacioEconomicaSuposit === "suposit1") {
				justificacioText += `\nPer al cas d'atorgament de subvencions a ens locals:\nCertificació de funcionari públic (Secretari/a i/o Interventor/a)`
				if (formData.consideracionsSuposit1Transfereix === "si" && formData.consideracionsSuposit1Beneficiaris && formData.consideracionsSuposit1Beneficiaris.length > 0) {
					justificacioText += `\n\nUna part de l'ajut es transferirà a una entitat que ha col·laborat o coorganitzat l'actuació subvencionada caldrà detallar la quantitat de l'ajut que es transfereix a l'entitat. En cas de vàries entitats, detallar el que correspon a cadascuna de les entitats:\n\n`
					// Generar taula HTML amb els mateixos estils que la taula de pressupost (DocumentPreview.tsx)
					justificacioText += `<div style="overflow: hidden; border-radius: 2px; border: 1px solid #e5e7eb;">
<table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
<thead>
<tr>
<th style="background-color: #991b1b; color: white; padding: 8px; border: 1px solid #d4d4d8; text-align: left; font-weight: 600;">Nom ens</th>
<th style="background-color: #991b1b; color: white; padding: 8px; border: 1px solid #d4d4d8; text-align: left; font-weight: 600;">NIF ens</th>
<th style="background-color: #991b1b; color: white; padding: 8px; border: 1px solid #d4d4d8; text-align: left; font-weight: 600;">Domicili ens</th>
<th style="background-color: #991b1b; color: white; padding: 8px; border: 1px solid #d4d4d8; text-align: right; font-weight: 600;">Import</th>
</tr>
</thead>
<tbody>`
					formData.consideracionsSuposit1Beneficiaris.forEach((beneficiari) => {
						justificacioText += `
<tr>
<td style="padding: 8px; border: 1px solid #d4d4d8;">${beneficiari.nomEns || ""}</td>
<td style="padding: 8px; border: 1px solid #d4d4d8;">${beneficiari.nifEns || ""}</td>
<td style="padding: 8px; border: 1px solid #d4d4d8;">${beneficiari.domiciliEns || ""}</td>
<td style="padding: 8px; border: 1px solid #d4d4d8; text-align: right;">${beneficiari.import || ""}</td>
</tr>`
					})
					justificacioText += `
</tbody>
</table>
</div>`
				}
			} else if (formData.consideracionsAcreditacioEconomicaSuposit === "suposit2") {
				justificacioText += `\nPer al cas d'atorgament de subvencions a entitats per import de fins a 20.000 euros:\nCompte justificatiu simplificat, amb relació de despeses i ingressos, i posterior mostreig de justificants de despesa.`
			} else if (formData.consideracionsAcreditacioEconomicaSuposit === "suposit3") {
				justificacioText += `\nPer al cas d'atorgament de subvencions a entitats per import superior a 20.000 euros:`
				if (formData.consideracionsSuposit3Opcio === "opcioA") {
					justificacioText += `\nCompte justificatiu, amb relació de despeses i ingressos i aportació de justificants de despesa.`
				} else if (formData.consideracionsSuposit3Opcio === "opcioB") {
					justificacioText += `\nCompte justificatiu amb informe d'auditor i amb relació de despeses i ingressos.`
				} else if (formData.consideracionsSuposit3Opcio === "opcioC") {
					justificacioText += `\nCompte justificatiu amb informe d'auditor i memòria econòmica abreujada.`
				}
			}
			sections.push(justificacioText)

			// 5. Terminis de justificació
			let terminisText = `<strong>Terminis de justificació de la subvenció:</strong>\nEs podrà justificar despesa generada dins del període d'execució de l'ajut.\n`
			if (formData.consideracionsTerminiOpcio === "opcioA") {
				const dataInici = formData.consideracionsTerminiADataInici || "XX"
				const dataFi = formData.consideracionsTerminiADataFi || "XX"
				terminisText += `\nCaldrà presentar la justificació de les actuacions entre ${dataInici} i ${dataFi}.`
			} else if (formData.consideracionsTerminiOpcio === "opcioB") {
				terminisText += `\nEls terminis de justificació s'estableix en els següents períodes:`
				if (formData.consideracionsTerminiSubOpcio === "B1") {
					const dataParcial = formData.consideracionsTerminiB1DataParcial || "31 d'octubre/15 novembre de 202X"
					const dataFinalInici = formData.consideracionsTerminiFinalDataInici || "XX de XXXXXX"
					const dataFinalFi = formData.consideracionsTerminiFinalDataFi || "XX de XXXXX de 202X"
					terminisText += `\n\nUn primer període voluntari fins el ${dataParcial}.\nUn segon període final entre el ${dataFinalInici} i el ${dataFinalFi}.`
				} else if (formData.consideracionsTerminiSubOpcio === "B2") {
					const dataParcialInici = formData.consideracionsTerminiB2DataParcialInici || "XX de XXXXXX"
					const dataParcialFi = formData.consideracionsTerminiB2DataParcialFi || "XX de XXXXXX"
					const dataFinalInici = formData.consideracionsTerminiFinalDataInici || "XX de XXXXXX"
					const dataFinalFi = formData.consideracionsTerminiFinalDataFi || "XX de XXXXX de 202X"
					terminisText += `\n\nUn primer període voluntari entre ${dataParcialInici} i ${dataParcialFi}.\nUn segon període final entre el ${dataFinalInici} i el ${dataFinalFi}.`
				}
			}
			if (formData.consideracionsTerminiOpcio) {
				sections.push(terminisText)
			}

			// 6. Pagament
			let pagamentText = `<strong>Pagament:</strong>\n`
			const importAvancat = formData.compromisosImportSubvencio || "..."

			if (formData.consideracionsePagamentOpcio === "opcioA") {
				pagamentText += `\nEl pagament es farà contra presentació de justificació per part de l'entitat destinatària.`
			} else if (formData.consideracionsePagamentOpcio === "opcioB") {
				pagamentText += `Es realitzaran pagaments avançats, ja que compleix, segons consta a l'expedient d'acord amb la declaració responsable presentada, amb els requisits establerts a l'article 5.1 i 28 en el cas de fundacions.\n\nAtès que en la part resolutiva del decret d'atorgament de la subvenció, s'establirà que la Diputació de Barcelona avançarà un import de ${importAvancat} EUR en un únic pagament, i que el beneficiari ha de presentar l'acceptació de la subvenció.\n\nAtès que el pagament avançat es farà efectiu un cop el beneficiari hagi acceptat expressament la subvenció.\n\nEn aquest sentit, de conformitat amb el Reial Decret 887/2006, de 21 de juliol, pel qual s'aprova el Reglament de la Llei 38/2003, de 17 de novembre, general de subvencions, així com amb les Bases d'execució del Pressupost de la Diputació del present exercici, es posa de manifest el següent:\n\nQue no s'ha dictat cap resolució de reintegrament o pèrdua del dret de cobrament de la subvenció per alguna de les causes de l'art. 37 de la Llei general de subvencions, que hagi estat promoguda des d'aquest centre gestor.\n\nQue no s'ha acordat per l'òrgan concedent cap mesura cautelar de retenció dels pagaments pendents d'abonar referits a la mateixa subvenció, que hagi estat promoguda des d'aquest centre gestor.\n\nEn conseqüència, s'informa favorablement per a la tramitació de l'atorgament de la subvenció, i del seu pagament avançat, prèvia a la seva acceptació.`
			} else if (formData.consideracionsePagamentOpcio === "opcioC") {
				const motivacio = formData.consideracionsePagamentOpcioCMotivacio || "garantir l'execució de les actuacions"
				pagamentText += `\nEs realitzaran pagaments avançats, atès que l'entitat ha sol·licitat aquesta modalitat de pagament per tal de ${motivacio}.\n\nAtès que en la part resolutiva del decret d'atorgament de la subvenció, s'establirà que la Diputació de Barcelona avançarà un import de ${importAvancat} EUR en un únic pagament, i que el beneficiari ha de presentar l'acceptació de la subvenció.\n\nAtès que el pagament avançat es farà efectiu un cop el beneficiari hagi acceptat expressament la subvenció.\n\nEn aquest sentit, de conformitat amb el Reial Decret 887/2006, de 21 de juliol, pel qual s'aprova el Reglament de la Llei 38/2003, de 17 de novembre, general de subvencions, així com amb les Bases d'execució del Pressupost de la Diputació del present exercici, es posa de manifest el següent:\n\nQue no s'ha dictat cap resolució de reintegrament o pèrdua del dret de cobrament de la subvenció per alguna de les causes de l'art. 37 de la Llei general de subvencions, que hagi estat promoguda des d'aquest centre gestor.\n\nQue no s'ha acordat per l'òrgan concedent cap mesura cautelar de retenció dels pagaments pendents d'abonar referits a la mateixa subvenció, que hagi estat promoguda des d'aquest centre gestor.\n\nEn conseqüència, s'informa favorablement per a la tramitació de l'atorgament de la subvenció, i del seu pagament avançat, prèvia a la seva acceptació.`
			} else if (formData.consideracionsePagamentOpcio === "opcioD") {
				const motivacio =
					formData.consideracionsePagamentOpcioDMotivacio ||
					"com a conseqüència de problemes de tresoreria, per evitar tensions de tresoreria que comportaria fer-se càrrec de la despesa abans de rebre l'import de la subvenció"
				pagamentText += `\nEs realitzarà pagament avançat atès que:\nL'ens local ha sol·licitat aquesta modalitat de pagament.\n\nL'ens local ha manifestat que no disposa de recursos suficients ${motivacio}.\n\nPer tant, és necessari el pagament avançat perquè l'ajuntament no disposa de suficient liquiditat per assumir transitòriament els costos d'execució de l'actuació inherents a la subvenció.\n\nEn la part resolutiva del decret d'atorgament de la subvenció, s'establirà que la Diputació de Barcelona avançarà un import de ${importAvancat} EUR en un únic pagament, i també es preveurà que el beneficiari ha de presentar l'acceptació de la subvenció.\n\nEl pagament avançat es farà efectiu un cop el beneficiari hagi acceptat expressament la subvenció.\n\nEn aquest sentit, de conformitat amb el Reial Decret 887/2006, de 21 de juliol, pel qual s'aprova el Reglament de la Llei 38/2003, de 17 de novembre, general de subvencions, així com amb les Bases d'execució del Pressupost de la Diputació del present exercici, es posa de manifest el següent:\n\nQue no s'ha dictat cap resolució de reintegrament o pèrdua del dret de cobrament de la subvenció per alguna de les causes de l'art. 37 de la Llei general de subvencions, que hagi estat promoguda des d'aquest centre gestor.\n\nQue no s'ha acordat per l'òrgan concedent cap mesura cautelar de retenció dels pagaments pendents d'abonar referits a la mateixa subvenció, que hagi estat promoguda des d'aquest centre gestor.\n\nEn conseqüència, s'informa favorablement per a la tramitació de l'atorgament de la subvenció, i del seu pagament avançat, prèvia a la seva acceptació.`
			}

			// Afegir text opcional de resta d'import
			if (formData.consideracionsePagamentRestaImport && formData.consideracionsePagamentOpcio && formData.consideracionsePagamentOpcio !== "opcioA") {
				pagamentText += `\n\nLa resta de l'import es farà efectiu contra justificació.`
			}

			if (formData.consideracionsePagamentOpcio) {
				sections.push(pagamentText)
			}

			return sections.join("\n\n")
		},
	},
]

// =============================================================================
// STEP FORM COMPONENTS - Add new step form components here
// =============================================================================

interface StepFormProps {
	formData: InformeTecnicFormData
	setFormData: React.Dispatch<React.SetStateAction<InformeTecnicFormData>>
	extractedData: SubvencioData
	selectedModel?: string
}

// Step 1: Antecedents / Tipus de subvenció (includes Declaració responsable for entitats)
function Step1Form({ formData, setFormData, preFormData }: StepFormProps & { preFormData: any }) {
	const handleTipusChange = (value: string) => {
		setFormData((prev) => ({
			...prev,
			tipusSubvencio: value as TipusSubvencio,
		}))
	}

	const isEntitat = preFormData?.tipusBeneficiari === "entitat"

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>1. Antecedents</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Tipus de subvenció */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Tipus de subvenció</Label>
					<RadioGroup value={formData.tipusSubvencio || ""} onValueChange={handleTipusChange}>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='nominativa' id='nominativa' />
							<Label htmlFor='nominativa' className='font-normal cursor-pointer'>
								Subvenció nominativa
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='no-nominativa' id='no-nominativa' />
							<Label htmlFor='no-nominativa' className='font-normal cursor-pointer'>
								Subvenció no nominativa
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Camp per subvenció nominativa */}
				{formData.tipusSubvencio === "nominativa" && (
					<div className='space-y-2'>
						<Label htmlFor='text-nominativa'>Beneficiari de la subvenció</Label>
						<Textarea
							id='text-nominativa'
							placeholder='Introduïu el nom del beneficiari...'
							value={formData.textNomBeneficiari}
							onChange={(e) => setFormData((prev) => ({ ...prev, textNomBeneficiari: e.target.value }))}
							className='min-h-[60px]'
						/>
					</div>
				)}

				{/* Camps per subvenció no nominativa */}
				{formData.tipusSubvencio === "no-nominativa" && (
					<div className='space-y-3'>
						<div className='space-y-2'>
							<Label htmlFor='data-ordre'>Data de l'ordre d'inici</Label>
							<Input id='data-ordre' placeholder='Ex: 15 de gener de 2024' value={formData.textOrdreInici} onChange={(e) => setFormData((prev) => ({ ...prev, textOrdreInici: e.target.value }))} />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='motiu-ajut'>Beneficiari / Motiu de l'ajut</Label>
							<Textarea
								id='motiu-ajut'
								placeholder="Introduïu el beneficiari o motiu de l'ajut..."
								value={formData.textNomBeneficiari}
								onChange={(e) => setFormData((prev) => ({ ...prev, textNomBeneficiari: e.target.value }))}
								className='min-h-[60px]'
							/>
						</div>
					</div>
				)}

				{/* Declaració responsable (només per entitats) */}
				{isEntitat && (
					<div className='space-y-3 border-t pt-4'>
						<Label className='font-semibold'>Declaració responsable (Llei 11/2023)</Label>
						<RadioGroup value={formData.declaracioResponsable || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, declaracioResponsable: v as any }))}>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='presenta-declaracio' id='presenta-declaracio' className='mt-1' />
								<Label htmlFor='presenta-declaracio' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Presenta declaració responsable</span>
									<br />
									<span className='text-muted-foreground text-sm'>Compleix amb els requisits de l'article 5.1. i 28 de la Llei 11/2023</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='no-compleix' id='no-compleix' className='mt-1' />
								<Label htmlFor='no-compleix' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Manifesta que no compleix</span>
									<br />
									<span className='text-muted-foreground text-sm'>No compleix amb els requisits de la Llei 11/2023</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='email-no-interesada' id='email-no-interesada' className='mt-1' />
								<Label htmlFor='email-no-interesada' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>No interessada (email)</span>
									<br />
									<span className='text-muted-foreground text-sm'>Ha manifestat per correu electrònic que no està interessada</span>
								</Label>
							</div>
						</RadioGroup>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// Step 3: Descripció de les actuacions
function Step3DescripcioForm({ formData, setFormData, extractedData, selectedModel }: StepFormProps) {
	const [isLoading, setIsLoading] = useState(false)

	// Camps de memoria_actuacio per mostrar com a referència
	const memoriaFields = [
		{ key: "titol_actuacions_i_municipi", label: "Títol de les actuacions i municipi" },
		{ key: "descripcio_actuacions", label: "Descripció de les actuacions" },
		{ key: "objectius_resultats", label: "Objectius i resultats esperats" },
		{ key: "actuacions_relacionades_objectius", label: "Actuacions relacionades amb els objectius" },
		{ key: "pla_treball_calendaritzat", label: "Pla de treball calendaritzat" },
	] as const

	const handleAIGenerate = async () => {
		setIsLoading(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")

			// Construir context amb tots els camps de memoria_actuacio
			const memoriaContext = `
Títol: ${extractedData.memoria_actuacio?.titol_actuacions_i_municipi || "No disponible"}
Descripció original: ${extractedData.memoria_actuacio?.descripcio_actuacions || "No disponible"}
Objectius i resultats: ${extractedData.memoria_actuacio?.objectius_resultats || "No disponible"}
Actuacions relacionades: ${extractedData.memoria_actuacio?.actuacions_relacionades_objectius || "No disponible"}
Pla de treball: ${extractedData.memoria_actuacio?.pla_treball_calendaritzat || "No disponible"}
			`.trim()

			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
Municipi: ${extractedData.dades_generals?.municip_actuacio || "No disponible"}
Any d'execució: ${extractedData.dades_generals?.any_execucio || "No disponible"}
			`.trim()

			const prompt = `Genera una descripció detallada de les actuacions per a un informe tècnic de subvenció.

La descripció ha d'explicar amb el major detall possible:
- En què consisteix l'actuació
- Per què és important i transcendent
- Qui hi assisteix
- Repercussió econòmica, turística i social en el municipi
- Quantes edicions té (si aplica)
- Qui aprofitarà les obres o resultats

Dades del projecte:
${projectContext}

Memòria d'actuació de la sol·licitud:
${memoriaContext}

Genera el text en català, de manera formal i adequada per a un informe tècnic administratiu. Ha de ser un text clar, concís i ben estructurat. Retorna només el text de la descripció, sense encapçalaments.`

			const result = await askLLM({
				prompt,
				module: "elaboracio",
				model: selectedModel || "gemini-2.5-flash",
				jsonResponse: false, // We want plain text, not JSON
			})
			const data = result.data as any
			// La resposta ve en format: {status, data: "text", text: "..."}
			// Prefer 'text' field which is always plain string
			const rawData = data?.text || data?.data || data?.response || ""
			// Ensure we have a string (in case data is an object)
			const generatedText = typeof rawData === "string" ? rawData : rawData?.text || JSON.stringify(rawData)
			console.log("Generated text from AI:", generatedText)
			if (generatedText) {
				setFormData((prev) => ({ ...prev, descripcioActuacions: generatedText }))
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<div className='flex items-center justify-between'>
					<CardTitle className='text-base'>3. Descripció de les actuacions</CardTitle>
					<Button variant='outline' size='sm' onClick={handleAIGenerate} disabled={isLoading} className='gap-1'>
						{isLoading ? (
							<>
								<Loader2 className='h-3 w-3 animate-spin' />
								Generant...
							</>
						) : (
							<>
								<Sparkles className='h-3 w-3' />
								Generar amb IA
							</>
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Camps de referència de memoria_actuacio */}
				<div className='space-y-3 rounded-md border bg-muted/30 p-3'>
					<Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Dades de la memòria d'actuació (sol·licitud)</Label>
					{memoriaFields.map((field) => {
						const value = extractedData.memoria_actuacio?.[field.key]
						return (
							<div key={field.key} className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>{field.label}</Label>
								<p className='text-sm bg-background rounded px-2 py-1.5 border'>{value || <span className='italic text-muted-foreground'>No disponible</span>}</p>
							</div>
						)
					})}
				</div>

				{/* Camp editable per la descripció final */}
				<div className='space-y-2'>
					<Label htmlFor='descripcio-actuacions'>Les actuacions consisteixen en...</Label>
					<Textarea
						id='descripcio-actuacions'
						placeholder="Expliqueu amb el major detall possible en què consisteix l'actuació, per què és important, transcendent, qui assisteix, repercussió econòmica, turística, social, en el municipi o municipis, quantes edicions, qui aprofitarà les obres, etc."
						value={formData.descripcioActuacions}
						onChange={(e) => setFormData((prev) => ({ ...prev, descripcioActuacions: e.target.value }))}
						className='min-h-[150px]'
					/>
					<p className='text-xs text-muted-foreground'>Nota: Quan el beneficiari és una entitat (no un ens local), expliqueu qui és l'entitat i què representa.</p>
				</div>
			</CardContent>
		</Card>
	)
}

// Step 2: Objecte de la subvenció
function Step2ObjecteForm({ formData, setFormData, extractedData }: StepFormProps) {
	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>2. Objecte de la subvenció</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Nom entitat beneficiària (copiat de la capçalera) */}
				<div className='space-y-2'>
					<Label htmlFor='objecte-nom-entitat'>Nom entitat beneficiària</Label>
					<Input id='objecte-nom-entitat' placeholder="Nom de l'entitat beneficiària..." value={formData.objecteNomEntitat} onChange={(e) => setFormData((prev) => ({ ...prev, objecteNomEntitat: e.target.value }))} />
					<p className='text-xs text-muted-foreground'>Copiat de la capçalera del document</p>
				</div>

				{/* Any */}
				<div className='space-y-2'>
					<Label htmlFor='objecte-any'>Any</Label>
					<Input id='objecte-any' placeholder='Ex: 2024' value={formData.objecteAny} onChange={(e) => setFormData((prev) => ({ ...prev, objecteAny: e.target.value }))} />
				</div>
			</CardContent>
		</Card>
	)
}

// Step 4: Motivació de la concessió de la subvenció
function Step4MotivaForm({ formData, setFormData, extractedData, selectedModel }: StepFormProps) {
	const [isLoading, setIsLoading] = useState(false)

	const liniesEstrategiques = [
		{ value: "linia1", label: "Línia 1: Esport per a tothom", description: "Garantir i democratitzar la pràctica de l'esport i de l'activitat física per a tothom" },
		{ value: "linia2", label: "Línia 2: Dones i esport", description: "Impulsar l'esport femení, lluitar contra el sedentarisme" },
		{ value: "linia3", label: "Línia 3: Qualitat a l'esport", description: "Activitat física sostenible, igualtat i coeducació no sexista" },
		{ value: "linia4", label: "Línia 4: Esport outdoor", description: "Entorns actius a l'espai públic, sostenibilitat, valors cívics" },
		{ value: "linia5", label: "Línia 5: Xarxa d'Equipaments Esportius", description: "Equipaments de qualitat, atenció ciutadana i seguretat" },
		{ value: "linia6", label: "Línia 6: Serveis d'esports municipals", description: "Sostenibilitat financera, assequibilitat dels preus públics" },
		{ value: "linia7", label: "Línia 7: Esdeveniments", description: "Popularitzar esdeveniments esportius, promoure el territori" },
	]

	const handleAIGenerate = async () => {
		setIsLoading(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")

			// Context de la sol·licitud
			const excepcionalitat = extractedData.excepcionalitat?.justificacio_text || ""
			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
Municipi: ${extractedData.dades_generals?.municip_actuacio || "No disponible"}
Any d'execució: ${extractedData.dades_generals?.any_execucio || "No disponible"}
			`.trim()

			const memoriaContext = `
Descripció actuacions: ${extractedData.memoria_actuacio?.descripcio_actuacions || "No disponible"}
Objectius i resultats: ${extractedData.memoria_actuacio?.objectius_resultats || "No disponible"}
			`.trim()

			const prompt = `Millora i amplia la justificació de l'excepcionalitat per a un informe tècnic de subvenció.

La justificació ha d'explicar de manera formal i convincent per què aquesta actuació mereix una subvenció extraordinària.

Dades del projecte:
${projectContext}

Memòria d'actuació:
${memoriaContext}

Justificació original de la sol·licitud (punt 9):
${excepcionalitat || "No disponible"}

Genera el text en català, de manera formal i adequada per a un informe tècnic administratiu. Ha de ser un text clar, concís i ben estructurat que justifiqui l'excepcionalitat de l'actuació. Retorna només el text de la justificació, sense encapçalaments.`

			const result = await askLLM({
				prompt,
				module: "elaboracio",
				model: selectedModel || "gemini-2.5-flash",
				jsonResponse: false, // We want plain text, not JSON
			})
			const data = result.data as any
			// La resposta ve en format: {status, data: "text", text: "..."}
			// Prefer 'text' field which is always plain string
			const rawData = data?.text || data?.data || data?.response || ""
			const generatedText = typeof rawData === "string" ? rawData : rawData?.text || JSON.stringify(rawData)
			if (generatedText) {
				setFormData((prev) => ({ ...prev, motivacioJustificacioExcepcionalitat: generatedText }))
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>4. Motivació de la concessió de la subvenció</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Línia estratègica */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Línia estratègica (AEAF)</Label>
					<RadioGroup value={formData.motivacioLiniaEstrategica || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, motivacioLiniaEstrategica: v as LiniaEstrategica }))}>
						{liniesEstrategiques.map((linia) => (
							<div key={linia.value} className='flex items-start space-x-2'>
								<RadioGroupItem value={linia.value} id={linia.value} className='mt-1' />
								<Label htmlFor={linia.value} className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>{linia.label}</span>
									<br />
									<span className='text-muted-foreground text-sm'>{linia.description}</span>
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>

				{/* Nom entitat beneficiària */}
				<div className='space-y-2'>
					<Label htmlFor='motivacio-nom-entitat'>Nom entitat beneficiària</Label>
					<Input
						id='motivacio-nom-entitat'
						placeholder="Nom de l'entitat beneficiària..."
						value={formData.motivacioNomEntitat}
						onChange={(e) => setFormData((prev) => ({ ...prev, motivacioNomEntitat: e.target.value }))}
					/>
					<p className='text-xs text-muted-foreground'>Copiat de la capçalera del document</p>
				</div>

				{/* Actuació subvencionada */}
				<div className='space-y-2'>
					<Label htmlFor='motivacio-actuacio'>Actuació subvencionada</Label>
					<Input
						id='motivacio-actuacio'
						placeholder='Actuació objecte de la subvenció...'
						value={formData.motivacioActuacioSubvencionada}
						onChange={(e) => setFormData((prev) => ({ ...prev, motivacioActuacioSubvencionada: e.target.value }))}
					/>
					<p className='text-xs text-muted-foreground'>Copiat de la capçalera del document</p>
				</div>

				{/* Justificació excepcionalitat */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<Label htmlFor='motivacio-justificacio'>Justificació de l'excepcionalitat</Label>
						<Button variant='outline' size='sm' onClick={handleAIGenerate} disabled={isLoading} className='gap-1'>
							{isLoading ? (
								<>
									<Loader2 className='h-3 w-3 animate-spin' />
									Generant...
								</>
							) : (
								<>
									<Sparkles className='h-3 w-3' />
									Millorar amb IA
								</>
							)}
						</Button>
					</div>

					{/* Referència del punt 9 de la sol·licitud */}
					{extractedData.excepcionalitat?.justificacio_text && (
						<div className='rounded-md border bg-muted/30 p-3 space-y-1'>
							<Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Justificació original (punt 9 sol·licitud)</Label>
							<p className='text-sm'>{extractedData.excepcionalitat.justificacio_text}</p>
						</div>
					)}

					<Textarea
						id='motivacio-justificacio'
						placeholder="Justifiqueu l'excepcionalitat de l'actuació..."
						value={formData.motivacioJustificacioExcepcionalitat}
						onChange={(e) => setFormData((prev) => ({ ...prev, motivacioJustificacioExcepcionalitat: e.target.value }))}
						className='min-h-[120px]'
					/>
				</div>
			</CardContent>
		</Card>
	)
}

// Step 5: Excepcionalitat de la concessió de la subvenció (només per a no nominatives)
function Step5ExcepcionalitatForm({ formData, setFormData, extractedData, selectedModel }: StepFormProps) {
	const [isLoading, setIsLoading] = useState(false)

	const handleAIGenerate = async () => {
		setIsLoading(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")

			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
Municipi: ${extractedData.dades_generals?.municip_actuacio || "No disponible"}
Any d'execució: ${extractedData.dades_generals?.any_execucio || "No disponible"}
			`.trim()

			const memoriaContext = `
Descripció actuacions: ${extractedData.memoria_actuacio?.descripcio_actuacions || "No disponible"}
Objectius i resultats: ${extractedData.memoria_actuacio?.objectius_resultats || "No disponible"}
			`.trim()

			const excepcionalitat = extractedData.excepcionalitat?.justificacio_text || ""

			const prompt = `Genera dos textos per justificar l'excepcionalitat d'una subvenció directa NO nominativa per a un informe tècnic.

Segons l'Ordenança General de Subvencions (arts. 16.3 c) i 26.2), cal justificar raons d'interès públic, social i econòmic que dificulten la concessió per concurrència competitiva.

Dades del projecte:
${projectContext}

Memòria d'actuació:
${memoriaContext}

Justificació original de la sol·licitud:
${excepcionalitat || "No disponible"}

Genera DOS textos en format JSON:
1. "actuacioSingular": Explica per què l'actuació és excepcional i no és objecte de concurrència. Exemples: és l'únic municipi escollit com ciutat europea de l'esport, seu d'un projecte especial, finançament d'obres per aniversari d'un club, etc.
2. "raonsInteres": Explica les raons d'interès públic, social, econòmic i esportiu. Exemples: es promouran experiències i bones pràctiques, impacte en la societat, millora d'instal·lacions, foment de l'activitat física, etc.

Retorna NOMÉS un JSON vàlid amb aquest format:
{"actuacioSingular": "text...", "raonsInteres": "text..."}`

			const result = await askLLM({
				prompt,
				module: "elaboracio",
				model: selectedModel || "gemini-2.5-flash",
				jsonResponse: true, // We expect JSON response
			})
			const data = result.data as any
			// La resposta ve en format: {status, data: object (if JSON), text: "..."}
			// data.data will be parsed JSON object, data.text is raw string
			const responseData = data?.data
			const responseText = data?.text || ""

			try {
				// If responseData is already an object (parsed JSON), use it directly
				const parsed = typeof responseData === "object" && responseData !== null ? responseData : JSON.parse(responseText)
				if (parsed.actuacioSingular) {
					setFormData((prev) => ({ ...prev, excepcionalitatActuacioSingular: parsed.actuacioSingular }))
				}
				if (parsed.raonsInteres) {
					setFormData((prev) => ({ ...prev, excepcionalitatRaonsInteres: parsed.raonsInteres }))
				}
			} catch {
				// Si no és JSON, usar el text directe
				const textValue = typeof responseText === "string" ? responseText : ""
				if (textValue) {
					setFormData((prev) => ({ ...prev, excepcionalitatActuacioSingular: textValue }))
				}
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<div className='flex items-center justify-between'>
					<CardTitle className='text-base'>5. Excepcionalitat de la concessió (no nominativa)</CardTitle>
					<Button variant='outline' size='sm' onClick={handleAIGenerate} disabled={isLoading} className='gap-1'>
						{isLoading ? (
							<>
								<Loader2 className='h-3 w-3 animate-spin' />
								Generant...
							</>
						) : (
							<>
								<Sparkles className='h-3 w-3' />
								Generar amb IA
							</>
						)}
					</Button>
				</div>
				<p className='text-xs text-muted-foreground mt-1'>Cal justificar raons d'interès públic, social i econòmic (arts. 16.3 c) i 26.2 de l'Ordenança General de Subvencions)</p>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Actuació singular */}
				<div className='space-y-2'>
					<Label htmlFor='excepcionalitat-actuacio'>Per què l'actuació és excepcional?</Label>
					<Textarea
						id='excepcionalitat-actuacio'
						placeholder="Exemple: es tracta de l'únic municipi escollit com ciutat europea de l'esport, seu del projecte..., financen les obres del camp de futbol per al 10è aniversari del Club..., etc."
						value={formData.excepcionalitatActuacioSingular}
						onChange={(e) => setFormData((prev) => ({ ...prev, excepcionalitatActuacioSingular: e.target.value }))}
						className='min-h-[100px]'
					/>
					<p className='text-xs text-muted-foreground'>Expliqueu per què no és objecte de concurrència competitiva</p>
				</div>

				{/* Raons d'interès */}
				<div className='space-y-2'>
					<Label htmlFor='excepcionalitat-raons'>Raons d'interès públic, social, econòmic i esportiu</Label>
					<Textarea
						id='excepcionalitat-raons'
						placeholder="Exemple: es promouran experiències, bones pràctiques, i conscienciarà sobre el paper de l'activitat física...; les obres tindran un impacte molt significatiu ja que milloraran l'estat de la pista..."
						value={formData.excepcionalitatRaonsInteres}
						onChange={(e) => setFormData((prev) => ({ ...prev, excepcionalitatRaonsInteres: e.target.value }))}
						className='min-h-[100px]'
					/>
					<p className='text-xs text-muted-foreground'>Detalleu l'impacte i beneficis de l'actuació</p>
				</div>
			</CardContent>
		</Card>
	)
}

// Step 6: Compromisos assumits per la Corporació
function Step6CompromisosForm({ formData, setFormData, extractedData, preFormData, selectedModel }: StepFormProps & { preFormData: any }) {
	const [isLoading, setIsLoading] = useState(false)

	// Obtenir valors de la capçalera/dades extretes
	const importSubvencioCapcalera = preFormData?.importTotalSubvencio || extractedData.pressupost?.resum?.subvencio_solicitada_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || ""
	const costTotalCapcalera = preFormData?.importTotalActuacio || extractedData.pressupost?.despeses?.total_despeses_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || ""

	const handleAIGenerate = async () => {
		setIsLoading(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")

			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
Municipi: ${extractedData.dades_generals?.municip_actuacio || "No disponible"}
Any d'execució: ${extractedData.dades_generals?.any_execucio || "No disponible"}
			`.trim()

			const memoriaContext = `
Descripció actuacions: ${extractedData.memoria_actuacio?.descripcio_actuacions || "No disponible"}
Objectius i resultats: ${extractedData.memoria_actuacio?.objectius_resultats || "No disponible"}
			`.trim()

			const prompt = `Genera una justificació per subvencionar el 100% del cost total de les actuacions per a un informe tècnic de subvenció.

Segons l'article 9.2 de l'Ordenança General de Subvencions, les subvencions normalment no han d'excedir el 50% del cost. Cal justificar per què en aquest cas s'ultrapassaria aquest límit.

Dades del projecte:
${projectContext}

Memòria d'actuació:
${memoriaContext}

Genera un text en català, de manera formal, que expliqui per què les actuacions sol·licitades formen part d'un projecte especial que justifica el 100% de subvenció. Exemples:
- Formen part d'un projecte pilot
- Concorren raons d'interès econòmic, social per als municipis
- Es tracta d'un esdeveniment singular d'interès territorial

Retorna només el text de la justificació, sense encapçalaments, que completarà la frase: "...atès que les actuacions sol·licitades formen part..."`

			const result = await askLLM({
				prompt,
				module: "elaboracio",
				model: selectedModel || "gemini-2.5-flash",
				jsonResponse: false, // We want plain text, not JSON
			})
			const data = result.data as any
			// La resposta ve en format: {status, data: "text", text: "..."}
			// Prefer 'text' field which is always plain string
			const rawData = data?.text || data?.data || data?.response || ""
			const generatedText = typeof rawData === "string" ? rawData : rawData?.text || JSON.stringify(rawData)
			if (generatedText) {
				setFormData((prev) => ({ ...prev, compromisosJustificacio100: generatedText }))
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>6. Compromisos assumits per la Corporació</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Import subvenció (de la capçalera) */}
				<div className='space-y-2'>
					<Label htmlFor='compromisos-import'>Import total subvenció (EUR)</Label>
					<Input
						id='compromisos-import'
						placeholder='Ex: 10.000,00'
						value={formData.compromisosImportSubvencio || importSubvencioCapcalera}
						onChange={(e) => setFormData((prev) => ({ ...prev, compromisosImportSubvencio: e.target.value }))}
					/>
					<p className='text-xs text-muted-foreground'>Copiat de la capçalera del document</p>
				</div>

				{/* Opció A o B */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Percentatge de subvenció respecte al cost total</Label>
					<RadioGroup value={formData.compromisosOpcio || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, compromisosOpcio: v as OpcioImportSubvencio }))}>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioA' id='opcioA-compromisos' className='mt-1' />
							<Label htmlFor='opcioA-compromisos' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció A: Menys del 50% del cost total</span>
								<br />
								<span className='text-muted-foreground text-sm'>La subvenció no excedeix el 50% del cost de l'activitat/obra</span>
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioB' id='opcioB-compromisos' className='mt-1' />
							<Label htmlFor='opcioB-compromisos' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció B: Per sobre del 50% del cost total</span>
								<br />
								<span className='text-muted-foreground text-sm'>Cal justificar els motius (art. 9.2 Ordenança General de Subvencions)</span>
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Camp per Opció A: Cost total */}
				{formData.compromisosOpcio === "opcioA" && (
					<div className='space-y-2'>
						<Label htmlFor='compromisos-cost-total'>Cost total pressupostat (EUR)</Label>
						<Input
							id='compromisos-cost-total'
							placeholder='Ex: 25.000,00'
							value={formData.compromisosCostTotal || costTotalCapcalera}
							onChange={(e) => setFormData((prev) => ({ ...prev, compromisosCostTotal: e.target.value }))}
						/>
						<p className='text-xs text-muted-foreground'>Punt 7.2 sol·licitud: TOTAL previsió de despeses</p>
					</div>
				)}

				{/* Camps per Opció B: Cost total + Justificació */}
				{formData.compromisosOpcio === "opcioB" && (
					<>
						<div className='space-y-2'>
							<Label htmlFor='compromisos-cost-total-b'>Cost total pressupostat (EUR)</Label>
							<Input
								id='compromisos-cost-total-b'
								placeholder='Ex: 25.000,00'
								value={formData.compromisosCostTotal || costTotalCapcalera}
								onChange={(e) => setFormData((prev) => ({ ...prev, compromisosCostTotal: e.target.value }))}
							/>
							<p className='text-xs text-muted-foreground'>Punt 7.2 sol·licitud: TOTAL previsió de despeses</p>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='compromisos-justificacio'>Justificació per superar el 50%</Label>
								<Button variant='outline' size='sm' onClick={handleAIGenerate} disabled={isLoading} className='gap-1'>
									{isLoading ? (
										<>
											<Loader2 className='h-3 w-3 animate-spin' />
											Generant...
										</>
									) : (
										<>
											<Sparkles className='h-3 w-3' />
											Generar amb IA
										</>
									)}
								</Button>
							</div>
							<Textarea
								id='compromisos-justificacio'
								placeholder="Exemple: d'un projecte pilot o concorren raons d'interès econòmic, social, etc....pels municipis que acolliran els esdeveniments, etc..."
								value={formData.compromisosJustificacio100}
								onChange={(e) => setFormData((prev) => ({ ...prev, compromisosJustificacio100: e.target.value }))}
								className='min-h-[100px]'
							/>
							<p className='text-xs text-muted-foreground'>Text que completa: "...atès que les actuacions sol·licitades formen part..."</p>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

// Step 7: Consideracions a tenir en compte per a la concessió de la subvenció
function Step7ConsideracionsForm({ formData, setFormData, extractedData, preFormData, selectedModel }: StepFormProps & { preFormData: any }) {
	const [isLoadingC, setIsLoadingC] = useState(false)
	const [isLoadingD, setIsLoadingD] = useState(false)

	const importAvancat = preFormData?.importPagamentAvancat || formData.compromisosImportSubvencio || ""

	const handleAIGenerateOpcioC = async () => {
		setIsLoadingC(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")
			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
			`.trim()

			const prompt = `Genera una justificació breu per a un pagament avançat de subvenció a una entitat que no ha presentat declaració responsable o que no compleix els requisits de la Llei 11/2023.

Dades del projecte:
${projectContext}

El text ha d'explicar per què s'opta per fer pagament avançat i per què des de la GSE es considera adient.

Exemples:
- garantir l'execució de les actuacions
- l'entitat no disposa de recursos suficients per avançar les despeses
- evitar tensions de tresoreria

Retorna només el text de la motivació, sense encapçalaments, que completarà la frase: "...per tal de..."`

			const result = await askLLM({ prompt, module: "elaboracio", model: selectedModel || "gemini-2.5-flash", jsonResponse: false })
			const data = result.data as any
			// La resposta ve en format: {status, data: "text", text: "..."}
			// Prefer 'text' field which is always plain string
			const rawData = data?.text || data?.data || data?.response || ""
			const generatedText = typeof rawData === "string" ? rawData : rawData?.text || JSON.stringify(rawData)
			if (generatedText) {
				setFormData((prev) => ({ ...prev, consideracionsePagamentOpcioCMotivacio: generatedText }))
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoadingC(false)
		}
	}

	const handleAIGenerateOpcioD = async () => {
		setIsLoadingD(true)
		try {
			const askLLM = httpsCallable(functions, "askLLM")
			const projectContext = `
Títol del projecte: ${extractedData.dades_generals?.titol_projecte || "No disponible"}
Beneficiari: ${extractedData.ens_solicitant?.nom_ens || "No disponible"}
Municipi: ${extractedData.dades_generals?.municip_actuacio || "No disponible"}
			`.trim()

			const prompt = `Genera una justificació breu per a un pagament avançat de subvenció a un ens local que no disposa de recursos suficients.

Dades del projecte:
${projectContext}

El text ha d'explicar per què l'ens local necessita el pagament avançat.

Exemples:
- com a conseqüència de problemes de tresoreria
- per evitar tensions de tresoreria que comportaria fer-se càrrec de la despesa abans de rebre l'import de la subvenció
- l'ajuntament no disposa de suficient liquiditat

Retorna només el text de la motivació, sense encapçalaments.`

			const result = await askLLM({ prompt, module: "elaboracio", model: selectedModel || "gemini-2.5-flash", jsonResponse: false })
			const data = result.data as any
			// La resposta ve en format: {status, data: "text", text: "..."}
			// Prefer 'text' field which is always plain string
			const rawData = data?.text || data?.data || data?.response || ""
			const generatedText = typeof rawData === "string" ? rawData : rawData?.text || JSON.stringify(rawData)
			if (generatedText) {
				setFormData((prev) => ({ ...prev, consideracionsePagamentOpcioDMotivacio: generatedText }))
			}
		} catch (error) {
			console.error("Error calling AI:", error)
		} finally {
			setIsLoadingD(false)
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>7. Consideracions a tenir en compte per a la concessió de la subvenció</CardTitle>
			</CardHeader>
			<CardContent className='space-y-6'>
				{/* Identificació i senyalització - Text fix informatiu */}
				<div className='rounded-md border bg-muted/30 p-3'>
					<Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Identificació i senyalització (automàtic)</Label>
					<p className='text-sm mt-1 text-muted-foreground'>
						L'entitat / ens local farà constar la col·laboració de la Diputació de Barcelona en l'activitat/obra subvencionada, incloent el logotip de la Diputació en tot el material de difusió.
					</p>
				</div>

				{/* Despeses elegibles */}
				<div className='space-y-4 border-t pt-4'>
					<Label className='font-semibold text-base'>Despeses elegibles</Label>

					{/* Tipus d'activitat/inversió */}
					<div className='space-y-3'>
						<Label className='font-medium'>Tipus de subvenció</Label>
						<RadioGroup value={formData.consideracionseDespesesTipus || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, consideracionseDespesesTipus: v as DespesesElegiblesTipus }))}>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='activitats' id='despeses-activitats' className='mt-1' />
								<Label htmlFor='despeses-activitats' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Opció A: Activitats (OAE)</span>
									<br />
									<span className='text-muted-foreground text-sm'>Despeses de personal i despeses corrents en béns i serveis</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='inversions' id='despeses-inversions' className='mt-1' />
								<Label htmlFor='despeses-inversions' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Opció B: Inversions (OEE)</span>
									<br />
									<span className='text-muted-foreground text-sm'>Despeses vinculades amb l'execució d'obres</span>
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Despeses indirectes */}
					<div className='space-y-3'>
						<Label className='font-medium'>Despeses indirectes</Label>
						<RadioGroup value={formData.consideracionseDespesesIndirectes || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, consideracionseDespesesIndirectes: v as DespesesIndirectes }))}>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='accepta' id='indirectes-si' className='mt-1' />
								<Label htmlFor='indirectes-si' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Accepta despeses indirectes</span>
									<br />
									<span className='text-muted-foreground text-sm'>Es podran imputar fins a un 5% de despeses indirectes</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='no-accepta' id='indirectes-no' className='mt-1' />
								<Label htmlFor='indirectes-no' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>No accepta despeses indirectes</span>
									<br />
									<span className='text-muted-foreground text-sm'>No es podran imputar despeses indirectes</span>
								</Label>
							</div>
						</RadioGroup>
					</div>
				</div>

				{/* Termini d'execució */}
				<div className='space-y-3 border-t pt-4'>
					<Label className='font-semibold text-base'>Termini d'execució</Label>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='execucio-inici'>Data inici</Label>
							<Input
								id='execucio-inici'
								placeholder="Ex: l'1 de gener de 2024"
								value={formData.consideracionsExecucioDataInici}
								onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsExecucioDataInici: e.target.value }))}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='execucio-fi'>Data fi</Label>
							<Input
								id='execucio-fi'
								placeholder='Ex: el 31 de desembre de 2024'
								value={formData.consideracionsExecucioDataFi}
								onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsExecucioDataFi: e.target.value }))}
							/>
						</div>
					</div>
				</div>

				{/* Forma de justificació */}
				<div className='space-y-4 border-t pt-4'>
					<Label className='font-semibold text-base'>Forma de justificació</Label>

					{/* Acreditació tècnica */}
					<div className='space-y-3'>
						<Label className='font-medium'>Acreditació tècnica</Label>
						<p className='text-sm text-muted-foreground'>Memòria de l'actuació justificativa del compliment de les condicions imposades (automàtic)</p>
						<div className='flex items-center space-x-2'>
							<input
								type='checkbox'
								id='fotos-corporatives'
								checked={formData.consideracionsAcreditacioTecnicaFotos === "si"}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										consideracionsAcreditacioTecnicaFotos: e.target.checked ? "si" : null,
									}))
								}
								className='h-4 w-4 rounded border-gray-300'
							/>
							<Label htmlFor='fotos-corporatives' className='font-normal cursor-pointer'>
								Incloure recull fotogràfic amb imatge corporativa Diputació
							</Label>
						</div>
					</div>

					{/* Acreditació econòmica */}
					<div className='space-y-3'>
						<Label className='font-medium'>Acreditació econòmica</Label>
						<RadioGroup
							value={formData.consideracionsAcreditacioEconomicaSuposit || ""}
							onValueChange={(v) =>
								setFormData((prev) => ({
									...prev,
									consideracionsAcreditacioEconomicaSuposit: v as AcreditacioEconomicaSuposit,
									consideracionsSuposit1Transfereix: null,
									consideracionsSuposit1Beneficiaris: [],
									consideracionsSuposit3Opcio: null,
								}))
							}
						>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='suposit1' id='suposit1' className='mt-1' />
								<Label htmlFor='suposit1' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Supòsit 1: Ens locals</span>
									<br />
									<span className='text-muted-foreground text-sm'>Certificació de funcionari públic (Secretari/a i/o Interventor/a)</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='suposit2' id='suposit2' className='mt-1' />
								<Label htmlFor='suposit2' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Supòsit 2: Entitats fins a 20.000€</span>
									<br />
									<span className='text-muted-foreground text-sm'>Compte justificatiu simplificat</span>
								</Label>
							</div>
							<div className='flex items-start space-x-2'>
								<RadioGroupItem value='suposit3' id='suposit3' className='mt-1' />
								<Label htmlFor='suposit3' className='font-normal cursor-pointer leading-relaxed'>
									<span className='font-semibold'>Supòsit 3: Entitats superior a 20.000€</span>
									<br />
									<span className='text-muted-foreground text-sm'>Diverses opcions de compte justificatiu</span>
								</Label>
							</div>
						</RadioGroup>

						{/* Supòsit 1 - Opció transferència */}
						{formData.consideracionsAcreditacioEconomicaSuposit === "suposit1" && (
							<div className='ml-6 space-y-3 border-l-2 pl-4'>
								<div className='flex items-center space-x-2'>
									<input
										type='checkbox'
										id='transfereix-entitat'
										checked={formData.consideracionsSuposit1Transfereix === "si"}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												consideracionsSuposit1Transfereix: e.target.checked ? "si" : null,
												consideracionsSuposit1Beneficiaris: e.target.checked
													? prev.consideracionsSuposit1Beneficiaris.length > 0
														? prev.consideracionsSuposit1Beneficiaris
														: [{ nomEns: "", nifEns: "", domiciliEns: "", import: "" }]
													: [],
											}))
										}
										className='h-4 w-4 rounded border-gray-300'
									/>
									<Label htmlFor='transfereix-entitat' className='font-normal cursor-pointer'>
										Una part de l'ajut es transferirà a una entitat col·laboradora
									</Label>
								</div>
								{formData.consideracionsSuposit1Transfereix === "si" && (
									<div className='space-y-3'>
										<Label className='text-sm font-medium'>Detalleu la quantitat de l'ajut que es transfereix a cada entitat:</Label>

										{/* Taula de beneficiaris */}
										<div className='border rounded-md overflow-hidden'>
											<table className='w-full text-sm'>
												<thead className='bg-muted/50'>
													<tr>
														<th className='px-3 py-2 text-left font-medium'>Nom ens</th>
														<th className='px-3 py-2 text-left font-medium'>NIF ens</th>
														<th className='px-3 py-2 text-left font-medium'>Domicili ens</th>
														<th className='px-3 py-2 text-left font-medium'>Import</th>
														<th className='px-2 py-2 w-10'></th>
													</tr>
												</thead>
												<tbody>
													{formData.consideracionsSuposit1Beneficiaris.map((beneficiari, index) => (
														<tr key={index} className='border-t'>
															<td className='px-2 py-1'>
																<Input
																	placeholder="Nom de l'ens"
																	value={beneficiari.nomEns}
																	onChange={(e) => {
																		const newBeneficiaris = [...formData.consideracionsSuposit1Beneficiaris]
																		newBeneficiaris[index] = { ...newBeneficiaris[index], nomEns: e.target.value }
																		setFormData((prev) => ({ ...prev, consideracionsSuposit1Beneficiaris: newBeneficiaris }))
																	}}
																	className='h-8 text-sm'
																/>
															</td>
															<td className='px-2 py-1'>
																<Input
																	placeholder='NIF'
																	value={beneficiari.nifEns}
																	onChange={(e) => {
																		const newBeneficiaris = [...formData.consideracionsSuposit1Beneficiaris]
																		newBeneficiaris[index] = { ...newBeneficiaris[index], nifEns: e.target.value }
																		setFormData((prev) => ({ ...prev, consideracionsSuposit1Beneficiaris: newBeneficiaris }))
																	}}
																	className='h-8 text-sm'
																/>
															</td>
															<td className='px-2 py-1'>
																<Input
																	placeholder='Domicili'
																	value={beneficiari.domiciliEns}
																	onChange={(e) => {
																		const newBeneficiaris = [...formData.consideracionsSuposit1Beneficiaris]
																		newBeneficiaris[index] = { ...newBeneficiaris[index], domiciliEns: e.target.value }
																		setFormData((prev) => ({ ...prev, consideracionsSuposit1Beneficiaris: newBeneficiaris }))
																	}}
																	className='h-8 text-sm'
																/>
															</td>
															<td className='px-2 py-1'>
																<Input
																	placeholder='0,00 €'
																	value={beneficiari.import}
																	onChange={(e) => {
																		const newBeneficiaris = [...formData.consideracionsSuposit1Beneficiaris]
																		newBeneficiaris[index] = { ...newBeneficiaris[index], import: e.target.value }
																		setFormData((prev) => ({ ...prev, consideracionsSuposit1Beneficiaris: newBeneficiaris }))
																	}}
																	className='h-8 text-sm'
																/>
															</td>
															<td className='px-2 py-1'>
																<Button
																	variant='ghost'
																	size='icon'
																	className='h-8 w-8 text-destructive hover:text-destructive'
																	onClick={() => {
																		const newBeneficiaris = formData.consideracionsSuposit1Beneficiaris.filter((_, i) => i !== index)
																		setFormData((prev) => ({ ...prev, consideracionsSuposit1Beneficiaris: newBeneficiaris.length > 0 ? newBeneficiaris : [{ nomEns: "", nifEns: "", domiciliEns: "", import: "" }] }))
																	}}
																	disabled={formData.consideracionsSuposit1Beneficiaris.length === 1}
																>
																	<Trash2 className='h-4 w-4' />
																</Button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>

										{/* Botó afegir */}
										<Button
											variant='outline'
											size='sm'
											onClick={() => {
												setFormData((prev) => ({
													...prev,
													consideracionsSuposit1Beneficiaris: [...prev.consideracionsSuposit1Beneficiaris, { nomEns: "", nifEns: "", domiciliEns: "", import: "" }],
												}))
											}}
											className='gap-1'
										>
											<Plus className='h-4 w-4' />
											Afegir entitat
										</Button>
									</div>
								)}
							</div>
						)}

						{/* Supòsit 3 - Opcions */}
						{formData.consideracionsAcreditacioEconomicaSuposit === "suposit3" && (
							<div className='ml-6 space-y-3 border-l-2 pl-4'>
								<Label className='font-medium'>Seleccioneu el tipus de compte justificatiu:</Label>
								<RadioGroup value={formData.consideracionsSuposit3Opcio || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, consideracionsSuposit3Opcio: v as Suposit3Opcio }))}>
									<div className='flex items-start space-x-2'>
										<RadioGroupItem value='opcioA' id='suposit3-opcioA' className='mt-1' />
										<Label htmlFor='suposit3-opcioA' className='font-normal cursor-pointer text-sm'>
											Opció A: Compte justificatiu amb relació de despeses i aportació de justificants
										</Label>
									</div>
									<div className='flex items-start space-x-2'>
										<RadioGroupItem value='opcioB' id='suposit3-opcioB' className='mt-1' />
										<Label htmlFor='suposit3-opcioB' className='font-normal cursor-pointer text-sm'>
											Opció B: Compte justificatiu amb informe d'auditor i relació de despeses
										</Label>
									</div>
									<div className='flex items-start space-x-2'>
										<RadioGroupItem value='opcioC' id='suposit3-opcioC' className='mt-1' />
										<Label htmlFor='suposit3-opcioC' className='font-normal cursor-pointer text-sm'>
											Opció C: Compte justificatiu amb informe d'auditor i memòria econòmica abreujada
										</Label>
									</div>
								</RadioGroup>
							</div>
						)}
					</div>
				</div>

				{/* Terminis de justificació */}
				<div className='space-y-4 border-t pt-4'>
					<Label className='font-semibold text-base'>Terminis de justificació de la subvenció</Label>
					<RadioGroup
						value={formData.consideracionsTerminiOpcio || ""}
						onValueChange={(v) =>
							setFormData((prev) => ({
								...prev,
								consideracionsTerminiOpcio: v as TerminiJustificacioOpcio,
								consideracionsTerminiSubOpcio: null,
							}))
						}
					>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioA' id='termini-opcioA' className='mt-1' />
							<Label htmlFor='termini-opcioA' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció A: Un sol termini de justificació final</span>
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioB' id='termini-opcioB' className='mt-1' />
							<Label htmlFor='termini-opcioB' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció B: Dos terminis (voluntari + final)</span>
							</Label>
						</div>
					</RadioGroup>

					{/* Opció A - Dates */}
					{formData.consideracionsTerminiOpcio === "opcioA" && (
						<div className='ml-6 space-y-3 border-l-2 pl-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='termini-a-inici'>Data inici justificació</Label>
									<Input
										id='termini-a-inici'
										placeholder='Ex: 2 de gener de 2025'
										value={formData.consideracionsTerminiADataInici}
										onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiADataInici: e.target.value }))}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='termini-a-fi'>Data fi justificació</Label>
									<Input
										id='termini-a-fi'
										placeholder='Ex: 31 de març de 2025'
										value={formData.consideracionsTerminiADataFi}
										onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiADataFi: e.target.value }))}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Opció B - Sub-opcions */}
					{formData.consideracionsTerminiOpcio === "opcioB" && (
						<div className='ml-6 space-y-4 border-l-2 pl-4'>
							<RadioGroup value={formData.consideracionsTerminiSubOpcio || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, consideracionsTerminiSubOpcio: v as TerminiJustificacioSubOpcio }))}>
								<div className='flex items-start space-x-2'>
									<RadioGroupItem value='B1' id='termini-B1' className='mt-1' />
									<Label htmlFor='termini-B1' className='font-normal cursor-pointer'>
										B.1: Primer període voluntari fins a data límit
									</Label>
								</div>
								<div className='flex items-start space-x-2'>
									<RadioGroupItem value='B2' id='termini-B2' className='mt-1' />
									<Label htmlFor='termini-B2' className='font-normal cursor-pointer'>
										B.2: Primer període voluntari amb rang de dates
									</Label>
								</div>
							</RadioGroup>

							{/* B1 - Dates */}
							{formData.consideracionsTerminiSubOpcio === "B1" && (
								<div className='space-y-3'>
									<div className='space-y-2'>
										<Label htmlFor='termini-b1-parcial'>Data límit primer període voluntari</Label>
										<Input
											id='termini-b1-parcial'
											placeholder="Ex: 31 d'octubre de 2024"
											value={formData.consideracionsTerminiB1DataParcial}
											onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiB1DataParcial: e.target.value }))}
										/>
									</div>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label htmlFor='termini-final-inici'>Data inici període final</Label>
											<Input
												id='termini-final-inici'
												placeholder='Ex: 2 de gener de 2025'
												value={formData.consideracionsTerminiFinalDataInici}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiFinalDataInici: e.target.value }))}
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='termini-final-fi'>Data fi període final</Label>
											<Input
												id='termini-final-fi'
												placeholder='Ex: 31 de març de 2025'
												value={formData.consideracionsTerminiFinalDataFi}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiFinalDataFi: e.target.value }))}
											/>
										</div>
									</div>
								</div>
							)}

							{/* B2 - Dates */}
							{formData.consideracionsTerminiSubOpcio === "B2" && (
								<div className='space-y-3'>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label htmlFor='termini-b2-parcial-inici'>Data inici primer període</Label>
											<Input
												id='termini-b2-parcial-inici'
												placeholder="Ex: 1 d'octubre de 2024"
												value={formData.consideracionsTerminiB2DataParcialInici}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiB2DataParcialInici: e.target.value }))}
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='termini-b2-parcial-fi'>Data fi primer període</Label>
											<Input
												id='termini-b2-parcial-fi'
												placeholder='Ex: 15 de novembre de 2024'
												value={formData.consideracionsTerminiB2DataParcialFi}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiB2DataParcialFi: e.target.value }))}
											/>
										</div>
									</div>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label htmlFor='termini-b2-final-inici'>Data inici període final</Label>
											<Input
												id='termini-b2-final-inici'
												placeholder='Ex: 2 de gener de 2025'
												value={formData.consideracionsTerminiFinalDataInici}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiFinalDataInici: e.target.value }))}
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='termini-b2-final-fi'>Data fi període final</Label>
											<Input
												id='termini-b2-final-fi'
												placeholder='Ex: 31 de març de 2025'
												value={formData.consideracionsTerminiFinalDataFi}
												onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsTerminiFinalDataFi: e.target.value }))}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Pagament */}
				<div className='space-y-4 border-t pt-4'>
					<Label className='font-semibold text-base'>Pagament</Label>
					<RadioGroup
						value={formData.consideracionsePagamentOpcio || ""}
						onValueChange={(v) =>
							setFormData((prev) => ({
								...prev,
								consideracionsePagamentOpcio: v as PagamentOpcio,
							}))
						}
					>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioA' id='pagament-opcioA' className='mt-1' />
							<Label htmlFor='pagament-opcioA' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció A: Pagament posterior a justificació</span>
								<br />
								<span className='text-muted-foreground text-sm'>El pagament es farà contra presentació de justificació</span>
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioB' id='pagament-opcioB' className='mt-1' />
							<Label htmlFor='pagament-opcioB' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció B: Pagament avançat a entitat amb declaració responsable</span>
								<br />
								<span className='text-muted-foreground text-sm'>Associació/Fundació/Federació que compleix Llei 11/2023</span>
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioC' id='pagament-opcioC' className='mt-1' />
							<Label htmlFor='pagament-opcioC' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció C: Pagament avançat a entitat sense declaració responsable</span>
								<br />
								<span className='text-muted-foreground text-sm'>Cal motivar per què s'opta pel pagament avançat</span>
							</Label>
						</div>
						<div className='flex items-start space-x-2'>
							<RadioGroupItem value='opcioD' id='pagament-opcioD' className='mt-1' />
							<Label htmlFor='pagament-opcioD' className='font-normal cursor-pointer leading-relaxed'>
								<span className='font-semibold'>Opció D: Pagament avançat a ens locals</span>
								<br />
								<span className='text-muted-foreground text-sm'>L'ens local no disposa de recursos suficients</span>
							</Label>
						</div>
					</RadioGroup>

					{/* Opció B - Mostra l'import */}
					{formData.consideracionsePagamentOpcio === "opcioB" && (
						<div className='ml-6 border-l-2 pl-4'>
							<p className='text-sm text-muted-foreground'>
								Import avançat: <strong>{importAvancat || formData.compromisosImportSubvencio || "..."} EUR</strong>
							</p>
						</div>
					)}

					{/* Opció C - Motivació + Import */}
					{formData.consideracionsePagamentOpcio === "opcioC" && (
						<div className='ml-6 space-y-3 border-l-2 pl-4'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<Label htmlFor='pagament-c-motivacio'>Motivació del pagament avançat</Label>
									<Button variant='outline' size='sm' onClick={handleAIGenerateOpcioC} disabled={isLoadingC} className='gap-1'>
										{isLoadingC ? (
											<>
												<Loader2 className='h-3 w-3 animate-spin' />
												Generant...
											</>
										) : (
											<>
												<Sparkles className='h-3 w-3' />
												Generar amb IA
											</>
										)}
									</Button>
								</div>
								<Textarea
									id='pagament-c-motivacio'
									placeholder="Exemple: garantir l'execució de les actuacions..."
									value={formData.consideracionsePagamentOpcioCMotivacio}
									onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsePagamentOpcioCMotivacio: e.target.value }))}
									className='min-h-[80px]'
								/>
								<p className='text-xs text-muted-foreground'>Text que completa: "...per tal de..."</p>
							</div>
							<p className='text-sm text-muted-foreground'>
								Import avançat: <strong>{importAvancat || formData.compromisosImportSubvencio || "..."} EUR</strong>
							</p>
						</div>
					)}

					{/* Opció D - Motivació + Import */}
					{formData.consideracionsePagamentOpcio === "opcioD" && (
						<div className='ml-6 space-y-3 border-l-2 pl-4'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<Label htmlFor='pagament-d-motivacio'>Motivació (recursos insuficients)</Label>
									<Button variant='outline' size='sm' onClick={handleAIGenerateOpcioD} disabled={isLoadingD} className='gap-1'>
										{isLoadingD ? (
											<>
												<Loader2 className='h-3 w-3 animate-spin' />
												Generant...
											</>
										) : (
											<>
												<Sparkles className='h-3 w-3' />
												Generar amb IA
											</>
										)}
									</Button>
								</div>
								<Textarea
									id='pagament-d-motivacio'
									placeholder='Exemple: com a conseqüència de problemes de tresoreria...'
									value={formData.consideracionsePagamentOpcioDMotivacio}
									onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsePagamentOpcioDMotivacio: e.target.value }))}
									className='min-h-[80px]'
								/>
							</div>
							<p className='text-sm text-muted-foreground'>
								Import avançat: <strong>{importAvancat || formData.compromisosImportSubvencio || "..."} EUR</strong>
							</p>
						</div>
					)}

					{/* Opcional: Resta d'import */}
					{formData.consideracionsePagamentOpcio && formData.consideracionsePagamentOpcio !== "opcioA" && (
						<div className='ml-6 border-l-2 pl-4'>
							<div className='flex items-center space-x-2'>
								<input
									type='checkbox'
									id='pagament-resta'
									checked={formData.consideracionsePagamentRestaImport}
									onChange={(e) => setFormData((prev) => ({ ...prev, consideracionsePagamentRestaImport: e.target.checked }))}
									className='h-4 w-4 rounded border-gray-300'
								/>
								<Label htmlFor='pagament-resta' className='font-normal cursor-pointer'>
									La resta de l'import es farà efectiu contra justificació
								</Label>
							</div>
							<p className='text-xs text-muted-foreground mt-1'>Marcar si no s'avança el 100% de l'import subvencionat</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Helper function to get default form data from extractedData
function getDefaultFormData(extractedData: SubvencioData): InformeTecnicFormData {
	return {
		// Step 1
		tipusSubvencio: "nominativa",
		textNomBeneficiari: extractedData.ens_solicitant?.nom_ens || "",
		textOrdreInici: "",
		// Step 2: Declaració responsable (només entitats)
		declaracioResponsable: null,
		// Step 3: Descripció de les actuacions
		descripcioActuacions: extractedData.memoria_actuacio?.descripcio_actuacions || "",
		// Step 4: Resultat objecte de la subvenció
		objecteNomEntitat: extractedData.ens_solicitant?.nom_ens || "",
		objecteAny: extractedData.dades_generals?.any_execucio || "",
		// Step 5: Motivació de la concessió
		motivacioLiniaEstrategica: null,
		motivacioNomEntitat: extractedData.ens_solicitant?.nom_ens || "",
		motivacioActuacioSubvencionada: extractedData.dades_generals?.titol_projecte || "",
		motivacioJustificacioExcepcionalitat: extractedData.excepcionalitat?.justificacio_text || "",
		// Step 6: Excepcionalitat de la concessió (només no nominatives)
		excepcionalitatActuacioSingular: "",
		excepcionalitatRaonsInteres: "",
		// Step 7: Compromisos assumits per la Corporació
		compromisosOpcio: null,
		compromisosImportSubvencio: extractedData.pressupost?.resum?.subvencio_solicitada_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		compromisosCostTotal: extractedData.pressupost?.despeses?.total_despeses_eur?.toLocaleString("es-ES", { minimumFractionDigits: 2 }) || "",
		compromisosJustificacio100: "",
		// Step 8: Consideracions
		consideracionseDespesesTipus: null,
		consideracionseDespesesIndirectes: null,
		consideracionsExecucioDataInici: "",
		consideracionsExecucioDataFi: "",
		consideracionsAcreditacioTecnicaFotos: null,
		consideracionsAcreditacioEconomicaSuposit: null,
		consideracionsSuposit1Transfereix: null,
		consideracionsSuposit1Beneficiaris:
			extractedData.destinacio_final_subvencio?.beneficiaris?.map((b: any) => ({
				nomEns: b.nom_ens || "",
				nifEns: b.nif_ens || "",
				domiciliEns: b.domicili_ens || "",
				import: b.import || "",
			})) || [],
		consideracionsSuposit3Opcio: null,
		consideracionsTerminiOpcio: null,
		consideracionsTerminiADataInici: "",
		consideracionsTerminiADataFi: "",
		consideracionsTerminiSubOpcio: null,
		consideracionsTerminiB1DataParcial: "",
		consideracionsTerminiB2DataParcialInici: "",
		consideracionsTerminiB2DataParcialFi: "",
		consideracionsTerminiFinalDataInici: "",
		consideracionsTerminiFinalDataFi: "",
		consideracionsePagamentOpcio: null,
		consideracionsePagamentOpcioCMotivacio: "",
		consideracionsePagamentOpcioDMotivacio: "",
		consideracionsePagamentRestaImport: false,
	}
}

export default function InformeTecnic({ preFormData, extractedData, onFormDataChange, onDocumentDataChange, initialFormData }: InformeTecnicProps) {
	// Use initialFormData if provided (when returning from another step), otherwise use defaults from extractedData
	const [formData, setFormData] = useState<InformeTecnicFormData>(initialFormData || getDefaultFormData(extractedData))

	// Get selected model from settings store
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// Notify parent of form data changes for validation
	useEffect(() => {
		if (onFormDataChange) {
			onFormDataChange(formData)
		}
	}, [formData, onFormDataChange])

	// Generate document sections from all steps
	const documentSections = useMemo(() => {
		return STEPS.map((step) => ({
			id: step.id,
			title: step.title,
			content: step.generateContent(formData, preFormData?.tipusBeneficiari),
		})).filter((section) => section.content) // Only include non-empty sections
	}, [formData, preFormData?.tipusBeneficiari])

	const previewData: PreviewData = useMemo(
		() => ({
			numExpedient: preFormData?.numeroExpedient || "202X/xxxxxxxxx",
			nomBeneficiari: preFormData?.nomEntitat || formData.textNomBeneficiari || extractedData.ens_solicitant?.nom_ens || "",
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
		[formData.textNomBeneficiari, extractedData, preFormData]
	)

	// Notify parent of document data changes for download button
	useEffect(() => {
		if (onDocumentDataChange) {
			onDocumentDataChange(documentSections, previewData)
		}
	}, [documentSections, previewData, onDocumentDataChange])

	const handleDocumentChange = (sections: Array<{ id: string; title: string; content: string }>) => {
		// Handle manual edits to the document if needed
		console.log("Document sections updated:", sections)
	}

	return (
		<div className='space-y-6'>
			<div className='grid grid-cols-2 gap-6 h-[calc(100vh-200px)]'>
				{/* Left side: Form with all steps */}
				<div className='space-y-4 overflow-y-auto pr-2'>
					<CardDescription>Introduïu les dades necessàries per generar l'informe tècnic</CardDescription>

					{/* Step 1: Antecedents (includes Declaració responsable for entitats) */}
					<Step1Form formData={formData} setFormData={setFormData} extractedData={extractedData} preFormData={preFormData} />

					{/* Step 2: Objecte de la subvenció */}
					<Step2ObjecteForm formData={formData} setFormData={setFormData} extractedData={extractedData} />

					{/* Step 3: Descripció de les actuacions */}
					<Step3DescripcioForm formData={formData} setFormData={setFormData} extractedData={extractedData} selectedModel={selectedModel} />

					{/* Step 4: Motivació de la concessió */}
					<Step4MotivaForm formData={formData} setFormData={setFormData} extractedData={extractedData} selectedModel={selectedModel} />

					{/* Step 5: Excepcionalitat de la concessió (només no nominatives) */}
					{formData.tipusSubvencio === "no-nominativa" && <Step5ExcepcionalitatForm formData={formData} setFormData={setFormData} extractedData={extractedData} selectedModel={selectedModel} />}

					{/* Step 6: Compromisos assumits per la Corporació */}
					<Step6CompromisosForm formData={formData} setFormData={setFormData} extractedData={extractedData} preFormData={preFormData} selectedModel={selectedModel} />

					{/* Step 7: Consideracions a tenir en compte per a la concessió */}
					<Step7ConsideracionsForm formData={formData} setFormData={setFormData} extractedData={extractedData} preFormData={preFormData} selectedModel={selectedModel} />
				</div>

				{/* Right side: Generated document preview */}
				<div className='overflow-y-auto pl-2'>
					<DocumentPreview sections={documentSections} onChange={handleDocumentChange} data={previewData} />
				</div>
			</div>
		</div>
	)
}
