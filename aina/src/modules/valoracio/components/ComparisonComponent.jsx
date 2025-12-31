import React, { useState } from "react"
import { GitCompare, Trophy, Award, TrendingUp, Building, FileText, Users, Download } from "lucide-react"
import { STRINGS } from "../lib/strings"
import { apiService } from "../lib/apiService"
import CollapsibleSection from "./CollapsibleSection"
import ComparisonLoader from "./ComparisonLoader"

/**
 * @typedef {import('../types').ProposalComparison} ProposalComparison
 * @typedef {import('../types').LotEvaluation} LotEvaluation
 * @typedef {import('../types').LotInfo} LotInfo
 * @typedef {import('../types').FileContent} FileContent
 */

/**
 * ComparisonComponent - Compare proposals for a lot
 * @param {Object} props
 * @param {LotInfo} props.lotInfo
 * @param {LotEvaluation[]} props.evaluatedProposals
 * @param {FileContent[]} props.specifications
 * @param {Function} [props.onDownloadPDF]
 * @param {string} [props.selectedModel]
 */
export default function ComparisonComponent({ lotInfo, evaluatedProposals, specifications, onDownloadPDF, selectedModel }) {
	const [comparison, setComparison] = useState(null)
	const [isComparing, setIsComparing] = useState(false)
	const [error, setError] = useState(null)

	const t = STRINGS.lotEvaluation

	const handleCompare = async () => {
		setIsComparing(true)
		setError(null)

		try {
			console.log("Starting comparison with:", {
				lotInfo,
				evaluatedProposalsCount: evaluatedProposals.length,
				specificationsCount: specifications.length,
				selectedModel,
			})

			const result = await apiService.compareProposals(specifications, lotInfo, evaluatedProposals, selectedModel)

			console.log("Comparison result received:", result)
			setComparison(result.comparison)
		} catch (err) {
			console.error("Comparison error:", err)
			const errorMessage = `Error durant la comparació: ${err instanceof Error ? err.message : "Error desconegut"}`
			setError(errorMessage)
		} finally {
			setIsComparing(false)
		}
	}

	const getScoreColor = (score) => {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return "#199875"
			case "REGULAR":
				return "#f59e0b"
			case "INSUFICIENT":
				return "#dc2626"
			default:
				return "#6f6f6f"
		}
	}

	const getScoreText = (score) => {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return "Compleix exitosament"
			case "REGULAR":
				return "Regular"
			case "INSUFICIENT":
				return "Insuficient"
			default:
				return score
		}
	}

	const getDisplayName = (companyName, proposalName) => {
		return companyName && companyName.trim().length > 0 ? companyName : proposalName
	}

	// Show loader while comparing
	if (isComparing) {
		return <ComparisonLoader isVisible={true} lotNumber={lotInfo.lotNumber} lotTitle={lotInfo.title} proposalCount={evaluatedProposals.length} />
	}

	// Show comparison trigger if not yet compared
	if (!comparison) {
		const companiesIdentified = evaluatedProposals.filter((p) => p.companyName && p.companyName.trim().length > 0).length

		return (
			<div className='p-6'>
				<div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200'>
					<div className='text-center mb-8'>
						<h4 className='text-2xl font-bold text-blue-900 mb-2'>{t.comparisonBetweenCompanies}</h4>
						<p className='text-blue-700'>Compara {evaluatedProposals.length} propostes per aquest lot amb anàlisi detallada</p>
						<p className='text-sm text-blue-600 mt-2'>
							{companiesIdentified}/{evaluatedProposals.length} empreses identificades
						</p>
					</div>

					{/* Features grid */}
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
						<div className='bg-white rounded-lg p-4 text-center border border-blue-100'>
							<Trophy className='h-8 w-8 mx-auto mb-2 text-blue-600' />
							<p className='text-sm font-medium text-blue-900'>Rànking Global</p>
							<p className='text-xs text-blue-700'>Posicionament de cada empresa</p>
						</div>
						<div className='bg-white rounded-lg p-4 text-center border border-blue-100'>
							<TrendingUp className='h-8 w-8 mx-auto mb-2 text-blue-600' />
							<p className='text-sm font-medium text-blue-900'>Anàlisi per Criteris</p>
							<p className='text-xs text-blue-700'>Comparació detallada</p>
						</div>
						<div className='bg-white rounded-lg p-4 text-center border border-blue-100'>
							<Award className='h-8 w-8 mx-auto mb-2 text-blue-600' />
							<p className='text-sm font-medium text-blue-900'>Recomanacions</p>
							<p className='text-xs text-blue-700'>Punts forts i febles</p>
						</div>
					</div>

					<button
						onClick={handleCompare}
						className='px-8 py-4 rounded-xl font-semibold flex items-center space-x-3 transition-all duration-300 text-white shadow-lg mx-auto transform hover:scale-105'
						style={{
							background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
						}}
					>
						<GitCompare className='h-5 w-5' />
						<span>Iniciar Comparació</span>
					</button>

					{error && (
						<div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
							<p className='text-sm text-red-800'>{error}</p>
						</div>
					)}
				</div>
			</div>
		)
	}

	// Show comparison results
	const companiesIdentified = comparison.companyNames.filter((name) => name !== null && name.trim().length > 0).length

	return (
		<div className='p-6 space-y-8'>
			{/* Header */}
			<div className='bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-4'>
						<div className='p-3 bg-white bg-opacity-20 rounded-full'>
							<GitCompare className='h-8 w-8' />
						</div>
						<div>
							<h3 className='text-2xl font-bold'>Comparació d'Empreses</h3>
							<p className='text-blue-100'>
								Lot {lotInfo.lotNumber}: {lotInfo.title}
							</p>
						</div>
					</div>
					<div className='text-right'>
						<p className='text-sm opacity-90'>{comparison.proposalNames.length} propostes analitzades</p>
						<p className='text-sm opacity-90'>
							{companiesIdentified}/{comparison.proposalNames.length} empreses identificades
						</p>
					</div>
				</div>
			</div>

			{/* Global Ranking */}
			<div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200'>
				<div className='px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500'>
					<h4 className='text-xl font-bold text-white flex items-center'>
						<Trophy className='h-6 w-6 mr-2' />
						Rànking Global
					</h4>
				</div>
				<div className='p-6 space-y-4'>
					{comparison.globalRanking.map((ranking, index) => (
						<div key={index} className='border rounded-lg p-6 hover:shadow-md transition-shadow' style={{ borderColor: index === 0 ? "#fbbf24" : "#e5e7eb" }}>
							<div className='flex items-start justify-between mb-4'>
								<div className='flex items-center space-x-3'>
									<div
										className='flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg'
										style={{
											backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#d1d5db" : "#9ca3af",
											color: "white",
										}}
									>
										{ranking.position}
									</div>
									<div>
										<h5 className='text-lg font-bold text-gray-900'>{getDisplayName(ranking.companyName, ranking.proposalName)}</h5>
										<p className='text-sm text-gray-600'>{ranking.proposalName}</p>
									</div>
								</div>
								<div className='text-right'>
									<span className='px-3 py-1 rounded-full text-sm font-medium' style={{ backgroundColor: getScoreColor(ranking.overallScore), color: "white" }}>
										{ranking.overallScore}
									</span>
								</div>
							</div>

							{ranking.strengths && ranking.strengths.length > 0 && (
								<div className='mb-3'>
									<h6 className='font-medium text-green-700 mb-2'>Punts Forts:</h6>
									<ul className='space-y-1'>
										{ranking.strengths.map((strength, i) => (
											<li key={i} className='text-sm text-green-600'>
												• {strength}
											</li>
										))}
									</ul>
								</div>
							)}

							{ranking.weaknesses && ranking.weaknesses.length > 0 && (
								<div className='mb-3'>
									<h6 className='font-medium text-red-700 mb-2'>Punts Febles:</h6>
									<ul className='space-y-1'>
										{ranking.weaknesses.map((weakness, i) => (
											<li key={i} className='text-sm text-red-600'>
												• {weakness}
											</li>
										))}
									</ul>
								</div>
							)}

							{ranking.recommendation && (
								<div className='mt-4 pt-4 border-t border-gray-200'>
									<p className='text-sm text-gray-700'>{ranking.recommendation}</p>
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Criteria Comparisons */}
			<div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200'>
				<div className='px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-500'>
					<h4 className='text-xl font-bold text-white flex items-center'>
						<TrendingUp className='h-6 w-6 mr-2' />
						Anàlisi per Criteris
					</h4>
				</div>
				<div className='p-6 space-y-6'>
					{comparison.criteriaComparisons.map((criteriaComp, index) => (
						<CollapsibleSection key={index} title={`${index + 1}. ${criteriaComp.criterion}`} defaultOpen={false}>
							<div className='space-y-4'>
								{criteriaComp.proposals.map((proposal, idx) => (
									<div key={idx} className='border rounded-lg p-4' style={{ borderColor: "#e5e7eb" }}>
										<div className='flex items-start justify-between mb-3'>
											<div className='flex items-center space-x-2'>
												<div
													className='flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm text-white'
													style={{
														backgroundColor: proposal.position === 1 ? "#199875" : proposal.position === 2 ? "#f59e0b" : "#9ca3af",
													}}
												>
													{proposal.position}
												</div>
												<div>
													<h6 className='font-semibold text-gray-900'>{getDisplayName(proposal.companyName, proposal.proposalName)}</h6>
													<p className='text-xs text-gray-600'>{proposal.proposalName}</p>
												</div>
											</div>
											<span className='px-2 py-1 rounded-full text-xs font-medium' style={{ backgroundColor: getScoreColor(proposal.score), color: "white" }}>
												{getScoreText(proposal.score)}
											</span>
										</div>
										{proposal.arguments && proposal.arguments.length > 0 && (
											<ul className='space-y-1 mt-2'>
												{proposal.arguments.map((arg, i) => (
													<li key={i} className='text-sm text-gray-700'>
														• {arg}
													</li>
												))}
											</ul>
										)}
									</div>
								))}
							</div>
						</CollapsibleSection>
					))}
				</div>
			</div>

			{/* Summary */}
			{comparison.summary && (
				<div className='bg-blue-50 rounded-xl p-6 border border-blue-200'>
					<h4 className='text-lg font-bold text-blue-900 mb-3 flex items-center'>
						<FileText className='h-5 w-5 mr-2' />
						Resum Executiu
					</h4>
					<p className='text-gray-700 leading-relaxed'>{comparison.summary}</p>
				</div>
			)}

			{/* Download PDF Button */}
			{onDownloadPDF && (
				<div className='flex justify-center'>
					<button
						onClick={() => onDownloadPDF(comparison)}
						className='px-6 py-3 rounded-xl font-semibold flex items-center space-x-3 transition-all duration-300 text-white shadow-lg transform hover:scale-105'
						style={{
							background: "linear-gradient(135deg, #199875 0%, #188869 100%)",
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "linear-gradient(135deg, #188869 0%, #177759 100%)"
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "linear-gradient(135deg, #199875 0%, #188869 100%)"
						}}
					>
						<Download className='h-5 w-5' />
						<span>Descarregar Informe Comparatiu</span>
					</button>
				</div>
			)}
		</div>
	)
}
