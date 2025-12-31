import React from "react"
import { RefreshCw, FileText } from "lucide-react"
import { STRINGS } from "../lib/strings"
import Tooltip from "./Tooltip"

/**
 * Header component
 * @param {Object} props
 * @param {Function} props.onReset - Reset handler
 */
export default function Header({ onReset }) {
	const t = STRINGS.header

	return (
		<div
			className='py-6 px-6'
			style={{
				background: "linear-gradient(135deg, #199875 0%, #188869 100%)",
			}}
		>
			<div className='max-w-7xl mx-auto'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-4'>
						<div className='bg-white p-3 rounded-lg shadow-lg'>
							<FileText className='h-8 w-8' style={{ color: "#199875" }} />
						</div>
						<div>
							<h1 className='text-3xl font-bold text-white'>{t.title}</h1>
							<p className='text-white text-opacity-90 text-sm mt-1'>{t.subtitle}</p>
						</div>
					</div>

					<div className='flex items-center space-x-4'>
						<Tooltip content={t.resetTitle}>
							<button
								onClick={() => {
									if (window.confirm(t.resetConfirm)) {
										onReset()
									}
								}}
								className='flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 text-white'
							>
								<RefreshCw className='h-4 w-4' />
								<span className='font-medium'>{t.newTender}</span>
							</button>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	)
}
