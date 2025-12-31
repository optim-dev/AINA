import React from "react"
import { Award, Package, FileText, Download } from "lucide-react"
import { STRINGS } from "../lib/strings"
import CollapsibleSection from "./CollapsibleSection"

/**
 * @typedef {import('../types').EvaluationResult} EvaluationResult
 */

/**
 * EvaluationResults - Display complete evaluation results
 * @param {Object} props
 * @param {EvaluationResult | null} props.evaluationResult
 * @param {Function} props.onDownloadPDF
 */
export default function EvaluationResults({ evaluationResult, onDownloadPDF }) {
	const t = STRINGS.results

	if (!evaluationResult) {
		return null
	}

	const totalProposals = evaluationResult.lots.length
	const totalLots = evaluationResult.extractedLots?.length || 0
	const totalCompaniesIdentified = evaluationResult.lots.filter((e) => e.companyName).length

	// Group evaluations by lot
	const evaluationsByLot = new Map()
	evaluationResult.lots.forEach((evaluation) => {
		if (!evaluationsByLot.has(evaluation.lotNumber)) {
			evaluationsByLot.set(evaluation.lotNumber, [])
		}
		evaluationsByLot.get(evaluation.lotNumber).push(evaluation)
	})

	return (
		<div className='bg-white rounded-xl shadow-lg overflow-hidden'>
			<div
				className='px-6 py-4'
				style={{
					background: "linear-gradient(135deg, #199875 0%, #188869 100%)",
				}}
			>
				<h2 className='text-xl font-semibold text-white flex items-center'>
					<Award className='mr-2 h-5 w-5' />
					{t.evaluationTitle}
				</h2>
				<p className='text-sm text-green-50 mt-1'>{t.evaluationSubtitle}</p>
			</div>

			<div className='p-6'>
				{/* Summary Stats */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
					<div className='bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200'>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm text-green-700'>{t.lotsEvaluated}</p>
								<p className='text-2xl font-bold text-green-900'>{totalLots}</p>
							</div>
							<Package className='h-8 w-8 text-green-600' />
						</div>
					</div>

					<div className='bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200'>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm text-blue-700'>{t.proposalsEvaluated}</p>
								<p className='text-2xl font-bold text-blue-900'>{totalProposals}</p>
							</div>
							<FileText className='h-8 w-8 text-blue-600' />
						</div>
					</div>

					<div className='bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200'>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm text-purple-700'>{t.companiesIdentified}</p>
								<p className='text-2xl font-bold text-purple-900'>{totalCompaniesIdentified}</p>
							</div>
							<Award className='h-8 w-8 text-purple-600' />
						</div>
					</div>
				</div>

				{/* Overall Analysis */}
				{evaluationResult.overallSummary && (
					<CollapsibleSection title={t.generalAnalysis} defaultOpen={true} variant='summary'>
						<div className='space-y-4'>
							<div className='bg-blue-50 rounded-lg p-4 border border-blue-200'>
								<h4 className='font-semibold text-blue-900 mb-2'>{t.summary}</h4>
								<p className='text-sm text-blue-800'>{evaluationResult.overallSummary}</p>
							</div>
							{evaluationResult.overallRecommendation && (
								<div className='bg-green-50 rounded-lg p-4 border border-green-200'>
									<h4 className='font-semibold text-green-900 mb-2'>{t.recommendations}</h4>
									<p className='text-sm text-green-800'>{evaluationResult.overallRecommendation}</p>
								</div>
							)}
						</div>
					</CollapsibleSection>
				)}

				{/* Lot-by-Lot Results */}
				<div className='space-y-4 mt-6'>
					{Array.from(evaluationsByLot.entries()).map(([lotNumber, evaluations]) => {
						const lot = evaluationResult.extractedLots?.find((l) => l.lotNumber === lotNumber)
						const lotTitle = lot?.title || `Lot ${lotNumber}`

						return (
							<CollapsibleSection key={lotNumber} title={`Lot ${lotNumber}: ${lotTitle}`} defaultOpen={false} variant='lot'>
								<div className='space-y-3'>
									{evaluations.map((evaluation, idx) => (
										<div key={idx} className='border rounded-lg p-4' style={{ borderColor: "#dfe7e6", backgroundColor: "#f8f9fa" }}>
											<div className='flex items-start justify-between mb-2'>
												<div>
													<h4 className='font-semibold text-gray-900'>{evaluation.proposalName}</h4>
													{evaluation.companyName && <p className='text-sm text-gray-600'>{evaluation.companyName}</p>}
												</div>
												{onDownloadPDF && (
													<button onClick={() => onDownloadPDF(evaluation)} className='p-2 hover:bg-green-100 rounded-lg transition-colors' title='Descarregar PDF'>
														<Download className='h-4 w-4 text-green-600' />
													</button>
												)}
											</div>
											<p className='text-sm text-gray-700 mt-2'>{evaluation.summary}</p>
											{evaluation.recommendation && (
												<div className='mt-2 p-2 bg-green-50 rounded border border-green-200'>
													<p className='text-xs font-medium text-green-800'>Recomanació:</p>
													<p className='text-xs text-green-700 mt-1'>{evaluation.recommendation}</p>
												</div>
											)}
										</div>
									))}
								</div>
							</CollapsibleSection>
						)
					})}
				</div>
			</div>
		</div>
	)
}
