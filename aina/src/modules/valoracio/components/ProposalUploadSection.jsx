import React, { useRef, useState } from "react"
import { FileText, CheckCircle, XCircle, Loader2, AlertTriangle, Package } from "lucide-react"
import { STRINGS } from "../lib/strings"
import { useFileProcessing, useDragAndDrop } from "../lib/useFileProcessing"
import { normalizeFileName, hasEncodingIssues } from "../lib/fileUtils"

/**
 * @typedef {import('../types').ProposalFile} ProposalFile
 * @typedef {import('../types').LotInfo} LotInfo
 */

/**
 * ProposalUploadSection - Component for uploading proposal files for each lot
 * @param {Object} props
 * @param {LotInfo[]} props.extractedLots
 * @param {ProposalFile[]} props.proposalFiles
 * @param {(files: ProposalFile[]) => void} props.setProposalFiles
 */
export default function ProposalUploadSection({ extractedLots, proposalFiles, setProposalFiles }) {
	const t = STRINGS.proposals
	const tFileUpload = STRINGS.fileUpload
	const fileRef = useRef(null)
	const [selectedLot, setSelectedLot] = useState(1)
	const processing = useFileProcessing()
	const dragDrop = useDragAndDrop()

	const handleFiles = async (selectedFiles) => {
		try {
			const processedFiles = await processing.processFiles(selectedFiles, "proposal")
			const proposalFilesWithLot = processedFiles.map((file) => ({
				...file,
				name: normalizeFileName(file.name),
				lotNumber: selectedLot,
			}))
			setProposalFiles([...proposalFiles, ...proposalFilesWithLot])
		} catch (err) {
			console.error("Error processing files:", err)
		}
	}

	const handleDrop = (e) => {
		const droppedFiles = Array.from(e.dataTransfer.files)
		dragDrop.dragHandlers.onDrop(e, () => handleFiles(droppedFiles))
	}

	const removeFile = (index) => {
		setProposalFiles(proposalFiles.filter((_, i) => i !== index))
	}

	const getFileStatus = (file) => {
		if (file.content.length < 100) {
			return {
				status: "warning",
				icon: <AlertTriangle className='h-5 w-5' style={{ color: "#f59e0b" }} />,
				color: "#f59e0b",
				bgColor: "#fffbeb",
				message: tFileUpload.minimumContent,
			}
		} else {
			return {
				status: "success",
				icon: <CheckCircle className='h-5 w-5' style={{ color: "#199875" }} />,
				color: "#199875",
				bgColor: "#dfe7e6",
				message: tFileUpload.processedCorrectly,
			}
		}
	}

	const getFilesByLot = (lotNumber) => {
		return proposalFiles.filter((file) => file.lotNumber === lotNumber)
	}

	const showLotSelection = extractedLots.length > 1

	return (
		<div>
			<div className='flex items-start justify-between mb-4 gap-4'>
				<h4 className='text-md font-medium flex-1' style={{ color: "#1c1c1c" }}>
					{t.sectionTitle}
				</h4>

				{showLotSelection && (
					<div className='flex items-center space-x-2 flex-shrink-0 min-w-0'>
						<label className='text-sm font-medium whitespace-nowrap hidden sm:block' style={{ color: "#1c1c1c" }}>
							{t.selectLot}
						</label>
						<select
							value={selectedLot}
							onChange={(e) => setSelectedLot(Number(e.target.value))}
							className='px-2 py-1 border rounded focus:ring-2 focus:ring-opacity-50 focus:border-transparent text-sm w-100 cursor-pointer'
							style={{ borderColor: "#dfe7e6", color: "#1c1c1c" }}
							title={`${t.lot} ${selectedLot}: ${extractedLots.find((l) => l.lotNumber === selectedLot)?.title || ""}`}
						>
							{extractedLots.map((lot) => (
								<option key={lot.lotNumber} value={lot.lotNumber}>
									{t.lot} {lot.lotNumber}: {lot.title}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer hover:border-opacity-80 ${dragDrop.isDragging ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
				style={{
					borderColor: dragDrop.isDragging ? "#3b82f6" : "#949494",
				}}
				{...dragDrop.dragHandlers}
				onDrop={handleDrop}
				onClick={() => fileRef.current?.click()}
			>
				<FileText className='mx-auto h-12 w-12 mb-4' style={{ color: "#949494" }} />
				<p className='mb-2' style={{ color: "#6f6f6f" }}>
					{tFileUpload.dragOrClick}
				</p>
				<p className='text-sm' style={{ color: "#949494" }}>
					{t.fileTypes}
				</p>
			</div>

			<input ref={fileRef} type='file' multiple accept='.pdf,.doc,.docx,.txt' onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} className='hidden' />

			{processing.isProcessing && (
				<div className='mt-4 p-4 rounded-lg border' style={{ backgroundColor: "#f3f4f6", borderColor: "#199875" }}>
					<div className='flex items-center justify-between mb-2'>
						<div className='flex items-center space-x-2'>
							<Loader2 className='h-4 w-4 animate-spin' style={{ color: "#199875" }} />
							<span className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
								{processing.currentFile ? normalizeFileName(processing.currentFile) : tFileUpload.processingFiles}
							</span>
						</div>
						<span className='text-sm' style={{ color: "#6f6f6f" }}>
							{Math.round(processing.progress)}%
						</span>
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

			{extractedLots.length > 0 && (
				<div className='mt-4 space-y-3'>
					<div className='flex items-center justify-between'>
						<h5 className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
							{t.proposalsPerLot}
						</h5>
					</div>

					{extractedLots.map((lot) => {
						const lotFiles = getFilesByLot(lot.lotNumber)
						return (
							<div key={lot.lotNumber} className='mb-4 border rounded-lg p-4' style={{ borderColor: "#dfe7e6", backgroundColor: "#f8f9fa" }}>
								<div className='flex items-center justify-between mb-3'>
									<div className='flex items-center space-x-2'>
										<Package className='h-6 w-6 flex-shrink-0 mr-4' style={{ color: "#199875" }} />
										<span className='font-medium' style={{ color: "#1c1c1c" }}>
											<span className='font-semibold'>
												{t.lot} {lot.lotNumber}:{" "}
											</span>
											{lot.title}
										</span>
									</div>
								</div>

								{lotFiles.length === 0 ? (
									<div className='text-center py-4'>
										<AlertTriangle className='h-8 w-8 mx-auto mb-2' style={{ color: "#f59e0b" }} />
										<p className='text-sm' style={{ color: "#f59e0b" }}>
											{t.noProposalSubmitted}
										</p>
									</div>
								) : (
									<div className='space-y-2'>
										{lotFiles.map((file, index) => {
											const fileStatus = getFileStatus(file)
											const globalIndex = proposalFiles.indexOf(file)
											const displayName = normalizeFileName(file.name)
											const hadEncodingIssues = hasEncodingIssues(file.name)

											return (
												<div
													key={index}
													className='border rounded p-3 transition-all duration-200 hover:shadow-sm'
													style={{
														backgroundColor: fileStatus.bgColor,
														borderColor: fileStatus.color + "40",
													}}
												>
													<div className='flex items-center justify-between'>
														<div className='flex items-center space-x-3'>
															{fileStatus.icon}
															<div>
																<div className='flex items-center space-x-2'>
																	<span className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
																		{displayName}
																	</span>
																	{hadEncodingIssues && (
																		<span className='text-xs px-2 py-0.5 rounded' style={{ backgroundColor: "#fff7ed", color: "#f97316" }}>
																			{tFileUpload.nameFixed}
																		</span>
																	)}
																</div>
																<p className='text-xs' style={{ color: "#6f6f6f" }}>
																	{fileStatus.message} • {file.content.length.toLocaleString()} {tFileUpload.characters}
																</p>
															</div>
														</div>
														<button onClick={() => removeFile(globalIndex)} className='p-1 hover:bg-red-100 rounded transition-colors duration-200' title={tFileUpload.removeFile}>
															<XCircle className='h-5 w-5' style={{ color: "#ef4444" }} />
														</button>
													</div>
												</div>
											)
										})}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
