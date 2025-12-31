import { useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { logManualEdit } from "../services/elaboracioMetricsService"

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentSection {
	id: string
	title: string
	content: string
	part?: "fets" | "fonaments" | "resolucio" // Part del decret (opcional)
}

export type DocumentType = "informe-tecnic" | "decret"

export interface PreviewData {
	numExpedient: string
	nomBeneficiari: string
	nif: string
	actuacioObjecte: string
	importTotalActuacio: string
	importTotalSubvencio: string
	importPagamentAvancat: string
	dataPresentacio: string
	// Budget data
	budget?: {
		ingressos: {
			recursosPropisEur: string
			subvencionsAltresEur: string
			aportacionsPrivadesEur: string
			altresIngressosEur: string
			totalIngressosEur: string
		}
		despeses: {
			personalEur: string
			despesesIndirectesEur: string
			totalDespesesEur: string
		}
		subvencioSolEur: string
	}
}

interface DocumentPreviewProps {
	sections: DocumentSection[]
	onChange?: (sections: DocumentSection[]) => void
	onManualEdit?: (section: "fets" | "fonaments" | "resolucio") => void
	data?: PreviewData
	documentType?: DocumentType
	expedientId?: string
}

// =============================================================================
// SECTION COMPONENT - Editable section for each step
// =============================================================================

interface SectionEditorProps {
	section: DocumentSection
	onChange: (content: string) => void
	onManualEdit?: () => void
}

function SectionEditor({ section, onChange, onManualEdit }: SectionEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null)
	const lastContentRef = useRef<string>("")
	const hasEditedRef = useRef<boolean>(false)

	// Update content when section changes from parent
	useEffect(() => {
		if (editorRef.current && section.content !== lastContentRef.current) {
			editorRef.current.innerHTML = section.content
			lastContentRef.current = section.content
		}
	}, [section.content])

	const handleInput = useCallback(() => {
		if (editorRef.current) {
			const content = editorRef.current.innerHTML
			lastContentRef.current = content
			onChange(content)

			// Log manual edit only once per section per session
			if (!hasEditedRef.current && onManualEdit) {
				hasEditedRef.current = true
				onManualEdit()
			}
		}
	}, [onChange, onManualEdit])

	return (
		<div className='mb-4'>
			<div
				ref={editorRef}
				contentEditable
				onInput={handleInput}
				className='p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent prose prose-sm max-w-none min-h-[40px] bg-white'
				style={{ whiteSpace: "pre-wrap" }}
				data-section-id={section.id}
			/>
		</div>
	)
}

// =============================================================================
// MAIN DOCUMENT PREVIEW COMPONENT
// =============================================================================

