import React, { useState } from "react"
import { Package, FileText, Building, MessageSquarePlus } from "lucide-react"
import { STRINGS } from "../lib/strings"
import HumanFeedbackPanel from "./HumanFeedbackPanel"

/**
 * @typedef {import('../types').LotEvaluation} LotEvaluation
 */

/**
 * ProposalEvaluation - Display detailed criteria evaluation for a single proposal
 * @param {Object} props
 * @param {LotEvaluation} props.evaluation
 * @param {string} [props.lotId] - Identificador del lot per al feedback
 */
export default function ProposalEvaluation({ evaluation, lotId }) {
	const t = STRINGS.proposalEvaluation
	const [showFeedbackPanel, setShowFeedbackPanel] = useState(false)

	return (
		<div className='p-6 space-y-6'>
			{/* Avaluació per criteris */}
			<div className='space-y-6'>
				<div className='flex items-center justify-between'>
					<h6 className='text-lg font-semibold flex items-center' style={{ color: "#1c1c1c" }}>
						<FileText className='h-5 w-5 mr-2' style={{ color: "#199875" }} />
						{t.criteriaEvaluation}
					</h6>
					<button
						onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
						className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
							showFeedbackPanel ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
						}`}
					>
						<MessageSquarePlus className='h-4 w-4' />
						{showFeedbackPanel ? "Amagar feedback" : "Aportar feedback"}
					</button>
				</div>

				{/* Panel de feedback humà */}
				{showFeedbackPanel && (
					<HumanFeedbackPanel
						lotId={lotId || evaluation.lotId || "lot-unknown"}
						ofertaId={evaluation.empresaId || evaluation.empresa || "oferta-unknown"}
						criteria={evaluation.criteria}
						onFeedbackSubmitted={(data) => {
							console.log("Feedback submitted:", data)
						}}
					/>
				)}

				{evaluation.criteria.map((criterion, index) => (
					<div key={index} className='border rounded-lg p-6 transition-all duration-200 hover:shadow-sm' style={{ borderColor: "#dfe7e6" }}>
						<div className='flex items-start justify-between mb-4 gap-4'>
							<h6 className='text-md font-semibold flex-1' style={{ color: "#1c1c1c" }}>
								{index + 1}. {criterion.criterion}
							</h6>
							<div className='flex items-center justify-center min-w-[200px] flex-shrink-0'>
								<span
									className='px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap inline-flex items-center transform transition-transform duration-200 hover:scale-105'
									style={{
										backgroundColor: criterion.score === "COMPLEIX_EXITOSAMENT" ? "#199875" : criterion.score === "REGULAR" ? "#f59e0b" : "#dc2626",
										color: "white",
									}}
								>
									{criterion.score === "COMPLEIX_EXITOSAMENT" ? `🟢 ${t.scores.compleix_exitosament}` : criterion.score === "REGULAR" ? `🟡 ${t.scores.regular}` : `🔴 ${t.scores.insuficient}`}
								</span>
							</div>
						</div>

						<p className='mb-4 leading-relaxed' style={{ color: "#6f6f6f" }}>
							{criterion.justification}
						</p>

						{(criterion.strengths.length > 0 || criterion.improvements.length > 0) && (
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{criterion.strengths.length > 0 && (
									<div className='animate-fade-in'>
										<h6 className='font-medium mb-2 flex items-center' style={{ color: "#199875" }}>
											<span className='w-2 h-2 bg-green-500 rounded-full mr-2'></span>
											{t.strengths}
										</h6>
										<ul className='space-y-1'>
											{criterion.strengths.map((strength, i) => (
												<li key={i} className='text-sm transition-all duration-200 hover:translate-x-1' style={{ color: "#188869" }}>
													• {strength}
												</li>
											))}
										</ul>
									</div>
								)}

								{criterion.improvements.length > 0 && (
									<div className='animate-fade-in'>
										<h6 className='font-medium mb-2 text-red-700 flex items-center'>
											<span className='w-2 h-2 bg-red-500 rounded-full mr-2'></span>
											{t.improvements}
										</h6>
										<ul className='space-y-1'>
											{criterion.improvements.map((improvement, i) => (
												<li key={i} className='text-sm text-red-600 transition-all duration-200 hover:translate-x-1'>
													• {improvement}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}

						{criterion.references && criterion.references.length > 0 && (
							<div className='mt-4 pt-4 border-t animate-fade-in' style={{ borderColor: "#dfe7e6" }}>
								<h6 className='font-medium mb-2 flex items-center' style={{ color: "#6f6f6f" }}>
									<span className='w-2 h-2 bg-gray-400 rounded-full mr-2'></span>
									{t.references}
								</h6>
								<div className='flex flex-wrap gap-2'>
									{criterion.references.map((ref, i) => (
										<span
											key={i}
											className='px-2 py-1 rounded text-xs transition-all duration-200 hover:scale-105'
											style={{
												backgroundColor: "#f3f4f6",
												color: "#6f6f6f",
											}}
										>
											{ref}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Recomanació */}
			<div
				className='rounded-lg p-4 animate-fade-in'
				style={{
					backgroundColor: "#e8f4fd",
					borderColor: "#b3d9f2",
					border: "1px solid",
				}}
			>
				<h6 className='text-md font-semibold mb-2 flex items-center' style={{ color: "#0369a1" }}>
					<Package className='h-4 w-4 mr-2' />
					{t.proposalAnalysis}
				</h6>
				<div className='text-sm leading-relaxed' style={{ color: "#0369a1" }}>
					{evaluation.recommendation.split("\n").map((paragraph, i) => (
						<p key={i} className={i > 0 ? "mt-2" : ""}>
							{paragraph}
						</p>
					))}
				</div>
			</div>
		</div>
	)
}
