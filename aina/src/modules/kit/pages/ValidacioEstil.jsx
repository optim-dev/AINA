import React, { useState, useCallback } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
	Palette,
	MessageCircle,
	ThumbsUp,
	ThumbsDown,
	FileText,
	TrendingUp,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	AlertCircle,
	Loader2,
	ChevronDown,
	ChevronRight,
	Send,
	RotateCcw,
	Sparkles,
	Copy,
	ArrowRight,
	Wand2,
} from "lucide-react"

import { validateStyleTone, improveText, getScoreColor, SCORE_THRESHOLDS } from "@/services/kitService"
import { useSettingsStore } from "@/stores/settingsStore"

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ScoreCard({ title, score, target, icon: Icon }) {
	const colorClass = getScoreColor(score, "overall")

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-sm font-medium'>{title}</CardTitle>
				{Icon && <Icon className='h-4 w-4 text-muted-foreground' />}
			</CardHeader>
			<CardContent>
				<div className={`text-2xl font-bold ${colorClass}`}>{score}%</div>
				<Progress value={score} className='mt-2' />
				<p className='text-xs text-muted-foreground mt-1'>Objectiu: ≥{target}%</p>
			</CardContent>
		</Card>
	)
}

function AlertCard({ alert, onFeedback }) {
	const [isOpen, setIsOpen] = useState(false)

	const typeLabels = {
		castellanisme: "Castellanisme",
		colloquialisme: "Col·loquialisme",
		ambiguitat: "Ambigüitat",
		registre_inadequat: "Registre inadequat",
		frase_llarga: "Frase llarga",
		passiva_excessiva: "Veu passiva",
		repeticio: "Repetició",
	}

	const Icon = alert.severity === "error" ? XCircle : alert.severity === "warning" ? AlertCircle : AlertCircle

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className='border rounded-lg p-3 mb-2'>
				<CollapsibleTrigger asChild>
					<div className='flex items-start justify-between cursor-pointer'>
						<div className='flex items-start gap-2'>
							<Icon className={`h-4 w-4 mt-0.5 ${alert.severity === "error" ? "text-red-500" : alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"}`} />
							<div>
								<div className='flex items-center gap-2'>
									<Badge variant={alert.severity === "error" ? "destructive" : alert.severity === "warning" ? "outline" : "secondary"}>{typeLabels[alert.type] || alert.type}</Badge>
									<span className='text-sm font-medium'>{alert.message}</span>
								</div>
								{alert.context?.text && <p className='text-sm text-muted-foreground mt-1'>«{alert.context.text}»</p>}
							</div>
						</div>
						{isOpen ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className='mt-3 pl-6 space-y-2'>
						{alert.suggestion && (
							<div className='text-sm'>
								<span className='font-medium'>Suggeriment: </span>
								<span className='text-green-600'>{alert.suggestion}</span>
							</div>
						)}
						{alert.context?.sentence && (
							<div className='text-sm text-muted-foreground'>
								<span className='font-medium'>Context: </span>
								{alert.context.sentence}
							</div>
						)}
						{onFeedback && (
							<div className='flex gap-2 mt-2'>
								<Button variant='ghost' size='sm' onClick={() => onFeedback(alert.id, "positive")}>
									<ThumbsUp className='h-3 w-3 mr-1' />
									Útil
								</Button>
								<Button variant='ghost' size='sm' onClick={() => onFeedback(alert.id, "negative")}>
									<ThumbsDown className='h-3 w-3 mr-1' />
									No útil
								</Button>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	)
}

function RecommendationCard({ recommendation }) {
	const priorityConfig = {
		alta: { color: "text-red-600" },
		mitjana: { color: "text-yellow-600" },
		baixa: { color: "text-blue-600" },
	}

	const config = priorityConfig[recommendation.priority] || priorityConfig.baixa

	return (
		<Card className='mb-3'>
			<CardHeader className='pb-2'>
				<div className='flex items-center justify-between'>
					<CardTitle className='text-base'>{recommendation.title}</CardTitle>
					<Badge variant='outline' className={config.color}>
						Prioritat {recommendation.priority}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<p className='text-sm text-muted-foreground'>{recommendation.description}</p>
				{recommendation.examples && recommendation.examples.length > 0 && (
					<div className='mt-3 space-y-2'>
						{recommendation.examples.map((ex, idx) => (
							<div key={idx} className='text-sm bg-muted/50 rounded p-2'>
								<div className='flex items-start gap-2'>
									<XCircle className='h-4 w-4 text-red-500 mt-0.5 flex-shrink-0' />
									<span className='line-through text-muted-foreground'>{ex.original}</span>
								</div>
								<div className='flex items-start gap-2 mt-1'>
									<CheckCircle2 className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
									<span className='text-green-700'>{ex.improved}</span>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ValidacioEstil() {
	const selectedModel = useSettingsStore((state) => state.selectedModel)
	const [text, setText] = useState("")
	const [documentType, setDocumentType] = useState("generic")
	const [targetAudience, setTargetAudience] = useState("no_especificat")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState(null)
	const [result, setResult] = useState(null)

	// Text improvement state
	const [isImproving, setIsImproving] = useState(false)
	const [improvementResult, setImprovementResult] = useState(null)
	const [improvementError, setImprovementError] = useState(null)

	const handleValidate = useCallback(async () => {
		if (!text.trim()) {
			setError("Cal introduir un text per validar")
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const validationResult = await validateStyleTone({
				text,
				documentType: documentType || undefined,
				targetAudience: targetAudience === "no_especificat" ? undefined : targetAudience,
				model: selectedModel || "gemini-2.5-flash",
			})
			setResult(validationResult)
		} catch (e) {
			setError(e.message || "Error en la validació")
			setResult(null)
		} finally {
			setIsLoading(false)
		}
	}, [text, documentType, targetAudience])

	const handleReset = useCallback(() => {
		setText("")
		setDocumentType("generic")
		setTargetAudience("no_especificat")
		setResult(null)
		setError(null)
		setImprovementResult(null)
		setImprovementError(null)
		setImprovementResult(null)
	}, [])

	const handleImproveText = useCallback(async () => {
		if (!result || !result.alerts || result.alerts.length === 0) {
			setImprovementError("No hi ha alertes per millorar")
			return
		}

		setIsImproving(true)
		setImprovementError(null)

		try {
			const improvement = await improveText({
				text,
				alerts: result.alerts,
				documentType: documentType || undefined,
				targetAudience: targetAudience === "no_especificat" ? undefined : targetAudience,
				model: selectedModel || "gemini-2.5-flash",
			})
			setImprovementResult(improvement)
		} catch (e) {
			setImprovementError(e.message || "Error en la millora del text")
			setImprovementResult(null)
		} finally {
			setIsImproving(false)
		}
	}, [text, result, documentType, targetAudience])

	const handleCopyImprovedText = useCallback(() => {
		if (improvementResult?.improvedText) {
			navigator.clipboard.writeText(improvementResult.improvedText)
		}
	}, [improvementResult])

	const handleApplyImprovedText = useCallback(() => {
		if (improvementResult?.improvedText) {
			setText(improvementResult.improvedText)
			setResult(null)
			setImprovementResult(null)
		}
	}, [improvementResult])

	const handleFeedback = useCallback((alertId, rating) => {
		// TODO: Implement feedback submission
		console.log("Feedback:", { alertId, rating })
	}, [])

	// Count alerts by severity
	const alertCounts = result
		? {
				error: result.alerts.filter((a) => a.severity === "error").length,
				warning: result.alerts.filter((a) => a.severity === "warning").length,
				info: result.alerts.filter((a) => a.severity === "info").length,
		  }
		: { error: 0, warning: 0, info: 0 }

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Validació d'estil i to</h1>
					<p className='text-muted-foreground mt-2'>Anàlisi i validació del to i l'estil dels documents administratius</p>
				</div>

				{/* Input Section */}
				<Card>
					<CardHeader>
						<CardTitle>Text a validar</CardTitle>
						<CardDescription>Introduïu el text que voleu analitzar per detectar problemes d'estil i to</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<Textarea placeholder='Escriviu o enganxeu aquí el text a validar...' value={text} onChange={(e) => setText(e.target.value)} rows={6} className='resize-none' />

						<div className='flex flex-wrap gap-4'>
							<div className='flex-1 min-w-[200px]'>
								<label className='text-sm font-medium mb-1 block'>Tipus de document</label>
								<Select value={documentType} onValueChange={setDocumentType}>
									<SelectTrigger>
										<SelectValue placeholder='Seleccionar tipus' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='generic'>Genèric</SelectItem>
										<SelectItem value='decret'>Decret</SelectItem>
										<SelectItem value='informe_valoracio'>Informe de valoració</SelectItem>
										<SelectItem value='comunicacio_interna'>Comunicació interna</SelectItem>
										<SelectItem value='notificacio_ciutada'>Notificació a la ciutadania</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className='flex-1 min-w-[200px]'>
								<label className='text-sm font-medium mb-1 block'>Públic destinatari</label>
								<Select value={targetAudience} onValueChange={setTargetAudience}>
									<SelectTrigger>
										<SelectValue placeholder='Seleccionar públic' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='no_especificat'>No especificat</SelectItem>
										<SelectItem value='intern'>Intern</SelectItem>
										<SelectItem value='ciutadania'>Ciutadania</SelectItem>
										<SelectItem value='empreses'>Empreses</SelectItem>
										<SelectItem value='altres_administracions'>Altres administracions</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='flex gap-2'>
							<Button onClick={handleValidate} disabled={isLoading || !text.trim()}>
								{isLoading ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										Validant...
									</>
								) : (
									<>
										<Send className='mr-2 h-4 w-4' />
										Validar text
									</>
								)}
							</Button>
							<Button variant='outline' onClick={handleReset}>
								<RotateCcw className='mr-2 h-4 w-4' />
								Netejar
							</Button>
						</div>

						{error && (
							<Alert variant='destructive'>
								<AlertTriangle className='h-4 w-4' />
								<AlertTitle>Error</AlertTitle>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>

				{/* Results Section */}
				{result && (
					<Tabs defaultValue='overview' className='w-full'>
						<TabsList>
							<TabsTrigger value='overview'>Visió General</TabsTrigger>
							<TabsTrigger value='style'>
								Anàlisi d'Estil
								{alertCounts.error + alertCounts.warning > 0 && (
									<Badge variant='outline' className='ml-2'>
										{alertCounts.error + alertCounts.warning}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value='tone'>Anàlisi de To</TabsTrigger>
							<TabsTrigger value='recommendations'>
								Recomanacions
								{result.recommendations.length > 0 && (
									<Badge variant='outline' className='ml-2'>
										{result.recommendations.length}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value='improve'>
								<Sparkles className='h-4 w-4 mr-1' />
								Millorar Text
								{improvementResult && (
									<Badge variant='default' className='ml-2 bg-green-600'>
										{improvementResult.totalChanges}
									</Badge>
								)}
							</TabsTrigger>
						</TabsList>

						{/* OVERVIEW TAB */}
						<TabsContent value='overview' className='space-y-4'>
							<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
								<ScoreCard title='Puntuació Global' score={result.scores.overall} target={SCORE_THRESHOLDS.overall.target} icon={TrendingUp} />
								<ScoreCard title='Coherència Estilística' score={result.scores.styleCoherence} target={SCORE_THRESHOLDS.styleCoherence.target} icon={Palette} />
								<ScoreCard title='Adequació del To' score={result.scores.toneAdequacy} target={SCORE_THRESHOLDS.toneAdequacy.target} icon={MessageCircle} />
							</div>

							<Card>
								<CardHeader>
									<CardTitle>Indicadors de Qualitat</CardTitle>
									<CardDescription>Mètriques d'estil i to del contingut</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='space-y-3'>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Claredat del missatge</span>
											<div className='flex items-center gap-2'>
												<Progress value={result.scores.clarity} className='w-24' />
												<Badge variant={result.scores.clarity >= 80 ? "default" : result.scores.clarity >= 60 ? "outline" : "destructive"}>{result.scores.clarity}%</Badge>
											</div>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Formalitat del to</span>
											<div className='flex items-center gap-2'>
												<Progress value={result.scores.formality} className='w-24' />
												<Badge variant={result.scores.formality >= 85 ? "default" : result.scores.formality >= 70 ? "outline" : "destructive"}>{result.scores.formality}%</Badge>
											</div>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Consistència terminològica</span>
											<div className='flex items-center gap-2'>
												<Progress value={result.scores.terminologyConsistency} className='w-24' />
												<Badge variant={result.scores.terminologyConsistency >= 90 ? "default" : result.scores.terminologyConsistency >= 70 ? "outline" : "destructive"}>{result.scores.terminologyConsistency}%</Badge>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Summary of issues */}
							{result.alerts.length > 0 && (
								<Alert variant={alertCounts.error > 0 ? "destructive" : "default"}>
									<AlertTriangle className='h-4 w-4' />
									<AlertTitle>Resum d'alertes</AlertTitle>
									<AlertDescription>
										S'han detectat{" "}
										<strong>
											{alertCounts.error} errors, {alertCounts.warning} avisos
										</strong>{" "}
										i <strong>{alertCounts.info} informacions</strong>. Consulteu la pestanya "Anàlisi d'Estil" per veure els detalls.
									</AlertDescription>
								</Alert>
							)}

							{result.alerts.length === 0 && (
								<Alert>
									<CheckCircle2 className='h-4 w-4' />
									<AlertTitle>Text correcte</AlertTitle>
									<AlertDescription>No s'han detectat problemes significatius d'estil o to.</AlertDescription>
								</Alert>
							)}
						</TabsContent>

						{/* STYLE TAB */}
						<TabsContent value='style' className='space-y-4'>
							<Card>
								<CardHeader>
									<CardTitle>Mètriques Estilístiques</CardTitle>
									<CardDescription>Avaluació dels aspectes estilístics del document</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='grid gap-4 md:grid-cols-2'>
										<div className='space-y-2'>
											<div className='flex items-center justify-between'>
												<span className='text-sm'>Longitud mitjana de frases</span>
												<Badge variant={result.styleMetrics.averageSentenceLength <= 25 ? "default" : result.styleMetrics.averageSentenceLength <= 35 ? "outline" : "destructive"}>
													{result.styleMetrics.averageSentenceLength} paraules
												</Badge>
											</div>
											<div className='flex items-center justify-between'>
												<span className='text-sm'>Complexitat sintàctica</span>
												<Badge variant='outline'>{result.styleMetrics.syntacticComplexity === "baixa" ? "Baixa" : result.styleMetrics.syntacticComplexity === "mitjana" ? "Mitjana" : "Alta"}</Badge>
											</div>
										</div>
										<div className='space-y-2'>
											<div className='flex items-center justify-between'>
												<span className='text-sm'>Ús de veu passiva</span>
												<Badge variant={result.styleMetrics.passiveVoicePercentage <= 20 ? "default" : result.styleMetrics.passiveVoicePercentage <= 30 ? "outline" : "destructive"}>
													{result.styleMetrics.passiveVoicePercentage}%
												</Badge>
											</div>
											<div className='flex items-center justify-between'>
												<span className='text-sm'>Varietat lèxica</span>
												<Badge variant={result.styleMetrics.lexicalDiversity >= 0.4 ? "default" : "outline"}>{(result.styleMetrics.lexicalDiversity * 100).toFixed(0)}%</Badge>
											</div>
										</div>
									</div>

									<div className='mt-4 text-sm text-muted-foreground'>
										<p>
											<strong>Frases:</strong> {result.styleMetrics.sentenceCount} | <strong>Paraules:</strong> {result.styleMetrics.wordCount} | <strong>Llegibilitat:</strong> {result.styleMetrics.readabilityScore}/100
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Alertes Detectades</CardTitle>
									<CardDescription>Problemes d'estil, registre i terminologia</CardDescription>
								</CardHeader>
								<CardContent>
									{result.alerts.length === 0 ? (
										<div className='text-center py-8 text-muted-foreground'>
											<CheckCircle2 className='h-12 w-12 mx-auto mb-4 opacity-50' />
											<p>No s'han detectat alertes</p>
										</div>
									) : (
										<div className='space-y-2'>
											{result.alerts.map((alert) => (
												<AlertCard key={alert.id} alert={alert} onFeedback={handleFeedback} />
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						{/* TONE TAB */}
						<TabsContent value='tone' className='space-y-4'>
							<Card>
								<CardHeader>
									<CardTitle>Anàlisi de To</CardTitle>
									<CardDescription>Avaluació del to i registre del document</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='grid gap-4 md:grid-cols-2'>
										<div className='space-y-3'>
											<h4 className='font-semibold'>Característiques del To</h4>
											<div className='space-y-2'>
												<div className='flex items-center justify-between'>
													<span className='text-sm'>Nivell de formalitat</span>
													<Badge variant={result.toneAnalysis.detectedTone === "formal_administratiu" ? "default" : result.toneAnalysis.detectedTone === "semiformal" ? "outline" : "destructive"}>
														{result.toneAnalysis.detectedTone === "formal_administratiu"
															? "Formal administratiu"
															: result.toneAnalysis.detectedTone === "semiformal"
															? "Semiformal"
															: result.toneAnalysis.detectedTone === "mixt"
															? "Mixt"
															: "Informal"}
													</Badge>
												</div>
												<div className='flex items-center justify-between'>
													<span className='text-sm'>To emocional</span>
													<Badge variant='outline'>
														{result.toneAnalysis.emotionalTone === "neutre"
															? "Neutre"
															: result.toneAnalysis.emotionalTone === "positiu"
															? "Positiu"
															: result.toneAnalysis.emotionalTone === "negatiu"
															? "Negatiu"
															: "Assertiu"}
													</Badge>
												</div>
												<div className='flex items-center justify-between'>
													<span className='text-sm'>Objectivitat</span>
													<Badge variant='outline'>{result.toneAnalysis.objectivity}%</Badge>
												</div>
											</div>
										</div>

										<div className='space-y-3'>
											<h4 className='font-semibold'>Confiança del Model</h4>
											<div className='space-y-2'>
												<Progress value={result.toneAnalysis.confidence * 100} className='h-2' />
												<p className='text-sm text-muted-foreground'>{(result.toneAnalysis.confidence * 100).toFixed(0)}% de confiança en la classificació</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Contextos Detectats</CardTitle>
									<CardDescription>Tipus de comunicació i públic objectiu</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='space-y-2'>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Tipus de document</span>
											<Badge variant='outline'>
												{documentType === "decret"
													? "Decret"
													: documentType === "informe_valoracio"
													? "Informe de valoració"
													: documentType === "comunicacio_interna"
													? "Comunicació interna"
													: documentType === "notificacio_ciutada"
													? "Notificació ciutadana"
													: "Genèric"}
											</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Públic destinatari</span>
											<Badge variant='outline'>
												{targetAudience === "intern"
													? "Intern"
													: targetAudience === "ciutadania"
													? "Ciutadania"
													: targetAudience === "empreses"
													? "Empreses"
													: targetAudience === "altres_administracions"
													? "Altres administracions"
													: "No especificat"}
											</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Adequació administrativa</span>
											<Badge variant={result.toneAnalysis.detectedTone === "formal_administratiu" ? "default" : "outline"}>{result.toneAnalysis.detectedTone === "formal_administratiu" ? "Adequat" : "A millorar"}</Badge>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* RECOMMENDATIONS TAB */}
						<TabsContent value='recommendations' className='space-y-4'>
							<Card>
								<CardHeader>
									<CardTitle>Recomanacions de Millora</CardTitle>
									<CardDescription>Suggeriments per optimitzar l'estil i el to</CardDescription>
								</CardHeader>
								<CardContent>
									{result.recommendations.length === 0 ? (
										<div className='text-center py-8 text-muted-foreground'>
											<ThumbsUp className='h-12 w-12 mx-auto mb-4 opacity-50' />
											<p>El text compleix els estàndards de qualitat</p>
										</div>
									) : (
										<div>
											{result.recommendations.map((rec) => (
												<RecommendationCard key={rec.id} recommendation={rec} />
											))}
										</div>
									)}
								</CardContent>
							</Card>

							<div className='grid gap-4 md:grid-cols-2'>
								<Card>
									<CardHeader>
										<CardTitle>Alertes de Qualitat</CardTitle>
										<CardDescription>Aspectes a revisar</CardDescription>
									</CardHeader>
									<CardContent>
										{alertCounts.error > 0 ? (
											<div className='space-y-2'>
												<div className='flex items-center gap-2 text-red-600'>
													<XCircle className='h-4 w-4' />
													<span>
														{alertCounts.error} error{alertCounts.error > 1 ? "s" : ""} greu
														{alertCounts.error > 1 ? "s" : ""}
													</span>
												</div>
												{alertCounts.warning > 0 && (
													<div className='flex items-center gap-2 text-yellow-600'>
														<AlertCircle className='h-4 w-4' />
														<span>{alertCounts.warning} avisos</span>
													</div>
												)}
											</div>
										) : (
											<div className='text-center py-4 text-muted-foreground'>
												<CheckCircle2 className='h-8 w-8 mx-auto mb-2 opacity-50' />
												<p className='text-sm'>Sense alertes crítiques</p>
											</div>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Bones Pràctiques</CardTitle>
										<CardDescription>Elements destacables del document</CardDescription>
									</CardHeader>
									<CardContent>
										{result.scores.overall >= 85 ? (
											<div className='space-y-2'>
												{result.scores.styleCoherence >= 90 && (
													<div className='flex items-center gap-2 text-green-600'>
														<CheckCircle2 className='h-4 w-4' />
														<span>Excel·lent coherència estilística</span>
													</div>
												)}
												{result.scores.toneAdequacy >= 85 && (
													<div className='flex items-center gap-2 text-green-600'>
														<CheckCircle2 className='h-4 w-4' />
														<span>To administratiu adequat</span>
													</div>
												)}
												{result.styleMetrics.averageSentenceLength <= 25 && (
													<div className='flex items-center gap-2 text-green-600'>
														<CheckCircle2 className='h-4 w-4' />
														<span>Frases de longitud adequada</span>
													</div>
												)}
											</div>
										) : (
											<div className='text-center py-4 text-muted-foreground'>
												<TrendingUp className='h-8 w-8 mx-auto mb-2 opacity-50' />
												<p className='text-sm'>Hi ha marge de millora</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>

							{/* Processing metadata */}
							<div className='text-xs text-muted-foreground text-right'>
								Validat el {new Date(result.metadata.processedAt).toLocaleString("ca-ES")} | Temps: {result.metadata.processingTimeMs}ms | Versió: {result.metadata.pipelineVersion}
							</div>
						</TabsContent>

						{/* IMPROVE TAB */}
						<TabsContent value='improve' className='space-y-4'>
							{/* Improve button and status */}
							<Card>
								<CardHeader>
									<CardTitle className='flex items-center gap-2'>
										<Wand2 className='h-5 w-5' />
										Millora Automàtica del Text
									</CardTitle>
									<CardDescription>Utilitza intel·ligència artificial per corregir automàticament els problemes detectats en el text</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									{!improvementResult ? (
										<>
											<div className='bg-muted/50 rounded-lg p-4'>
												<h4 className='font-medium mb-2'>Què es millorarà?</h4>
												<ul className='text-sm text-muted-foreground space-y-1'>
													{result.alerts.filter((a) => a.type === "castellanisme").length > 0 && (
														<li className='flex items-center gap-2'>
															<CheckCircle2 className='h-4 w-4 text-green-600' />
															{result.alerts.filter((a) => a.type === "castellanisme").length} castellanismes → formes catalanes
														</li>
													)}
													{result.alerts.filter((a) => a.type === "colloquialisme").length > 0 && (
														<li className='flex items-center gap-2'>
															<CheckCircle2 className='h-4 w-4 text-green-600' />
															{result.alerts.filter((a) => a.type === "colloquialisme").length} col·loquialismes → registre formal
														</li>
													)}
													{result.alerts.filter((a) => a.type === "registre_inadequat").length > 0 && (
														<li className='flex items-center gap-2'>
															<CheckCircle2 className='h-4 w-4 text-green-600' />
															{result.alerts.filter((a) => a.type === "registre_inadequat").length} problemes de registre → to formal
														</li>
													)}
													{result.alerts.filter((a) => a.type === "ambiguitat").length > 0 && (
														<li className='flex items-center gap-2'>
															<CheckCircle2 className='h-4 w-4 text-green-600' />
															{result.alerts.filter((a) => a.type === "ambiguitat").length} ambigüitats → text precís
														</li>
													)}
													{result.alerts.filter((a) => a.type === "frase_llarga").length > 0 && (
														<li className='flex items-center gap-2'>
															<CheckCircle2 className='h-4 w-4 text-green-600' />
															{result.alerts.filter((a) => a.type === "frase_llarga").length} frases llargues → frases més curtes
														</li>
													)}
													{result.alerts.length === 0 && <li className='text-muted-foreground'>No hi ha problemes a corregir</li>}
												</ul>
											</div>

											<Button onClick={handleImproveText} disabled={isImproving || result.alerts.length === 0} className='w-full' size='lg'>
												{isImproving ? (
													<>
														<Loader2 className='mr-2 h-4 w-4 animate-spin' />
														Millorant text pas a pas...
													</>
												) : (
													<>
														<Sparkles className='mr-2 h-4 w-4' />
														Millorar text automàticament
													</>
												)}
											</Button>

											{improvementError && (
												<Alert variant='destructive'>
													<AlertTriangle className='h-4 w-4' />
													<AlertTitle>Error</AlertTitle>
													<AlertDescription>{improvementError}</AlertDescription>
												</Alert>
											)}
										</>
									) : (
										<Alert className='bg-green-50 border-green-200'>
											<CheckCircle2 className='h-4 w-4 text-green-600' />
											<AlertTitle className='text-green-800'>Text millorat correctament</AlertTitle>
											<AlertDescription className='text-green-700'>
												S'han aplicat {improvementResult.totalChanges} canvis en {improvementResult.steps.length} passos. Temps total: {improvementResult.metadata.totalProcessingTimeMs}ms
											</AlertDescription>
										</Alert>
									)}
								</CardContent>
							</Card>

							{/* Improvement results */}
							{improvementResult && (
								<>
									{/* Improved text display */}
									<Card>
										<CardHeader>
											<div className='flex items-center justify-between'>
												<CardTitle>Text Millorat</CardTitle>
												<div className='flex gap-2'>
													<Button variant='outline' size='sm' onClick={handleCopyImprovedText}>
														<Copy className='h-4 w-4 mr-1' />
														Copiar
													</Button>
													<Button size='sm' onClick={handleApplyImprovedText}>
														<ArrowRight className='h-4 w-4 mr-1' />
														Aplicar i revalidar
													</Button>
												</div>
											</div>
											<CardDescription>El text original amb totes les correccions aplicades</CardDescription>
										</CardHeader>
										<CardContent>
											<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
												<p className='whitespace-pre-wrap text-sm'>{improvementResult.improvedText}</p>
											</div>
										</CardContent>
									</Card>

									{/* Step by step changes */}
									<Card>
										<CardHeader>
											<CardTitle>Passos de Millora</CardTitle>
											<CardDescription>Detall de cada categoria de millora aplicada</CardDescription>
										</CardHeader>
										<CardContent className='space-y-4'>
											{improvementResult.steps.map((step, idx) => (
												<Collapsible key={idx} defaultOpen={step.changesApplied > 0}>
													<div className='border rounded-lg'>
														<CollapsibleTrigger className='w-full p-4 flex items-center justify-between hover:bg-muted/50'>
															<div className='flex items-center gap-3'>
																<Badge variant={step.changesApplied > 0 ? "default" : "secondary"}>Pas {idx + 1}</Badge>
																<span className='font-medium capitalize'>{step.category.replace("_", " ")}</span>
																{step.changesApplied > 0 ? (
																	<Badge variant='outline' className='text-green-600'>
																		{step.changesApplied} canvis
																	</Badge>
																) : (
																	<Badge variant='outline' className='text-muted-foreground'>
																		Sense canvis
																	</Badge>
																)}
															</div>
															<div className='flex items-center gap-2 text-muted-foreground text-sm'>
																<span>{step.latencyMs}ms</span>
																<ChevronDown className='h-4 w-4' />
															</div>
														</CollapsibleTrigger>
														<CollapsibleContent>
															{step.changes.length > 0 ? (
																<div className='p-4 pt-0 space-y-3'>
																	{step.changes.map((change, changeIdx) => (
																		<div key={changeIdx} className='bg-muted/30 rounded p-3'>
																			<div className='flex items-start gap-2 mb-2'>
																				<XCircle className='h-4 w-4 text-red-500 mt-0.5 flex-shrink-0' />
																				<span className='text-sm line-through text-muted-foreground'>{change.original}</span>
																			</div>
																			<div className='flex items-start gap-2 mb-2'>
																				<CheckCircle2 className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
																				<span className='text-sm text-green-700 font-medium'>{change.improved}</span>
																			</div>
																			<p className='text-xs text-muted-foreground pl-6'>{change.explanation}</p>
																		</div>
																	))}
																</div>
															) : (
																<div className='p-4 pt-0 text-center text-muted-foreground text-sm'>No s'han trobat problemes d'aquesta categoria</div>
															)}
														</CollapsibleContent>
													</div>
												</Collapsible>
											))}
										</CardContent>
									</Card>

									{/* Summary */}
									<Card>
										<CardHeader>
											<CardTitle>Resum de Millores</CardTitle>
										</CardHeader>
										<CardContent>
											<div className='grid gap-4 md:grid-cols-5'>
												<div className='text-center p-3 bg-muted/50 rounded-lg'>
													<div className='text-2xl font-bold text-blue-600'>{improvementResult.summary.castellanismes || 0}</div>
													<div className='text-xs text-muted-foreground'>Castellanismes</div>
												</div>
												<div className='text-center p-3 bg-muted/50 rounded-lg'>
													<div className='text-2xl font-bold text-purple-600'>{improvementResult.summary.colloquialismes || 0}</div>
													<div className='text-xs text-muted-foreground'>Col·loquialismes</div>
												</div>
												<div className='text-center p-3 bg-muted/50 rounded-lg'>
													<div className='text-2xl font-bold text-orange-600'>{improvementResult.summary.registre || 0}</div>
													<div className='text-xs text-muted-foreground'>Registre</div>
												</div>
												<div className='text-center p-3 bg-muted/50 rounded-lg'>
													<div className='text-2xl font-bold text-teal-600'>{improvementResult.summary.claredat || 0}</div>
													<div className='text-xs text-muted-foreground'>Claredat</div>
												</div>
												<div className='text-center p-3 bg-muted/50 rounded-lg'>
													<div className='text-2xl font-bold text-green-600'>{improvementResult.summary.frases_llargues || 0}</div>
													<div className='text-xs text-muted-foreground'>Frases llargues</div>
												</div>
											</div>

											<div className='mt-4 text-xs text-muted-foreground text-right'>
												Processat el {new Date(improvementResult.metadata.processedAt).toLocaleString("ca-ES")} | Temps total: {improvementResult.metadata.totalProcessingTimeMs}ms | Passos:{" "}
												{improvementResult.metadata.stepsExecuted}
											</div>
										</CardContent>
									</Card>

									{/* Button to retry improvement */}
									<div className='flex justify-center'>
										<Button variant='outline' onClick={() => setImprovementResult(null)}>
											<RotateCcw className='mr-2 h-4 w-4' />
											Tornar a millorar
										</Button>
									</div>
								</>
							)}
						</TabsContent>
					</Tabs>
				)}

				{/* Empty state when no result */}
				{!result && !isLoading && (
					<Card>
						<CardContent className='py-12'>
							<div className='text-center text-muted-foreground'>
								<FileText className='h-16 w-16 mx-auto mb-4 opacity-30' />
								<h3 className='text-lg font-medium mb-2'>Introduïu un text per començar</h3>
								<p className='text-sm max-w-md mx-auto'>La validació d'estil i to analitzarà el vostre text per detectar castellanismes, col·loquialismes, problemes de registre i altres aspectes estilístics.</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</DashboardLayout>
	)
}
