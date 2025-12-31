import React from "react"
import { Package, Play, CheckCircle, Loader2 } from "lucide-react"
import { STRINGS } from "../lib/strings"

/**
 * @typedef {import('../types').LotInfo} LotInfo
 * @typedef {import('../types').LotEvaluationStatus} LotEvaluationStatus
 */

/**
 * LotEvaluationButtons - Individual lot evaluation controls
 * @param {Object} props
 * @param {LotInfo[]} props.lots
 * @param {Map<number, LotEvaluationStatus>} props.lotStatuses
 * @param {(lot: LotInfo) => void} props.onEvaluateLot
 * @param {boolean} props.isFormValid
 * @param {number | null} props.currentEvaluatingLot
 */
export default function LotEvaluationButtons({ lots, lotStatuses, onEvaluateLot, isFormValid, currentEvaluatingLot }) {
	const t = STRINGS.lots

	const lotsWithProposals = lots.filter((lot) => {
		const status = lotStatuses.get(lot.lotNumber)
		return status?.hasProposals
	})

	if (lotsWithProposals.length === 0) {
		return null
	}

	return (
		<div className='mt-6 space-y-4'>
			<div className='flex items-center space-x-2'>
				<Package className='h-5 w-5 text-gray-600' />
				<h4 className='text-md font-medium text-gray-800'>{t.individualEvaluation}</h4>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{lotsWithProposals.map((lot) => {
					const status = lotStatuses.get(lot.lotNumber)
					const isCurrentlyEvaluating = currentEvaluatingLot === lot.lotNumber
					const isAnyLotEvaluating = currentEvaluatingLot !== null
					const isDisabled = !isFormValid || isAnyLotEvaluating || false

					return (
						<div key={lot.lotNumber} className={`border rounded-lg p-4 transition-all duration-200 ${status?.isEvaluated ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:border-gray-300"}`}>
							<div className='flex items-start justify-between mb-3'>
								<div className='flex-1'>
									<div className='flex items-center space-x-2 mb-1'>
										<span className='font-semibold text-gray-800'>Lot {lot.lotNumber}</span>
										{status?.isEvaluated && <CheckCircle className='h-4 w-4 text-green-500' />}
									</div>
									<p className='text-sm text-gray-600 line-clamp-2'>{lot.title}</p>
									{status && (
										<p className='text-xs text-gray-500 mt-1'>
											{status.proposalCount} propost
											{status.proposalCount > 1 ? "es" : "a"}
											{status.isEvaluated && ` • ${status.evaluations.length} avaluació${status.evaluations.length > 1 ? "ns" : ""}`}
										</p>
									)}
								</div>
							</div>

							<div className='flex items-center justify-between'>
								{status?.isEvaluated ? (
									<div className='flex items-center space-x-2 text-green-600'>
										<CheckCircle className='h-4 w-4' />
										<span className='text-sm font-medium'>{t.evaluated}</span>
									</div>
								) : (
									<button
										onClick={() => onEvaluateLot(lot)}
										disabled={isDisabled}
										className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
											isDisabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer transform hover:scale-105"
										}`}
									>
										{isCurrentlyEvaluating ? (
											<>
												<Loader2 className='h-4 w-4 animate-spin' />
												<span>{t.evaluating}</span>
											</>
										) : (
											<>
												<Play className='h-4 w-4' />
												<span>{t.evaluateLot}</span>
											</>
										)}
									</button>
								)}
							</div>

							{/* Progress indicator when evaluating */}
							{isCurrentlyEvaluating && (
								<div className='mt-3'>
									<div className='w-full bg-gray-200 rounded-full h-1'>
										<div className='bg-blue-500 h-1 rounded-full animate-pulse' style={{ width: "60%" }}></div>
									</div>
									<p className='text-xs text-blue-600 mt-1'>{t.processingWithAI}</p>
								</div>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
