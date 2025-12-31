import React from "react"
import { Loader2, GitCompare } from "lucide-react"
import { STRINGS } from "../lib/strings"

/**
 * ComparisonLoader - Shows progress when comparing proposals
 * @param {Object} props
 * @param {boolean} props.isVisible
 * @param {number} props.lotNumber
 * @param {string} props.lotTitle
 * @param {number} props.proposalCount
 */
export default function ComparisonLoader({ isVisible, lotNumber, lotTitle, proposalCount }) {
	const t = STRINGS.loader.comparison

	if (!isVisible) return null

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm'>
			<div className='bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full'>
				<div className='text-center'>
					<div className='flex items-center justify-center mb-6'>
						<div className='p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full'>
							<Loader2 className='h-12 w-12 animate-spin text-indigo-600' />
						</div>
					</div>

					<h3 className='text-xl font-bold text-gray-900 mb-2'>{t.title}</h3>

					<p className='text-sm text-gray-600 mb-6'>{t.subtitle.replace("{lot}", lotNumber).replace("{count}", proposalCount)}</p>

					{lotTitle && (
						<div className='bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6'>
							<div className='flex items-center justify-center space-x-3'>
								<GitCompare className='h-8 w-8 text-indigo-600' />
								<p className='text-sm font-medium text-indigo-800 leading-relaxed'>{lotTitle}</p>
							</div>
						</div>
					)}

					<div className='flex items-center justify-center space-x-2 text-xs text-gray-500 mb-2'>
						<div className='w-2 h-2 bg-indigo-500 rounded-full animate-bounce'></div>
						<div className='w-2 h-2 bg-purple-500 rounded-full animate-bounce' style={{ animationDelay: "0.3s" }}></div>
						<div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce' style={{ animationDelay: "0.6s" }}></div>
					</div>

					<p className='text-sm text-gray-600'>{t.generating}</p>
				</div>
			</div>
		</div>
	)
}
