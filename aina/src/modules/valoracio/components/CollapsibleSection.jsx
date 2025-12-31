import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

/**
 * CollapsibleSection component
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} [props.defaultOpen=true] - Whether section is open by default
 * @param {React.ReactNode} [props.icon] - Optional icon
 * @param {string} [props.badgeText] - Optional badge text
 * @param {string} [props.badgeColor] - Badge color
 * @param {React.ReactNode} [props.customBadge] - Custom badge component
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {string} [props.headerBgColor] - Optional header background color
 * @param {string} [props.variant] - Variant style ('lot' for special styling)
 */
export default function CollapsibleSection({ title, children, defaultOpen = true, icon, badgeText, badgeColor = "#199875", customBadge, subtitle, headerBgColor, variant }) {
	const [isOpen, setIsOpen] = useState(defaultOpen)

	const getBackgroundStyle = () => {
		if (variant === "lot") {
			return isOpen ? "linear-gradient(135deg, #199875 0%, #188869 100%)" : "#ffffff"
		}
		if (headerBgColor && !isOpen) {
			return headerBgColor
		}
		return isOpen ? "linear-gradient(135deg, #199875 0%, #188869 100%)" : "#ffffff"
	}

	return (
		<div className='bg-white rounded-xl shadow-lg overflow-hidden mb-6'>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='w-full px-6 py-4 flex items-center justify-between transition-colors duration-200 hover:bg-gray-50'
				style={{
					background: getBackgroundStyle(),
				}}
			>
				<div className='flex items-center space-x-3 flex-1'>
					{icon && <div style={{ color: isOpen ? "#ffffff" : "#199875" }}>{icon}</div>}
					<div className='flex-1'>
						<div className='flex items-center space-x-2'>
							<h2 className='text-xl font-semibold' style={{ color: isOpen ? "#ffffff" : "#1c1c1c" }}>
								{title}
							</h2>
							{badgeText && !customBadge && (
								<span className='px-3 py-1 text-xs font-medium rounded-full' style={{ backgroundColor: isOpen ? "rgba(255,255,255,0.2)" : badgeColor + "20", color: isOpen ? "#ffffff" : badgeColor }}>
									{badgeText}
								</span>
							)}
						</div>
						{subtitle && (
							<p className='text-sm mt-1' style={{ color: isOpen ? "rgba(255,255,255,0.8)" : "#6f6f6f" }}>
								{subtitle}
							</p>
						)}
					</div>
					{customBadge && <div className='ml-auto mr-4'>{customBadge}</div>}
				</div>
				<div style={{ color: isOpen ? "#ffffff" : "#6f6f6f" }}>{isOpen ? <ChevronDown className='h-5 w-5' /> : <ChevronRight className='h-5 w-5' />}</div>
			</button>

			{isOpen && <div className='p-6'>{children}</div>}
		</div>
	)
}
