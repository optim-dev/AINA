// Detail item for budget line items
interface DetallItem {
	concepte: string
	import_eur: number
}

// Budget category with optional detail breakdown
interface PressupostCategoria {
	import_eur: number | null
	detall?: DetallItem[]
}

export interface SubvencioData {
	dades_generals: {
		codi_bdns: string | null
		codi_convocatoria: string | null
		centre_gestor: string | null
		area_servei: string | null
		titol_projecte: string | null
		any_execucio: string | null
		municip_actuacio: string | null
	}

	ens_solicitant: {
		nom_ens: string
		nif: string
		adreca: {
			domicili: string | null
			localitat: string | null
			codi_postal: string | null
		}
		contacte: {
			telefon: string | null
			email: string | null
		}
		representant_legal: {
			nom_cognoms: string
			carrec: string | null
		}
	}

	modalitat_execucio: {
		es_ens_instrumental: boolean
		dades_ens_instrumental?: {
			nom_rao_social: string | null
			nif: string | null
		}
	}

	documentacio_adjunta_check: {
		annex_1_memoria: boolean
		annex_2_pressupost: boolean
		annex_3_declaracio_subvencions: boolean
		annex_4_menors: boolean
		annex_5_excepcionalitat: boolean
	}

	destinacio_final_subvencio?: {
		existeix_transferencia_a_tercers: boolean
		beneficiaris?: Array<{
			nom_ens: string
			nif_ens: string | null
			domicili_ens: string | null
			import_eur: number
		}>
	}

	memoria_actuacio?: {
		titol_actuacions_i_municipi: string | null
		descripcio_actuacions: string | null
		objectius_resultats: string | null
		actuacions_relacionades_objectius: string | null
		pla_treball_calendaritzat: string | null
	}

	pressupost: {
		ingressos: {
			recursos_propis: PressupostCategoria
			subvencions_altres_admins: PressupostCategoria
			aportacions_privades?: PressupostCategoria
			altres_ingressos?: PressupostCategoria
			total_ingressos_eur: number
		}
		despeses: {
			personal: PressupostCategoria
			contractacio_externa: PressupostCategoria
			material: PressupostCategoria
			despeses_indirectes?: PressupostCategoria
			altres_despeses?: PressupostCategoria
			total_despeses_eur: number
		}
		resum: {
			subvencio_solicitada_eur: number
		}
	}

	excepcionalitat?: {
		justificacio_text: string | null
	}
}
