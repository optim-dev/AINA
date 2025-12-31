import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react"

export interface SubvencioPreFormData {
	// Desplegables amagats
	tipusBeneficiari: "entitat" | "ens-local" | ""
	tipusEntitat: "associacio" | "fundacio" | "federacio" | ""
	tipusActuacio: "activitat" | "esdeveniment" | "obra" | ""

	// Camps capçalera (només els que NO s'extreuen del PDF)
	numeroExpedient: string
	importPagamentAvancat: string
	dataPresentacio: string
}

interface SubvencioPreFormProps {
	onFormComplete: (data: SubvencioPreFormData) => void
}

// Base case data for testing and development
const SAMPLE_FORM_DATA: SubvencioPreFormData = {
	tipusBeneficiari: "entitat",
	tipusEntitat: "associacio",
	tipusActuacio: "activitat",
	numeroExpedient: "EXP-2024-001234",
	importPagamentAvancat: "7500.00",
	dataPresentacio: "2024-06-15",
}

export default function SubvencioPreForm({ onFormComplete }: SubvencioPreFormProps) {
	const [isExpanded, setIsExpanded] = useState(true)
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [formData, setFormData] = useState<SubvencioPreFormData>({
		tipusBeneficiari: "",
		tipusEntitat: "",
		tipusActuacio: "",
		numeroExpedient: "",
		importPagamentAvancat: "",
		dataPresentacio: "",
	})

	const handlePrefillSample = () => {
		setFormData(SAMPLE_FORM_DATA)
	}

	const handleInputChange = (field: keyof SubvencioPreFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}))
	}

	const isFormValid = () => {
		return (
			formData.tipusBeneficiari !== "" &&
			formData.tipusActuacio !== "" &&
			formData.numeroExpedient.trim() !== "" &&
			formData.importPagamentAvancat.trim() !== "" &&
			formData.dataPresentacio.trim() !== "" &&
			(formData.tipusBeneficiari !== "entitat" || formData.tipusEntitat !== "")
		)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (isFormValid()) {
			setIsSubmitted(true)
			setIsExpanded(false)
			onFormComplete(formData)
		}
	}

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded)
	}

	return (
		<Card>
			<CardHeader className={isSubmitted ? "cursor-pointer" : ""} onClick={isSubmitted ? toggleExpanded : undefined}>
				<div className='flex items-center justify-between'>
					<div className='flex-1'>
						<CardTitle>Dades Preliminars de la Sol·licitud</CardTitle>
						{isSubmitted ? (
							<CardDescription className='flex items-center gap-2'>
								<CheckCircle2 className='h-4 w-4 text-green-600' />
								Dades completades - Clica per {isExpanded ? "minimitzar" : "veure"}
							</CardDescription>
						) : (
							<CardDescription>Completa aquestes dades abans d'analitzar el PDF de la sol·licitud</CardDescription>
						)}
					</div>
					{isSubmitted && (
						<button type='button' onClick={toggleExpanded} className='ml-4'>
							{isExpanded ? <ChevronDown className='h-5 w-5 text-slate-600' /> : <ChevronRight className='h-5 w-5 text-slate-600' />}
						</button>
					)}
				</div>
			</CardHeader>

			{/* Summary when collapsed */}
			{isSubmitted && !isExpanded && (
				<CardContent>
					<div className='grid grid-cols-2 md:grid-cols-3 gap-3 text-sm'>
						<div>
							<span className='text-slate-500'>Exp:</span> <span className='font-medium'>{formData.numeroExpedient}</span>
						</div>
						<div>
							<span className='text-slate-500'>Pagament avançat:</span> <span className='font-medium'>{formData.importPagamentAvancat} €</span>
						</div>
						<div>
							<span className='text-slate-500'>Data:</span> <span className='font-medium'>{formData.dataPresentacio}</span>
						</div>
					</div>
				</CardContent>
			)}

			{isExpanded && (
				<CardContent>
					<form onSubmit={handleSubmit} className='space-y-6'>
						{/* Prefill Sample Data Button - for testing */}
						{!isSubmitted && (
							<div className='flex justify-end'>
								<Button type='button' variant='outline' size='sm' onClick={handlePrefillSample}>
									Omplir dades d'exemple
								</Button>
							</div>
						)}

						{/* Classificació Section */}
						<div className='space-y-4'>
							<h3 className='font-semibold text-slate-700 border-b pb-2'>Classificació</h3>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								{/* Tipus de Beneficiari */}
								<div className='space-y-2'>
									<Label htmlFor='tipusBeneficiari' className='text-sm font-medium'>
										Tipus de beneficiari *
									</Label>
									<select
										id='tipusBeneficiari'
										value={formData.tipusBeneficiari}
										onChange={(e) => handleInputChange("tipusBeneficiari", e.target.value)}
										className='w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										required
									>
										<option value=''>-- Selecciona --</option>
										<option value='entitat'>Entitat</option>
										<option value='ens-local'>Ens Local</option>
									</select>
								</div>

								{/* Tipus d'Entitat (només si és entitat) */}
								{formData.tipusBeneficiari === "entitat" && (
									<div className='space-y-2'>
										<Label htmlFor='tipusEntitat' className='text-sm font-medium'>
											Tipus d'entitat *
										</Label>
										<select
											id='tipusEntitat'
											value={formData.tipusEntitat}
											onChange={(e) => handleInputChange("tipusEntitat", e.target.value)}
											className='w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
											required
										>
											<option value=''>-- Selecciona --</option>
											<option value='associacio'>Associació</option>
											<option value='fundacio'>Fundació</option>
											<option value='federacio'>Federació</option>
										</select>
									</div>
								)}

								{/* Tipus d'Actuació */}
								<div className='space-y-2'>
									<Label htmlFor='tipusActuacio' className='text-sm font-medium'>
										Tipus d'actuació *
									</Label>
									<select
										id='tipusActuacio'
										value={formData.tipusActuacio}
										onChange={(e) => handleInputChange("tipusActuacio", e.target.value)}
										className='w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										required
									>
										<option value=''>-- Selecciona --</option>
										<option value='activitat'>Activitat</option>
										<option value='esdeveniment'>Esdeveniment</option>
										<option value='obra'>Obra</option>
									</select>
								</div>
							</div>
						</div>

						{/* Camps Capçalera - camps que NO s'extreuen del PDF */}
						<div className='space-y-4'>
							<h3 className='font-semibold text-slate-700 border-b pb-2'>Camps de la Capçalera</h3>
							<p className='text-sm text-slate-500'>Els camps de l'entitat, NIF, actuació i imports s'extrauran automàticament del PDF.</p>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								{/* Número d'expedient tècnic */}
								<div className='space-y-2'>
									<Label htmlFor='numeroExpedient' className='text-sm font-medium'>
										Número d'expedient tècnic *
									</Label>
									<Input
										id='numeroExpedient'
										type='text'
										value={formData.numeroExpedient}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("numeroExpedient", e.target.value)}
										placeholder='Ex: EXP-2024-001'
										required
									/>
								</div>

								{/* Import pagament avançat */}
								<div className='space-y-2'>
									<Label htmlFor='importPagamentAvancat' className='text-sm font-medium'>
										Import pagament avançat *
									</Label>
									<Input
										id='importPagamentAvancat'
										type='number'
										step='0.01'
										value={formData.importPagamentAvancat}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("importPagamentAvancat", e.target.value)}
										placeholder='0.00 €'
										required
									/>
								</div>

								{/* Data presentació sol·licitud */}
								<div className='space-y-2'>
									<Label htmlFor='dataPresentacio' className='text-sm font-medium'>
										Data presentació sol·licitud *
									</Label>
									<Input id='dataPresentacio' type='date' value={formData.dataPresentacio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("dataPresentacio", e.target.value)} required />
								</div>
							</div>
						</div>

						{/* Submit Button */}
						<div className='flex justify-end pt-4'>
							<Button type='submit' disabled={!isFormValid()} className='min-w-[200px]'>
								{isFormValid() ? (
									<>
										<CheckCircle2 className='mr-2 h-4 w-4' />
										Continuar amb l'Anàlisi PDF
									</>
								) : (
									"Completa tots els camps requerits"
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			)}
		</Card>
	)
}
