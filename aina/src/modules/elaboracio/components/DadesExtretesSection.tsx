import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, FileText, Building2, CreditCard, ClipboardList, Target, AlertTriangle, Users, Plus, Trash2, Pencil, X } from "lucide-react"
import { SubvencioData } from "../types"
import { SubvencioPreFormData } from "./SubvencioPreForm"

// =============================================================================
// HELPER FUNCTIONS (outside component to avoid recreations)
// =============================================================================

const formatCurrency = (amount: number | null | undefined) => {
	if (amount == null) return "-"
	return new Intl.NumberFormat("ca-ES", {
		style: "currency",
		currency: "EUR",
	}).format(amount)
}

const getBeneficiaryTypeLabel = (type: string) => {
	switch (type) {
		case "entitat":
			return "Entitat"
		case "ens-local":
			return "Ens Local"
		default:
			return "-"
	}
}

const getEntityTypeLabel = (type: string) => {
	switch (type) {
		case "associacio":
			return "Associació"
		case "fundacio":
			return "Fundació"
		case "federacio":
			return "Federació"
		default:
			return "-"
	}
}

const getActionTypeLabel = (type: string) => {
	switch (type) {
		case "activitat":
			return "Activitat"
		case "esdeveniment":
			return "Esdeveniment"
		case "obra":
			return "Obra"
		default:
			return "-"
	}
}

// =============================================================================
// REUSABLE FIELD COMPONENTS (outside main component to avoid recreations)
// =============================================================================

interface EditableInputProps {
	label: string
	value: string | number | null | undefined
	onChange: (value: string) => void
	type?: string
	className?: string
	required?: boolean
	placeholder?: string
	canEdit: boolean
}

function EditableInput({ label, value, onChange, type = "text", className = "", required = false, placeholder = "", canEdit }: EditableInputProps) {
	return (
		<div className={className}>
			<Label className='text-xs text-slate-500 font-medium'>
				{label}
				{required && <span className='text-red-500 ml-1'>*</span>}
			</Label>
			{canEdit ? (
				<Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} className='mt-1 h-8 text-sm' />
			) : (
				<p className='mt-1 text-sm font-medium text-slate-900'>{value || "-"}</p>
			)}
		</div>
	)
}

interface EditableTextareaProps {
	label: string
	value: string | null | undefined
	onChange: (value: string) => void
	rows?: number
	required?: boolean
	canEdit: boolean
}

function EditableTextarea({ label, value, onChange, rows = 3, required = false, canEdit }: EditableTextareaProps) {
	return (
		<div>
			<Label className='text-xs text-slate-500 font-medium'>
				{label}
				{required && <span className='text-red-500 ml-1'>*</span>}
			</Label>
			{canEdit ? (
				<Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={label} className='mt-1 text-sm' />
			) : (
				<p className='mt-1 text-sm text-slate-700 whitespace-pre-wrap'>{value || "-"}</p>
			)}
		</div>
	)
}

interface EditableCurrencyInputProps {
	label: string
	value: number | null | undefined
	onChange: (value: number) => void
	className?: string
	canEdit: boolean
}

function EditableCurrencyInput({ label, value, onChange, className = "", canEdit }: EditableCurrencyInputProps) {
	return (
		<div className={className}>
			{label && <Label className='text-xs text-slate-500 font-medium'>{label}</Label>}
			{canEdit ? (
				<div className='relative mt-1'>
					<Input type='number' step='0.01' value={value ?? ""} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} placeholder='0.00' className='h-8 text-sm pr-8' />
					<span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400'>€</span>
				</div>
			) : (
				<p className='mt-1 text-sm font-medium text-slate-900'>{formatCurrency(value)}</p>
			)}
		</div>
	)
}

interface BudgetCategoryEditorProps {
	label: string
	category: { import_eur: number | null; detall?: Array<{ concepte: string; import_eur: number }> } | undefined
	onChange: (category: { import_eur: number | null; detall?: Array<{ concepte: string; import_eur: number }> }) => void
	colorClass?: string
	canEdit: boolean
}

