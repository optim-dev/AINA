import React from "react"
import { Loader2, Package } from "lucide-react"
import { STRINGS } from "../lib/strings"

/**
 * ProgressiveEvaluationLoader - Shows progress when evaluating multiple lots
 * @param {Object} props
 * @param {boolean} props.isVisible
 * @param {number} props.currentLot
 * @param {number} props.totalLots
 * @param {string} props.currentLotTitle
 */
export default function ProgressiveEvaluationLoader({ isVisible, currentLot, totalLots, currentLotTitle }) {
	const t = STRINGS.loader.progressive

	if (!isVisible) return null

	const progressPercentage = totalLots > 0 ? (currentLot / totalLots) * 100 : 0

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm'>
			<div className='bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full'>
				<div className='text-center'>
					<div className='flex items-center justify-center mb-6'>
						<div className='p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-full'>
							<Loader2 className='h-12 w-12 animate-spin text-green-600' />
						</div>
					</div>

					<h3 className='text-xl font-bold text-gray-900 mb-2'>{t.title}</h3>

					<p className='text-sm text-gray-600 mb-6'>{currentLot > 0 ? t.lotProgress.replace("{current}", currentLot).replace("{total}", totalLots) : t.starting}</p>

					<div className='w-full bg-gray-200 rounded-full h-3 mb-4'>
						<div className='bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out' style={{ width: `${progressPercentage}%` }}></div>
					</div>

					{currentLotTitle && (
						<div className='bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200 mb-4'>
							<div className='flex items-center justify-center space-x-3'>
								<Package className='h-8 w-8 text-green-600' />
								<p className='text-sm font-medium text-green-800 truncate'>{currentLotTitle}</p>
							</div>
						</div>
					)}

					<div className='flex justify-center space-x-2 mb-4'>
						{Array.from({ length: totalLots }, (_, i) => (
							<div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < currentLot ? "bg-green-500" : i === currentLot - 1 ? "bg-blue-500 animate-pulse" : "bg-gray-300"}`}></div>
						))}
					</div>

					<p className='text-xs text-gray-500'>{t.processing}</p>
				</div>
			</div>
		</div>
	)
}
