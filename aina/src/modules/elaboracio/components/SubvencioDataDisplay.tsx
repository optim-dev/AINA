import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubvencioData } from "../types"

interface SubvencioDataDisplayProps {
	data: SubvencioData
}

export default function SubvencioDataDisplay({ data }: SubvencioDataDisplayProps) {
	const formatCurrency = (amount: number | null | undefined) => {
		if (amount == null) return "-"
		return new Intl.NumberFormat("ca-ES", {
			style: "currency",
			currency: "EUR",
		}).format(amount)
	}

	// Helper to render budget category with optional detail
	const renderBudgetCategory = (label: string, category: { import_eur: number | null; detall?: Array<{ concepte: string; import_eur: number }> } | undefined) => {
		if (!category) return null

		if (category.detall && category.detall.length > 0) {
			return (
				<>
					{category.detall.map((item, index) => (
						<div key={index} className='flex justify-between'>
							<span className='text-slate-600'>
								{label}: {item.concepte}
							</span>
							<span className='font-medium'>{formatCurrency(item.import_eur)}</span>
						</div>
					))}
				</>
			)
		}

		return (
			<div className='flex justify-between'>
				<span className='text-slate-600'>{label}</span>
				<span className='font-medium'>{formatCurrency(category.import_eur)}</span>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Dades Generals */}
			<Card>
				<CardHeader>
					<CardTitle>Dades Generals de la Subvenció</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='grid grid-cols-2 gap-4'>
						{data.dades_generals.codi_bdns && (
							<div>
								<label className='text-sm font-medium text-slate-600'>Codi BDNS</label>
								<p className='text-base font-mono'>{data.dades_generals.codi_bdns}</p>
							</div>
						)}
						{data.dades_generals.codi_convocatoria && (
							<div>
								<label className='text-sm font-medium text-slate-600'>Codi Convocatòria</label>
								<p className='text-base'>{data.dades_generals.codi_convocatoria}</p>
							</div>
						)}
						<div>
							<label className='text-sm font-medium text-slate-600'>Centre Gestor</label>
							<p className='text-base'>{data.dades_generals.centre_gestor || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Àrea/Servei</label>
							<p className='text-base'>{data.dades_generals.area_servei || "-"}</p>
						</div>
					</div>
					<div>
						<label className='text-sm font-medium text-slate-600'>Títol del Projecte</label>
						<p className='text-base font-medium'>{data.dades_generals.titol_projecte || "-"}</p>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='text-sm font-medium text-slate-600'>Any d'Execució</label>
							<p className='text-base'>{data.dades_generals.any_execucio || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Municipi</label>
							<p className='text-base'>{data.dades_generals.municip_actuacio || "-"}</p>
						</div>
					</div>
					<div>
						<label className='text-sm font-medium text-slate-600'>Subvenció Sol·licitada</label>
						<p className='text-lg font-bold text-blue-600'>{formatCurrency(data.pressupost.resum.subvencio_solicitada_eur)}</p>
					</div>
				</CardContent>
			</Card>

			{/* Ens Sol·licitant */}
			<Card>
				<CardHeader>
					<CardTitle>Ens Sol·licitant</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='text-sm font-medium text-slate-600'>Nom de l'Ens</label>
							<p className='text-base'>{data.ens_solicitant.nom_ens || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>NIF</label>
							<p className='text-base font-mono'>{data.ens_solicitant.nif || "-"}</p>
						</div>
					</div>

					<div className='border-t pt-4'>
						<h4 className='font-semibold mb-2'>Adreça</h4>
						<div className='grid grid-cols-3 gap-4'>
							<div>
								<label className='text-sm font-medium text-slate-600'>Domicili</label>
								<p className='text-base'>{data.ens_solicitant.adreca.domicili || "-"}</p>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-600'>Localitat</label>
								<p className='text-base'>{data.ens_solicitant.adreca.localitat || "-"}</p>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-600'>Codi Postal</label>
								<p className='text-base'>{data.ens_solicitant.adreca.codi_postal || "-"}</p>
							</div>
						</div>
					</div>

					<div className='border-t pt-4'>
						<h4 className='font-semibold mb-2'>Dades de Contacte</h4>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='text-sm font-medium text-slate-600'>Telèfon</label>
								<p className='text-base'>{data.ens_solicitant.contacte.telefon || "-"}</p>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-600'>Email</label>
								<p className='text-base'>{data.ens_solicitant.contacte.email || "-"}</p>
							</div>
						</div>
					</div>

					<div className='border-t pt-4'>
						<h4 className='font-semibold mb-2'>Representant Legal</h4>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='text-sm font-medium text-slate-600'>Nom i Cognoms</label>
								<p className='text-base'>{data.ens_solicitant.representant_legal.nom_cognoms || "-"}</p>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-600'>Càrrec</label>
								<p className='text-base'>{data.ens_solicitant.representant_legal.carrec || "-"}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Modalitat d'Execució */}
			{data.modalitat_execucio.es_ens_instrumental && data.modalitat_execucio.dades_ens_instrumental && (
				<Card>
					<CardHeader>
						<CardTitle>Ens Instrumental</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='text-sm font-medium text-slate-600'>Nom/Raó Social</label>
								<p className='text-base'>{data.modalitat_execucio.dades_ens_instrumental.nom_rao_social || "-"}</p>
							</div>
							<div>
								<label className='text-sm font-medium text-slate-600'>NIF</label>
								<p className='text-base font-mono'>{data.modalitat_execucio.dades_ens_instrumental.nif || "-"}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Memòria d'Actuació */}
			{data.memoria_actuacio && (
				<Card>
					<CardHeader>
						<CardTitle>Memòria d'Actuació</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<label className='text-sm font-medium text-slate-600'>Títol Actuacions i Municipi</label>
							<p className='text-base'>{data.memoria_actuacio.titol_actuacions_i_municipi || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Descripció de les Actuacions</label>
							<p className='text-base whitespace-pre-wrap'>{data.memoria_actuacio.descripcio_actuacions || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Objectius i Resultats</label>
							<p className='text-base whitespace-pre-wrap'>{data.memoria_actuacio.objectius_resultats || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Actuacions Relacionades amb Objectius</label>
							<p className='text-base whitespace-pre-wrap'>{data.memoria_actuacio.actuacions_relacionades_objectius || "-"}</p>
						</div>
						<div>
							<label className='text-sm font-medium text-slate-600'>Pla de Treball Calendaritzat</label>
							<p className='text-base whitespace-pre-wrap'>{data.memoria_actuacio.pla_treball_calendaritzat || "-"}</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Pressupost */}
			<Card>
				<CardHeader>
					<CardTitle>Pressupost</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='border-b pb-4'>
						<h4 className='font-semibold mb-3'>Ingressos</h4>
						<div className='space-y-2'>
							{renderBudgetCategory("Recursos Propis", data.pressupost.ingressos.recursos_propis)}
							{renderBudgetCategory("Subvencions Altres Administracions", data.pressupost.ingressos.subvencions_altres_admins)}
							{renderBudgetCategory("Aportacions Privades", data.pressupost.ingressos.aportacions_privades)}
							{renderBudgetCategory("Altres Ingressos", data.pressupost.ingressos.altres_ingressos)}
							<div className='flex justify-between border-t pt-2 font-bold'>
								<span>Total Ingressos</span>
								<span className='text-green-600'>{formatCurrency(data.pressupost.ingressos.total_ingressos_eur)}</span>
							</div>
						</div>
					</div>

					<div className='border-b pb-4'>
						<h4 className='font-semibold mb-3'>Despeses</h4>
						<div className='space-y-2'>
							{renderBudgetCategory("Personal", data.pressupost.despeses.personal)}
							{renderBudgetCategory("Contractació Externa", data.pressupost.despeses.contractacio_externa)}
							{renderBudgetCategory("Material", data.pressupost.despeses.material)}
							{renderBudgetCategory("Despeses Indirectes", data.pressupost.despeses.despeses_indirectes)}
							{renderBudgetCategory("Altres Despeses", data.pressupost.despeses.altres_despeses)}
							<div className='flex justify-between border-t pt-2 font-bold'>
								<span>Total Despeses</span>
								<span className='text-red-600'>{formatCurrency(data.pressupost.despeses.total_despeses_eur)}</span>
							</div>
						</div>
					</div>

					<div className='bg-blue-50 p-4 rounded-lg'>
						<div className='flex justify-between items-center'>
							<span className='text-lg font-bold'>Subvenció Sol·licitada</span>
							<span className='text-2xl font-bold text-blue-600'>{formatCurrency(data.pressupost.resum.subvencio_solicitada_eur)}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Documentació Adjunta */}
			<Card>
				<CardHeader>
					<CardTitle>Documentació Adjunta</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex flex-wrap gap-2'>
						{data.documentacio_adjunta_check.annex_1_memoria && <Badge variant='secondary'>Memòria d'Actuació (Annex 1)</Badge>}
						{data.documentacio_adjunta_check.annex_2_pressupost && <Badge variant='secondary'>Pressupost (Annex 2)</Badge>}
						{data.documentacio_adjunta_check.annex_3_declaracio_subvencions && <Badge variant='secondary'>Declaració Responsable Requisits (Annex 3)</Badge>}
						{data.documentacio_adjunta_check.annex_4_menors && <Badge variant='secondary'>Declaració Protecció Menors (Annex 4)</Badge>}
						{data.documentacio_adjunta_check.annex_5_excepcionalitat && <Badge variant='secondary'>Justificació Excepcionalitat (Annex 5)</Badge>}
					</div>
				</CardContent>
			</Card>

			{/* Destinació Final Subvenció */}
			{data.destinacio_final_subvencio?.existeix_transferencia_a_tercers && data.destinacio_final_subvencio.beneficiaris && data.destinacio_final_subvencio.beneficiaris.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Destinació Final de la Subvenció</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{data.destinacio_final_subvencio.beneficiaris.map((beneficiari, index) => (
								<div key={index} className='bg-slate-50 p-3 rounded'>
									<p className='text-sm'>
										<strong>Ens:</strong> {beneficiari.nom_ens}
									</p>
									{beneficiari.nif_ens && (
										<p className='text-sm'>
											<strong>NIF:</strong> {beneficiari.nif_ens}
										</p>
									)}
									{beneficiari.domicili_ens && (
										<p className='text-sm'>
											<strong>Domicili:</strong> {beneficiari.domicili_ens}
										</p>
									)}
									<p className='text-sm'>
										<strong>Import:</strong> {formatCurrency(beneficiari.import_eur)}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Excepcionalitat */}
			{data.excepcionalitat?.justificacio_text && (
				<Card>
					<CardHeader>
						<CardTitle>Justificació de l'Excepcionalitat</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-base whitespace-pre-wrap'>{data.excepcionalitat.justificacio_text}</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
