import React, { useRef } from "react"
import { FileCheck, FileText, CheckCircle, XCircle, Loader2, AlertTriangle, Zap } from "lucide-react"
import { STRINGS } from "../lib/strings"
import { useFileProcessing, useDragAndDrop } from "../lib/useFileProcessing"
import { normalizeFileName, hasEncodingIssues } from "../lib/fileUtils"

/**
 * FileUploadSection component
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.description - Description text
 * @param {import('../types').FileWithContent[]} props.files - Uploaded files
 * @param {Function} props.setFiles - Function to update files
 * @param {'spec' | 'proposal'} props.icon - Icon type
 */
export default function FileUploadSection({ title, description, files, setFiles, icon }) {
	const t = STRINGS.fileUpload
	const fileRef = useRef(null)
	const processing = useFileProcessing()
	const dragDrop = useDragAndDrop()

	const handleFiles = async (selectedFiles) => {
		try {
			console.log(
				"Processing files:",
				selectedFiles.map((f) => f.name)
			)
			const type = icon === "spec" ? "specification" : "proposal"
			const processedFiles = await processing.processFiles(selectedFiles, type)

			const normalizedFiles = processedFiles.map((file) => ({
				...file,
				name: normalizeFileName(file.name),
			}))

			console.log("Files processed:", normalizedFiles.length)
			setFiles([...files, ...normalizedFiles])
		} catch (err) {
			console.error("Error processing files:", err)
		}
	}

	const handleDrop = (e) => {
		const droppedFiles = Array.from(e.dataTransfer.files)
		dragDrop.dragHandlers.onDrop(e, () => handleFiles(droppedFiles))
	}

	const removeFile = (index) => {
		setFiles(files.filter((_, i) => i !== index))
	}

	const getFileStatus = (file) => {
		if (file.content.length < 100) {
			return {
				status: "warning",
				icon: <AlertTriangle className='h-5 w-5' style={{ color: "#f59e0b" }} />,
				color: "#f59e0b",
				bgColor: "#fffbeb",
				message: t.minimumContent,
			}
		} else {
			return {
				status: "success",
				icon: <CheckCircle className='h-5 w-5' style={{ color: "#199875" }} />,
				color: "#199875",
				bgColor: "#dfe7e6",
				message: t.processedCorrectly,
			}
		}
	}

	const IconComponent = icon === "spec" ? FileCheck : FileText

	return (
		<div>
			{title && (
				<h4 className='text-md font-medium mb-4' style={{ color: "#1c1c1c" }}>
					{title}
				</h4>
			)}

			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer hover:border-opacity-80 ${dragDrop.isDragging ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
				style={{
					borderColor: dragDrop.isDragging ? "#3b82f6" : "#949494",
				}}
				{...dragDrop.dragHandlers}
				onDrop={handleDrop}
				onClick={() => fileRef.current?.click()}
			>
				<IconComponent className='mx-auto h-12 w-12 mb-4' style={{ color: "#949494" }} />
				<p className='mb-2' style={{ color: "#6f6f6f" }}>
					{t.dragOrClick}
				</p>
				<p className='text-sm' style={{ color: "#949494" }}>
					{description}
				</p>
			</div>

			<input ref={fileRef} type='file' multiple accept='.pdf,.doc,.docx,.txt' onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} className='hidden' />

			{processing.isProcessing && (
				<div className='mt-4 p-4 rounded-lg border' style={{ backgroundColor: "#f3f4f6", borderColor: "#199875" }}>
					<div className='flex items-center justify-between mb-2'>
						<div className='flex items-center space-x-2'>
							<Loader2 className='h-4 w-4 animate-spin' style={{ color: "#199875" }} />
							<span className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
								{processing.currentFile ? normalizeFileName(processing.currentFile) : t.processingFiles}
							</span>
						</div>
						<div className='flex items-center space-x-2'>
							<Zap className='h-4 w-4' style={{ color: "#199875" }} />
							<span className='text-sm' style={{ color: "#6f6f6f" }}>
								{Math.round(processing.progress)}%
							</span>
						</div>
					</div>
					<div className='w-full bg-gray-200 rounded-full h-2'>
						<div
							className='h-2 rounded-full transition-all duration-500'
							style={{
								backgroundColor: "#199875",
								width: `${processing.progress}%`,
							}}
						></div>
					</div>
				</div>
			)}

			{files.length > 0 && (
				<div className='mt-4 space-y-3'>
					<div className='flex items-center justify-between'>
						<h5 className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
							{t.filesProcessed.replace("{count}", files.length)}
						</h5>
						<div className='text-xs' style={{ color: "#6f6f6f" }}>
							{t.totalCharacters.replace("{count}", files.reduce((acc, file) => acc + file.content.length, 0).toLocaleString())}
						</div>
					</div>

					{files.map((file, index) => {
						const fileStatus = getFileStatus(file)
						const displayName = normalizeFileName(file.name)
						const hadEncodingIssues = hasEncodingIssues(file.name)

						return (
							<div
								key={index}
								className='border rounded-lg p-4 transition-all duration-200 hover:shadow-sm'
								style={{
									backgroundColor: fileStatus.bgColor,
									borderColor: fileStatus.color + "40",
								}}
							>
								<div className='flex items-start justify-between'>
									<div className='flex items-start space-x-3 flex-1'>
										{fileStatus.icon}
										<div className='flex-1'>
											<div className='flex items-center justify-between'>
												<span className='text-sm font-medium' style={{ color: "#1c1c1c" }} title={displayName}>
													{displayName}
													{hadEncodingIssues && <span className='ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full'>{t.corrected}</span>}
												</span>
												<button onClick={() => removeFile(index)} className='text-red-600 hover:text-red-800 ml-2 p-1 rounded transition-colors cursor-pointer' title={t.removeFile}>
													<XCircle className='h-4 w-4' />
												</button>
											</div>

											<div className='flex items-center space-x-3 mt-1'>
												<p className='text-xs' style={{ color: fileStatus.color }}>
													{fileStatus.message}
												</p>
												<span className='text-xs' style={{ color: "#6f6f6f" }}>
													•
												</span>
												<span className='text-xs' style={{ color: "#6f6f6f" }}>
													{t.characters.replace("{count}", file.content.length.toLocaleString())}
												</span>
											</div>

											<div className='mt-3'>
												<details className='group'>
													<summary className='text-xs cursor-pointer font-medium' style={{ color: "#6f6f6f" }}>
														{t.viewPreview}
													</summary>
													<div className='mt-2 bg-white border rounded p-3 max-h-32 overflow-y-auto'>
														<p className='text-xs' style={{ color: "#1c1c1c", lineHeight: "1.4" }}>
															{file.content.substring(0, 500)}
															{file.content.length > 500 ? "..." : ""}
														</p>
													</div>
												</details>
											</div>
										</div>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}

			{processing.error && (
				<div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
					<div className='flex items-start space-x-2'>
						<AlertTriangle className='h-5 w-5 text-red-600 mt-0.5' />
						<div>
							<p className='text-sm font-medium text-red-800'>{t.errorProcessing}</p>
							<div className='text-sm text-red-600 mt-1 max-h-32 overflow-y-auto'>
								<pre className='whitespace-pre-wrap'>{processing.error}</pre>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
