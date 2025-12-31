import React, { useState, useEffect } from "react"
import { Upload, FileCheck } from "lucide-react"
import { STRINGS } from "../lib/strings"
import { createPDFGenerator } from "../lib/pdfGenerator"
import FileUploadSection from "../components/FileUploadSection"
import ProposalUploadSection from "../components/ProposalUploadSection"
import EvaluationControl from "../components/EvaluationControl"
import LotEvaluationButtons from "../components/LotEvaluationButtons"
import IndividualLotResults from "../components/IndividualLotResults"
import EvaluationResults from "../components/EvaluationResults"
import ProgressiveEvaluationLoader from "../components/ProgressiveEvaluationLoader"
import SingleLotEvaluationLoader from "../components/SingleLotEvaluationLoader"
import CollapsibleSection from "../components/CollapsibleSection"
import { apiService } from "../lib/apiService"
import { useSettingsStore } from "@/stores/settingsStore"
import { storeProcessingStartTime, logOfertaProcessada, logAvaluacioCompletada, getOrCreateSessionId } from "../services/valoracioMetricsService"

/**
 * @typedef {import('../types').FileWithContent} FileWithContent
 * @typedef {import('../types').ProposalFile} ProposalFile
 * @typedef {import('../types').LotInfo} LotInfo
 * @typedef {import('../types').LotEvaluation} LotEvaluation
 * @typedef {import('../types').EvaluationResult} EvaluationResult
 * @typedef {import('../types').IndividualLotEvaluation} IndividualLotEvaluation
 * @typedef {import('../types').LotEvaluationStatus} LotEvaluationStatus
 */

/**
 * OptimEvaluator - Main component for tender evaluation
 */