function BudgetCategoryEditor({ label, category, onChange, colorClass = "bg-slate-50", canEdit }: BudgetCategoryEditorProps) {
	const detall = category?.detall || []
	const totalFromDetail = detall.reduce((sum, item) => sum + (item.import_eur || 0), 0)

	const addDetailItem = () => {
		onChange({
			...category,
			import_eur: totalFromDetail,
			detall: [...detall, { concepte: "", import_eur: 0 }],
		})
	}

	const removeDetailItem = (index: number) => {
		const newDetall = detall.filter((_, i) => i !== index)
		const newTotal = newDetall.reduce((sum, item) => sum + (item.import_eur || 0), 0)
		onChange({
			...category,
			import_eur: newTotal,
			detall: newDetall,
		})
	}

	const updateDetailItem = (index: number, field: "concepte" | "import_eur", value: string | number) => {
		const newDetall = [...detall]
		newDetall[index] = { ...newDetall[index], [field]: value }
		const newTotal = newDetall.reduce((sum, item) => sum + (item.import_eur || 0), 0)
		onChange({
			...category,
			import_eur: newTotal,
			detall: newDetall,
		})
	}

	return (
		<div className={`${colorClass} rounded-lg p-3 space-y-2`}>
			<div className='flex items-center justify-between'>
				<Label className='text-xs font-medium'>{label}</Label>
				{canEdit && (
					<Button type='button' variant='ghost' size='sm' onClick={addDetailItem} className='h-6 px-2 text-xs'>
						<Plus className='h-3 w-3 mr-1' /> Afegir
					</Button>
				)}
			</div>
			{detall.length > 0 ? (
				<div className='space-y-2'>
					{detall.map((item, index) => (
						<div key={index} className='flex items-center gap-2'>
							{canEdit ? (
								<>
									<Input value={item.concepte} onChange={(e) => updateDetailItem(index, "concepte", e.target.value)} placeholder='Concepte' className='flex-1 h-7 text-xs' />
									<div className='relative w-24'>
										<Input
											type='number'
											step='0.01'
											value={item.import_eur ?? ""}
											onChange={(e) => updateDetailItem(index, "import_eur", parseFloat(e.target.value) || 0)}
											placeholder='0.00'
											className='h-7 text-xs pr-6'
										/>
										<span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400'>€</span>
									</div>
									<Button type='button' variant='ghost' size='sm' onClick={() => removeDetailItem(index)} className='h-7 w-7 p-0 text-red-500 hover:text-red-700'>
										<Trash2 className='h-3 w-3' />
									</Button>
								</>
							) : (
								<>
									<span className='flex-1 text-xs text-slate-700'>{item.concepte || "-"}</span>
									<span className='text-xs font-medium text-slate-900'>{formatCurrency(item.import_eur)}</span>
								</>
							)}
						</div>
					))}
					<div className='flex justify-between pt-2 border-t text-xs'>
						<span className='font-medium'>Subtotal {label}</span>
						<span className='font-semibold'>{formatCurrency(totalFromDetail)}</span>
					</div>
				</div>
			) : canEdit ? (
				<div className='flex items-center gap-2'>
					<Input
						type='number'
						step='0.01'
						value={category?.import_eur ?? ""}
						onChange={(e) => onChange({ ...category, import_eur: parseFloat(e.target.value) || 0, detall: [] })}
						placeholder='0.00'
						className='h-7 text-xs'
					/>
					<span className='text-xs text-slate-400'>€</span>
				</div>
			) : (
				<p className='text-sm font-medium text-slate-900'>{formatCurrency(category?.import_eur)}</p>
			)}
		</div>
	)
}

interface DadesExtretesSectionProps {
	data: SubvencioData
	preFormData?: SubvencioPreFormData
	isValidated: boolean
	onValidate: () => void
	onDataChange?: (data: SubvencioData) => void
}

