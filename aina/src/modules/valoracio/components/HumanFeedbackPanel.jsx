import React, { useState } from "react"
import { MessageSquare, Check, X, Edit2, Star, Send, AlertCircle } from "lucide-react"
import { logCorreccioManual, logConsistenciaFeedback } from "../services/valoracioMetricsService"

/**
 * @typedef {Object} CriterionFeedback
 * @property {string} criterion - Nom del criteri
 * @property {string} scoreSystem - Puntuació del sistema (COMPLEIX_EXITOSAMENT, REGULAR, INSUFICIENT)
 * @property {string} [scoreHuman] - Puntuació humana
 * @property {string} [comment] - Comentari de la correcció
 * @property {boolean} isEditing - Si s'està editant
 */

/**
 * HumanFeedbackPanel - Panel per aportar feedback humà a les avaluacions
 * @param {Object} props
 * @param {string} props.lotId - Identificador del lot
 * @param {string} props.ofertaId - Identificador de l'oferta
 * @param {Array} props.criteria - Criteris avaluats pel sistema
 * @param {Function} [props.onFeedbackSubmitted] - Callback quan es guarda el feedback
 */
export default function HumanFeedbackPanel({ lotId, ofertaId, criteria, onFeedbackSubmitted }) {
	const [feedbackData, setFeedbackData] = useState(
		criteria.map((c) => ({
			criterion: c.criterion,
			scoreSystem: c.score,
			scoreHuman: null,
			comment: "",
			isEditing: false,
		}))
	)
	const [overallConsistencySubmitted, setOverallConsistencySubmitted] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState(null)
	const [submitSuccess, setSubmitSuccess] = useState(false)

	// Converteix score text a valor numèric
	const scoreToNumber = (score) => {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return 3
			case "REGULAR":
				return 2
			case "INSUFICIENT":
				return 1
			default:
				return 0
		}
	}

	const handleEditToggle = (index) => {
		setFeedbackData((prev) => prev.map((item, i) => (i === index ? { ...item, isEditing: !item.isEditing } : item)))
	}

	const handleScoreChange = (index, score) => {
		setFeedbackData((prev) => prev.map((item, i) => (i === index ? { ...item, scoreHuman: score } : item)))
	}

	const handleCommentChange = (index, comment) => {
		setFeedbackData((prev) => prev.map((item, i) => (i === index ? { ...item, comment } : item)))
	}

	const handleSaveCorrection = async (index) => {
		const item = feedbackData[index]
		if (!item.scoreHuman) return

		setIsSubmitting(true)
		setSubmitError(null)

		try {
			// Log correcció manual
			await logCorreccioManual({
				lotId,
				ofertaId,
				criteri: item.criterion,
				puntuacioSistema: scoreToNumber(item.scoreSystem),
				puntuacioHumana: scoreToNumber(item.scoreHuman),
				comentari: item.comment,
			})

			// Marca com a guardat
			setFeedbackData((prev) => prev.map((it, i) => (i === index ? { ...it, isEditing: false } : it)))

			setSubmitSuccess(true)
			setTimeout(() => setSubmitSuccess(false), 3000)

			if (onFeedbackSubmitted) {
				onFeedbackSubmitted({ type: "correction", index, data: item })
			}
		} catch (error) {
			console.error("Error saving correction:", error)
			setSubmitError("Error guardant la correcció")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleSubmitOverallConsistency = async () => {
		setIsSubmitting(true)
		setSubmitError(null)

		try {
			// Calcula la puntuació global del sistema i humana
			const systemTotal = feedbackData.reduce((sum, item) => sum + scoreToNumber(item.scoreSystem), 0)
			const humanTotal = feedbackData.reduce((sum, item) => sum + scoreToNumber(item.scoreHuman || item.scoreSystem), 0)

			// Log consistència global
			await logConsistenciaFeedback({
				lotId,
				ofertaId,
				puntuacioSistema: systemTotal,
				puntuacioHumana: humanTotal,
				comentari: `Avaluació de ${feedbackData.length} criteris`,
			})

			setOverallConsistencySubmitted(true)
			setSubmitSuccess(true)
			setTimeout(() => setSubmitSuccess(false), 3000)

			if (onFeedbackSubmitted) {
				onFeedbackSubmitted({ type: "consistency", systemTotal, humanTotal })
			}
		} catch (error) {
			console.error("Error submitting consistency:", error)
			setSubmitError("Error enviant la valoració")
		} finally {
			setIsSubmitting(false)
		}
	}

	const getScoreLabel = (score) => {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return "Compleix"
			case "REGULAR":
				return "Regular"
			case "INSUFICIENT":
				return "Insuficient"
			default:
				return "-"
		}
	}

	const getScoreColor = (score) => {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return "bg-green-100 text-green-800 border-green-300"
			case "REGULAR":
				return "bg-yellow-100 text-yellow-800 border-yellow-300"
			case "INSUFICIENT":
				return "bg-red-100 text-red-800 border-red-300"
			default:
				return "bg-gray-100 text-gray-600 border-gray-300"
		}
	}

	const hasAnyCorrections = feedbackData.some((item) => item.scoreHuman && item.scoreHuman !== item.scoreSystem)

	return (
		<div className='bg-white rounded-lg border border-blue-200 shadow-sm'>
			{/* Header */}
			<div className='px-4 py-3 bg-blue-50 border-b border-blue-200 rounded-t-lg'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<MessageSquare className='h-5 w-5 text-blue-600' />
						<h3 className='font-semibold text-blue-900'>Feedback Humà</h3>
					</div>
					{submitSuccess && (
						<span className='text-sm text-green-600 flex items-center gap-1'>
							<Check className='h-4 w-4' /> Guardat
						</span>
					)}
					{submitError && (
						<span className='text-sm text-red-600 flex items-center gap-1'>
							<AlertCircle className='h-4 w-4' /> {submitError}
						</span>
					)}
				</div>
				<p className='text-sm text-blue-700 mt-1'>Revisa i corregeix les puntuacions del sistema si cal</p>
			</div>

			{/* Criteria List */}
			<div className='p-4 space-y-3'>
				{feedbackData.map((item, index) => (
					<div key={index} className={`rounded-lg border p-3 transition-all ${item.isEditing ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}>
						<div className='flex items-start justify-between gap-3'>
							{/* Criterion name */}
							<div className='flex-1 min-w-0'>
								<p className='font-medium text-gray-900 text-sm truncate'>
									{index + 1}. {item.criterion}
								</p>
							</div>

							{/* Scores */}
							<div className='flex items-center gap-2 flex-shrink-0'>
								{/* System score */}
								<div className='text-center'>
									<p className='text-xs text-gray-500 mb-1'>Sistema</p>
									<span className={`px-2 py-1 rounded text-xs font-medium border ${getScoreColor(item.scoreSystem)}`}>{getScoreLabel(item.scoreSystem)}</span>
								</div>

								{/* Arrow */}
								<span className='text-gray-400'>→</span>

								{/* Human score */}
								<div className='text-center'>
									<p className='text-xs text-gray-500 mb-1'>Humà</p>
									{item.isEditing ? (
										<select
											value={item.scoreHuman || ""}
											onChange={(e) => handleScoreChange(index, e.target.value)}
											className='text-xs border border-blue-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400'
										>
											<option value=''>Selecciona...</option>
											<option value='COMPLEIX_EXITOSAMENT'>Compleix</option>
											<option value='REGULAR'>Regular</option>
											<option value='INSUFICIENT'>Insuficient</option>
										</select>
									) : item.scoreHuman ? (
										<span className={`px-2 py-1 rounded text-xs font-medium border ${getScoreColor(item.scoreHuman)}`}>{getScoreLabel(item.scoreHuman)}</span>
									) : (
										<span className='px-2 py-1 rounded text-xs text-gray-400 border border-dashed border-gray-300'>-</span>
									)}
								</div>

								{/* Edit button */}
								{!item.isEditing ? (
									<button onClick={() => handleEditToggle(index)} className='p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors' title='Editar puntuació'>
										<Edit2 className='h-4 w-4' />
									</button>
								) : (
									<div className='flex gap-1'>
										<button
											onClick={() => handleSaveCorrection(index)}
											disabled={!item.scoreHuman || isSubmitting}
											className='p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50'
											title='Guardar'
										>
											<Check className='h-4 w-4' />
										</button>
										<button onClick={() => handleEditToggle(index)} className='p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors' title='Cancel·lar'>
											<X className='h-4 w-4' />
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Comment field when editing */}
						{item.isEditing && (
							<div className='mt-3'>
								<textarea
									value={item.comment}
									onChange={(e) => handleCommentChange(index, e.target.value)}
									placeholder='Comentari opcional sobre la correcció...'
									className='w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none'
									rows={2}
								/>
							</div>
						)}

						{/* Show saved correction indicator */}
						{!item.isEditing && item.scoreHuman && item.scoreHuman !== item.scoreSystem && (
							<div className='mt-2 flex items-center gap-2 text-xs text-amber-600'>
								<AlertCircle className='h-3 w-3' />
								<span>Correcció aplicada</span>
								{item.comment && <span className='text-gray-500'>- {item.comment}</span>}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Footer with overall consistency submit */}
			<div className='px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg'>
				<div className='flex items-center justify-between'>
					<div className='text-sm text-gray-600'>
						{hasAnyCorrections ? (
							<span className='flex items-center gap-1 text-amber-600'>
								<Edit2 className='h-4 w-4' />
								{feedbackData.filter((i) => i.scoreHuman && i.scoreHuman !== i.scoreSystem).length} correccions aplicades
							</span>
						) : (
							<span className='text-gray-500'>Sense correccions</span>
						)}
					</div>

					<button
						onClick={handleSubmitOverallConsistency}
						disabled={isSubmitting || overallConsistencySubmitted}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							overallConsistencySubmitted ? "bg-green-100 text-green-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
						}`}
					>
						{overallConsistencySubmitted ? (
							<>
								<Check className='h-4 w-4' />
								Valoració enviada
							</>
						) : (
							<>
								<Send className='h-4 w-4' />
								Enviar valoració global
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
