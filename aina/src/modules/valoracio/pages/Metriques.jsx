import React, { useMemo, useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Clock, CheckCircle, FileText, Percent, Target, Edit, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useMetricsForDashboard } from "@/hooks/useMetrics"
import { useSettingsStore } from "@/stores/settingsStore"
import { getValoracioMetrics } from "../services/valoracioMetricsService"

export default function Metriques() {
	// Get the currently selected model from settings
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	// Filter metrics for the valoracio module and current model
	const filters = useMemo(() => ({ module: "valoracio", model: selectedModel }), [selectedModel])

	// Fetch LLM metrics from BigQuery
	const { aggregatedMetrics, loading, error, refetch } = useMetricsForDashboard(filters)

	// State for valoracio-specific metrics
	const [valoracioMetrics, setValoracioMetrics] = useState({
		documentsIngerits: 0,
		tempsMitjaProcessament: 0,
		completesaRubrica: 0,
		criterisPerOferta: 0,
		consistenciaPuntuacio: 0,
		percentatgeCorreccions: 0,
		totalCorreccions: 0,
		totalAvaluacions: 0,
	})
	const [valoracioLoading, setValoracioLoading] = useState(false)
	const [valoracioError, setValoracioError] = useState(null)

	// Fetch valoracio-specific metrics
	const fetchValoracioMetrics = async () => {
		try {
			setValoracioLoading(true)
			setValoracioError(null)
			const metrics = await getValoracioMetrics()
			setValoracioMetrics(metrics)
		} catch (err) {
			console.error("Error fetching valoracio metrics:", err)
			setValoracioError(err.message || "Error desconegut")
		} finally {
			setValoracioLoading(false)
		}
	}

	// Load valoracio metrics on mount
	useEffect(() => {
		fetchValoracioMetrics()
	}, [])

	// Refresh all metrics
	const handleRefresh = () => {
		refetch()
		fetchValoracioMetrics()
	}

	// Calculate derived metrics (handle division by zero)
	const taxaExit = aggregatedMetrics.peticionsTotals > 0 ? ((aggregatedMetrics.petitionsExitoses / aggregatedMetrics.peticionsTotals) * 100).toFixed(2) : "0.00"
	const costPerPeticio = aggregatedMetrics.peticionsTotals > 0 ? (aggregatedMetrics.costTotal / aggregatedMetrics.peticionsTotals).toFixed(4) : "0.0000"

	const isLoading = loading || valoracioLoading

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<div className='flex items-center gap-3'>
						<h1 className='text-3xl font-bold tracking-tight'>Mètriques - Valoració d'Ofertes</h1>
						{isLoading && <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />}
						<button onClick={handleRefresh} className='p-1 hover:bg-muted rounded-md transition-colors' title='Actualitzar mètriques'>
							<RefreshCw className='h-4 w-4 text-muted-foreground hover:text-foreground' />
						</button>
					</div>
					<p className='text-muted-foreground mt-2'>Estadístiques i indicadors de rendiment del mòdul</p>
					{(error || valoracioError) && (
						<div className='flex items-center gap-2 mt-2 text-destructive text-sm'>
							<AlertCircle className='h-4 w-4' />
							<span>Error carregant mètriques: {error?.message || valoracioError}</span>
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
									<CardTitle className='text-sm font-medium'>Documents Processats</CardTitle>
									<FileText className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.documentsIngerits}</div>
									<p className='text-xs text-muted-foreground'>Ofertes ingerides</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Temps Mitjà</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.tempsMitjaProcessament > 0 ? `${valoracioMetrics.tempsMitjaProcessament.toFixed(1)}s` : "-"}</div>
									<p className='text-xs text-muted-foreground'>Per oferta processada</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Completesa de Rúbrica</CardTitle>
									<Percent className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.completesaRubrica > 0 ? `${valoracioMetrics.completesaRubrica.toFixed(1)}%` : "-"}</div>
									<p className='text-xs text-muted-foreground'>% criteris puntuats</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Consistència</CardTitle>
									<TrendingUp className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.consistenciaPuntuacio > 0 ? `${valoracioMetrics.consistenciaPuntuacio.toFixed(1)}%` : "-"}</div>
									<p className='text-xs text-muted-foreground'>Sistema vs Humà</p>
								</CardContent>
							</Card>
						</div>

						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Criteris Avaluats</CardTitle>
									<Target className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.criterisPerOferta > 0 ? valoracioMetrics.criterisPerOferta.toFixed(1) : "-"}</div>
									<p className='text-xs text-muted-foreground'>Per oferta</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Correccions Manuals</CardTitle>
									<Edit className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.percentatgeCorreccions.toFixed(1)}%</div>
									<p className='text-xs text-muted-foreground'>{valoracioMetrics.totalCorreccions} ajustaments humans</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Avaluacions Totals</CardTitle>
									<CheckCircle className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{valoracioMetrics.totalAvaluacions}</div>
									<p className='text-xs text-muted-foreground'>Valoracions completades</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Mètriques Clau del Sistema</CardTitle>
								<CardDescription>Indicadors principals per al seguiment de la qualitat d'avaluació</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Documents Ingerits</h3>
									<p className='text-sm text-muted-foreground'>Nombre d'ofertes processades pel sistema.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Temps Mitjà de Processament per Oferta</h3>
									<p className='text-sm text-muted-foreground'>Temps mitjà de processament per cada oferta.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Completesa de la Rúbrica d'Avaluació (%)</h3>
									<p className='text-sm text-muted-foreground'>Percentatge de criteris subjectius correctament puntuats.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Consistència de Puntuació</h3>
									<p className='text-sm text-muted-foreground'>Desviació entre les avaluacions del sistema i les avaluacions humanes.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Nombre de Criteris Avaluats per Oferta</h3>
									<p className='text-sm text-muted-foreground'>Nombre de criteris avaluats per cada oferta.</p>
								</div>
								<div className='space-y-2'>
									<h3 className='font-semibold text-sm'>Correccions o Ajustaments Manuals (%)</h3>
									<p className='text-sm text-muted-foreground'>Percentatge de casos on els humans ajusten la puntuació del LLM.</p>
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