export default function DadesExtretesSection({ data: initialData, preFormData, isValidated, onValidate, onDataChange }: DadesExtretesSectionProps) {
	const [data, setData] = useState<SubvencioData>(initialData)
	const [validationErrors, setValidationErrors] = useState<string[]>([])
	const [showValidationMessage, setShowValidationMessage] = useState(false)
	const [isEditMode, setIsEditMode] = useState(false)

	// Computed: can edit only if in edit mode and not validated
	const canEdit = isEditMode && !isValidated

	// Sync with parent when data changes
	useEffect(() => {
		onDataChange?.(data)
	}, [data, onDataChange])

	// Update nested field helper - memoized to prevent unnecessary re-renders
	const updateField = useCallback((path: string, value: unknown) => {
		setData((prev) => {
			const newData = JSON.parse(JSON.stringify(prev)) // Deep clone
			const keys = path.split(".")
			let current = newData
			for (let i = 0; i < keys.length - 1; i++) {
				if (current[keys[i]] === undefined) {
					current[keys[i]] = {}
				}
				current = current[keys[i]]
			}
			current[keys[keys.length - 1]] = value
			return newData
		})
	}, [])

	// Check if data can be validated
	const canValidate = useMemo(() => {
		if (!data.dades_generals?.titol_projecte) return false
		if (!data.ens_solicitant?.nom_ens) return false
		if (!data.ens_solicitant?.nif) return false
		if (!data.pressupost?.resum?.subvencio_solicitada_eur && data.pressupost?.resum?.subvencio_solicitada_eur !== 0) return false
		return true
	}, [data])

	const validateData = (): boolean => {
		const errors: string[] = []

		if (!data.dades_generals?.titol_projecte) {
			errors.push("El títol del projecte és obligatori")
		}
		if (!data.ens_solicitant?.nom_ens) {
			errors.push("El nom de l'ens sol·licitant és obligatori")
		}
		if (!data.ens_solicitant?.nif) {
			errors.push("El NIF de l'ens sol·licitant és obligatori")
		}
		if (!data.pressupost?.resum?.subvencio_solicitada_eur && data.pressupost?.resum?.subvencio_solicitada_eur !== 0) {
			errors.push("L'import de la subvenció sol·licitada és obligatori")
		}

		setValidationErrors(errors)
		return errors.length === 0
	}

	const handleValidate = () => {
		if (validateData()) {
			setShowValidationMessage(false)
			onValidate()
		} else {
			setShowValidationMessage(true)
		}
	}

	return (
		<div className='space-y-6'>
			{/* Main Header Card */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='flex items-center gap-2'>
								Dades Extretes
								{isValidated && <CheckCircle className='h-5 w-5 text-green-500' />}
							</CardTitle>
							<CardDescription>Informació completa de la sol·licitud de subvenció</CardDescription>
						</div>
						{isValidated ? (
							<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>Validat</span>
						) : (
							<div className='flex items-center gap-2'>
								{isEditMode ? (
									<Button variant='outline' onClick={() => setIsEditMode(false)} className='border-slate-300'>
										<X className='h-4 w-4 mr-2' />
										Sortir d'Edició
									</Button>
								) : (
									<Button variant='outline' onClick={() => setIsEditMode(true)} className='border-amber-300 text-amber-700 hover:bg-amber-50'>
										<Pencil className='h-4 w-4 mr-2' />
										Editar
									</Button>
								)}
								<Button onClick={handleValidate} className={canValidate ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 hover:bg-gray-500 cursor-pointer"}>
									<CheckCircle className='h-4 w-4 mr-2' />
									Validar Dades
								</Button>
								{showValidationMessage && !canValidate && <span className='text-xs text-red-600'>Completa tots els camps obligatoris</span>}
							</div>
						)}
					</div>
				</CardHeader>

				{/* Summary Banner */}
				<CardContent>
					<div className='bg-blue-50 rounded-lg p-4 border border-blue-100'>
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							<div>
								<p className='text-sm text-slate-600'>Títol del Projecte</p>
								<p className='font-semibold text-slate-900'>{data.dades_generals?.titol_projecte || "-"}</p>
							</div>
							<div>
								<p className='text-sm text-slate-600'>Ens Sol·licitant</p>
								<p className='font-semibold text-slate-900'>{data.ens_solicitant?.nom_ens || "-"}</p>
							</div>
							<div>
								<p className='text-sm text-slate-600'>Municipi</p>
								<p className='font-semibold text-slate-900'>{data.dades_generals?.municip_actuacio || "-"}</p>
							</div>
							<div>
								<p className='text-sm text-slate-600'>Subvenció Sol·licitada</p>
								<p className='font-bold text-xl text-blue-600'>{formatCurrency(data.pressupost?.resum?.subvencio_solicitada_eur)}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Dades Preliminars (from PreForm) - Read Only */}
			{preFormData && (
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='flex items-center gap-2 text-lg'>
							<ClipboardList className='h-5 w-5 text-purple-600' />
							Dades Preliminars de l'Expedient
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
							<div className='bg-purple-50 rounded-lg p-3'>
								<p className='text-xs text-purple-600 font-medium'>Núm. Expedient</p>
								<p className='text-sm font-semibold text-slate-900'>{preFormData.numeroExpedient || "-"}</p>
							</div>
							<div className='bg-purple-50 rounded-lg p-3'>
								<p className='text-xs text-purple-600 font-medium'>Data Presentació</p>
								<p className='text-sm font-semibold text-slate-900'>{preFormData.dataPresentacio ? new Date(preFormData.dataPresentacio).toLocaleDateString("ca-ES") : "-"}</p>
							</div>
							<div className='bg-purple-50 rounded-lg p-3'>
								<p className='text-xs text-purple-600 font-medium'>Tipus Beneficiari</p>
								<p className='text-sm font-semibold text-slate-900'>{getBeneficiaryTypeLabel(preFormData.tipusBeneficiari)}</p>
							</div>
							{preFormData.tipusBeneficiari === "entitat" && preFormData.tipusEntitat && (
								<div className='bg-purple-50 rounded-lg p-3'>
									<p className='text-xs text-purple-600 font-medium'>Tipus Entitat</p>
									<p className='text-sm font-semibold text-slate-900'>{getEntityTypeLabel(preFormData.tipusEntitat)}</p>
								</div>
							)}
							<div className='bg-purple-50 rounded-lg p-3'>
								<p className='text-xs text-purple-600 font-medium'>Tipus Actuació</p>
								<p className='text-sm font-semibold text-slate-900'>{getActionTypeLabel(preFormData.tipusActuacio)}</p>
							</div>
							<div className='bg-amber-50 rounded-lg p-3'>
								<p className='text-xs text-amber-600 font-medium'>Pagament Avançat</p>
								<p className='text-sm font-bold text-amber-700'>{preFormData.importPagamentAvancat ? formatCurrency(parseFloat(preFormData.importPagamentAvancat)) : "-"}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Dades Generals - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<FileText className='h-5 w-5 text-blue-600' />
						Dades Generals de la Subvenció
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
						<EditableInput label='Codi BDNS' value={data.dades_generals?.codi_bdns} onChange={(v) => updateField("dades_generals.codi_bdns", v)} canEdit={canEdit} />
						<EditableInput label='Codi Convocatòria' value={data.dades_generals?.codi_convocatoria} onChange={(v) => updateField("dades_generals.codi_convocatoria", v)} canEdit={canEdit} />
						<EditableInput label='Centre Gestor' value={data.dades_generals?.centre_gestor} onChange={(v) => updateField("dades_generals.centre_gestor", v)} canEdit={canEdit} />
						<EditableInput label='Àrea/Servei' value={data.dades_generals?.area_servei} onChange={(v) => updateField("dades_generals.area_servei", v)} canEdit={canEdit} />
						<EditableInput label="Any d'Execució" value={data.dades_generals?.any_execucio} onChange={(v) => updateField("dades_generals.any_execucio", v)} canEdit={canEdit} />
						<EditableInput label='Municipi' value={data.dades_generals?.municip_actuacio} onChange={(v) => updateField("dades_generals.municip_actuacio", v)} canEdit={canEdit} />
					</div>
					<div className='mt-4 pt-4 border-t'>
						<EditableInput label='Títol del Projecte' value={data.dades_generals?.titol_projecte} onChange={(v) => updateField("dades_generals.titol_projecte", v)} required canEdit={canEdit} />
					</div>
				</CardContent>
			</Card>

			{/* Ens Sol·licitant - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Building2 className='h-5 w-5 text-green-600' />
						Ens Sol·licitant
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<EditableInput label="Nom de l'Ens" value={data.ens_solicitant?.nom_ens} onChange={(v) => updateField("ens_solicitant.nom_ens", v)} className='md:col-span-2' required canEdit={canEdit} />
						<EditableInput label='NIF' value={data.ens_solicitant?.nif} onChange={(v) => updateField("ens_solicitant.nif", v)} required canEdit={canEdit} />
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t'>
						{/* Adreça */}
						<div className='bg-slate-50 rounded-lg p-3 space-y-3'>
							<h4 className='text-xs font-semibold text-slate-700'>📍 Adreça</h4>
							<EditableInput label='Domicili' value={data.ens_solicitant?.adreca?.domicili} onChange={(v) => updateField("ens_solicitant.adreca.domicili", v)} canEdit={canEdit} />
							<div className='grid grid-cols-2 gap-2'>
								<EditableInput label='Codi Postal' value={data.ens_solicitant?.adreca?.codi_postal} onChange={(v) => updateField("ens_solicitant.adreca.codi_postal", v)} canEdit={canEdit} />
								<EditableInput label='Localitat' value={data.ens_solicitant?.adreca?.localitat} onChange={(v) => updateField("ens_solicitant.adreca.localitat", v)} canEdit={canEdit} />
							</div>
						</div>

						{/* Contacte */}
						<div className='bg-slate-50 rounded-lg p-3 space-y-3'>
							<h4 className='text-xs font-semibold text-slate-700'>📞 Contacte</h4>
							<EditableInput label='Telèfon' value={data.ens_solicitant?.contacte?.telefon} onChange={(v) => updateField("ens_solicitant.contacte.telefon", v)} canEdit={canEdit} />
							<EditableInput label='Email' value={data.ens_solicitant?.contacte?.email} onChange={(v) => updateField("ens_solicitant.contacte.email", v)} type='email' canEdit={canEdit} />
						</div>
					</div>

					{/* Representant Legal */}
					<div className='pt-2 border-t'>
						<h4 className='text-xs font-semibold text-slate-700 mb-3'>👤 Representant Legal</h4>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<EditableInput label='Nom i Cognoms' value={data.ens_solicitant?.representant_legal?.nom_cognoms} onChange={(v) => updateField("ens_solicitant.representant_legal.nom_cognoms", v)} canEdit={canEdit} />
							<EditableInput label='Càrrec' value={data.ens_solicitant?.representant_legal?.carrec} onChange={(v) => updateField("ens_solicitant.representant_legal.carrec", v)} canEdit={canEdit} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Modalitat d'Execució - Ens Instrumental - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Users className='h-5 w-5 text-orange-600' />
						Modalitat d'Execució
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center space-x-2'>
						<Checkbox
							id='es_ens_instrumental'
							checked={data.modalitat_execucio?.es_ens_instrumental || false}
							onCheckedChange={(checked) => updateField("modalitat_execucio.es_ens_instrumental", checked)}
							disabled={!canEdit}
						/>
						<Label htmlFor='es_ens_instrumental' className='text-sm'>
							Execució a través d'ens instrumental
						</Label>
					</div>
					{data.modalitat_execucio?.es_ens_instrumental && (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg'>
							<EditableInput
								label='Nom/Raó Social'
								value={data.modalitat_execucio?.dades_ens_instrumental?.nom_rao_social}
								onChange={(v) => updateField("modalitat_execucio.dades_ens_instrumental.nom_rao_social", v)}
								canEdit={canEdit}
							/>
							<EditableInput label='NIF' value={data.modalitat_execucio?.dades_ens_instrumental?.nif} onChange={(v) => updateField("modalitat_execucio.dades_ens_instrumental.nif", v)} canEdit={canEdit} />
						</div>
					)}
				</CardContent>
			</Card>

			{/* Memòria d'Actuació - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Target className='h-5 w-5 text-indigo-600' />
						Memòria d'Actuació
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<EditableInput
						label='Títol Actuacions i Municipi'
						value={data.memoria_actuacio?.titol_actuacions_i_municipi}
						onChange={(v) => updateField("memoria_actuacio.titol_actuacions_i_municipi", v)}
						canEdit={canEdit}
					/>
					<EditableTextarea
						label='Descripció de les Actuacions'
						value={data.memoria_actuacio?.descripcio_actuacions}
						onChange={(v) => updateField("memoria_actuacio.descripcio_actuacions", v)}
						rows={4}
						canEdit={canEdit}
					/>
					<EditableTextarea label='Objectius i Resultats' value={data.memoria_actuacio?.objectius_resultats} onChange={(v) => updateField("memoria_actuacio.objectius_resultats", v)} rows={3} canEdit={canEdit} />
					<EditableTextarea
						label='Actuacions Relacionades amb Objectius'
						value={data.memoria_actuacio?.actuacions_relacionades_objectius}
						onChange={(v) => updateField("memoria_actuacio.actuacions_relacionades_objectius", v)}
						rows={3}
						canEdit={canEdit}
					/>
					<EditableTextarea
						label='Pla de Treball Calendaritzat'
						value={data.memoria_actuacio?.pla_treball_calendaritzat}
						onChange={(v) => updateField("memoria_actuacio.pla_treball_calendaritzat", v)}
						rows={3}
						canEdit={canEdit}
					/>
				</CardContent>
			</Card>

			{/* Pressupost - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<CreditCard className='h-5 w-5 text-emerald-600' />
						Pressupost
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						{/* Ingressos */}
						<div className='space-y-3'>
							<h4 className='font-semibold text-green-800 flex items-center gap-2'>📈 Ingressos</h4>
							<BudgetCategoryEditor
								label='Recursos Propis'
								category={data.pressupost?.ingressos?.recursos_propis}
								onChange={(cat) => updateField("pressupost.ingressos.recursos_propis", cat)}
								colorClass='bg-green-50'
								canEdit={canEdit}
							/>
							<BudgetCategoryEditor
								label='Subvencions Altres Administracions'
								category={data.pressupost?.ingressos?.subvencions_altres_admins}
								onChange={(cat) => updateField("pressupost.ingressos.subvencions_altres_admins", cat)}
								colorClass='bg-green-50'
								canEdit={canEdit}
							/>
							<BudgetCategoryEditor
								label='Aportacions Privades'
								category={data.pressupost?.ingressos?.aportacions_privades || { import_eur: 0, detall: [] }}
								onChange={(cat) => updateField("pressupost.ingressos.aportacions_privades", cat)}
								colorClass='bg-green-50'
								canEdit={canEdit}
							/>
							<BudgetCategoryEditor
								label='Altres Ingressos'
								category={data.pressupost?.ingressos?.altres_ingressos || { import_eur: 0, detall: [] }}
								onChange={(cat) => updateField("pressupost.ingressos.altres_ingressos", cat)}
								colorClass='bg-green-50'
								canEdit={canEdit}
							/>
							<div className='flex justify-between items-center p-3 bg-green-100 rounded-lg'>
								<span className='font-semibold text-green-800'>Total Ingressos</span>
								<EditableCurrencyInput label='' value={data.pressupost?.ingressos?.total_ingressos_eur} onChange={(v) => updateField("pressupost.ingressos.total_ingressos_eur", v)} className='w-32' canEdit={canEdit} />
							</div>
						</div>

						{/* Despeses */}
						<div className='space-y-3'>
							<h4 className='font-semibold text-red-800 flex items-center gap-2'>📉 Despeses</h4>
							<BudgetCategoryEditor label='Personal' category={data.pressupost?.despeses?.personal} onChange={(cat) => updateField("pressupost.despeses.personal", cat)} colorClass='bg-red-50' canEdit={canEdit} />
							<BudgetCategoryEditor
								label='Contractació Externa'
								category={data.pressupost?.despeses?.contractacio_externa}
								onChange={(cat) => updateField("pressupost.despeses.contractacio_externa", cat)}
								colorClass='bg-red-50'
								canEdit={canEdit}
							/>
							<BudgetCategoryEditor label='Material' category={data.pressupost?.despeses?.material} onChange={(cat) => updateField("pressupost.despeses.material", cat)} colorClass='bg-red-50' canEdit={canEdit} />
							<BudgetCategoryEditor
								label='Despeses Indirectes'
								category={data.pressupost?.despeses?.despeses_indirectes || { import_eur: 0, detall: [] }}
								onChange={(cat) => updateField("pressupost.despeses.despeses_indirectes", cat)}
								colorClass='bg-red-50'
								canEdit={canEdit}
							/>
							<BudgetCategoryEditor
								label='Altres Despeses'
								category={data.pressupost?.despeses?.altres_despeses || { import_eur: 0, detall: [] }}
								onChange={(cat) => updateField("pressupost.despeses.altres_despeses", cat)}
								colorClass='bg-red-50'
								canEdit={canEdit}
							/>
							<div className='flex justify-between items-center p-3 bg-red-100 rounded-lg'>
								<span className='font-semibold text-red-800'>Total Despeses</span>
								<EditableCurrencyInput label='' value={data.pressupost?.despeses?.total_despeses_eur} onChange={(v) => updateField("pressupost.despeses.total_despeses_eur", v)} className='w-32' canEdit={canEdit} />
							</div>
						</div>
					</div>

					{/* Subvenció Sol·licitada */}
					<div className='mt-4 bg-blue-50 rounded-lg p-4'>
						<div className='flex justify-between items-center'>
							<span className='text-lg text-black font-semibold'>Subvenció Sol·licitada</span>
							{canEdit ? (
								<div className='flex items-center gap-2'>
									<Input
										type='number'
										step='0.01'
										value={data.pressupost?.resum?.subvencio_solicitada_eur ?? ""}
										onChange={(e) => updateField("pressupost.resum.subvencio_solicitada_eur", parseFloat(e.target.value) || 0)}
										className='w-40 h-10 text-xl font-bold text-blue-600 text-right'
									/>
									<span className='text-xl font-bold text-blue-600'>€</span>
								</div>
							) : (
								<span className='text-xl font-bold text-blue-600'>{formatCurrency(data.pressupost?.resum?.subvencio_solicitada_eur)}</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Documentació Adjunta - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<FileText className='h-5 w-5 text-slate-600' />
						Documentació Adjunta
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='annex_1'
								checked={data.documentacio_adjunta_check?.annex_1_memoria || false}
								onCheckedChange={(checked) => updateField("documentacio_adjunta_check.annex_1_memoria", checked)}
								disabled={!canEdit}
							/>
							<Label htmlFor='annex_1' className='text-sm'>
								Memòria d'Actuació (Annex 1)
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='annex_2'
								checked={data.documentacio_adjunta_check?.annex_2_pressupost || false}
								onCheckedChange={(checked) => updateField("documentacio_adjunta_check.annex_2_pressupost", checked)}
								disabled={!canEdit}
							/>
							<Label htmlFor='annex_2' className='text-sm'>
								Pressupost (Annex 2)
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='annex_3'
								checked={data.documentacio_adjunta_check?.annex_3_declaracio_subvencions || false}
								onCheckedChange={(checked) => updateField("documentacio_adjunta_check.annex_3_declaracio_subvencions", checked)}
								disabled={!canEdit}
							/>
							<Label htmlFor='annex_3' className='text-sm'>
								Declaració Requisits (Annex 3)
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='annex_4'
								checked={data.documentacio_adjunta_check?.annex_4_menors || false}
								onCheckedChange={(checked) => updateField("documentacio_adjunta_check.annex_4_menors", checked)}
								disabled={!canEdit}
							/>
							<Label htmlFor='annex_4' className='text-sm'>
								Protecció Menors (Annex 4)
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='annex_5'
								checked={data.documentacio_adjunta_check?.annex_5_excepcionalitat || false}
								onCheckedChange={(checked) => updateField("documentacio_adjunta_check.annex_5_excepcionalitat", checked)}
								disabled={!canEdit}
							/>
							<Label htmlFor='annex_5' className='text-sm'>
								Excepcionalitat (Annex 5)
							</Label>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Destinació Final Subvenció - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Users className='h-5 w-5 text-teal-600' />
						Destinació Final de la Subvenció
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center space-x-2'>
						<Checkbox
							id='transferencia_tercers'
							checked={data.destinacio_final_subvencio?.existeix_transferencia_a_tercers || false}
							onCheckedChange={(checked) => {
								updateField("destinacio_final_subvencio.existeix_transferencia_a_tercers", checked)
								if (!checked) {
									updateField("destinacio_final_subvencio.beneficiaris", [])
								}
							}}
							disabled={!canEdit}
						/>
						<Label htmlFor='transferencia_tercers' className='text-sm'>
							Existeix transferència a tercers
						</Label>
					</div>

					{data.destinacio_final_subvencio?.existeix_transferencia_a_tercers && (
						<div className='space-y-3'>
							{(data.destinacio_final_subvencio.beneficiaris || []).map((beneficiari, index) => (
								<div key={index} className='bg-teal-50 p-3 rounded-lg border border-teal-100'>
									{canEdit ? (
										<div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
											<div className='md:col-span-2'>
												<Label className='text-xs text-teal-600'>Nom Ens</Label>
												<Input
													value={beneficiari.nom_ens}
													onChange={(e) => {
														const newBeneficiaris = [...(data.destinacio_final_subvencio?.beneficiaris || [])]
														newBeneficiaris[index] = { ...newBeneficiaris[index], nom_ens: e.target.value }
														updateField("destinacio_final_subvencio.beneficiaris", newBeneficiaris)
													}}
													className='h-7 text-sm'
												/>
											</div>
											<div>
												<Label className='text-xs text-teal-600'>NIF</Label>
												<Input
													value={beneficiari.nif_ens || ""}
													onChange={(e) => {
														const newBeneficiaris = [...(data.destinacio_final_subvencio?.beneficiaris || [])]
														newBeneficiaris[index] = { ...newBeneficiaris[index], nif_ens: e.target.value }
														updateField("destinacio_final_subvencio.beneficiaris", newBeneficiaris)
													}}
													className='h-7 text-sm'
												/>
											</div>
											<div>
												<Label className='text-xs text-teal-600'>Import (€)</Label>
												<Input
													type='number'
													step='0.01'
													value={beneficiari.import_eur}
													onChange={(e) => {
														const newBeneficiaris = [...(data.destinacio_final_subvencio?.beneficiaris || [])]
														newBeneficiaris[index] = { ...newBeneficiaris[index], import_eur: parseFloat(e.target.value) || 0 }
														updateField("destinacio_final_subvencio.beneficiaris", newBeneficiaris)
													}}
													className='h-7 text-sm'
												/>
											</div>
											<div className='flex items-end'>
												<Button
													type='button'
													variant='ghost'
													size='sm'
													onClick={() => {
														const newBeneficiaris = (data.destinacio_final_subvencio?.beneficiaris || []).filter((_, i) => i !== index)
														updateField("destinacio_final_subvencio.beneficiaris", newBeneficiaris)
													}}
													className='h-7 text-red-500 hover:text-red-700'
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</div>
										</div>
									) : (
										<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
											<div className='md:col-span-2'>
												<p className='text-xs text-teal-600'>Nom Ens</p>
												<p className='text-sm font-medium text-slate-900'>{beneficiari.nom_ens || "-"}</p>
											</div>
											<div>
												<p className='text-xs text-teal-600'>NIF</p>
												<p className='text-sm font-medium text-slate-900'>{beneficiari.nif_ens || "-"}</p>
											</div>
											<div>
												<p className='text-xs text-teal-600'>Import</p>
												<p className='text-sm font-medium text-slate-900'>{formatCurrency(beneficiari.import_eur)}</p>
											</div>
										</div>
									)}
								</div>
							))}
							{canEdit && (
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => {
										const newBeneficiaris = [...(data.destinacio_final_subvencio?.beneficiaris || []), { nom_ens: "", nif_ens: "", domicili_ens: "", import_eur: 0 }]
										updateField("destinacio_final_subvencio.beneficiaris", newBeneficiaris)
									}}
									className='w-full'
								>
									<Plus className='h-4 w-4 mr-2' /> Afegir Beneficiari
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Excepcionalitat - EDITABLE */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<AlertTriangle className='h-5 w-5 text-amber-600' />
						Justificació de l'Excepcionalitat
					</CardTitle>
				</CardHeader>
				<CardContent>
					<EditableTextarea
						label="Justificació de l'Excepcionalitat i Urgència"
						value={data.excepcionalitat?.justificacio_text}
						onChange={(v) => updateField("excepcionalitat.justificacio_text", v)}
						rows={4}
						canEdit={canEdit}
					/>
				</CardContent>
			</Card>

			{/* Validation Errors */}
			{validationErrors.length > 0 && (
				<Card className='border-red-200 bg-red-50'>
					<CardContent className='pt-6'>
						<div className='flex items-start gap-2'>
							<AlertCircle className='h-5 w-5 text-red-500 mt-0.5' />
							<div>
								<h4 className='font-medium text-red-800'>Errors de validació</h4>
								<ul className='mt-2 list-disc list-inside text-sm text-red-700'>
									{validationErrors.map((error, index) => (
										<li key={index}>{error}</li>
									))}
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
