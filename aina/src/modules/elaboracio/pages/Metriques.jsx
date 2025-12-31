import React, { useMemo, useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Clock, CheckCircle, FileText, Edit, Scale, Star, Target, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useMetricsForDashboard } from "@/hooks/useMetrics"
import { useSettingsStore } from "@/stores/settingsStore"
import { getElaboracioMetrics } from "../services/elaboracioMetricsService"

export default function Metriques() {
	// Get the currently selected model from settings
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// Filter metrics for the elaboracio module and current model
	const filters = useMemo(() => ({ module: "elaboracio", model: selectedModel }), [selectedModel])

	// Fetch LLM metrics from BigQuery
	const { aggregatedMetrics, loading, error, refetch } = useMetricsForDashboard(filters)

	// Elaboracio-specific metrics state
	const [elaboracioMetrics, setElaboracioMetrics] = useState({
		decretsGenerats: 0,
		decretsAmbRevisioManual: 0,
		percentatgeRevisioManual: 0,
		tempsMitjaGeneracio: 0,
		taxaExitValidacioLegal: 0,
		puntuacioMitjanaFeedback: 0,
		totalFeedbacks: 0,
	})
	const [elaboracioLoading, setElaboracioLoading] = useState(false)
	const [elaboracioError, setElaboracioError] = useState(null)

	// Fetch elaboracio metrics
	const fetchElaboracioMetrics = async () => {
		setElaboracioLoading(true)
		setElaboracioError(null)
		try {
			const metrics = await getElaboracioMetrics()
			setElaboracioMetrics(metrics)
		} catch (err) {
			setElaboracioError(err)
			console.error("Error fetching elaboracio metrics:", err)
		} finally {
			setElaboracioLoading(false)
		}
	}

	useEffect(() => {
		fetchElaboracioMetrics()
	}, [])

	const handleRefresh = () => {
		refetch()
		fetchElaboracioMetrics()
	}

	// Calculate derived metrics (handle division by zero)
	const taxaExit = aggregatedMetrics.peticionsTotals > 0 ? ((aggregatedMetrics.petitionsExitoses / aggregatedMetrics.peticionsTotals) * 100).toFixed(2) : "0.00"
	const costPerPeticio = aggregatedMetrics.peticionsTotals > 0 ? (aggregatedMetrics.costTotal / aggregatedMetrics.peticionsTotals).toFixed(4) : "0.0000"

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<div className='flex items-center gap-3'>
						<h1 className='text-3xl font-bold tracking-tight'>Mètriques - Elaboració Decrets</h1>
						{(loading || elaboracioLoading) && <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />}
						<button onClick={handleRefresh} className='p-1 hover:bg-muted rounded-md transition-colors' title='Actualitzar mètriques'>
							<RefreshCw className='h-4 w-4 text-muted-foreground hover:text-foreground' />
						</button>
					</div>
					<p className='text-muted-foreground mt-2'>Estadístiques i indicadors de rendiment del mòdul</p>
					{(error || elaboracioError) && (
						<div className='flex items-center gap-2 mt-2 text-destructive text-sm'>
							<AlertCircle className='h-4 w-4' />
							<span>Error carregant mètriques: {error?.message || elaboracioError?.message}</span>
						</div>
					)}
				</div>

				<Tabs defaultValue='metrics' className='w-full'>
					<TabsList>
						<TabsTrigger value='metrics'>Mètriques Principals</TabsTrigger>
						<TabsTrigger value='llm'>Mètriques LLM</TabsTrigger>
					</TabsList>

					<TabsContent value='metrics' className='space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Decrets Generats</CardTitle>
									<FileText className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{elaboracioMetrics.decretsGenerats}</div>
									<p className='text-xs text-muted-foreground'>Automàticament</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Revisió Manual</CardTitle>
									<Edit className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{elaboracioMetrics.percentatgeRevisioManual.toFixed(1)}%</div>
									<p className='text-xs text-muted-foreground'>{elaboracioMetrics.decretsAmbRevisioManual} decrets revisats</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Temps Mitjà</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{elaboracioMetrics.tempsMitjaGeneracio > 0 ? `${(elaboracioMetrics.tempsMitjaGeneracio / 60).toFixed(1)} min` : "-"}</div>
									<p className='text-xs text-muted-foreground'>Per generació</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Validació Legal</CardTitle>
									<Scale className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{elaboracioMetrics.taxaExitValidacioLegal.toFixed(1)}%</div>
									<p className='text-xs text-muted-foreground'>% èxit citacions</p>
								</CardContent>
							</Card>
						</div>

						<div className='grid gap-4 md:grid-cols-1'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Valoració Jurídica</CardTitle>
									<Star className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{elaboracioMetrics.puntuacioMitjanaFeedback > 0 ? `${elaboracioMetrics.puntuacioMitjanaFeedback.toFixed(1)}/5` : "-"}</div>
									<p className='text-xs text-muted-foreground'>{elaboracioMetrics.totalFeedbacks} valoracions</p>
								</CardContent>
							</Card>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Mètriques Clau del Sistema</CardTitle>
								<CardDescription>Indicadors principals per al seguiment de la qualitat de generació de decrets</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Decrets Generats Automàticament</h3>
									<p className='text-sm text-muted-foreground'>Nombre total de decrets generats automàticament pel sistema.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>% de Decrets que Requereixen Revisió Manual</h3>
									<p className='text-sm text-muted-foreground'>Percentatge de decrets que necessiten revisió manual abans de la seva aprovació.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Temps Mitjà de Generació per Decret</h3>
									<p className='text-sm text-muted-foreground'>Temps mitjà necessari per generar un decret complet.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Taxa d'Èxit de Validació Legal (%)</h3>
									<p className='text-sm text-muted-foreground'>Percentatge d'èxit en la citació correcta d'articles i clàusules legals.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Puntuació Mitjana de Feedback (Precisió Jurídica)</h3>
									<p className='text-sm text-muted-foreground'>Puntuació mitjana de feedback sobre l'exactitud jurídica dels decrets generats.</p>
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
