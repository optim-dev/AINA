import React from "react"

/**
 * Tooltip component
 * @param {Object} props
 * @param {React.ReactNode} props.content - Tooltip content
 * @param {React.ReactNode} props.children - Child element
 */
export default function Tooltip({ content, children }) {
	return (
		<div className='relative group inline-block'>
			{children}
			<div
				className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50'
				style={{ backgroundColor: "#1c1c1c" }}
			>
				{content}
				<div className='absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent' style={{ borderTopColor: "#1c1c1c" }}></div>
			</div>
		</div>
	)
}
