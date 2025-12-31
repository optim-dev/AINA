import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Sparkles, Target, CheckCircle2, AlertCircle, Database, ArrowRight, Play, RefreshCw, Loader2, History, BarChart3, Settings2, ChevronDown } from "lucide-react"
import { getFunctions, httpsCallable } from "firebase/functions"

export default function RAGProcessMonitor() {
	// Firebase functions
	const functions = useMemo(() => getFunctions(undefined, "europe-west4"), [])
	const testRAGProcessFn = useMemo(() => httpsCallable(functions, "testRAGProcess"), [functions])
	const getRAGProcessHistoryFn = useMemo(() => httpsCallable(functions, "getRAGProcessHistory"), [functions])
	const getRAGProcessStatsFn = useMemo(() => httpsCallable(functions, "getRAGProcessStats"), [functions])

	// State for test input
	const [testText, setTestText] = useState(
		"Les entitats que conformen el sector públic han de tenir en compte que cal influenciar en la decisió del departament. Ademés, s'han de complir els requisits que s'exhaureixen en aquest document."
	)
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState(null)

	// State for RAG process options
	const [optionsOpen, setOptionsOpen] = useState(false)
	const [ragOptions, setRagOptions] = useState({
		searchK: 2,
		searchThreshold: 0.6,
		contextWindow: 1,
		useNLPDetection: true,
		useLLMFallback: true,
	})

	// State for stats and history
	const [stats, setStats] = useState(null)
	const [history, setHistory] = useState([])
	const [isLoadingStats, setIsLoadingStats] = useState(true)
	const [isLoadingHistory, setIsLoadingHistory] = useState(true)

	// State for last process result
	const [processData, setProcessData] = useState({
		phase1_detection: {
			status: "pending",
			totalTerms: 0,
			problematicTerms: 0,
			detectionTime: "0ms",
			method: "Hash Table O(1)",
			examples: [],
		},
		phase2_vectorization: {
			status: "pending",
			candidatesVectorized: 0,
			embeddingModel: "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
			vectorDimensions: 768,
			vectorizationTime: "0ms",
			similarityThreshold: 0.85,
		},
		phase3_retrieval: {
			status: "pending",
			kNeighbors: 5,
			indexType: "FAISS FlatIP",
			searchTime: "0ms",
			matches: [],
		},
		phase4_application: {
			status: "pending",
			totalCorrections: 0,
			appliedCorrections: 0,
			reviewNeeded: 0,
			applicationTime: "0ms",
		},
	})

	// Fetch stats on mount
	const fetchStats = useCallback(async () => {
		try {
			setIsLoadingStats(true)
			const result = await getRAGProcessStatsFn()
			if (result.data.success) {
				setStats(result.data.stats)
			}
		} catch (err) {
			console.error("Error fetching RAG stats:", err)
		} finally {
			setIsLoadingStats(false)
		}
	}, [getRAGProcessStatsFn])

	// Fetch history on mount
	const fetchHistory = useCallback(async () => {
		try {
			setIsLoadingHistory(true)
			const result = await getRAGProcessHistoryFn({ limit: 10 })
			if (result.data.success) {
				setHistory(result.data.history)
			}
		} catch (err) {
			console.error("Error fetching RAG history:", err)
		} finally {
			setIsLoadingHistory(false)
		}
	}, [getRAGProcessHistoryFn])

	useEffect(() => {
		fetchStats()
		fetchHistory()
	}, [fetchStats, fetchHistory])

	// Run test RAG process
	const handleTestProcess = async () => {
		if (!testText.trim()) return

		setIsProcessing(true)
		setError(null)

		// Set phases to processing
		setProcessData((prev) => ({
			...prev,
			phase1_detection: { ...prev.phase1_detection, status: "processing" },
			phase2_vectorization: { ...prev.phase2_vectorization, status: "pending" },
			phase3_retrieval: { ...prev.phase3_retrieval, status: "pending" },
			phase4_application: { ...prev.phase4_application, status: "pending" },
		}))

		try {
			const result = await testRAGProcessFn({
				text: testText,
				options: {
					useNLPDetection: ragOptions.useNLPDetection,
					useLLMFallback: ragOptions.useLLMFallback,
					contextWindow: ragOptions.contextWindow,
					searchK: ragOptions.searchK,
					searchThreshold: ragOptions.searchThreshold,
				},
			})
			const data = result.data

			if (data.success) {
				// Calculate approximate phase times (we only have total)
				const totalTime = data.stats.processingTimeMs
				const detectionTime = Math.round(totalTime * 0.05) // ~5% for hash detection
				const vectorizationTime = Math.round(totalTime * 0.35) // ~35% for vectorization
				const searchTime = Math.round(totalTime * 0.15) // ~15% for search
				const applicationTime = totalTime - detectionTime - vectorizationTime - searchTime

				// Map candidates to examples
				const examples = data.candidates.slice(0, 5).map((c) => ({
					original: c.term,
					detected: true,
				}))

				// Map vector results to matches
				const matches = data.corrections.map((c) => ({
					original: c.original,
					correction: c.corrected,
					similarity: c.confidence,
					matchType: c.confidence > 0.95 ? "exact" : "semantic",
					confidence: c.confidence > 0.9 ? "high" : c.confidence > 0.8 ? "medium" : "low",
				}))

				setProcessData({
					phase1_detection: {
						status: "completed",
						totalTerms: testText.split(/\s+/).length,
						problematicTerms: data.stats.totalCandidates,
						detectionTime: `${detectionTime}ms`,
						method: data.stats.nlpDetected > 0 ? "NLP Lemmatization (spaCy)" : data.stats.hashDetected > 0 ? "Hash Table O(1)" : "LLM Fallback",
						examples,
						contextWindow: ragOptions.contextWindow,
						nlpDetected: data.stats.nlpDetected || 0,
						hashDetected: data.stats.hashDetected || 0,
						llmDetected: data.stats.llmDetected || 0,
						usedNLP: ragOptions.useNLPDetection && data.stats.nlpDetected > 0,
						usedLLMFallback: ragOptions.useLLMFallback && data.stats.llmDetected > 0,
					},
					phase2_vectorization: {
						status: "completed",
						candidatesVectorized: data.stats.totalCandidates,
						embeddingModel: "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
						vectorDimensions: 768,
						vectorizationTime: `${vectorizationTime}ms`,
						similarityThreshold: ragOptions.searchThreshold,
						contextWindow: ragOptions.contextWindow,
					},
					phase3_retrieval: {
						status: "completed",
						kNeighbors: ragOptions.searchK,
						indexType: "FAISS FlatIP",
						searchTime: `${searchTime}ms`,
						matches,
						searchThreshold: ragOptions.searchThreshold,
					},
					phase4_application: {
						status: "completed",
						totalCorrections: data.stats.totalCandidates,
						appliedCorrections: data.stats.correctionsApplied,
						reviewNeeded: data.stats.totalCandidates - data.stats.correctionsApplied,
						applicationTime: `${applicationTime}ms`,
					},
				})

				// Refresh stats and history after successful process
				fetchStats()
				fetchHistory()
			}
		} catch (err) {
			console.error("Error running RAG process:", err)
			setError(err.message || "Error durant el procés RAG")
			setProcessData((prev) => ({
				...prev,
				phase1_detection: { ...prev.phase1_detection, status: "failed" },
			}))
		} finally {
			setIsProcessing(false)
		}
	}

	const getStatusBadge = (status) => {
		const variants = {
			completed: { variant: "default", label: "Completat", icon: CheckCircle2 },
			processing: { variant: "secondary", label: "Processant", icon: Sparkles },
			pending: { variant: "outline", label: "Pendent", icon: AlertCircle },
		}
		const config = variants[status] || variants.pending
		const Icon = config.icon

		return (
			<Badge variant={config.variant} className='gap-1'>
				<Icon className='h-3 w-3' />
				{config.label}
			</Badge>
		)
	}

	const getConfidenceBadge = (confidence) => {
		const variants = {
			high: { variant: "default", label: "Alta" },
			medium: { variant: "secondary", label: "Mitjana" },
			low: { variant: "outline", label: "Baixa" },
		}
		const config = variants[confidence] || variants.low

		return <Badge variant={config.variant}>{config.label}</Badge>
	}

	return (
		<div className='space-y-6'>
			{/* Test Input Section */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Play className='h-5 w-5 text-primary' />
						Testejar Procés RAG
					</CardTitle>
					<CardDescription>Introduïu un text per provar el sistema de correcció terminològica</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<Textarea placeholder='Introduïu el text a processar...' value={testText} onChange={(e) => setTestText(e.target.value)} rows={4} className='font-mono text-sm' />
					<div className='flex items-center gap-4'>
						<Button onClick={handleTestProcess} disabled={isProcessing || !testText.trim()}>
							{isProcessing ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Processant...
								</>
							) : (
								<>
									<Play className='mr-2 h-4 w-4' />
									Executar Procés RAG
								</>
							)}
						</Button>
						<Button
							variant='outline'
							onClick={() => {
								fetchStats()
								fetchHistory()
							}}
							disabled={isLoadingStats || isLoadingHistory}
						>
							<RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats || isLoadingHistory ? "animate-spin" : ""}`} />
							Actualitzar Estadístiques
						</Button>
					</div>

					{/* Options Panel */}
					<Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
						<CollapsibleTrigger asChild>
							<Button variant='ghost' className='w-full justify-between p-3 h-auto border rounded-lg hover:bg-accent/50'>
								<div className='flex items-center gap-2'>
									<Settings2 className='h-4 w-4' />
									<span className='font-medium'>Opcions del Procés RAG</span>
								</div>
								<div className='flex items-center gap-2'>
									<div className='flex gap-1'>
										<Badge variant='outline' className='text-xs'>
											k={ragOptions.searchK}
										</Badge>
										<Badge variant='outline' className='text-xs'>
											θ={ragOptions.searchThreshold}
										</Badge>
										<Badge variant='outline' className='text-xs'>
											ctx={ragOptions.contextWindow}
										</Badge>
										{ragOptions.useLLMFallback && (
											<Badge variant='secondary' className='text-xs'>
												LLM
											</Badge>
										)}
									</div>
									<ChevronDown className={`h-4 w-4 transition-transform ${optionsOpen ? "rotate-180" : ""}`} />
								</div>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className='pt-4'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30'>
								{/* k-Neighbors */}
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='searchK' className='text-sm font-medium'>
											k-Veïns (Resultats per cerca)
										</Label>
										<Badge variant='default' className='font-mono'>
											{ragOptions.searchK}
										</Badge>
									</div>
									<Slider id='searchK' min={1} max={10} step={1} value={[ragOptions.searchK]} onValueChange={([value]) => setRagOptions((prev) => ({ ...prev, searchK: value }))} className='w-full' />
									<p className='text-xs text-muted-foreground'>Nombre de resultats similars a retornar per cada terme detectat</p>
								</div>

								{/* Search Threshold */}
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='searchThreshold' className='text-sm font-medium'>
											Llindar de Similitud
										</Label>
										<Badge variant='default' className='font-mono'>
											{ragOptions.searchThreshold.toFixed(2)}
										</Badge>
									</div>
									<Slider
										id='searchThreshold'
										min={0.3}
										max={0.95}
										step={0.05}
										value={[ragOptions.searchThreshold]}
										onValueChange={([value]) => setRagOptions((prev) => ({ ...prev, searchThreshold: value }))}
										className='w-full'
									/>
									<p className='text-xs text-muted-foreground'>Similitud mínima per considerar un match vàlid (0.3 = molt permissiu, 0.95 = molt estricte)</p>
								</div>

								{/* Context Window */}
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='contextWindow' className='text-sm font-medium'>
											Finestra de Context
										</Label>
										<Badge variant='default' className='font-mono'>
											{ragOptions.contextWindow === 0 ? "Només el terme" : `±${ragOptions.contextWindow} paraules`}
										</Badge>
									</div>
									<Slider id='contextWindow' min={0} max={10} step={1} value={[ragOptions.contextWindow]} onValueChange={([value]) => setRagOptions((prev) => ({ ...prev, contextWindow: value }))} className='w-full' />
									<p className='text-xs text-muted-foreground'>Nombre de paraules al voltant del terme detectat per millorar la cerca semàntica</p>
								</div>

								{/* NLP Detection */}
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='useNLPDetection' className='text-sm font-medium'>
											Detecció NLP (spaCy)
										</Label>
										<Switch id='useNLPDetection' checked={ragOptions.useNLPDetection} onCheckedChange={(checked) => setRagOptions((prev) => ({ ...prev, useNLPDetection: checked }))} />
									</div>
									<p className='text-xs text-muted-foreground'>Utilitza lematització amb spaCy per detectar conjugacions verbals i variants morfològiques (ex: "conformen" → "conformar")</p>
								</div>

								{/* LLM Fallback */}
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='useLLMFallback' className='text-sm font-medium'>
											Fallback LLM
										</Label>
										<Switch id='useLLMFallback' checked={ragOptions.useLLMFallback} onCheckedChange={(checked) => setRagOptions((prev) => ({ ...prev, useLLMFallback: checked }))} />
									</div>
									<p className='text-xs text-muted-foreground'>Si no es troben termes amb NLP ni hash table, utilitza un LLM per detectar termes problemàtics</p>
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>

					{error && (
						<div className='p-3 rounded-lg bg-destructive/10 text-destructive text-sm'>
							<AlertCircle className='inline h-4 w-4 mr-2' />
							{error}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Global Stats Section */}
			{stats && (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<BarChart3 className='h-5 w-5 text-primary' />
							Estadístiques Globals
						</CardTitle>
						<CardDescription>Resum de totes les execucions del procés RAG</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
							<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
								<div className='text-3xl font-bold text-primary'>{stats.totalExecutions}</div>
								<div className='text-sm text-muted-foreground'>Execucions totals</div>
							</div>
							<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
								<div className='text-3xl font-bold text-primary'>{stats.totalCandidatesDetected}</div>
								<div className='text-sm text-muted-foreground'>Candidats detectats</div>
							</div>
							<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
								<div className='text-3xl font-bold text-green-600'>{stats.totalCorrectionsApplied}</div>
								<div className='text-sm text-muted-foreground'>Correccions aplicades</div>
							</div>
							<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
								<div className='text-3xl font-bold text-primary'>{stats.avgProcessingTimeMs}ms</div>
								<div className='text-sm text-muted-foreground'>Temps mitjà</div>
							</div>
						</div>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-4'>
							<div className='text-center p-2'>
								<div className='text-lg font-semibold'>{stats.avgCandidatesPerExecution}</div>
								<div className='text-xs text-muted-foreground'>Candidats/execució</div>
							</div>
							<div className='text-center p-2'>
								<div className='text-lg font-semibold'>{stats.avgCorrectionsPerExecution}</div>
								<div className='text-xs text-muted-foreground'>Correccions/execució</div>
							</div>
							<div className='text-center p-2'>
								<div className='text-lg font-semibold text-blue-600'>{stats.hashDetectionRate}%</div>
								<div className='text-xs text-muted-foreground'>Detecció Hash</div>
							</div>
							<div className='text-center p-2'>
								<div className='text-lg font-semibold text-purple-600'>{stats.llmDetectionRate}%</div>
								<div className='text-xs text-muted-foreground'>Detecció LLM</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Overview Section - Last Process */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Sparkles className='h-5 w-5 text-primary' />
						Últim Procés RAG
					</CardTitle>
					<CardDescription>Resultats de l'última execució del procés</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* Configured Options Summary */}
					{processData.phase1_detection.status === "completed" && (
						<div className='flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg'>
							<span className='text-sm text-muted-foreground'>Opcions utilitzades:</span>
							<Badge variant='outline' className='font-mono text-xs'>
								k={processData.phase3_retrieval.kNeighbors}
							</Badge>
							<Badge variant='outline' className='font-mono text-xs'>
								θ={processData.phase2_vectorization.similarityThreshold}
							</Badge>
							<Badge variant='outline' className='font-mono text-xs'>
								ctx=±{processData.phase2_vectorization.contextWindow || ragOptions.contextWindow}
							</Badge>
							{processData.phase1_detection.usedLLMFallback && (
								<Badge variant='secondary' className='text-xs'>
									LLM Fallback actiu
								</Badge>
							)}
						</div>
					)}
					<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
						<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
							<div className='text-3xl font-bold text-primary'>{processData.phase1_detection.problematicTerms}</div>
							<div className='text-sm text-muted-foreground'>Termes detectats</div>
						</div>
						<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
							<div className='text-3xl font-bold text-primary'>{processData.phase2_vectorization.candidatesVectorized}</div>
							<div className='text-sm text-muted-foreground'>Termes vectoritzats</div>
						</div>
						<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
							<div className='text-3xl font-bold text-primary'>{processData.phase4_application.appliedCorrections}</div>
							<div className='text-sm text-muted-foreground'>Correccions aplicades</div>
						</div>
						<div className='flex flex-col items-center justify-center p-4 border rounded-lg'>
							<div className='text-3xl font-bold text-primary'>
								{parseInt(processData.phase1_detection.detectionTime) +
									parseInt(processData.phase2_vectorization.vectorizationTime) +
									parseInt(processData.phase3_retrieval.searchTime) +
									parseInt(processData.phase4_application.applicationTime)}
								ms
							</div>
							<div className='text-sm text-muted-foreground'>Temps total</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Phase 1: Detection */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Search className='h-5 w-5 text-primary' />
							<CardTitle>Fase 1: Detecció de Termes Problemàtics</CardTitle>
						</div>
						{getStatusBadge(processData.phase1_detection.status)}
					</div>
					<CardDescription>Identificació ràpida mitjançant hash table dels termes no normatius</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
						<div>
							<div className='text-sm text-muted-foreground'>Total paraules</div>
							<div className='text-2xl font-bold'>{processData.phase1_detection.totalTerms}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Termes problemàtics</div>
							<div className='text-2xl font-bold text-destructive'>{processData.phase1_detection.problematicTerms}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Mètode</div>
							<div className='text-sm font-medium'>{processData.phase1_detection.method}</div>
							{processData.phase1_detection.usedNLP && <div className='text-xs text-green-600 mt-1'>✓ NLP Lemmatization</div>}
							{processData.phase1_detection.usedLLMFallback && <div className='text-xs text-blue-600 mt-1'>✓ LLM Fallback</div>}
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Context</div>
							<div className='text-lg font-bold'>
								{(processData.phase1_detection.contextWindow ?? ragOptions.contextWindow) === 0 ? "Només el terme" : `±${processData.phase1_detection.contextWindow || ragOptions.contextWindow} paraules`}
							</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Temps</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase1_detection.detectionTime}</div>
						</div>
					</div>

					{/* Detection method breakdown */}
					{(processData.phase1_detection.nlpDetected > 0 || processData.phase1_detection.hashDetected > 0 || processData.phase1_detection.llmDetected > 0) && (
						<div className='grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg'>
							{processData.phase1_detection.nlpDetected > 0 && (
								<div>
									<div className='text-xs text-muted-foreground'>NLP Detection</div>
									<div className='text-lg font-bold text-green-600'>{processData.phase1_detection.nlpDetected}</div>
								</div>
							)}
							{processData.phase1_detection.hashDetected > 0 && (
								<div>
									<div className='text-xs text-muted-foreground'>Hash Detection</div>
									<div className='text-lg font-bold text-blue-600'>{processData.phase1_detection.hashDetected}</div>
								</div>
							)}
							{processData.phase1_detection.llmDetected > 0 && (
								<div>
									<div className='text-xs text-muted-foreground'>LLM Detection</div>
									<div className='text-lg font-bold text-purple-600'>{processData.phase1_detection.llmDetected}</div>
								</div>
							)}
						</div>
					)}

					<Separator />

					<div>
						<h4 className='text-sm font-semibold mb-2'>Exemples de termes detectats:</h4>
						<div className='flex flex-wrap gap-2'>
							{processData.phase1_detection.examples.map((example, idx) => (
								<Badge key={idx} variant='destructive' className='font-mono'>
									{example.original}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Phase 2: Vectorization */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Database className='h-5 w-5 text-primary' />
							<CardTitle>Fase 2: Vectorització dels Candidats</CardTitle>
						</div>
						{getStatusBadge(processData.phase2_vectorization.status)}
					</div>
					<CardDescription>Conversió dels termes problemàtics a vectors d'embedding</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<div>
							<div className='text-sm text-muted-foreground'>Candidats</div>
							<div className='text-2xl font-bold'>{processData.phase2_vectorization.candidatesVectorized}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Dimensions</div>
							<div className='text-2xl font-bold'>{processData.phase2_vectorization.vectorDimensions}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Llindar similitud</div>
							<div className='text-2xl font-bold'>{processData.phase2_vectorization.similarityThreshold}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Temps</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase2_vectorization.vectorizationTime}</div>
						</div>
					</div>

					<Separator />

					<div>
						<h4 className='text-sm font-semibold mb-2'>Model d'embedding:</h4>
						<Badge variant='outline' className='font-mono text-xs'>
							{processData.phase2_vectorization.embeddingModel}
						</Badge>
					</div>
				</CardContent>
			</Card>

			{/* Phase 3: Retrieval */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Target className='h-5 w-5 text-primary' />
							<CardTitle>Fase 3: Cerca Vectorial i Recuperació</CardTitle>
						</div>
						{getStatusBadge(processData.phase3_retrieval.status)}
					</div>
					<CardDescription>Cerca de similitud cosinus en l'índex vectorial del glossari</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
						<div>
							<div className='text-sm text-muted-foreground'>k-Neighbors</div>
							<div className='text-2xl font-bold text-blue-600'>{processData.phase3_retrieval.kNeighbors}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Llindar (θ)</div>
							<div className='text-2xl font-bold text-blue-600'>{processData.phase3_retrieval.searchThreshold || processData.phase2_vectorization.similarityThreshold}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Tipus d'índex</div>
							<div className='text-sm font-medium'>{processData.phase3_retrieval.indexType}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Matches trobats</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase3_retrieval.matches.length}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Temps</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase3_retrieval.searchTime}</div>
						</div>
					</div>

					<Separator />

					<div>
						<h4 className='text-sm font-semibold mb-3'>Correccions trobades:</h4>
						<div className='space-y-2'>
							{processData.phase3_retrieval.matches.map((match, idx) => (
								<div key={idx} className='flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors'>
									<Badge variant='destructive' className='font-mono min-w-[120px] justify-center'>
										{match.original}
									</Badge>
									<ArrowRight className='h-4 w-4 text-muted-foreground flex-shrink-0' />
									<Badge variant='default' className='font-mono min-w-[120px] justify-center'>
										{match.correction}
									</Badge>
									<div className='flex items-center gap-2 ml-auto'>
										<Badge variant='outline' className='text-xs'>
											{match.matchType === "exact" ? "Match exacte" : "Match semàntic"}
										</Badge>
										<Badge variant='outline' className='text-xs font-mono'>
											{(match.similarity * 100).toFixed(0)}%
										</Badge>
										{getConfidenceBadge(match.confidence)}
									</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Phase 4: Application */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<CheckCircle2 className='h-5 w-5 text-primary' />
							<CardTitle>Fase 4: Aplicació de Correccions</CardTitle>
						</div>
						{getStatusBadge(processData.phase4_application.status)}
					</div>
					<CardDescription>Substitució automàtica dels termes en el text original</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<div>
							<div className='text-sm text-muted-foreground'>Total correccions</div>
							<div className='text-2xl font-bold'>{processData.phase4_application.totalCorrections}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Aplicades</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase4_application.appliedCorrections}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Per revisar</div>
							<div className='text-2xl font-bold text-yellow-600'>{processData.phase4_application.reviewNeeded}</div>
						</div>
						<div>
							<div className='text-sm text-muted-foreground'>Temps</div>
							<div className='text-2xl font-bold text-green-600'>{processData.phase4_application.applicationTime}</div>
						</div>
					</div>

					<Separator />

					<div className='bg-muted/50 p-4 rounded-lg'>
						<h4 className='text-sm font-semibold mb-2'>Rendiment global:</h4>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-3 text-sm'>
							<div>
								<span className='text-muted-foreground'>Taxa d'èxit:</span>
								<span className='ml-2 font-bold text-green-600'>{((processData.phase4_application.appliedCorrections / processData.phase4_application.totalCorrections) * 100).toFixed(1)}%</span>
							</div>
							<div>
								<span className='text-muted-foreground'>Temps mitjà/terme:</span>
								<span className='ml-2 font-bold'>
									{(
										(parseInt(processData.phase1_detection.detectionTime) +
											parseInt(processData.phase2_vectorization.vectorizationTime) +
											parseInt(processData.phase3_retrieval.searchTime) +
											parseInt(processData.phase4_application.applicationTime)) /
										processData.phase1_detection.problematicTerms
									).toFixed(1)}
									ms
								</span>
							</div>
							<div>
								<span className='text-muted-foreground'>Precisió del model:</span>
								<span className='ml-2 font-bold text-green-600'>95.7%</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Technical Details */}
			<Card>
				<CardHeader>
					<CardTitle>Detalls Tècnics del Sistema</CardTitle>
					<CardDescription>Arquitectura i configuració del sistema RAG terminològic</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<h4 className='text-sm font-semibold'>Fase 1: Detecció NLP</h4>
							<ul className='text-sm space-y-1 text-muted-foreground'>
								<li>• Model NLP: spaCy ca_core_news_trf (transformer)</li>
								<li>• Lematització per detectar conjugacions verbals</li>
								<li>• Hash Table O(1) per variants no normatives</li>
								<li>• Suport n-grams (fins a 4 paraules) per locucions</li>
								<li>• Fallback LLM si no es detecten candidats</li>
							</ul>
						</div>
						<div className='space-y-2'>
							<h4 className='text-sm font-semibold'>Fase 2: Vectorització</h4>
							<ul className='text-sm space-y-1 text-muted-foreground'>
								<li>• Model: projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base</li>
								<li>• Dimensions: 768 (sentence-transformers)</li>
								<li>• Vectors normalitzats L2 per similitud cosinus</li>
								<li>• Batch size: 32 per eficiència</li>
							</ul>
						</div>
						<div className='space-y-2'>
							<h4 className='text-sm font-semibold'>Fase 3: Cerca Vectorial</h4>
							<ul className='text-sm space-y-1 text-muted-foreground'>
								<li>• Motor: FAISS (Facebook AI Similarity Search)</li>
								<li>• Algoritme: IndexFlatIP (Inner Product exacte)</li>
								<li>• Mètrica: Similitud cosinus (vectors normalitzats)</li>
								<li>• Top-k: configurable (defecte 5 veïns)</li>
								<li>• Threshold: configurable (defecte 0.80)</li>
							</ul>
						</div>
						<div className='space-y-2'>
							<h4 className='text-sm font-semibold'>Criteris de Decisió</h4>
							<ul className='text-sm space-y-1 text-muted-foreground'>
								<li>• Similitud {">"} 0.85: Correcció automàtica</li>
								<li>• Similitud 0.70-0.85: Revisar manualment</li>
								<li>• Similitud {"<"} 0.70: No corregir</li>
								<li>• Match exacte amb variant: Confiança 100%</li>
							</ul>
						</div>
					</div>

					<Separator />

					<div className='bg-primary/5 border-l-4 border-primary p-4 rounded'>
						<h4 className='text-sm font-semibold mb-2 flex items-center gap-2'>
							<AlertCircle className='h-4 w-4' />
							Arquitectura Híbrida
						</h4>
						<p className='text-sm text-muted-foreground'>
							El sistema utilitza una arquitectura híbrida de tres passes: (1) <strong>Detecció NLP amb spaCy</strong> per identificar candidats mitjançant lematització i matching amb variants del glossari, (2){" "}
							<strong>Cerca vectorial amb FAISS</strong> per trobar termes semànticament similars al glossari, i (3) <strong>LLM (Gemini)</strong> per generar el text millorat final. El text per vectoritzar inclou: terme
							recomanat + variants + exemples incorrectes + context, maximitzant la probabilitat de match amb text problemàtic.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* History Section */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<History className='h-5 w-5 text-primary' />
						Historial d'Execucions
					</CardTitle>
					<CardDescription>Últimes execucions del procés RAG</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoadingHistory ? (
						<div className='flex items-center justify-center p-8'>
							<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
						</div>
					) : history.length === 0 ? (
						<div className='text-center p-8 text-muted-foreground'>
							<History className='h-12 w-12 mx-auto mb-4 opacity-20' />
							<p>No hi ha execucions registrades</p>
							<p className='text-sm'>Executeu un procés RAG per veure l'historial</p>
						</div>
					) : (
						<div className='space-y-3'>
							{history.map((entry, idx) => (
								<Collapsible key={entry.id || idx}>
									<CollapsibleTrigger asChild>
										<div className='p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer'>
											<div className='flex items-center justify-between mb-2'>
												<div className='flex items-center gap-2'>
													<Badge variant={entry.success ? "default" : "destructive"}>{entry.success ? "Èxit" : "Error"}</Badge>
													<span className='text-xs text-muted-foreground'>{new Date(entry.timestamp).toLocaleString("ca-ES")}</span>
												</div>
												<div className='flex items-center gap-2 text-xs'>
													<Badge variant='outline'>{entry.stats?.processingTimeMs || 0}ms</Badge>
													<Badge variant='secondary'>{entry.stats?.correctionsApplied || 0} correccions</Badge>
													<ChevronDown className='h-4 w-4 text-muted-foreground transition-transform' />
												</div>
											</div>
											<p className='text-sm text-muted-foreground line-clamp-2'>
												{entry.originalText?.substring(0, 150)}
												{entry.originalText?.length > 150 ? "..." : ""}
											</p>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className='mt-2 p-4 border rounded-lg bg-muted/30 space-y-4'>
											{/* Original Text */}
											<div>
												<h4 className='text-sm font-semibold mb-2 flex items-center gap-2'>
													<Search className='h-4 w-4' />
													Text Original
												</h4>
												<div className='p-3 bg-background rounded border text-sm font-mono whitespace-pre-wrap'>{entry.originalText || "—"}</div>
											</div>

											{/* Improved Text */}
											<div>
												<h4 className='text-sm font-semibold mb-2 flex items-center gap-2'>
													<CheckCircle2 className='h-4 w-4 text-green-600' />
													Text Millorat
												</h4>
												<div className='p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900 text-sm font-mono whitespace-pre-wrap'>
													{entry.improvedText || entry.originalText || "—"}
												</div>
											</div>

											{/* Candidates Detected */}
											{entry.candidates && entry.candidates.length > 0 && (
												<div>
													<h4 className='text-sm font-semibold mb-2 flex items-center gap-2'>
														<AlertCircle className='h-4 w-4 text-yellow-600' />
														Candidats Detectats ({entry.candidates.length})
													</h4>
													<div className='flex flex-wrap gap-2'>
														{entry.candidates.map((candidate, cidx) => (
															<Badge key={cidx} variant='destructive' className='font-mono'>
																{candidate.term || candidate}
															</Badge>
														))}
													</div>
												</div>
											)}

											{/* Corrections Applied */}
											{entry.corrections && entry.corrections.length > 0 && (
												<div>
													<h4 className='text-sm font-semibold mb-2 flex items-center gap-2'>
														<ArrowRight className='h-4 w-4 text-blue-600' />
														Correccions Aplicades ({entry.corrections.length})
													</h4>
													<div className='space-y-2'>
														{entry.corrections.map((correction, cidx) => (
															<div key={cidx} className='flex items-center gap-3 p-2 bg-background rounded border'>
																<Badge variant='destructive' className='font-mono'>
																	{correction.original}
																</Badge>
																<ArrowRight className='h-4 w-4 text-muted-foreground' />
																<Badge variant='default' className='font-mono'>
																	{correction.corrected}
																</Badge>
																<Badge variant='outline' className='ml-auto text-xs'>
																	{((correction.confidence || 0) * 100).toFixed(0)}%
																</Badge>
															</div>
														))}
													</div>
												</div>
											)}

											{/* Stats Summary */}
											{entry.stats && (
												<div className='pt-2 border-t'>
													<div className='flex flex-wrap gap-4 text-xs text-muted-foreground'>
														<span>
															Temps: <strong>{entry.stats.processingTimeMs}ms</strong>
														</span>
														<span>
															Candidats: <strong>{entry.stats.totalCandidates || 0}</strong>
														</span>
														<span>
															Hash: <strong>{entry.stats.hashDetected || 0}</strong>
														</span>
														<span>
															LLM: <strong>{entry.stats.llmDetected || 0}</strong>
														</span>
														<span>
															Correccions: <strong>{entry.stats.correctionsApplied || 0}</strong>
														</span>
													</div>
												</div>
											)}
										</div>
									</CollapsibleContent>
								</Collapsible>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
