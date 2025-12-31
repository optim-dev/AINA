import React from "react"
import { FileText } from "lucide-react"
import { STRINGS } from "../lib/strings"

/**
 * BasicInfoForm component
 * @param {Object} props
 * @param {import('../types').BasicInfo} props.basicInfo
 * @param {Function} props.setBasicInfo
 */
export default function BasicInfoForm({ basicInfo, setBasicInfo }) {
	const t = STRINGS.basicInfo

	return (
		<div className='bg-white rounded-xl shadow-lg overflow-hidden'>
			<div
				className='px-6 py-4'
				style={{
					background: "linear-gradient(135deg, #199875 0%, #188869 100%)",
				}}
			>
				<h2 className='text-xl font-semibold text-white flex items-center'>
					<FileText className='mr-2 h-5 w-5' />
					{t.sectionTitle}
				</h2>
			</div>

			<div className='p-6'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					<div>
						<label className='block text-sm font-medium mb-2' style={{ color: "#1c1c1c" }}>
							{t.titleLabel}
						</label>
						<input
							type='text'
							value={basicInfo.title}
							onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
							className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent'
							style={{
								borderColor: "#dfe7e6",
								color: "#1c1c1c",
							}}
							placeholder={t.titlePlaceholder}
						/>
					</div>

					<div>
						<label className='block text-sm font-medium mb-2' style={{ color: "#1c1c1c" }}>
							{t.expedientLabel}
						</label>
						<input
							type='text'
							value={basicInfo.expedient}
							onChange={(e) => setBasicInfo({ ...basicInfo, expedient: e.target.value })}
							className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent'
							style={{
								borderColor: "#dfe7e6",
								color: "#1c1c1c",
							}}
							placeholder={t.expedientPlaceholder}
						/>
					</div>

					<div>
						<label className='block text-sm font-medium mb-2' style={{ color: "#1c1c1c" }}>
							{t.entityLabel}
						</label>
						<input
							type='text'
							value={basicInfo.entity}
							onChange={(e) => setBasicInfo({ ...basicInfo, entity: e.target.value })}
							className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent'
							style={{
								borderColor: "#dfe7e6",
								color: "#1c1c1c",
							}}
							placeholder={t.entityPlaceholder}
						/>
					</div>

					<div>
						<label className='block text-sm font-medium mb-2' style={{ color: "#1c1c1c" }}>
							{t.contextLabel}
						</label>
						<textarea
							value={basicInfo.context}
							onChange={(e) => setBasicInfo({ ...basicInfo, context: e.target.value })}
							rows={3}
							className='w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent'
							style={{
								borderColor: "#dfe7e6",
								color: "#1c1c1c",
							}}
							placeholder={t.contextPlaceholder}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
