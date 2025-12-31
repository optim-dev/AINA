import { useState, useCallback } from "react"
import { apiService } from "./apiService"
import { normalizeFileName } from "./fileUtils"
import type { FileWithContent, ProcessingState, UploadResponse } from "../types"

export function useFileProcessing() {
	const [state, setState] = useState<ProcessingState>({
		isProcessing: false,
		currentFile: null,
		error: null,
		progress: 0,
	})

	const processFiles = useCallback(async (files: File[], type: "specification" | "proposal"): Promise<FileWithContent[]> => {
		setState({
			isProcessing: true,
			currentFile: null,
			error: null,
			progress: 0,
		})

		try {
			// Use the new Storage-based upload with progress tracking
			const result: UploadResponse = await apiService.uploadFilesViaStorage(files, type, (progress) => {
				setState((prev) => ({
					...prev,
					progress,
					currentFile: progress < 50 ? `Pujant ${files.length} document(s) a Storage...` : `Processant ${files.length} document(s)...`,
				}))
			})

			setState((prev) => ({
				...prev,
				progress: 100,
				currentFile: `Processament completat: ${result.summary.successful} document(s) processats amb èxit.`,
			}))

			const processedFiles: FileWithContent[] = result.files
				.filter((file) => file.success)
				.map((file) => ({
					file: files.find((f) => f.name === file.name)!,
					content: file.content,
					name: normalizeFileName(file.name),
				}))

			const failedFiles = result.files.filter((file) => !file.success)

			let errorMessage = ""

			if (failedFiles.length > 0) {
				errorMessage += `❌ ${failedFiles.length} documents(s) no han pogut ser processats:\n`
				errorMessage += failedFiles.map((f) => `- ${normalizeFileName(f.name)}: ${f.error}`).join("\n")
			}

			if (errorMessage) {
				setState((prev) => ({
					...prev,
					error: errorMessage,
				}))
			}

			console.log(`✅ Processats ${processedFiles.length}/${files.length} documents correctament.`)

			return processedFiles
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Error desconegut"
			console.error("❌ Error en el processament:", errorMessage)

			setState({
				isProcessing: false,
				currentFile: null,
				error: `Error processant documents: ${errorMessage}`,
				progress: 0,
			})
			throw error
		} finally {
			setTimeout(() => {
				setState((prev) => ({
					...prev,
					isProcessing: false,
					currentFile: null,
					progress: 0,
				}))
			}, 2000)
		}
	}, [])

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }))
	}, [])

	const reset = useCallback(() => {
		setState({
			isProcessing: false,
			currentFile: null,
			error: null,
			progress: 0,
		})
	}, [])

	return {
		...state,
		processFiles,
		clearError,
		reset,
	}
}

export function useDragAndDrop() {
	const [isDragging, setIsDragging] = useState(false)
	const [_dragCounter, setDragCounter] = useState(0)

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragCounter((prev) => prev + 1)
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragCounter((prev) => {
			const newCounter = prev - 1
			if (newCounter === 0) {
				setIsDragging(false)
			}
			return newCounter
		})
	}, [])

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const handleDrop = useCallback((e: React.DragEvent, onDrop: (files: File[]) => void) => {
		e.preventDefault()
		e.stopPropagation()

		setIsDragging(false)
		setDragCounter(0)

		const files = Array.from(e.dataTransfer.files)

		const supportedFiles = files.filter((file) => {
			const supportedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"]
			return (
				supportedTypes.includes(file.type) || file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc") || file.name.toLowerCase().endsWith(".txt")
			)
		})

		if (supportedFiles.length === 0) {
			console.warn("No s'han trobat fitxers vàlids per processar.")
			return
		}

		onDrop(supportedFiles)
	}, [])

	return {
		isDragging,
		dragHandlers: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDragOver,
			onDrop: handleDrop,
		},
	}
}
