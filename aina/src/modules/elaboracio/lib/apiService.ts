// API Service per a Elaboració de Decrets
import { ref, uploadBytesResumable } from "firebase/storage"
import { storage } from "../../../services/firebase"
import { httpsCallable } from "firebase/functions"
import { functions } from "../../../services/firebase"

export interface SubvencioData {
	subvencio: {
		centre_gestor: string
		titol_projecte_actuacio: string
		any_execucio_actuacions: string
		import_solicitat_eur: number
		municipi_realitzacio: string
	}
	ens_public: {
		nom_ens_local: string
		localitat: string
		cif_nif: string
		telefon_notificacions: string
		email_notificacions: string
		representant_legal: {
			nom_cognoms: string
			carrec: string
		}
		contacte_tecnic: {
			nom_cognoms: string
			carrec: string
			email: string
			telefon: string
		}
	}
	modalitat_execucio: {
		ens_public_solicitant: string
		ens_instrumental: {
			te_ens_instrumental: boolean
			nom_rao_social: string
			cif_nif: string
		}
	}
	documentacio_adjunta: {
		memoria_actuacio_annex1: boolean
		pressupost_annex2: boolean
		declaracio_responsable_requisits_annex3: boolean
		declaracio_responsable_proteccio_menors_annex4: boolean
		justificacio_excepcionalitat_annex5: boolean
		altra_documentacio: {
			hi_ha_altra_documentacio: boolean
			llista: string[]
		}
	}
	destinacio_final_subvencio: {
		existeix_transferencia_a_tercers: boolean
		beneficiaris: Array<{
			nom_ens: string
			nif_ens: string
			domicili_ens: string
			import_eur: number
		}>
	}
	memoria_actuacio: {
		titol_actuacions_i_municipi: string
		descripcio_actuacions: string
		objectius_resultats: string
		actuacions_relacionades_amb_objectius: string
		pla_treball_calendaritzat: string
	}
	pressupost: {
		ingressos: {
			recursos_propis_eur: number
			subvencions_altres_admins_eur: number
			aportacions_privades_eur: number
			altres_ingressos_detall: string
			altres_ingressos_eur: number
			total_ingressos_eur: number
		}
		despeses: {
			personal_eur: number
			contractacio_externa: Array<{
				concepte: string
				import_eur: number
			}>
			material_eur: number
			despeses_indirectes_eur: number
			altres_despeses: Array<{
				concepte: string
				import_eur: number
			}>
			total_despeses_eur: number
		}
		subvencio_solicitada_eur: number
	}
	declaracio_responsable: {
		al_corrents_obligacions_tributaries_seg_social: boolean
		al_corrents_reintegrament_subvencions: boolean
		compromis_execucio_projecte: boolean
		accepta_control_financer_diba: boolean
		altres_subvencions_mateixa_actuacio: Array<{
			entitat_concedent: string
			identificacio_convocatoria: string
			import_eur: number
		}>
		compromis_comunicar_altres_subvencions: boolean
		proteccio_menors: {
			implica_contacte_habitual_menors: boolean
			no_implica_contacte_habitual_menors: boolean
			te_certificacions_personal_sense_antecedents: boolean
		}
	}
	excepcionalitat: {
		justificacio_excepcionalitat: string
		sol_licitud_pagament_avancat: boolean
		import_pagament_avancat_eur: number
	}
	autoritzacions: {
		autoritza_consulta_certificats_telematics: boolean
		no_accepto_consulta_telematica: boolean
	}
	proteccio_dades: {
		informa_finalitat_tractament: boolean
		informa_cessions_previstes: boolean
		drets_interessat: string[]
		canals_exercici_drets: {
			seu_electronica_url: string
			adreces_registre_diba_url: string
			dpd_email: string
			apdcat_reclamacio_url: string
			denuncia_url: string
		}
	}
	destinatari_final_decret: {
		carrec_destinatari: string
	}
}

class ElaboracioApiService {
	// Upload file to Firebase Storage and extract subvencio data
	async uploadAndExtractSubvencio(file: File, onProgress?: (progress: number) => void): Promise<SubvencioData> {
		try {
			// Upload file to Firebase Storage
			const timestamp = Date.now()
			const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
			const storagePath = `uploads/subvencio/${timestamp}_${sanitizedName}`

			const storageRef = ref(storage, storagePath)
			const uploadTask = uploadBytesResumable(storageRef, file)

			// Track upload progress (0-50%)
			await new Promise<void>((resolve, reject) => {
				uploadTask.on(
					"state_changed",
					(snapshot) => {
						const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 50
						onProgress?.(progress)
					},
					(error) => reject(error),
					() => resolve()
				)
			})

			onProgress?.(50) // Upload complete, now processing

			// Call Cloud Function to extract subvencio data using Genkit
			const extractSubvencio = httpsCallable<{ filePath: string }, SubvencioData>(functions, "extractSubvencio")

			const result = await extractSubvencio({ filePath: storagePath })

			onProgress?.(100) // Processing complete

			return result.data
		} catch (error) {
			console.error("Error uploading and extracting subvencio:", error)
			throw error
		}
	}
}

export const elaboracioApiService = new ElaboracioApiService()
