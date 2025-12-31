import React, { useState, useMemo } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Clock, CheckCircle, Target, Cpu, Filter, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { AINA_MODULES, LLM_MODELS, MODULE_LABELS, MODEL_LABELS } from "@/modules/shared/types"
import { useMetricsForDashboard } from "@/hooks/useMetrics"

/** @typedef {import("@/modules/shared/types").AinaModule} AinaModule */
/** @typedef {import("@/modules/shared/types").LLMModel} LLMModel */

export default function ModelMetriques() {
	const [selectedModuleFilter, setSelectedModuleFilter] = useState("all")
	const [selectedModelFilter, setSelectedModelFilter] = useState("all")

	// Build filters based on selection
	const filters = useMemo(() => {
		const f = {}
		if (selectedModuleFilter !== "all") {
			f.module = selectedModuleFilter
		}
		if (selectedModelFilter !== "all") {
			f.model = selectedModelFilter
		}
		return f
	}, [selectedModuleFilter, selectedModelFilter])

	// Fetch metrics from BigQuery
	const { metricsByModel, aggregatedMetrics, topPerformers, loading, error, refetch } = useMetricsForDashboard(filters)

	// Calculate derived metrics (handle division by zero)
	const taxaExit = aggregatedMetrics.peticionsTotals > 0 ? ((aggregatedMetrics.petitionsExitoses / aggregatedMetrics.peticionsTotals) * 100).toFixed(2) : "0.00"
	const tokensEntradaMitjans = aggregatedMetrics.peticionsTotals > 0 ? Math.round(aggregatedMetrics.tokensEntrada / aggregatedMetrics.peticionsTotals) : 0
	const tokensSortidaMitjans = aggregatedMetrics.peticionsTotals > 0 ? Math.round(aggregatedMetrics.tokensSortida / aggregatedMetrics.peticionsTotals) : 0
	const costPerPeticio = aggregatedMetrics.peticionsTotals > 0 ? (aggregatedMetrics.costTotal / aggregatedMetrics.peticionsTotals).toFixed(4) : "0.0000"
	const ratioTokens = aggregatedMetrics.tokensEntrada > 0 ? (aggregatedMetrics.tokensSortida / aggregatedMetrics.tokensEntrada).toFixed(2) : "0.00"

	/** @param {AinaModule | "all"} filter */
	const getFilterLabel = (filter) => MODULE_LABELS[filter]

	/** @param {LLMModel | "all"} model */
	const getModelLabel = (model) => MODEL_LABELS[model]

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div className='flex justify-between items-start'>
					<div>
						<div className='flex items-center gap-3'>
							<h1 className='text-3xl font-bold tracking-tight'>Mètriques Globals LLM</h1>
							{loading && <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />}
							<button onClick={() => refetch()} className='p-1 hover:bg-muted rounded-md transition-colors' title='Actualitzar mètriques'>
								<RefreshCw className='h-4 w-4 text-muted-foreground hover:text-foreground' />
							</button>
						</div>
						<p className='text-muted-foreground mt-2'>Rendiment i ús del model de llenguatge a través dels mòduls</p>
						{error && (
							<div className='flex items-center gap-2 mt-2 text-destructive text-sm'>
								<AlertCircle className='h-4 w-4' />
								<span>Error carregant mètriques: {error.message}</span>
							</div>
						)}
					</div>

					<Card className='w-fit'>
						<CardContent className='pt-6'>
							<div className='flex flex-col gap-4'>
								<div className='flex items-center gap-2'>
									<Filter className='h-4 w-4 text-muted-foreground' />
									<span className='text-sm font-medium'>Mòdul:</span>
									<select value={selectedModuleFilter} onChange={(e) => setSelectedModuleFilter(e.target.value)} className='px-3 py-1 text-sm border rounded-md bg-background'>
										<option value='all'>Tots els mòduls</option>
										<option value='valoracio'>Valoració d'Ofertes</option>
										<option value='elaboracio'>Elaboració Decrets</option>
										<option value='kit'>Kit Lingüístic</option>
									</select>
								</div>
								<div className='flex items-center gap-2'>
									<Cpu className='h-4 w-4 text-muted-foreground' />
									<span className='text-sm font-medium'>Model:</span>
									<select value={selectedModelFilter} onChange={(e) => setSelectedModelFilter(e.target.value)} className='px-3 py-1 text-sm border rounded-md bg-background'>
										<option value='all'>Tots els models</option>
										<option value='salamandra-7b-vertex'>Salamandra 7B Vertex AI</option>
										<option value='salamandra-ta-7b-local'>SalamandraTA 7B Local</option>
										<option value='gemini-2.5-flash'>Gemini 2.5 Flash</option>
									</select>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='rounded-lg border bg-card p-4'>
					<div className='flex items-center gap-4'>
						<div className='flex items-center gap-2'>
							<Filter className='h-5 w-5' />
							<span className='text-sm font-medium'>Mòdul:</span>
							<Badge variant='secondary'>{getFilterLabel(selectedModuleFilter)}</Badge>
						</div>
						<div className='flex items-center gap-2'>
							<Cpu className='h-5 w-5' />
							<span className='text-sm font-medium'>Model:</span>
							<Badge variant='secondary'>{getModelLabel(selectedModelFilter)}</Badge>
						</div>
					</div>
				</div>

				<Tabs defaultValue='overview' className='w-full'>
					<TabsList>
						<TabsTrigger value='overview'>Resum</TabsTrigger>
						<TabsTrigger value='detailed'>Detalls</TabsTrigger>
						<TabsTrigger value='comparison'>Comparació per Mòdul</TabsTrigger>
					</TabsList>

					<TabsContent value='overview' className='space-y-4'>
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
									<p className='text-xs text-muted-foreground'>
										{aggregatedMetrics.petitionsExitoses} / {aggregatedMetrics.peticionsTotals}
									</p>
								</CardContent>
							</Card>
						</div>

						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Cost Total</CardTitle>
									<BarChart3 className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>€{aggregatedMetrics.costTotal.toFixed(2)}</div>
									<p className='text-xs text-muted-foreground'>Cost acumulat</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Latència P95</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.latenciaP95.toFixed(1)}s</div>
									<p className='text-xs text-muted-foreground'>95è percentil</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Throughput</CardTitle>
									<Target className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{aggregatedMetrics.throughput}</div>
									<p className='text-xs text-muted-foreground'>req/min</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value='detailed' className='space-y-4'>
						<Card>
							<CardHeader>
								<CardTitle>Taula de Mètriques LLM Detallades</CardTitle>
								<CardDescription>Indicadors de rendiment i ús del model de llenguatge</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='border-b'>
												<th className='text-left py-3 px-2 font-semibold'>Mètrica</th>
												<th className='text-left py-3 px-2 font-semibold'>Valor</th>
												<th className='text-left py-3 px-2 font-semibold'>Objectiu</th>
												<th className='text-left py-3 px-2 font-semibold'>Estat</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											<tr>
												<td className='py-3 px-2'>Tokens d'entrada mitjans</td>
												<td className='py-3 px-2 font-medium'>{tokensEntradaMitjans.toLocaleString()}</td>
												<td className='py-3 px-2 text-muted-foreground'>Monitorització</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Normal</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Tokens de sortida mitjans</td>
												<td className='py-3 px-2 font-medium'>{tokensSortidaMitjans.toLocaleString()}</td>
												<td className='py-3 px-2 text-muted-foreground'>Monitorització</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Normal</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Temps de resposta mitjà</td>
												<td className='py-3 px-2 font-medium'>{aggregatedMetrics.tempsMitjaResposta.toFixed(2)}s</td>
												<td className='py-3 px-2 text-muted-foreground'>&lt;3s</td>
												<td className='py-3 px-2'>
													<Badge variant={aggregatedMetrics.tempsMitjaResposta < 3 ? "outline" : "destructive"}>{aggregatedMetrics.tempsMitjaResposta < 3 ? "Òptim" : "Millorable"}</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Latència P95</td>
												<td className='py-3 px-2 font-medium'>{aggregatedMetrics.latenciaP95.toFixed(1)}s</td>
												<td className='py-3 px-2 text-muted-foreground'>&lt;5s</td>
												<td className='py-3 px-2'>
													<Badge variant={aggregatedMetrics.latenciaP95 < 5 ? "outline" : "destructive"}>{aggregatedMetrics.latenciaP95 < 5 ? "Òptim" : "Millorable"}</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Taxa d'èxit</td>
												<td className='py-3 px-2 font-medium'>{taxaExit}%</td>
												<td className='py-3 px-2 text-muted-foreground'>&gt;99%</td>
												<td className='py-3 px-2'>
													<Badge variant={parseFloat(taxaExit) > 99 ? "outline" : "destructive"}>{parseFloat(taxaExit) > 99 ? "Òptim" : "Millorable"}</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Cost per petició</td>
												<td className='py-3 px-2 font-medium'>€{costPerPeticio}</td>
												<td className='py-3 px-2 text-muted-foreground'>Optimització contínua</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Monitorització</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Throughput</td>
												<td className='py-3 px-2 font-medium'>{aggregatedMetrics.throughput} req/min</td>
												<td className='py-3 px-2 text-muted-foreground'>&gt;100 req/min</td>
												<td className='py-3 px-2'>
													<Badge variant={aggregatedMetrics.throughput > 100 ? "outline" : "destructive"}>{aggregatedMetrics.throughput > 100 ? "Òptim" : "Millorable"}</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Ràtio tokens entrada/sortida</td>
												<td className='py-3 px-2 font-medium'>{ratioTokens}</td>
												<td className='py-3 px-2 text-muted-foreground'>Monitorització</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>Normal</Badge>
												</td>
											</tr>
											<tr>
												<td className='py-3 px-2'>Total de peticions</td>
												<td className='py-3 px-2 font-medium'>{aggregatedMetrics.peticionsTotals.toLocaleString()}</td>
												<td className='py-3 px-2 text-muted-foreground'>-</td>
												<td className='py-3 px-2'>
													<Badge variant='outline'>-</Badge>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='comparison' className='space-y-4'>
						<Card>
							<CardHeader>
								<CardTitle>Comparació de Mètriques</CardTitle>
								<CardDescription>
									{selectedModelFilter === "all" && selectedModuleFilter === "all"
										? "Visió comparativa del rendiment per mòdul (agregat de tots els models)"
										: selectedModelFilter !== "all" && selectedModuleFilter === "all"
										? `Visió comparativa del rendiment per mòdul amb el model ${getModelLabel(selectedModelFilter)}`
										: selectedModelFilter === "all" && selectedModuleFilter !== "all"
										? `Visió comparativa del rendiment per model en el mòdul ${getFilterLabel(selectedModuleFilter)}`
										: `Mètriques per ${getFilterLabel(selectedModuleFilter)} amb ${getModelLabel(selectedModelFilter)}`}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr className='border-b'>
												<th className='text-left py-3 px-2 font-semibold'>{selectedModuleFilter === "all" && selectedModelFilter !== "all" ? "Mòdul" : selectedModelFilter === "all" ? "Model / Mòdul" : "Mòdul"}</th>
												<th className='text-right py-3 px-2 font-semibold'>Tokens Entrada</th>
												<th className='text-right py-3 px-2 font-semibold'>Tokens Sortida</th>
												<th className='text-right py-3 px-2 font-semibold'>Temps Mitjà</th>
												<th className='text-right py-3 px-2 font-semibold'>Peticions</th>
												<th className='text-right py-3 px-2 font-semibold'>Taxa Èxit</th>
												<th className='text-right py-3 px-2 font-semibold'>Cost</th>
											</tr>
										</thead>
										<tbody className='divide-y'>
											{selectedModuleFilter === "all" && selectedModelFilter === "all" ? (
												// Show all modules aggregated across models
												<>
													{AINA_MODULES.map((module) => {
														const moduleMetrics = Object.keys(metricsByModel).reduce(
															(acc, model) => {
																if (!metricsByModel[model] || !metricsByModel[model][module]) return acc
																const m = metricsByModel[model][module]
																return {
																	tokensEntrada: acc.tokensEntrada + m.tokensEntrada,
																	tokensSortida: acc.tokensSortida + m.tokensSortida,
																	tempsMitjaResposta: acc.tempsMitjaResposta + m.tempsMitjaResposta,
																	peticionsTotals: acc.peticionsTotals + m.peticionsTotals,
																	petitionsExitoses: acc.petitionsExitoses + m.petitionsExitoses,
																	costTotal: acc.costTotal + m.costTotal,
																	count: acc.count + 1,
																}
															},
															{ tokensEntrada: 0, tokensSortida: 0, tempsMitjaResposta: 0, peticionsTotals: 0, petitionsExitoses: 0, costTotal: 0, count: 0 }
														)
														moduleMetrics.tempsMitjaResposta = moduleMetrics.tempsMitjaResposta / moduleMetrics.count

														return (
															<tr key={module}>
																<td className='py-3 px-2 font-medium'>{getFilterLabel(module)}</td>
																<td className='py-3 px-2 text-right'>{moduleMetrics.tokensEntrada.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{moduleMetrics.tokensSortida.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{moduleMetrics.tempsMitjaResposta.toFixed(2)}s</td>
																<td className='py-3 px-2 text-right'>{moduleMetrics.peticionsTotals}</td>
																<td className='py-3 px-2 text-right'>{((moduleMetrics.petitionsExitoses / moduleMetrics.peticionsTotals) * 100).toFixed(2)}%</td>
																<td className='py-3 px-2 text-right'>€{moduleMetrics.costTotal.toFixed(2)}</td>
															</tr>
														)
													})}
												</>
											) : selectedModuleFilter !== "all" && selectedModelFilter === "all" ? (
												// Show all models for a specific module
												<>
													{Object.keys(metricsByModel).map((model) => {
														if (!metricsByModel[model] || !metricsByModel[model][selectedModuleFilter]) return null
														const m = metricsByModel[model][selectedModuleFilter]
														return (
															<tr key={model}>
																<td className='py-3 px-2 font-medium'>{getModelLabel(model)}</td>
																<td className='py-3 px-2 text-right'>{m.tokensEntrada.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{m.tokensSortida.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{m.tempsMitjaResposta.toFixed(2)}s</td>
																<td className='py-3 px-2 text-right'>{m.peticionsTotals}</td>
																<td className='py-3 px-2 text-right'>{((m.petitionsExitoses / m.peticionsTotals) * 100).toFixed(2)}%</td>
																<td className='py-3 px-2 text-right'>€{m.costTotal.toFixed(2)}</td>
															</tr>
														)
													})}
												</>
											) : selectedModuleFilter === "all" && selectedModelFilter !== "all" ? (
												// Show all modules for a specific model
												<>
													{AINA_MODULES.map((module) => {
														if (!metricsByModel[selectedModelFilter] || !metricsByModel[selectedModelFilter][module]) return null
														const m = metricsByModel[selectedModelFilter][module]
														return (
															<tr key={module}>
																<td className='py-3 px-2 font-medium'>{getFilterLabel(module)}</td>
																<td className='py-3 px-2 text-right'>{m.tokensEntrada.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{m.tokensSortida.toLocaleString()}</td>
																<td className='py-3 px-2 text-right'>{m.tempsMitjaResposta.toFixed(2)}s</td>
																<td className='py-3 px-2 text-right'>{m.peticionsTotals}</td>
																<td className='py-3 px-2 text-right'>{((m.petitionsExitoses / m.peticionsTotals) * 100).toFixed(2)}%</td>
																<td className='py-3 px-2 text-right'>€{m.costTotal.toFixed(2)}</td>
															</tr>
														)
													})}
												</>
											) : (
												// Show single module and model combination
												<tr>
													<td className='py-3 px-2 font-medium'>{getFilterLabel(selectedModuleFilter)}</td>
													<td className='py-3 px-2 text-right'>{aggregatedMetrics.tokensEntrada.toLocaleString()}</td>
													<td className='py-3 px-2 text-right'>{aggregatedMetrics.tokensSortida.toLocaleString()}</td>
													<td className='py-3 px-2 text-right'>{aggregatedMetrics.tempsMitjaResposta.toFixed(2)}s</td>
													<td className='py-3 px-2 text-right'>{aggregatedMetrics.peticionsTotals}</td>
													<td className='py-3 px-2 text-right'>{taxaExit}%</td>
													<td className='py-3 px-2 text-right'>€{aggregatedMetrics.costTotal.toFixed(2)}</td>
												</tr>
											)}
											<tr className='bg-muted/50 font-semibold'>
												<td className='py-3 px-2'>TOTAL</td>
												<td className='py-3 px-2 text-right'>{aggregatedMetrics.tokensEntrada.toLocaleString()}</td>
												<td className='py-3 px-2 text-right'>{aggregatedMetrics.tokensSortida.toLocaleString()}</td>
												<td className='py-3 px-2 text-right'>{aggregatedMetrics.tempsMitjaResposta.toFixed(2)}s</td>
												<td className='py-3 px-2 text-right'>{aggregatedMetrics.peticionsTotals}</td>
												<td className='py-3 px-2 text-right'>{taxaExit}%</td>
												<td className='py-3 px-2 text-right'>€{aggregatedMetrics.costTotal.toFixed(2)}</td>
											</tr>
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>

						<div className='grid gap-4 md:grid-cols-3'>
							<Card>
								<CardHeader>
									<CardTitle className='text-base'>Millor eficiència (temps)</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>
										{topPerformers?.fastestResponse
											? `${getModelLabel(topPerformers.fastestResponse.model) || topPerformers.fastestResponse.model} / ${getFilterLabel(topPerformers.fastestResponse.module) || topPerformers.fastestResponse.module}`
											: "N/A"}
									</div>
									<p className='text-sm text-muted-foreground'>{topPerformers?.fastestResponse?.avgLatency ? `${topPerformers.fastestResponse.avgLatency.toFixed(2)}s de mitjana` : "Sense dades"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className='text-base'>Major volum</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>
										{topPerformers?.highestVolume
											? `${getModelLabel(topPerformers.highestVolume.model) || topPerformers.highestVolume.model} / ${getFilterLabel(topPerformers.highestVolume.module) || topPerformers.highestVolume.module}`
											: "N/A"}
									</div>
									<p className='text-sm text-muted-foreground'>{topPerformers?.highestVolume?.requests ? `${topPerformers.highestVolume.requests} peticions` : "Sense dades"}</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className='text-base'>Millor taxa d'èxit</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>
										{topPerformers?.bestSuccessRate
											? `${getModelLabel(topPerformers.bestSuccessRate.model) || topPerformers.bestSuccessRate.model} / ${getFilterLabel(topPerformers.bestSuccessRate.module) || topPerformers.bestSuccessRate.module}`
											: "N/A"}
									</div>
									<p className='text-sm text-muted-foreground'>{topPerformers?.bestSuccessRate?.successRate != null ? `${topPerformers.bestSuccessRate.successRate.toFixed(1)}% èxit` : "Sense dades"}</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
