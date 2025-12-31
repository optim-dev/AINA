import React, { useMemo } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
	BarChart3,
	TrendingUp,
	Clock,
	CheckCircle,
	Target,
	BookCheck,
	Type,
	Palette,
	MessageCircle,
	ThumbsUp,
	Star,
	AlertCircle,
	CheckCircle2,
	BookOpen,
	Database,
	Users,
	Loader2,
	RefreshCw,
	Search,
	Sparkles,
} from "lucide-react"
import { useKitMetricsForDashboard } from "../hooks/useKitMetrics"
import { useMetricsForDashboard } from "@/hooks/useMetrics"
import { useSettingsStore } from "@/stores/settingsStore"

export default function Metriques() {
	// Get the currently selected model from settings
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// Filter metrics for the kit module and current model
	const filters = useMemo(() => ({ module: "kit", model: selectedModel }), [selectedModel])

	// Fetch LLM metrics from BigQuery (for token usage and costs)
	const { aggregatedMetrics, loading: llmLoading, error: llmError, refetch: refetchLLM } = useMetricsForDashboard(filters)

	// Fetch Kit-specific metrics (LanguageTool, StyleTone, RAG)
	const { mainMetrics, additionalMetrics, llmMetrics, languageTool, styleTone, ragProcess, loading: kitLoading, error: kitError, refetch: refetchKit } = useKitMetricsForDashboard({ days: 30 })

	// Combined loading and error states
	const loading = llmLoading || kitLoading
	const error = llmError || kitError

	// Combined refetch
	const refetch = () => {
		refetchLLM()
		refetchKit()
	}

	// Calculate derived metrics (handle division by zero)
	const taxaExit = aggregatedMetrics.peticionsTotals > 0 ? ((aggregatedMetrics.petitionsExitoses / aggregatedMetrics.peticionsTotals) * 100).toFixed(2) : "0.00"
	const costPerPeticio = aggregatedMetrics.peticionsTotals > 0 ? (aggregatedMetrics.costTotal / aggregatedMetrics.peticionsTotals).toFixed(4) : "0.0000"

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<div className='flex items-center gap-3'>
						<h1 className='text-3xl font-bold tracking-tight'>Mètriques - Kit Lingüístic</h1>
						{loading && <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />}
						<button onClick={() => refetch()} className='p-1 hover:bg-muted rounded-md transition-colors' title='Actualitzar mètriques'>
							<RefreshCw className='h-4 w-4 text-muted-foreground hover:text-foreground' />
						</button>
					</div>
					<p className='text-muted-foreground mt-2'>Estadístiques i indicadors de rendiment del mòdul</p>
					{error && (
						<div className='flex items-center gap-2 mt-2 text-destructive text-sm'>
							<AlertCircle className='h-4 w-4' />
							<span>Error carregant mètriques: {error.message}</span>
						</div>
					)}
				</div>

				<Tabs defaultValue='metrics' className='w-full'>
					<TabsList>
						<TabsTrigger value='metrics'>Mètriques Principals</TabsTrigger>
						<TabsTrigger value='additional'>Mètriques Addicionals</TabsTrigger>
						<TabsTrigger value='llm'>Mètriques LLM</TabsTrigger>
					</TabsList>

					<TabsContent value='metrics' className='space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Taxa Correcció Terminològica</CardTitle>
									<BookCheck className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{mainMetrics.terminologyCorrectionRate}%</div>
									<p className='text-xs text-muted-foreground'>{ragProcess ? `${ragProcess.totalCorrectionsApplied.toLocaleString()} correccions aplicades` : "Objectiu: >98%"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Precisió Ortogràfica</CardTitle>
									<Type className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{mainMetrics.orthographyPrecision}%</div>
									<p className='text-xs text-muted-foreground'>{languageTool ? `${languageTool.totalErrorsDetected.toLocaleString()} errors detectats` : "Objectiu: >98%"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Coherència d'Estil</CardTitle>
									<Target className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{mainMetrics.terminologyCoherence}%</div>
									<p className='text-xs text-muted-foreground'>{styleTone ? `${styleTone.totalValidations.toLocaleString()} validacions` : "Objectiu: >95%"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Adequació d'Estil</CardTitle>
									<Palette className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{mainMetrics.styleAdequacy}/5</div>
									<p className='text-xs text-muted-foreground'>{styleTone ? `Puntuació global: ${styleTone.avgOverallScore.toFixed(0)}%` : "Objectiu: >4/5"}</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Taula de Mètriques Clau</CardTitle>
								<CardDescription>Indicadors de qualitat lingüística amb objectius i mesuraments</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='border-b'>
												<th className='text-left py-3 px-2 font-semibold'>Mètrica</th>
												<th className='text-left py-3 px-2 font-semibold'>Objectiu</th>
												<th className='text-left py-3 px-2 font-semibold'>Mesurament</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											<tr>
												<td className='py-3 px-2'>Taxa de correcció terminològica</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;98%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>% de termes inadequats correctament identificats i reemplaçats</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Precisió ortogràfica</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;98%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Errors detectats / total</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Coherència terminològica</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;95%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Termes correctes / total</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Adequació d'estil</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;4/5</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Valoració d'usuari</td>
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='additional' className='space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Consistència de To</CardTitle>
									<MessageCircle className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.toneConsistency}%</div>
									<p className='text-xs text-muted-foreground'>Objectiu: &gt;90%</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Satisfacció Qualitat Lingüística</CardTitle>
									<Star className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.satisfactionScore}</div>
									<p className='text-xs text-muted-foreground'>Objectiu: &gt;4.2/5</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Feedback Usuaris</CardTitle>
									<ThumbsUp className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.feedbackScore}</div>
									<p className='text-xs text-muted-foreground'>Tendència mensual</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Errors Lingüístics Detectats</CardTitle>
									<AlertCircle className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.errorsDetected}</div>
									<p className='text-xs text-muted-foreground'>Total detectat (30 dies)</p>
								</CardContent>
							</Card>
						</div>

						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Correccions Automàtiques</CardTitle>
									<CheckCircle2 className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.autoCorrections}</div>
									<p className='text-xs text-muted-foreground'>% aplicades per execució</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Mètode Detecció NLP</CardTitle>
									<Search className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{ragProcess ? `${ragProcess.nlpDetectionRate}%` : "-"}</div>
									<p className='text-xs text-muted-foreground'>vs Hash: {ragProcess ? `${ragProcess.hashDetectionRate}%` : "-"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>LLM Fallback</CardTitle>
									<Sparkles className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{ragProcess ? `${ragProcess.llmDetectionRate}%` : "-"}</div>
									<p className='text-xs text-muted-foreground'>Deteccions via LLM</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Feedback Processat (RLHF)</CardTitle>
									<Users className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{additionalMetrics.rlhfFeedback}</div>
									<p className='text-xs text-muted-foreground'>Cicle RLHF</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Taula de Mètriques Addicionals</CardTitle>
								<CardDescription>Indicadors complementaris de qualitat lingüística</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='border-b'>
												<th className='text-left py-3 px-2 font-semibold'>Mètrica</th>
												<th className='text-left py-3 px-2 font-semibold'>Objectiu</th>
												<th className='text-left py-3 px-2 font-semibold'>Mesurament</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											<tr>
												<td className='py-3 px-2'>Consistència de to</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;90%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Anàlisi automàtica</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Satisfacció amb qualitat lingüística</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;4.2/5</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Feedback d'usuaris</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Puntuació feedback usuaris (👍/👎)</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Tendència positiva mensual</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Vots agregats d'usuaris</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Errors lingüístics detectats</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Monitorització contínua</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Comptador total d'errors detectats</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Correccions aplicades automàticament</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;85%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Percentatge de correccions automàtiques</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Freqüència d'actualitzacions del glossari</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Setmanal</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Actualitzacions periòdiques del glossari</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Events de reindexació exitosa (Vector DB)</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;99%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Taxa d'èxit de reindexació a la base de dades vectorial</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Feedback humà processat (RLHF)</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Cicle continu</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Feedback processat en el cicle RLHF</td>
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='llm' className='space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Tokens d'Entrada</CardTitle>
									<TrendingUp className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.tokensEntrada.toLocaleString()}</div>
									<p className='text-xs text-muted-foreground'>Total tokens processats</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Tokens de Sortida</CardTitle>
									<TrendingUp className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.tokensSortida.toLocaleString()}</div>
									<p className='text-xs text-muted-foreground'>Total tokens generats</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Temps Mitjà Resposta</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.tempsMitjaResposta.toFixed(2)}s</div>
									<p className='text-xs text-muted-foreground'>Segons per petició</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Taxa d'Èxit</CardTitle>
									<CheckCircle className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{taxaExit}%</div>
									<p className='text-xs text-muted-foreground'>Objectiu: &gt;99%</p>
								</CardContent>
							</Card>
						</div>

						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Cost per Petició</CardTitle>
									<BarChart3 className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{costPerPeticio}€</div>
									<p className='text-xs text-muted-foreground'>Cost mitjà en crèdits</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Latència P95</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.latenciaP95.toFixed(2)}s</div>
									<p className='text-xs text-muted-foreground'>95è percentil</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Peticions Totals</CardTitle>
									<Target className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.peticionsTotals.toLocaleString()}</div>
									<p className='text-xs text-muted-foreground'>Volum de peticions</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Taula de Mètriques LLM</CardTitle>
								<CardDescription>Indicadors de rendiment i ús del model de llenguatge</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='border-b'>
												<th className='text-left py-3 px-2 font-semibold'>Mètrica</th>
												<th className='text-left py-3 px-2 font-semibold'>Objectiu</th>
												<th className='text-left py-3 px-2 font-semibold'>Mesurament</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											<tr>
												<td className='py-3 px-2'>Tokens d'entrada mitjans</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Monitorització</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Mitjana de tokens processats per petició</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Tokens de sortida mitjans</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Monitorització</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Mitjana de tokens generats per resposta</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Temps de resposta mitjà</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&lt;3s</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Temps mitjà de processament per petició</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Latència P95</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&lt;5s</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>95è percentil de latència</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Taxa d'èxit</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;99%</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Percentatge de peticions exitoses</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Cost per petició</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Optimització contínua</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Cost mitjà en crèdits API</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Throughput</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>&gt;100 req/min</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Peticions processades per minut</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Ràtio tokens entrada/sortida</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Monitorització</Badge>
												</td>
												<td className='py-3 px-2 text-muted-foreground'>Proporció entre tokens d'entrada i sortida</td>
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