export default function DocumentPreview({ sections, onChange, onManualEdit, data, documentType = "informe-tecnic", expedientId }: DocumentPreviewProps) {
	const handleSectionChange = useCallback(
		(sectionId: string, newContent: string) => {
			const updatedSections = sections.map((s) => (s.id === sectionId ? { ...s, content: newContent } : s))
			onChange?.(updatedSections)
		},
		[sections, onChange]
	)

	// Handler to log manual edits with section part
	const handleManualEditForSection = useCallback(
		(part: "fets" | "fonaments" | "resolucio") => {
			// Log to metrics service
			logManualEdit(part, expedientId)
			// Also notify parent if callback provided
			onManualEdit?.(part)
		},
		[expedientId, onManualEdit]
	)

	// Separate sections by part for Decret
	const sectionsByPart = {
		fets: sections.filter((s) => s.part === "fets"),
		fonaments: sections.filter((s) => s.part === "fonaments"),
		resolucio: sections.filter((s) => s.part === "resolucio"),
	}

	// Check if there are sections for each part
	const hasFets = sectionsByPart.fets.length > 0
	const hasFonaments = sectionsByPart.fonaments.length > 0
	const hasResolucio = sectionsByPart.resolucio.length > 0

	// Render Decret document
	if (documentType === "decret") {
		return (
			<div className='space-y-4'>
				<CardDescription>Vista prèvia del decret generat - Podeu editar el text directament</CardDescription>
				<Card className='h-full flex flex-col'>
					<CardContent className='flex-1 flex flex-col pt-6'>
						{/* Document title */}
						<h1 className='text-lg font-bold text-center mb-6 border-b pb-2'>DECRET D'ATORGAMENT DE SUBVENCIÓ DIRECTA</h1>

						{/* Document sections */}
						<div className='flex-1 space-y-2'>
							{sections.length === 0 ? (
								<p className='text-muted-foreground text-center py-8'>Completeu el formulari per generar el document...</p>
							) : (
								<>
									{/* PART I: FETS */}
									{hasFets && (
										<div className='mb-6'>
											<h2 className='text-base font-bold mb-4 mt-4 bg-zinc-100 p-2 rounded'>PART I: FETS</h2>
											{sectionsByPart.fets.map((section) => (
												<SectionEditor key={section.id} section={section} onChange={(content) => handleSectionChange(section.id, content)} onManualEdit={() => handleManualEditForSection("fets")} />
											))}
										</div>
									)}

									{/* PART II: FONAMENTS DE DRET */}
									{hasFonaments && (
										<div className='mb-6'>
											<h2 className='text-base font-bold mb-4 mt-4 bg-zinc-100 p-2 rounded'>PART II: FONAMENTS DE DRET</h2>
											{sectionsByPart.fonaments.map((section) => (
												<SectionEditor key={section.id} section={section} onChange={(content) => handleSectionChange(section.id, content)} onManualEdit={() => handleManualEditForSection("fonaments")} />
											))}
										</div>
									)}

									{/* PART III: RESOLUCIÓ */}
									{hasResolucio && (
										<div className='mb-6'>
											<h2 className='text-base font-bold mb-4 mt-4 bg-zinc-100 p-2 rounded'>PART III: RESOLUCIÓ</h2>
											{sectionsByPart.resolucio.map((section) => (
												<SectionEditor key={section.id} section={section} onChange={(content) => handleSectionChange(section.id, content)} onManualEdit={() => handleManualEditForSection("resolucio")} />
											))}
										</div>
									)}

									{/* Placeholder for future parts */}
									{!hasFonaments && (
										<div className='mb-6 opacity-50'>
											<h2 className='text-base font-bold mb-4 mt-4 bg-zinc-100 p-2 rounded text-muted-foreground'>PART II: FONAMENTS DE DRET</h2>
											<p className='text-sm text-muted-foreground italic p-3'>(Pendent d'implementar)</p>
										</div>
									)}
									{!hasResolucio && (
										<div className='mb-6 opacity-50'>
											<h2 className='text-base font-bold mb-4 mt-4 bg-zinc-100 p-2 rounded text-muted-foreground'>PART III: RESOLUCIÓ</h2>
											<p className='text-sm text-muted-foreground italic p-3'>(Pendent d'implementar)</p>
										</div>
									)}
								</>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Render Informe Tècnic document (default)
	return (
		<div className='space-y-4'>
			<CardDescription>Vista prèvia del document generat - Podeu editar el text directament</CardDescription>
			<Card className='h-full flex flex-col'>
				<CardContent className='flex-1 flex flex-col pt-6'>
					{/* Document title */}
					<h1 className='text-lg font-bold text-center mb-6 border-b pb-2'>INFORME TÈCNIC RELATIU A SUBVENCIÓ DIRECTA</h1>

					{/* dades preliminars */}
					{data && (
						<div className='mb-6 overflow-hidden rounded-sm border border-zinc-200'>
							<table className='w-full border-collapse text-sm'>
								<tbody>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold w-1/3'>Núm. Expedient</td>
										<td className='p-2 border border-zinc-300 font-mono'>{data.numExpedient}</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Nom de l'Entitat beneficiària</td>
										<td className='p-2 border border-zinc-300'>{data.nomBeneficiari}</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>NIF</td>
										<td className='p-2 border border-zinc-300'>{data.nif}</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Actuació objecte de subvenció</td>
										<td className='p-2 border border-zinc-300'>{data.actuacioObjecte}</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Import total actuació</td>
										<td className='p-2 border border-zinc-300'>{data.importTotalActuacio} €</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Import total subvenció</td>
										<td className='p-2 border border-zinc-300'>{data.importTotalSubvencio} €</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Import pagament avançat</td>
										<td className='p-2 border border-zinc-300'>
											{data.importPagamentAvancat ? (
												<span>{data.importPagamentAvancat} €</span>
											) : (
												<>
													<span className='text-blue-600'>Opció A: ......... €</span>
													<span className='ml-4 text-blue-600'>Opció B: No s'escau</span>
												</>
											)}
										</td>
									</tr>
									<tr>
										<td className='bg-red-800 text-white p-2 border border-zinc-300 font-semibold'>Data presentació sol·licitud</td>
										<td className='p-2 border border-zinc-300'>{data.dataPresentacio}</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}

					{/* Document sections - one per step */}
					<div className='flex-1 space-y-2'>
						{sections.length === 0 ? (
							<p className='text-muted-foreground text-center py-8'>Completeu el formulari per generar el document...</p>
						) : (
							<>
								{sections.map((section, index) => (
									<div key={section.id}>
										{section.id === "step1-antecedents" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-4'>ANTECEDENTS A L'INFORME:</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
												{data?.budget && (
													<div className='mb-6'>
														<h2 className='text-base font-bold mb-3 mt-6'>PRESSUPOST DE L'ACTUACIÓ</h2>
														<div className='overflow-hidden rounded-sm border border-zinc-200'>
															<table className='w-full border-collapse text-sm'>
																<thead>
																	<tr>
																		<th className='bg-red-800 text-white p-2 border border-zinc-300 text-left font-semibold' colSpan={2}>
																			PREVISIÓ D'INGRESSOS
																		</th>
																		<th className='bg-red-800 text-white p-2 border border-zinc-300 text-center font-semibold'>IMPORT (€)</th>
																	</tr>
																</thead>
																<tbody>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Recursos propis
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.ingressos.recursosPropisEur}</td>
																	</tr>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Subvencions d'altres administracions públiques (inclou altres subvencions per a la mateixa actuació Diputació de Barcelona)
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.ingressos.subvencionsAltresEur}</td>
																	</tr>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Aportacions privades
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.ingressos.aportacionsPrivadesEur}</td>
																	</tr>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Altres ingressos
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.ingressos.altresIngressosEur}</td>
																	</tr>
																	<tr>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 font-semibold' colSpan={2}>
																			TOTAL
																		</td>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 text-right font-semibold'>{data.budget.ingressos.totalIngressosEur}</td>
																	</tr>
																</tbody>
															</table>
															<table className='w-full border-collapse text-sm mt-4'>
																<thead>
																	<tr>
																		<th className='bg-red-800 text-white p-2 border border-zinc-300 text-left font-semibold' colSpan={2}>
																			PREVISIÓ DE DESPESES
																		</th>
																		<th className='bg-red-800 text-white p-2 border border-zinc-300 text-center font-semibold'>IMPORT (€)</th>
																	</tr>
																</thead>
																<tbody>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Personal
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.despeses.personalEur}</td>
																	</tr>
																	<tr>
																		<td className='p-2 border border-zinc-300' colSpan={2}>
																			Despeses indirectes
																		</td>
																		<td className='p-2 border border-zinc-300 text-right'>{data.budget.despeses.despesesIndirectesEur}</td>
																	</tr>
																	<tr>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 font-semibold' colSpan={2}>
																			TOTAL
																		</td>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 text-right font-semibold'>{data.budget.despeses.totalDespesesEur}</td>
																	</tr>
																</tbody>
															</table>
															<table className='w-full border-collapse text-sm mt-4'>
																<tbody>
																	<tr>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 font-semibold w-2/3'>SUBVENCIÓ SOL·LICITADA (diferència entre ingressos i despeses)</td>
																		<td className='bg-zinc-100 p-2 border border-zinc-300 text-right font-semibold'>{data.budget.subvencioSolEur}</td>
																	</tr>
																</tbody>
															</table>
														</div>
													</div>
												)}
											</>
										)}
										{section.id === "step2-resultat-objecte" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>OBJECTE DE LA SUBVENCIÓ</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id === "step3-descripcio-actuacions" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>DESCRIPCIÓ DE LES ACTUACIONS</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id === "step4-motivacio-concessio" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>MOTIVACIÓ DE LA CONCESSIÓ DE LA SUBVENCIÓ</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id === "step5-excepcionalitat-concessio" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>EXCEPCIONALITAT DE LA CONCESSIÓ DE LA SUBVENCIÓ</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id === "step6-compromisos-corporacio" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>COMPROMISOS ASSUMITS PER LA CORPORACIÓ</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id === "step7-consideracions-concessio" && (
											<>
												<h2 className='text-base font-bold mb-3 mt-6'>CONSIDERACIONS A TENIR EN COMPTE PER A LA CONCESSIÓ DE LA SUBVENCIÓ</h2>
												<SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />
											</>
										)}
										{section.id !== "step1-antecedents" &&
											section.id !== "step2-resultat-objecte" &&
											section.id !== "step3-descripcio-actuacions" &&
											section.id !== "step4-motivacio-concessio" &&
											section.id !== "step5-excepcionalitat-concessio" &&
											section.id !== "step6-compromisos-corporacio" &&
											section.id !== "step7-consideracions-concessio" && <SectionEditor section={section} onChange={(content) => handleSectionChange(section.id, content)} />}
									</div>
								))}
							</>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
