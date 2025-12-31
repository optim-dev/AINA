import { useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, ArrowRight, FileText, Send, Loader2, ThumbsUp, ThumbsDown, Edit2, Save, X } from "lucide-react"
import { functions } from "@/services/firebase"
import { httpsCallable } from "firebase/functions"
import { useSettingsStore } from "@/stores/settingsStore"

export default function ProcessamentVertical() {
	const [inputText, setInputText] = useState("")
	const [loading, setLoading] = useState(false)
	const [currentStep, setCurrentStep] = useState(null)
	const selectedModel = useSettingsStore((state) => state.selectedModel)
	const [results, setResults] = useState({
		step1: null,
		step2: null,
		step3: null,
	})
	const [errors, setErrors] = useState({
		step1: null,
		step2: null,
		step3: null,
	})
	const [feedback, setFeedback] = useState({
		step1: null, // 'up' | 'down' | null
		step2: null,
		step3: null,
	})
	const [editing, setEditing] = useState({
		step1: {}, // { [matchIndex]: boolean }
		step2: {}, // { [changeIndex]: boolean }
	})
	const [editedValues, setEditedValues] = useState({
		step1: {}, // { [matchIndex]: editedText }
		step2: {}, // { [changeIndex]: editedText }
	})
	const [originalText, setOriginalText] = useState("")
	const [finalText, setFinalText] = useState("")
	const [summary, setSummary] = useState(null)
	const [metadata, setMetadata] = useState(null)

	// Feedback handlers
	const handleFeedback = (step, value) => {
		setFeedback((prev) => ({
			...prev,
			[`step${step}`]: prev[`step${step}`] === value ? null : value,
		}))
		// TODO: Send feedback to backend for logging
		console.log(`Feedback for step ${step}:`, value)
	}

	// Edit handlers
	const handleStartEdit = (step, index) => {
		setEditing((prev) => ({
			...prev,
			[`step${step}`]: { ...prev[`step${step}`], [index]: true },
		}))

		// Initialize edited value if not exists
		if (step === 1 && results.step1?.matches[index]) {
			const match = results.step1.matches[index]
			const currentValue = match.replacements?.[0]?.value || ""
			setEditedValues((prev) => ({
				...prev,
				step1: { ...prev.step1, [index]: currentValue },
			}))
		} else if (step === 2 && results.step2?.termChanges[index]) {
			const change = results.step2.termChanges[index]
			setEditedValues((prev) => ({
				...prev,
				step2: { ...prev.step2, [index]: change.corrected },
			}))
		}
	}

	const handleCancelEdit = (step, index) => {
		setEditing((prev) => ({
			...prev,
			[`step${step}`]: { ...prev[`step${step}`], [index]: false },
		}))
	}

	const handleSaveEdit = (step, index) => {
		// TODO: Send edited value to backend for logging as human feedback
		console.log(`Saved edit for step ${step}, index ${index}:`, editedValues[`step${step}`][index])

		// Update the result with edited value
		if (step === 1) {
			setResults((prev) => {
				const newMatches = [...prev.step1.matches]
				newMatches[index] = {
					...newMatches[index],
					replacements: [{ value: editedValues.step1[index] }, ...(newMatches[index].replacements?.slice(1) || [])],
				}
				return { ...prev, step1: { ...prev.step1, matches: newMatches } }
			})
		} else if (step === 2) {
			setResults((prev) => {
				const newChanges = [...prev.step2.termChanges]
				newChanges[index] = {
					...newChanges[index],
					corrected: editedValues.step2[index],
				}
				return { ...prev, step2: { ...prev.step2, termChanges: newChanges } }
			})
		}

		setEditing((prev) => ({
			...prev,
			[`step${step}`]: { ...prev[`step${step}`], [index]: false },
		}))
	}

	const handleEditChange = (step, index, value) => {
		setEditedValues((prev) => ({
			...prev,
			[`step${step}`]: { ...prev[`step${step}`], [index]: value },
		}))
	}

	// Process all steps using the unified vertical process endpoint
	const handleProcess = async () => {
		if (!inputText.trim()) return

		setLoading(true)
		setCurrentStep(1)
		setResults({ step1: null, step2: null, step3: null })
		setErrors({ step1: null, step2: null, step3: null })
		setFeedback({ step1: null, step2: null, step3: null })
		setEditing({ step1: {}, step2: {} })
		setEditedValues({ step1: {}, step2: {} })
		setOriginalText("")
		setFinalText("")
		setSummary(null)
		setMetadata(null)

		try {
			// Call the unified processVertical endpoint
			const processVertical = httpsCallable(functions, "processVertical")

			// Simulate step progression for UI feedback
			setCurrentStep(1)

			const response = await processVertical({
				text: inputText,
				language: "ca",
				model: selectedModel || "gemini-2.5-flash",
				options: {
					languageToolLevel: "picky",
				},
			})

			const data = response.data

			// Update step 1 results
			setCurrentStep(2)
			if (data.step1) {
				if (data.step1.success) {
					setResults((prev) => ({
						...prev,
						step1: {
							success: true,
							matches: data.step1.matches || [],
							processedText: data.step1.processedText,
						},
					}))
				} else {
					setErrors((prev) => ({ ...prev, step1: data.step1.error || "Error en la correcció ortogràfica" }))
				}
			}

			// Update step 2 results
			setCurrentStep(3)
			if (data.step2) {
				if (data.step2.success) {
					setResults((prev) => ({
						...prev,
						step2: {
							success: true,
							termChanges: data.step2.termChanges || [],
							processedText: data.step2.processedText,
						},
					}))
				} else {
					setErrors((prev) => ({ ...prev, step2: data.step2.error || "Error en la correcció terminològica" }))
				}
			}

			// Update step 3 results
			if (data.step3) {
				if (data.step3.success) {
					setResults((prev) => ({
						...prev,
						step3: {
							success: true,
							styleIssues: data.step3.styleIssues || [],
							scores: data.step3.scores,
							toneAnalysis: data.step3.toneAnalysis,
							metrics: data.step3.metrics,
							recommendations: data.step3.recommendations || [],
							processedText: data.step3.processedText,
						},
					}))
				} else {
					setErrors((prev) => ({ ...prev, step3: data.step3.error || "Error en la validació d'estil" }))
				}
			}

			// Set final results
			setOriginalText(data.originalText)
			setFinalText(data.finalText)
			setSummary(data.summary)
			setMetadata(data.metadata)

			setCurrentStep(null)
		} catch (err) {
			console.error("Vertical process error:", err)
			setErrors((prev) => ({
				...prev,
				step1: currentStep === 1 ? err.message : prev.step1,
				step2: currentStep === 2 ? err.message : prev.step2,
				step3: currentStep === 3 ? err.message : prev.step3,
			}))
			setCurrentStep(null)
		} finally {
			setLoading(false)
		}
	}

	const getStepStatus = (step) => {
		if (errors[`step${step}`]) return "error"
		if (results[`step${step}`]) return "completed"
		if (currentStep === step) return "processing"
		if (currentStep && currentStep > step) return "completed"
		return "pending"
	}

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Processament Lingüístic Vertical</h1>
					<p className='text-muted-foreground mt-2'>Anàlisi en tres etapes: ortografia, terminologia i estil</p>
				</div>

				{/* Input Section */}
				<Card>
					<CardHeader>
						<CardTitle>Text a Processar</CardTitle>
						<CardDescription>Introduïu el text que voleu analitzar amb el sistema lingüístic complet</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='text-input'>Text d'entrada</Label>
							<textarea
								id='text-input'
								placeholder='Escriviu o enganxeu el text aquí...'
								value={inputText}
								onChange={(e) => setInputText(e.target.value)}
								className='flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
								disabled={loading}
							/>
						</div>

						<Button onClick={handleProcess} disabled={loading || !inputText.trim()} className='w-full' size='lg'>
							{loading ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Processant...
								</>
							) : (
								<>
									<Send className='mr-2 h-4 w-4' />
									Processar Text
								</>
							)}
						</Button>
					</CardContent>
				</Card>

				{/* Processing Steps Visualization */}
				<div className='grid gap-4'>
					{/* Step 1: Correcció Ortogràfica */}
					<Card className={getStepStatus(1) === "processing" ? "border-blue-500" : getStepStatus(1) === "error" ? "border-red-500" : getStepStatus(1) === "completed" ? "border-green-500" : ""}>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold'>1</div>
									<div>
										<CardTitle className='text-lg'>Correcció Ortogràfica i Sintàctica</CardTitle>
										<CardDescription>Detecció i correcció d'errors ortogràfics i sintàctics</CardDescription>
									</div>
								</div>
								<div>
									{getStepStatus(1) === "processing" && <Loader2 className='h-5 w-5 animate-spin text-blue-500' />}
									{getStepStatus(1) === "completed" && <CheckCircle2 className='h-5 w-5 text-green-500' />}
									{getStepStatus(1) === "error" && <AlertCircle className='h-5 w-5 text-red-500' />}
								</div>
							</div>
						</CardHeader>
						{results.step1 && (
							<CardContent>
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<span className='text-sm font-medium'>Errors detectats:</span>
										<Badge variant={results.step1.matches.length > 0 ? "destructive" : "default"}>{results.step1.matches.length}</Badge>
									</div>

									{results.step1.matches.length > 0 ? (
										<div className='space-y-2 max-h-60 overflow-y-auto'>
											{results.step1.matches.map((match, index) => (
												<div key={index} className='p-3 border rounded-lg bg-muted/50'>
													<div className='flex items-start justify-between mb-1'>
														<p className='font-medium text-sm'>{match.message}</p>
														<Badge variant='outline' className='text-xs'>
															{match.rule?.category?.name || "General"}
														</Badge>
													</div>
													<div className='bg-background p-2 rounded text-xs mb-2'>
														<span className='line-through text-destructive'>{match.context?.text?.substring(match.context?.offset, match.context?.offset + match.context?.length)}</span>
														{match.replacements && match.replacements.length > 0 && (
															<>
																<span className='mx-2'>→</span>
																{editing.step1[index] ? (
																	<span className='inline-flex items-center gap-1'>
																		<Input value={editedValues.step1[index] || ""} onChange={(e) => handleEditChange(1, index, e.target.value)} className='inline-block w-auto h-6 px-2 text-xs' />
																		<Button size='sm' variant='ghost' className='h-6 w-6 p-0' onClick={() => handleSaveEdit(1, index)}>
																			<Save className='h-3 w-3 text-green-600' />
																		</Button>
																		<Button size='sm' variant='ghost' className='h-6 w-6 p-0' onClick={() => handleCancelEdit(1, index)}>
																			<X className='h-3 w-3 text-red-600' />
																		</Button>
																	</span>
																) : (
																	<>
																		<span className='text-green-600 font-medium'>{match.replacements[0].value}</span>
																		<Button size='sm' variant='ghost' className='h-5 w-5 p-0 ml-1 inline-flex' onClick={() => handleStartEdit(1, index)}>
																			<Edit2 className='h-3 w-3' />
																		</Button>
																	</>
																)}
															</>
														)}
													</div>
													{match.rule?.description && <p className='text-xs text-muted-foreground mb-2'>{match.rule.description}</p>}
												</div>
											))}
										</div>
									) : (
										<div className='text-center py-3 text-sm text-muted-foreground'>
											<CheckCircle2 className='h-8 w-8 mx-auto mb-1 text-green-600' />
											Cap error detectat
										</div>
									)}

									{/* Overall feedback for Step 1 */}
									<div className='flex gap-1 pt-2 border-t'>
										<Button size='sm' variant={feedback.step1 === "up" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(1, "up")}>
											<ThumbsUp className='h-3 w-3 mr-1' />
											<span className='text-xs'>Correccions correctes</span>
										</Button>
										<Button size='sm' variant={feedback.step1 === "down" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(1, "down")}>
											<ThumbsDown className='h-3 w-3 mr-1' />
											<span className='text-xs'>Correccions incorrectes</span>
										</Button>
									</div>
								</div>
							</CardContent>
						)}
						{errors.step1 && (
							<CardContent>
								<div className='flex items-start space-x-2 text-destructive'>
									<AlertCircle className='h-5 w-5 mt-0.5' />
									<p className='text-sm'>{errors.step1}</p>
								</div>
							</CardContent>
						)}
					</Card>

					{/* Arrow */}
					{(results.step1 || currentStep >= 2) && (
						<div className='flex justify-center'>
							<ArrowRight className='h-6 w-6 text-muted-foreground rotate-90' />
						</div>
					)}

					{/* Step 2: RAG Terminològic */}
					<Card className={getStepStatus(2) === "processing" ? "border-blue-500" : getStepStatus(2) === "error" ? "border-red-500" : getStepStatus(2) === "completed" ? "border-green-500" : ""}>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold'>2</div>
									<div>
										<CardTitle className='text-lg'>RAG Terminològic</CardTitle>
										<CardDescription>Correcció terminològica amb cerca semàntica</CardDescription>
									</div>
								</div>
								<div>
									{getStepStatus(2) === "processing" && <Loader2 className='h-5 w-5 animate-spin text-blue-500' />}
									{getStepStatus(2) === "completed" && <CheckCircle2 className='h-5 w-5 text-green-500' />}
									{getStepStatus(2) === "error" && <AlertCircle className='h-5 w-5 text-red-500' />}
								</div>
							</div>
						</CardHeader>
						{results.step2 && (
							<CardContent>
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<span className='text-sm font-medium'>Canvis terminològics:</span>
										<Badge variant={results.step2.termChanges.length > 0 ? "default" : "outline"}>{results.step2.termChanges.length}</Badge>
									</div>

									{results.step2.termChanges.length > 0 ? (
										<div className='space-y-2 max-h-60 overflow-y-auto'>
											{results.step2.termChanges.map((change, index) => (
												<div key={index} className='p-3 border rounded-lg bg-muted/50'>
													<div className='bg-background p-2 rounded text-sm mb-2'>
														<span className='line-through text-orange-600'>{change.original}</span>
														<span className='mx-2'>→</span>
														{editing.step2[index] ? (
															<span className='inline-flex items-center gap-1'>
																<Input value={editedValues.step2[index] || ""} onChange={(e) => handleEditChange(2, index, e.target.value)} className='inline-block w-auto h-6 px-2 text-xs' />
																<Button size='sm' variant='ghost' className='h-6 w-6 p-0' onClick={() => handleSaveEdit(2, index)}>
																	<Save className='h-3 w-3 text-green-600' />
																</Button>
																<Button size='sm' variant='ghost' className='h-6 w-6 p-0' onClick={() => handleCancelEdit(2, index)}>
																	<X className='h-3 w-3 text-red-600' />
																</Button>
															</span>
														) : (
															<>
																<span className='text-green-600 font-medium'>{change.corrected}</span>
																<Button size='sm' variant='ghost' className='h-5 w-5 p-0 ml-1 inline-flex' onClick={() => handleStartEdit(2, index)}>
																	<Edit2 className='h-3 w-3' />
																</Button>
															</>
														)}
													</div>
													<p className='text-xs text-muted-foreground mb-2'>{change.reason}</p>
												</div>
											))}
										</div>
									) : (
										<div className='text-center py-3 text-sm text-muted-foreground'>
											<CheckCircle2 className='h-8 w-8 mx-auto mb-1 text-green-600' />
											Cap canvi terminològic necessari
										</div>
									)}

									{/* Overall feedback for Step 2 */}
									<div className='flex gap-1 pt-2 border-t'>
										<Button size='sm' variant={feedback.step2 === "up" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(2, "up")}>
											<ThumbsUp className='h-3 w-3 mr-1' />
											<span className='text-xs'>Canvis correctes</span>
										</Button>
										<Button size='sm' variant={feedback.step2 === "down" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(2, "down")}>
											<ThumbsDown className='h-3 w-3 mr-1' />
											<span className='text-xs'>Canvis incorrectes</span>
										</Button>
									</div>
								</div>
							</CardContent>
						)}
						{errors.step2 && (
							<CardContent>
								<div className='flex items-start space-x-2 text-destructive'>
									<AlertCircle className='h-5 w-5 mt-0.5' />
									<p className='text-sm'>{errors.step2}</p>
								</div>
							</CardContent>
						)}
					</Card>

					{/* Arrow */}
					{(results.step2 || currentStep === 3) && (
						<div className='flex justify-center'>
							<ArrowRight className='h-6 w-6 text-muted-foreground rotate-90' />
						</div>
					)}

					{/* Step 3: Validació d'Estil */}
					<Card className={getStepStatus(3) === "processing" ? "border-blue-500" : getStepStatus(3) === "error" ? "border-red-500" : getStepStatus(3) === "completed" ? "border-green-500" : ""}>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold'>3</div>
									<div>
										<CardTitle className='text-lg'>Validació d'Estil i To</CardTitle>
										<CardDescription>Anàlisi del to i l'estil del document</CardDescription>
									</div>
								</div>
								<div>
									{getStepStatus(3) === "processing" && <Loader2 className='h-5 w-5 animate-spin text-blue-500' />}
									{getStepStatus(3) === "completed" && <CheckCircle2 className='h-5 w-5 text-green-500' />}
									{getStepStatus(3) === "error" && <AlertCircle className='h-5 w-5 text-red-500' />}
								</div>
							</div>
						</CardHeader>
						{results.step3 && (
							<CardContent>
								<div className='space-y-3'>
									{/* Scores */}
									{results.step3.scores && (
										<div className='grid grid-cols-2 md:grid-cols-3 gap-2 pb-3 border-b'>
											<div className='text-center p-2 bg-muted/50 rounded'>
												<p className='text-xs text-muted-foreground'>Puntuació Global</p>
												<p className='text-lg font-bold' style={{ color: results.step3.scores.overall >= 80 ? "#16a34a" : results.step3.scores.overall >= 60 ? "#ca8a04" : "#dc2626" }}>
													{results.step3.scores.overall?.toFixed(0)}
												</p>
											</div>
											<div className='text-center p-2 bg-muted/50 rounded'>
												<p className='text-xs text-muted-foreground'>Claredat</p>
												<p className='text-sm font-medium'>{results.step3.scores.clarity?.toFixed(0)}</p>
											</div>
											<div className='text-center p-2 bg-muted/50 rounded'>
												<p className='text-xs text-muted-foreground'>Formalitat</p>
												<p className='text-sm font-medium'>{results.step3.scores.formality?.toFixed(0)}</p>
											</div>
											<div className='text-center p-2 bg-muted/50 rounded'>
												<p className='text-xs text-muted-foreground'>Coherència</p>
												<p className='text-sm font-medium'>{results.step3.scores.styleCoherence?.toFixed(0)}</p>
											</div>
											<div className='text-center p-2 bg-muted/50 rounded'>
												<p className='text-xs text-muted-foreground'>Adequació To</p>
												<p className='text-sm font-medium'>{results.step3.scores.toneAdequacy?.toFixed(0)}</p>
											</div>
											{results.step3.toneAnalysis && (
												<div className='text-center p-2 bg-muted/50 rounded'>
													<p className='text-xs text-muted-foreground'>To Detectat</p>
													<p className='text-sm font-medium capitalize'>{results.step3.toneAnalysis.detectedTone?.replace(/_/g, " ")}</p>
												</div>
											)}
										</div>
									)}

									<div className='flex items-center justify-between'>
										<span className='text-sm font-medium'>Observacions d'estil:</span>
										<Badge variant='outline'>{results.step3.styleIssues?.length || 0}</Badge>
									</div>

									{results.step3.styleIssues?.length > 0 ? (
										<div className='space-y-2 max-h-60 overflow-y-auto'>
											{results.step3.styleIssues.map((issue, index) => (
												<div key={index} className='p-3 border rounded-lg bg-muted/50'>
													<div className='flex items-start justify-between mb-1'>
														<p className='text-sm'>{issue.message}</p>
														<Badge variant={issue.severity === "error" ? "destructive" : issue.severity === "warning" ? "default" : "outline"} className='text-xs'>
															{issue.type}
														</Badge>
													</div>
													{issue.suggestion && <p className='text-xs text-green-600 mt-1'>💡 {issue.suggestion}</p>}
												</div>
											))}
										</div>
									) : (
										<div className='text-center py-3 text-sm text-muted-foreground'>
											<CheckCircle2 className='h-8 w-8 mx-auto mb-1 text-green-600' />
											L'estil és adequat
										</div>
									)}

									{/* Recommendations */}
									{results.step3.recommendations?.length > 0 && (
										<div className='pt-2 border-t'>
											<p className='text-xs font-medium text-muted-foreground mb-2'>Recomanacions:</p>
											<div className='space-y-1'>
												{results.step3.recommendations.slice(0, 3).map((rec, idx) => (
													<div key={idx} className='text-xs flex items-start gap-1'>
														<Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "outline"} className='text-[10px] px-1'>
															{rec.priority}
														</Badge>
														<span>{rec.message}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Feedback buttons for the entire step */}
									<div className='flex gap-1 pt-2 border-t'>
										<Button size='sm' variant={feedback.step3 === "up" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(3, "up")}>
											<ThumbsUp className='h-3 w-3 mr-1' />
											<span className='text-xs'>Correcte</span>
										</Button>
										<Button size='sm' variant={feedback.step3 === "down" ? "default" : "outline"} className='h-7 px-2' onClick={() => handleFeedback(3, "down")}>
											<ThumbsDown className='h-3 w-3 mr-1' />
											<span className='text-xs'>Incorrecte</span>
										</Button>
									</div>
								</div>
							</CardContent>
						)}
						{errors.step3 && (
							<CardContent>
								<div className='flex items-start space-x-2 text-destructive'>
									<AlertCircle className='h-5 w-5 mt-0.5' />
									<p className='text-sm'>{errors.step3}</p>
								</div>
							</CardContent>
						)}
					</Card>
				</div>

				{/* Summary */}
				{results.step1 && results.step2 && results.step3 && !loading && (
					<Card className='border-green-500 bg-green-50 dark:bg-green-950'>
						<CardHeader>
							<CardTitle className='text-green-700 dark:text-green-300 flex items-center gap-2'>
								<CheckCircle2 className='h-5 w-5' />
								Processament Completat
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{/* Summary stats */}
								<div className='space-y-2 text-sm'>
									<p className='font-medium'>Resum de les intervencions:</p>
									<ul className='list-disc list-inside space-y-1 text-muted-foreground'>
										<li>
											<strong>Ortografia:</strong> {results.step1.matches?.length || 0} errors detectats
										</li>
										<li>
											<strong>Terminologia:</strong> {results.step2.termChanges?.length || 0} canvis aplicats
										</li>
										<li>
											<strong>Estil:</strong> {results.step3.styleIssues?.length || 0} observacions
										</li>
									</ul>
									{summary && (
										<div className='mt-2 pt-2 border-t'>
											<p className='text-sm'>
												<strong>Puntuació global:</strong>{" "}
												<Badge variant={summary.overallScore >= 80 ? "default" : summary.overallScore >= 60 ? "secondary" : "destructive"}>{summary.overallScore?.toFixed(1) || "N/A"}/100</Badge>
											</p>
										</div>
									)}
								</div>

								{/* Original vs Final Text Comparison */}
								{originalText && finalText && (
									<div className='space-y-4 pt-4 border-t'>
										<p className='font-medium text-sm'>Comparació de textos:</p>

										{/* Original Text */}
										<div className='space-y-2'>
											<Label className='text-xs text-muted-foreground flex items-center gap-1'>
												<FileText className='h-3 w-3' />
												Text Original
											</Label>
											<div className='p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg'>
												<p className='text-sm whitespace-pre-wrap'>{originalText}</p>
											</div>
										</div>

										{/* Final Text */}
										<div className='space-y-2'>
											<Label className='text-xs text-muted-foreground flex items-center gap-1'>
												<CheckCircle2 className='h-3 w-3' />
												Text Processat
											</Label>
											<div className='p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg'>
												<p className='text-sm whitespace-pre-wrap'>{finalText}</p>
											</div>
										</div>

										{/* Changes Applied */}
										{(results.step1.matches?.length > 0 || results.step2.termChanges?.length > 0) && (
											<div className='space-y-2'>
												<Label className='text-xs text-muted-foreground'>Canvis aplicats:</Label>
												<div className='flex flex-wrap gap-2'>
													{results.step1.matches?.map(
														(match, idx) =>
															match.replacements?.[0]?.value && (
																<Badge key={`lt-${idx}`} variant='outline' className='text-xs'>
																	<span className='line-through text-red-500 mr-1'>{match.context?.text?.substring(match.context?.offset, match.context?.offset + match.context?.length)}</span>→{" "}
																	<span className='text-green-600 ml-1'>{match.replacements[0].value}</span>
																</Badge>
															)
													)}
													{results.step2.termChanges?.map((change, idx) => (
														<Badge key={`rag-${idx}`} variant='outline' className='text-xs'>
															<span className='line-through text-orange-500 mr-1'>{change.original}</span>→ <span className='text-green-600 ml-1'>{change.corrected}</span>
														</Badge>
													))}
												</div>
											</div>
										)}
									</div>
								)}

								{/* Metadata */}
								{metadata && (
									<div className='pt-2 border-t text-xs text-muted-foreground'>
										<p>
											Temps de processament: {metadata.totalProcessingTimeMs}ms | ID: {metadata.requestId}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</DashboardLayout>
	)
}
