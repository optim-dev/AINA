import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Download } from "lucide-react"
import InformeTecnic, { InformeTecnicFormData, validateInformeTecnicFormData, DocumentSection, PreviewData } from "./InformeTecnic"
import { generateInformeTecnicDocument } from "../lib/informeTecnicGenerator"
import { SubvencioData } from "../types"

// Re-export types for use in Module2
export type { DocumentSection, PreviewData } from "./InformeTecnic"

interface InformeTecnicSectionProps {
	preFormData: any
	extractedData: SubvencioData
	isValidated: boolean
	onValidate: () => void
	onInformeTecnicDataChange?: (formData: InformeTecnicFormData) => void
	onDocumentDataChange?: (sections: DocumentSection[], preview: PreviewData) => void
	initialFormData?: InformeTecnicFormData | null
}

export default function InformeTecnicSection({ preFormData, extractedData, isValidated, onValidate, onInformeTecnicDataChange, onDocumentDataChange, initialFormData }: InformeTecnicSectionProps) {
	const [validationErrors, setValidationErrors] = useState<string[]>([])
	const [currentFormData, setCurrentFormData] = useState<InformeTecnicFormData | null>(null)
	const [showValidationMessage, setShowValidationMessage] = useState(false)
	const [documentSections, setDocumentSections] = useState<DocumentSection[]>([])
	const [previewData, setPreviewData] = useState<PreviewData | null>(null)

	const handleFormDataChange = (formData: InformeTecnicFormData) => {
		setCurrentFormData(formData)
		// Notify parent of form data changes
		if (onInformeTecnicDataChange) {
			onInformeTecnicDataChange(formData)
		}
		// Don't clear validation errors here - let them persist until next validation
	}

	const handleDocumentDataChange = (sections: DocumentSection[], preview: PreviewData) => {
		setDocumentSections(sections)
		setPreviewData(preview)
		// Notify parent of document data changes for wizard download button
		if (onDocumentDataChange) {
			onDocumentDataChange(sections, preview)
		}
	}

	const handleDownload = async () => {
		if (!previewData || !isValidated) return
		await generateInformeTecnicDocument({
			preFormData,
			extractedData,
			documentSections,
			previewData,
		})
	}

	const handleValidate = () => {
		if (!currentFormData) {
			setValidationErrors(["No s'han pogut obtenir les dades del formulari"])
			return
		}

		const result = validateInformeTecnicFormData(currentFormData, preFormData)

		if (result.isValid) {
			setValidationErrors([])
			setShowValidationMessage(false)
			onValidate()
		} else {
			setValidationErrors(result.errors)
			setShowValidationMessage(true)
		}
	}

	console.log("validationErrors:", validationErrors)

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='flex items-center gap-2'>
								Informe Tècnic
								{isValidated && <CheckCircle className='h-5 w-5 text-green-500' />}
								{isValidated && previewData && (
									<button onClick={handleDownload} className='ml-2 p-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors' title='Descarregar Informe Tècnic'>
										<Download className='h-4 w-4' />
									</button>
								)}
							</CardTitle>
							<CardDescription>Completa l'informe tècnic de la subvenció</CardDescription>
						</div>
						{isValidated ? (
							<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>Validat</span>
						) : (
							<div className='flex flex-col items-end gap-1'>
								<Button onClick={handleValidate} className={"bg-blue-600 hover:bg-blue-700"}>
									<CheckCircle className='h-4 w-4 mr-2' />
									Validar Informe Tècnic
								</Button>
								{showValidationMessage && <span className='text-xs text-red-600'>Completa tots els camps obligatoris</span>}
							</div>
						)}
					</div>
					{validationErrors.length > 0 && (
						<div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
							<div className='flex items-start gap-2'>
								<AlertCircle className='h-5 w-5 text-red-500 mt-0.5 flex-shrink-0' />
								<div>
									<h4 className='font-medium text-red-800'>Camps pendents de completar</h4>
									<ul className='mt-2 list-disc list-inside text-sm text-red-700 space-y-1'>
										{validationErrors.map((error, index) => (
											<li key={index}>{error}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}
				</CardHeader>
				<CardContent>
					<InformeTecnic preFormData={preFormData} extractedData={extractedData} onFormDataChange={handleFormDataChange} onDocumentDataChange={handleDocumentDataChange} initialFormData={initialFormData} />
				</CardContent>
			</Card>
		</div>
	)
}