export default function OptimEvaluator() {
	const tDocuments = STRINGS.documents
	const tLots = STRINGS.lots
	const tErrors = STRINGS.errors

	// Get the currently selected model from settings
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// Generate random basicInfo values
	const generateBasicInfo = () => ({
		title: "Licitació",
		expedient: `EXP-${Date.now().toString().slice(-8)}`,
		entity: "",
		context: "",
	})

	// State management
	const [basicInfo] = useState(generateBasicInfo())

	const [specificationFiles, setSpecificationFiles] = useState([])
	const [proposalFiles, setProposalFiles] = useState([])
	const [extractedLots, setExtractedLots] = useState([])
	const [isLoadingLots, setIsLoadingLots] = useState(false)
	const [evaluationProgress, setEvaluationProgress] = useState({
		isEvaluating: false,
		currentLot: 0,
		totalLots: 0,
		currentLotTitle: "",
		completedEvaluations: [],
	})
	const [lotEvaluationStatuses, setLotEvaluationStatuses] = useState(new Map())
	const [individualLotResults, setIndividualLotResults] = useState(new Map())
	const [currentEvaluatingLot, setCurrentEvaluatingLot] = useState(null)
	const [evaluationResult, setEvaluationResult] = useState(null)
	const [error, setError] = useState(null)

	// PDF Download Handler
	const handleDownloadPDF = (evaluation) => {
		console.log("📄 Generating PDF report...", evaluation)

		// Create PDF generator instance
		const pdfGenerator = createPDFGenerator()

		// Create a temporary evaluation result for single evaluation
		const tempEvaluationResult = {
			lots: [evaluation],
			extractedLots: [
				{
					lotNumber: evaluation.lotNumber,
					title: evaluation.lotTitle,
				},
			],
			overallSummary: "",
			overallRecommendation: "",
			completedLots: 1,
			totalLots: 1,
			isComplete: true,
		}

		// Generate the PDF report
		pdfGenerator.generateEvaluationReport(tempEvaluationResult, basicInfo, evaluation)

		console.log(`✅ PDF generated and downloaded`)
	}

	// Comparison PDF Download Handler
	const handleDownloadComparisonPDF = (comparison) => {
		console.log("📄 Generating comparison PDF report...", comparison)

		// Create PDF generator instance
		const pdfGenerator = createPDFGenerator()

		// Generate the comparison PDF report
		pdfGenerator.generateComparisonReport(comparison, basicInfo)

		console.log(`✅ Comparison PDF generated and downloaded`)
	}

	// Extract lots when specification files change
	useEffect(() => {
		const extractLots = async () => {
			if (specificationFiles.length === 0) {
				setExtractedLots([])
				setProposalFiles([])
				return
			}

			try {
				setIsLoadingLots(true)

				// BACKEND CALL: Extract lots from specifications
				const specifications = specificationFiles.map((file) => ({
					name: file.name,
					content: file.content,
					type: "specification",
				}))

				const lots = await apiService.extractLots(specifications, selectedModel)

				if (lots.length > 0) {
					setExtractedLots(lots)
				} else {
					setExtractedLots([{ lotNumber: 1, title: tLots.singleLot }])
				}

				setProposalFiles([])
				setLotEvaluationStatuses(new Map())
				setIndividualLotResults(new Map())
				setEvaluationResult(null)
			} catch (err) {
				console.error("Error extracting lots:", err)
				setExtractedLots([{ lotNumber: 1, title: tLots.singleLot }])
				setProposalFiles([])
			} finally {
				setIsLoadingLots(false)
			}
		}

		extractLots()
	}, [specificationFiles, tLots.singleLot])

	// Update lot evaluation statuses when lots or proposals change
	useEffect(() => {
		const getProposalsForLotLocal = (lotNumber) => {
			return proposalFiles.filter((file) => file.lotNumber === lotNumber)
		}

		const getUniqueProposalCountLocal = (lotProposals) => {
			const groupedByName = new Map()
			lotProposals.forEach((file) => {
				const baseName = file.name.replace(/\s*\(.*?\)\s*/g, "").trim()
				if (!groupedByName.has(baseName)) {
					groupedByName.set(baseName, [])
				}
				groupedByName.get(baseName).push(file)
			})
			return groupedByName.size
		}

		const newStatuses = new Map()

		extractedLots.forEach((lot) => {
			const lotProposals = getProposalsForLotLocal(lot.lotNumber)
			const proposalCount = getUniqueProposalCountLocal(lotProposals)
			const existingStatus = lotEvaluationStatuses.get(lot.lotNumber)

			const lastEvaluatedCount = existingStatus?.lastEvaluatedProposalCount || 0
			const shouldResetEvaluation = existingStatus?.isEvaluated && proposalCount > lastEvaluatedCount

			newStatuses.set(lot.lotNumber, {
				lotNumber: lot.lotNumber,
				isEvaluated: shouldResetEvaluation ? false : existingStatus?.isEvaluated || false,
				isEvaluating: existingStatus?.isEvaluating || false,
				evaluations: shouldResetEvaluation ? [] : existingStatus?.evaluations || [],
				hasProposals: proposalCount > 0,
				proposalCount,
				lastEvaluatedProposalCount: shouldResetEvaluation ? 0 : lastEvaluatedCount,
			})
		})

		setLotEvaluationStatuses(newStatuses)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [extractedLots, proposalFiles])

	const getProposalsForLot = (lotNumber) => {
		return proposalFiles.filter((file) => file.lotNumber === lotNumber)
	}

	const getUniqueProposalCount = (lotProposals) => {
		const groupedByName = new Map()
		lotProposals.forEach((file) => {
			const baseName = file.name.replace(/\s*\(.*?\)\s*/g, "").trim()
			if (!groupedByName.has(baseName)) {
				groupedByName.set(baseName, [])
			}
			groupedByName.get(baseName).push(file)
		})
		return groupedByName.size
	}

	// Evaluation Handlers
	const handleEvaluateSingleLot = async (lotInfo) => {
		if (specificationFiles.length === 0) {
			setError(tErrors.completeRequired)
			return
		}

		const lotProposals = getProposalsForLot(lotInfo.lotNumber)
		if (lotProposals.length === 0) {
			setError(tErrors.noProposalsInLot)
			return
		}

		setError(null)
		setCurrentEvaluatingLot(lotInfo.lotNumber)

		// Track start time for metrics
		storeProcessingStartTime()
		getOrCreateSessionId()

		setLotEvaluationStatuses((prev) => {
			const newStatuses = new Map(prev)
			const status = newStatuses.get(lotInfo.lotNumber)
			if (status) {
				newStatuses.set(lotInfo.lotNumber, {
					...status,
					isEvaluating: true,
				})
			}
			return newStatuses
		})

		try {
			const specifications = specificationFiles.map((file) => ({
				name: file.name,
				content: file.content,
				type: "specification",
			}))

			const proposals = lotProposals.map((file) => ({
				name: file.name,
				content: file.content,
				type: "proposal",
				lotNumber: file.lotNumber,
			}))

			const result = await apiService.evaluateSingleLot(specifications, proposals, lotInfo, selectedModel)

			const currentProposalCount = getUniqueProposalCount(lotProposals)

			setLotEvaluationStatuses((prev) => {
				const newStatuses = new Map(prev)
				const status = newStatuses.get(lotInfo.lotNumber)
				if (status) {
					newStatuses.set(lotInfo.lotNumber, {
						...status,
						isEvaluating: false,
						isEvaluated: true,
						evaluations: result.evaluations,
						lastEvaluatedProposalCount: currentProposalCount,
					})
				}
				return newStatuses
			})

			setIndividualLotResults((prev) => {
				const newResults = new Map(prev)
				newResults.set(lotInfo.lotNumber, {
					lotNumber: lotInfo.lotNumber,
					lotTitle: lotInfo.title,
					evaluations: result.evaluations,
					timestamp: Date.now(),
				})
				return newResults
			})

			// Log metrics for each proposal processed
			for (const evaluation of result.evaluations) {
				// Log oferta processada
				await logOfertaProcessada({
					lotId: `LOT-${lotInfo.lotNumber}`,
					ofertaId: evaluation.proposalName || `proposal-${Date.now()}`,
					licitacioId: basicInfo.expedient,
					modelUsed: selectedModel,
				})

				// Log avaluació completada
				await logAvaluacioCompletada({
					lotId: `LOT-${lotInfo.lotNumber}`,
					ofertaId: evaluation.proposalName || `proposal-${Date.now()}`,
					totalCriteris: evaluation.criteria?.length || 0,
					criterisAvaluats: evaluation.criteria?.filter((c) => c.score)?.length || 0,
					modelUsed: selectedModel,
				})
			}
		} catch (err) {
			console.error(`Error evaluating lot ${lotInfo.lotNumber}:`, err)
			setError(`${tErrors.errorEvaluatingLot}: ${err instanceof Error ? err.message : tErrors.unknownError}`)

			setLotEvaluationStatuses((prev) => {
				const newStatuses = new Map(prev)
				const status = newStatuses.get(lotInfo.lotNumber)
				if (status) {
					newStatuses.set(lotInfo.lotNumber, {
						...status,
						isEvaluating: false,
					})
				}
				return newStatuses
			})
		} finally {
			setCurrentEvaluatingLot(null)
		}
	}

	const handleEvaluateAllLots = async () => {
		if (specificationFiles.length === 0 || proposalFiles.length === 0) {
			setError(tErrors.completeRequired)
			return
		}

		const lotsWithProposals = extractedLots.filter((lot) => {
			const status = lotEvaluationStatuses.get(lot.lotNumber)
			return status?.hasProposals
		})

		if (lotsWithProposals.length === 0) {
			setError(tErrors.noProposalsInAnyLot)
			return
		}

		setError(null)
		setEvaluationResult(null)
		setIndividualLotResults(new Map())
		setEvaluationProgress({
			isEvaluating: true,
			currentLot: 0,
			totalLots: lotsWithProposals.length,
			currentLotTitle: "",
			completedEvaluations: [],
		})

		try {
			const specifications = specificationFiles.map((file) => ({
				name: file.name,
				content: file.content,
				type: "specification",
			}))

			const allEvaluations = []

			for (let i = 0; i < lotsWithProposals.length; i++) {
				const lot = lotsWithProposals[i]

				setEvaluationProgress((prev) => ({
					...prev,
					currentLot: i + 1,
					currentLotTitle: lot.title,
				}))

				const lotProposals = getProposalsForLot(lot.lotNumber)
				const proposals = lotProposals.map((file) => ({
					name: file.name,
					content: file.content,
					type: "proposal",
					lotNumber: file.lotNumber,
				}))

				const lotResult = await apiService.evaluateSingleLot(specifications, proposals, lot, selectedModel)

				allEvaluations.push(...lotResult.evaluations)

				const currentProposalCount = getUniqueProposalCount(lotProposals)

				setLotEvaluationStatuses((prev) => {
					const newStatuses = new Map(prev)
					const status = newStatuses.get(lot.lotNumber)
					if (status) {
						newStatuses.set(lot.lotNumber, {
							...status,
							isEvaluated: true,
							evaluations: lotResult.evaluations,
							lastEvaluatedProposalCount: currentProposalCount,
						})
					}
					return newStatuses
				})
			}

			const finalResult = {
				lots: allEvaluations,
				extractedLots: extractedLots,
				overallSummary: `S'han avaluat ${allEvaluations.length} propostes distribuïdes en ${lotsWithProposals.length} lots.`,
				overallRecommendation: "Es recomana revisar individualment cada lot i les seves respectives avaluacions.",
				completedLots: lotsWithProposals.length,
				totalLots: extractedLots.length,
				isComplete: true,
			}

			setEvaluationResult(finalResult)
		} catch (err) {
			setError(`${tErrors.errorDuringEvaluation}: ${err instanceof Error ? err.message : tErrors.unknownError}`)
		} finally {
			setEvaluationProgress((prev) => ({
				...prev,
				isEvaluating: false,
			}))
		}
	}

	const getTotalProposals = () => {
		return new Set(proposalFiles.map((file) => file.name.replace(/\s*\(.*?\)\s*/g, "").trim())).size
	}

	// Future: Handlers for evaluation and comparison
	// const handleStartComparison = (lotInfo) => { ... }
	// const handleComparisonComplete = (comparison) => { ... }
	// const handleComparisonError = (errorMessage) => { ... }

	// Computed values
	const shouldShowProposalSection = extractedLots.length > 0 && !isLoadingLots
	const lotsWithProposals = extractedLots.filter((lot) => {
		const lotProposals = getProposalsForLot(lot.lotNumber)
		return getUniqueProposalCount(lotProposals) > 0
	})
	const isFormValid = !!(specificationFiles.length > 0)
	const totalProposals = getTotalProposals()
	const isProcessing = isLoadingLots || evaluationProgress.isEvaluating
	const hasIndividualResults = individualLotResults.size > 0

	return (
		<div className='space-y-6'>
			{/* Loaders */}
			<ProgressiveEvaluationLoader isVisible={evaluationProgress.isEvaluating} currentLot={evaluationProgress.currentLot} totalLots={evaluationProgress.totalLots} currentLotTitle={evaluationProgress.currentLotTitle} />

			<SingleLotEvaluationLoader isVisible={currentEvaluatingLot !== null} lotNumber={currentEvaluatingLot || 0} lotTitle={extractedLots.find((l) => l.lotNumber === currentEvaluatingLot)?.title || ""} />

			{/* Documents Section */}
			<div className='bg-white rounded-xl shadow-lg overflow-hidden'>
				<div
					className='px-6 py-4'
					style={{
						background: "linear-gradient(135deg, #199875 0%, #188869 100%)",
					}}
				>
					<h2 className='text-xl font-semibold text-white flex items-center'>
						<FileCheck className='mr-2 h-5 w-5' />
						{tDocuments.sectionTitle}
					</h2>
				</div>

				<div className='p-6 space-y-6'>
					{/* Specifications Upload */}
					<FileUploadSection title={tDocuments.specificationsTitle} description={tLots.fileTypes} files={specificationFiles} setFiles={setSpecificationFiles} icon='spec' />

					{/* Lots Display */}
					{shouldShowProposalSection && (
						<div className='border-t pt-6' style={{ borderColor: "#dfe7e6" }}>
							<div className='mb-4'>
								<h4 className='text-md font-medium mb-2' style={{ color: "#1c1c1c" }}>
									{tLots.availableLots}
								</h4>
								<div className='flex flex-wrap gap-2'>
									{extractedLots.map((lot) => {
										const lotProposals = getProposalsForLot(lot.lotNumber)
										const proposalCount = getUniqueProposalCount(lotProposals)
										return (
											<div
												key={lot.lotNumber}
												className='px-4 py-2 rounded-lg border'
												style={{
													backgroundColor: proposalCount > 0 ? "#dfe7e6" : "#f3f4f6",
													borderColor: proposalCount > 0 ? "#199875" : "#949494",
												}}
											>
												<div className='flex items-center space-x-2'>
													<span className='font-medium' style={{ color: "#1c1c1c" }}>
														{tLots.lot} {lot.lotNumber}
													</span>
													<span className='text-xs px-2 py-1 rounded-full' style={{ backgroundColor: proposalCount > 0 ? "#199875" : "#949494", color: "#ffffff" }}>
														{proposalCount > 0 ? `${proposalCount} ${proposalCount === 1 ? "proposta" : "propostes"}` : tLots.noProposals}
													</span>
												</div>
												{lot.title && lot.title !== tLots.singleLot && (
													<p className='text-xs mt-1' style={{ color: "#6f6f6f" }}>
														{lot.title}
													</p>
												)}
											</div>
										)
									})}
								</div>
							</div>

							{/* ProposalUploadSection component */}
							<ProposalUploadSection extractedLots={extractedLots} proposalFiles={proposalFiles} setProposalFiles={setProposalFiles} />
						</div>
					)}

					{specificationFiles.length > 0 && !shouldShowProposalSection && (
						<div
							className='mt-6 p-4 rounded-lg border'
							style={{
								backgroundColor: "#f3f4f6",
								borderColor: "#949494",
								borderStyle: "dashed",
							}}
						>
							<div className='text-center'>
								<div className='flex items-center justify-center mb-2'>
									{isLoadingLots ? <div className='animate-spin rounded-full h-6 w-6 border-b-2' style={{ borderColor: "#199875" }}></div> : <Upload className='h-6 w-6' style={{ color: "#949494" }} />}
								</div>
								<p className='text-sm font-medium' style={{ color: "#1c1c1c" }}>
									{isLoadingLots ? tLots.extractingInfo : tLots.addSpecifications}
								</p>
								<p className='text-xs mt-1' style={{ color: "#6f6f6f" }}>
									{isLoadingLots ? tLots.thisMayTakeSeconds : tLots.onceProcessed}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Evaluation Controls and Results */}
			{shouldShowProposalSection && lotsWithProposals.length > 0 && (
				<div className='bg-white rounded-xl shadow-lg p-6'>
					<EvaluationControl
						onEvaluateAll={handleEvaluateAllLots}
						isEvaluating={evaluationProgress.isEvaluating}
						isProcessing={isProcessing}
						error={error}
						totalProposals={totalProposals}
						lotsWithProposals={lotsWithProposals.length}
						totalLots={extractedLots.length}
					/>

					<LotEvaluationButtons lots={extractedLots} lotStatuses={lotEvaluationStatuses} onEvaluateLot={handleEvaluateSingleLot} isFormValid={isFormValid} currentEvaluatingLot={currentEvaluatingLot} />
				</div>
			)}

			{/* Individual Lot Results */}
			{hasIndividualResults && !evaluationResult && (
				<IndividualLotResults
					individualLotResults={individualLotResults}
					specifications={specificationFiles}
					onDownloadPDF={handleDownloadPDF}
					onDownloadComparisonPDF={handleDownloadComparisonPDF}
					selectedModel={selectedModel}
				/>
			)}

			{/* Complete Evaluation Results */}
			{evaluationResult && <EvaluationResults evaluationResult={evaluationResult} onDownloadPDF={handleDownloadPDF} />}
		</div>
	)
}
