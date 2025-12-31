import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText } from "lucide-react"
import { SubvencioData } from "../types"
import { SubvencioPreFormData } from "./SubvencioPreForm"
import { DocumentSection, PreviewData } from "./DocumentPreview"
import { generateInformeTecnicDocument } from "../lib/informeTecnicGenerator"

interface InformeTecnicDownloadButtonProps {
	preFormData: SubvencioPreFormData
	extractedData: SubvencioData
	documentSections: DocumentSection[]
	previewData: PreviewData
	isValidated: boolean
}

export default function InformeTecnicDownloadButton({ preFormData, extractedData, documentSections, previewData, isValidated }: InformeTecnicDownloadButtonProps) {
	const [isGenerating, setIsGenerating] = useState(false)
	const [progress, setProgress] = useState("")

	const handleDownload = async () => {
		if (!isValidated) return

		setIsGenerating(true)
		setProgress("Generant document DOCX...")

		try {
			await generateInformeTecnicDocument({
				preFormData,
				extractedData,
				documentSections,
				previewData,
			})

			setProgress("Descarregant...")
		} catch (error) {
			console.error("Error generating informe tècnic:", error)
			alert("Error generant l'informe tècnic. Si us plau, torna-ho a intentar.")
		} finally {
			setIsGenerating(false)
			setProgress("")
		}
	}

	return (
		<div className={`flex flex-col gap-3 p-4 border rounded-lg ${isValidated ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
			<div className='flex items-center gap-2'>
				<FileText className={`h-5 w-5 ${isValidated ? "text-green-600" : "text-gray-400"}`} />
				<div>
					<h3 className={`font-semibold ${isValidated ? "text-green-900" : "text-gray-500"}`}>Informe Tècnic</h3>
					<p className={`text-sm ${isValidated ? "text-green-700" : "text-gray-400"}`}>
						{isValidated ? "Descarrega el document oficial en format Word (DOCX)" : "Valida l'informe tècnic per poder descarregar el document"}
					</p>
				</div>
			</div>

			<Button onClick={handleDownload} disabled={!isValidated || isGenerating} className={`w-full ${isValidated ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}`}>
				{isGenerating ? (
					<>
						<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						{progress || "Generant informe..."}
					</>
				) : (
					<>
						<Download className='mr-2 h-4 w-4' />
						Descarregar Informe Tècnic (DOCX)
					</>
				)}
			</Button>

			{!isValidated && <p className='text-xs text-gray-500 text-center'>Completa i valida l'informe tècnic per habilitar la descàrrega</p>}
		</div>
	)
}
