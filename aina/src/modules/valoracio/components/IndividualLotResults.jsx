import React from "react"
import { Package, FileText, Award, Download, Building, CheckCircle, AlertCircle, XCircle, Users } from "lucide-react"
import { STRINGS } from "../lib/strings"
import CollapsibleSection from "./CollapsibleSection"
import ProposalEvaluation from "./ProposalEvaluation"
import ComparisonComponent from "./ComparisonComponent"

/**
 * @typedef {import('../types').LotEvaluation} LotEvaluation
 */

/**
 * IndividualLotResults - Display results for individual lot evaluations
 * @param {Object} props
 * @param {Map<number, any>} props.individualLotResults
 * @param {Array} props.specifications
 * @param {Function} props.onDownloadPDF
 * @param {Function} [props.onDownloadComparisonPDF]
 * @param {string} [props.selectedModel]
 */
export default function IndividualLotResults({ individualLotResults, specifications, onDownloadPDF, onDownloadComparisonPDF, selectedModel }) {
	const t = STRINGS.results.individual

	if (!individualLotResults || individualLotResults.size === 0) {
		return null
	}

	const resultsArray = Array.from(individualLotResults.values())
	const totalProposals = resultsArray.reduce((sum, result) => sum + result.evaluations.length, 0)
	const totalCompaniesIdentified = resultsArray.reduce((sum, result) => sum + result.evaluations.filter((e) => e.companyName).length, 0)

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
					{t.title}
				</h2>
				<p className='text-sm text-green-50 mt-1'>{t.subtitle(resultsArray.length)}</p>
			</div>

			<div className='p-6'>
				{/* Summary Stats */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
					<div className='bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200'>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm text-green-700'>{t.lotsEvaluated}</p>
								<p className='text-2xl font-bold text-green-900'>{resultsArray.length}</p>
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
								<p className='text-xs text-purple-600'>{t.percentIdentified(Math.round((totalCompaniesIdentified / totalProposals) * 100))}</p>
							</div>
							<Award className='h-8 w-8 text-purple-600' />
						</div>
					</div>
				</div>

				{/* Individual Lot Results */}
				<div className='space-y-4'>
					{resultsArray.map((result) => {
						const hasMultipleProposals = result.evaluations.length >= 2
						const companiesIdentified = result.evaluations.filter((e) => e.companyName && e.companyName.trim().length > 0).length

						return (
							<CollapsibleSection key={result.lotNumber} title={`Lot ${result.lotNumber}: ${result.lotTitle}`} defaultOpen={false} variant='lot'>
								<div className='space-y-4'>
									{/* Individual Proposal Evaluations */}
									{result.evaluations.map((evaluation, idx) => {
										const hasCompanyInfo = evaluation.companyName && evaluation.companyName.trim().length > 0

										// Create title that includes company and file name
										const createTitle = () => {
											if (hasCompanyInfo) {
												return (
													<div className='flex items-center space-x-2'>
														<span>{evaluation.companyName}</span>
														<span className='text-gray-500 text-sm font-normal'>({evaluation.proposalName})</span>
													</div>
												)
											} else {
												return `${evaluation.proposalName} (${STRINGS.lotEvaluation.companyNotIdentified})`
											}
										}

										// Create score badge
										const createScoreBadge = () => {
											const excellentCount = evaluation.criteria.filter((c) => c.score === "COMPLEIX_EXITOSAMENT").length
											const regularCount = evaluation.criteria.filter((c) => c.score === "REGULAR").length
											const insufficientCount = evaluation.criteria.filter((c) => c.score === "INSUFICIENT").length

											const items = []

											if (excellentCount > 0) {
												items.push(
													<div key='excellent' className='flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full'>
														<CheckCircle className='h-3 w-3 text-green-600' />
														<span className='text-xs font-medium text-green-700'>{excellentCount}</span>
													</div>
												)
											}

											if (regularCount > 0) {
												items.push(
													<div key='regular' className='flex items-center space-x-1 bg-yellow-100 px-2 py-1 rounded-full'>
														<AlertCircle className='h-3 w-3 text-yellow-600' />
														<span className='text-xs font-medium text-yellow-700'>{regularCount}</span>
													</div>
												)
											}

											if (insufficientCount > 0) {
												items.push(
													<div key='insufficient' className='flex items-center space-x-1 bg-red-100 px-2 py-1 rounded-full'>
														<XCircle className='h-3 w-3 text-red-600' />
														<span className='text-xs font-medium text-red-700'>{insufficientCount}</span>
													</div>
												)
											}

											return <div className='flex items-center space-x-2'>{items}</div>
										}

										const criteriaCount = evaluation.criteria.length
										const subtitle = `${criteriaCount} ${STRINGS.lotEvaluation.criteriaEvaluated}`

										return (
											<div key={idx} className='animate-slide-in-up'>
												<CollapsibleSection
													title={createTitle()}
													subtitle={subtitle}
													icon={hasCompanyInfo ? <Building className='h-5 w-5' style={{ color: "#199875" }} /> : <FileText className='h-5 w-5' style={{ color: "#199875" }} />}
													defaultOpen={false}
													customBadge={
														<div className='flex items-center space-x-3'>
															{createScoreBadge()}
															{onDownloadPDF && (
																<button onClick={() => onDownloadPDF(evaluation)} className='p-2 hover:bg-green-100 rounded-lg transition-colors' title='Descarregar PDF'>
																	<Download className='h-4 w-4 text-green-600' />
																</button>
															)}
														</div>
													}
													headerBgColor='#f8f9fa'
												>
													<ProposalEvaluation evaluation={evaluation} showLotNumber={false} />
												</CollapsibleSection>
											</div>
										)
									})}

									{/* Comparison Section for lots with 2+ proposals */}
									{hasMultipleProposals && specifications && specifications.length > 0 && (
										<div className='mt-6 animate-slide-in-up'>
											<CollapsibleSection
												title='Comparació entre Empreses'
												subtitle={`Anàlisi comparatiu detallat entre ${result.evaluations.length} propostes`}
												icon={<Users className='h-5 w-5' style={{ color: "#3b82f6" }} />}
												defaultOpen={false}
												customBadge={
													<div className='flex items-center space-x-1 px-2 py-1 rounded-full' style={{ backgroundColor: "#e3f2fd" }}>
														<Building className='h-3 w-3' style={{ color: "#1976d2" }} />
														<span className='text-xs font-medium' style={{ color: "#1976d2" }}>
															{companiesIdentified}/{result.evaluations.length}
														</span>
													</div>
												}
												headerBgColor='#f0f9ff'
											>
												<ComparisonComponent
													lotInfo={{
														lotNumber: result.lotNumber,
														title: result.lotTitle,
													}}
													evaluatedProposals={result.evaluations}
													specifications={specifications.map((file) => ({
														name: file.name,
														content: file.content,
													}))}
													onDownloadPDF={onDownloadComparisonPDF}
													selectedModel={selectedModel}
												/>
											</CollapsibleSection>
										</div>
									)}

									{/* Download Reports Section */}
									{result.evaluations.length > 0 && onDownloadPDF && (
										<div className='mt-6 animate-fade-in bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200'>
											<h5 className='text-lg font-semibold text-gray-800 mb-4 flex items-center'>
												<Download className='h-5 w-5 mr-2 text-gray-600' />
												Descarregar Informes del Lot {result.lotNumber}
											</h5>

											<div className='space-y-4'>
												{/* Individual evaluation downloads */}
												<div>
													<p className='text-sm font-medium text-gray-700 mb-3'>Informes Individuals per Proposta:</p>
													<div className='flex flex-wrap gap-3'>
														{result.evaluations.map((evaluation) => {
															const displayName = evaluation.companyName && evaluation.companyName.trim().length > 0 ? evaluation.companyName : evaluation.proposalName
															const showCompanyIcon = evaluation.companyName && evaluation.companyName.trim().length > 0

															return (
																<button
																	key={`${evaluation.lotNumber}-${evaluation.proposalName}`}
																	onClick={() => onDownloadPDF(evaluation)}
																	className='px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all duration-300 text-white cursor-pointer transform hover:scale-105 hover:shadow-md shadow-sm'
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
																	{showCompanyIcon ? <Building className='h-4 w-4' /> : <FileText className='h-4 w-4' />}
																	<Download className='h-4 w-4' />
																	<span className='max-w-32 truncate text-sm'>{displayName}</span>
																</button>
															)
														})}
													</div>
												</div>
											</div>
										</div>
									)}
								</div>
							</CollapsibleSection>
						)
					})}
				</div>
			</div>
		</div>
	)
}
