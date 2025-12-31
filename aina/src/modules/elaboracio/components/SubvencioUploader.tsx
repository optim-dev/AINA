import React, { useCallback, useState } from "react"
import { Upload, FileCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { storeUploadStartTime, getOrCreateSessionId } from "../services/elaboracioMetricsService"

interface SubvencioUploaderProps {
	onFileUploaded: (file: File) => void
	isLoading: boolean
	uploadProgress: number
}

export default function SubvencioUploader({ onFileUploaded, isLoading, uploadProgress }: SubvencioUploaderProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files
		if (files && files.length > 0) {
			const file = files[0]
			if (file.type === "application/pdf") {
				setSelectedFile(file)
			} else {
				alert("Si us plau, selecciona un fitxer PDF")
			}
		}
	}, [])

	const handleUpload = useCallback(() => {
		if (selectedFile) {
			// Initialize session and store start time for metrics
			getOrCreateSessionId()
			storeUploadStartTime()
			onFileUploaded(selectedFile)
		}
	}, [selectedFile, onFileUploaded])

	return (
		<Card>
			<CardHeader>
				<CardTitle>Càrrega de Sol·licitud de Subvenció</CardTitle>
				<CardDescription>Carrega el document PDF de la sol·licitud de subvenció per extreure les dades</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='flex items-center gap-4'>
					<div className='flex-1'>
						<input
							type='file'
							accept='.pdf'
							onChange={handleFileChange}
							disabled={isLoading}
							className='block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50'
						/>
					</div>
					<Button onClick={handleUpload} disabled={!selectedFile || isLoading} className='min-w-[120px]'>
						{isLoading ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Processant...
							</>
						) : selectedFile ? (
							<>
								<Upload className='mr-2 h-4 w-4' />
								Analitzar
							</>
						) : (
							<>
								<Upload className='mr-2 h-4 w-4' />
								Selecciona PDF
							</>
						)}
					</Button>
				</div>

				{selectedFile && (
					<div className='flex items-center gap-2 p-3 bg-slate-50 rounded-md'>
						<FileCheck className='h-5 w-5 text-green-600' />
						<span className='text-sm font-medium'>{selectedFile.name}</span>
						<span className='text-xs text-slate-500 ml-auto'>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
					</div>
				)}

				{isLoading && (
					<div className='space-y-2'>
						<div className='w-full bg-gray-200 rounded-full h-2.5'>
							<div className='bg-blue-600 h-2.5 rounded-full transition-all duration-300' style={{ width: `${uploadProgress}%` }}></div>
						</div>
						<p className='text-sm text-center text-slate-600'>{uploadProgress < 50 ? "Carregant document..." : "Extraient dades amb IA..."}</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
