import React, { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Type, CheckCircle2, AlertCircle, FileText, Zap, Send, RefreshCw, Clock, TrendingUp, BarChart3 } from "lucide-react"
import { functions } from "@/services/firebase"
import { httpsCallable } from "firebase/functions"

// Get the Cloud Functions URL base
const FUNCTIONS_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || "https://europe-west4-aina-demostradors.cloudfunctions.net"

export default function CorreccioOrtografica() {
	const [inputText, setInputText] = useState("")
	const [level, setLevel] = useState("default")
	const [apiResponse, setApiResponse] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	// Statistics state
	const [stats, setStats] = useState(null)
	const [corrections, setCorrections] = useState([])
	const [loadingStats, setLoadingStats] = useState(false)
	const [loadingCorrections, setLoadingCorrections] = useState(false)
	const [statsError, setStatsError] = useState(null)

	// Fetch statistics on component mount
	useEffect(() => {
		fetchStats()
		fetchCorrections()
	}, [])

	const fetchStats = async () => {
		setLoadingStats(true)
		setStatsError(null)
		try {
			const response = await fetch(`${FUNCTIONS_URL}/languageToolStats`)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const data = await response.json()
			setStats(data.data)
		} catch (err) {
			console.error("Failed to fetch stats:", err)
			setStatsError(err.message)
		} finally {
			setLoadingStats(false)
		}
	}

	const fetchCorrections = async () => {
		setLoadingCorrections(true)
		try {
			const response = await fetch(`${FUNCTIONS_URL}/languageToolCorrections?limit=50`)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const data = await response.json()
			setCorrections(data.data || [])
		} catch (err) {
			console.error("Failed to fetch corrections:", err)
		} finally {
			setLoadingCorrections(false)
		}
	}

	const handleSend = async () => {
		setLoading(true)
		setError(null)
		setApiResponse(null)

		try {
			const checkLanguageTool = httpsCallable(functions, "checkLanguageTool")
			const result = await checkLanguageTool({
				text: inputText,
				language: "ca",
				level: level,
			})

			setApiResponse(result.data)
			// Refresh stats after a successful check
			setTimeout(() => {
				fetchStats()
				fetchCorrections()
			}, 1000)
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	// Format date for display
	const formatDate = (dateStr) => {
		if (!dateStr) return "-"
		const date = new Date(dateStr)
		return date.toLocaleString("ca-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		})
	}

	// Format milliseconds to readable time
	const formatLatency = (ms) => {
		if (!ms || ms === 0) return "-"
		if (ms < 1000) return `${Math.round(ms)} ms`
		return `${(ms / 1000).toFixed(2)} s`
	}

	// Calculate success rate
	const getSuccessRate = () => {
		if (!stats || !stats.totalRequests || stats.totalRequests === 0) return "-"
		const rate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
		return `${rate}%`
	}

	// Get errors by category from stats
	const getErrorsByCategory = () => {
		if (!stats?.errorsByCategory) return []
		return Object.entries(stats.errorsByCategory)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
	}

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Correcció ortogràfica i sintàctica inicial</h1>
					<p className='text-muted-foreground mt-2'>Revisió automàtica d'ortografia i sintaxi dels documents</p>
				</div>

				<Tabs defaultValue='overview' className='w-full'>
					<TabsList>
						<TabsTrigger value='overview'>Visió General</TabsTrigger>
						<TabsTrigger value='corrections'>Correccions</TabsTrigger>
						<TabsTrigger value='statistics'>Estadístiques</TabsTrigger>
						<TabsTrigger value='eina'>Eina</TabsTrigger>
					</TabsList>

					<TabsContent value='overview' className='space-y-4'>
						<div className='flex justify-end'>
							<Button variant='outline' size='sm' onClick={fetchStats} disabled={loadingStats}>
								<RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? "animate-spin" : ""}`} />
								Actualitzar
							</Button>
						</div>

						{statsError && (
							<Card className='border-destructive'>
								<CardContent className='pt-6'>
									<div className='flex items-center space-x-2'>
										<AlertCircle className='h-5 w-5 text-destructive' />
										<p className='text-sm text-muted-foreground'>Error carregant estadístiques: {statsError}</p>
									</div>
								</CardContent>
							</Card>
						)}

						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Documents Revisats</CardTitle>
									<FileText className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{loadingStats ? "..." : stats?.totalRequests || 0}</div>
									<p className='text-xs text-muted-foreground'>Total acumulat</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Errors Detectats</CardTitle>
									<AlertCircle className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{loadingStats ? "..." : stats?.totalErrorsDetected || 0}</div>
									<p className='text-xs text-muted-foreground'>Ortogràfics i sintàctics</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Taxa d'Èxit</CardTitle>
									<CheckCircle2 className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{loadingStats ? "..." : getSuccessRate()}</div>
									<p className='text-xs text-muted-foreground'>Peticions correctes</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
									<CardTitle className='text-sm font-medium'>Latència Mitjana</CardTitle>
									<Clock className='h-4 w-4 text-muted-foreground' />
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{loadingStats ? "..." : formatLatency(stats?.avgLatencyMs)}</div>
									<p className='text-xs text-muted-foreground'>Temps de resposta</p>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Tipus de Correccions</CardTitle>
								<CardDescription>Distribució d'errors detectats per categoria</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								{loadingStats ? (
									<div className='text-center py-4 text-muted-foreground'>Carregant...</div>
								) : getErrorsByCategory().length > 0 ? (
									<div className='space-y-2'>
										{getErrorsByCategory().map(({ name, count }) => (
											<div key={name} className='flex items-center justify-between'>
												<span className='text-sm'>{name}</span>
												<Badge variant='outline'>{count}</Badge>
											</div>
										))}
									</div>
								) : (
									<div className='text-center py-4 text-muted-foreground'>
										<BarChart3 className='h-8 w-8 mx-auto mb-2 opacity-50' />
										<p className='text-sm'>No hi ha dades de categories disponibles</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='corrections' className='space-y-4'>
						<div className='flex justify-end'>
							<Button variant='outline' size='sm' onClick={fetchCorrections} disabled={loadingCorrections}>
								<RefreshCw className={`h-4 w-4 mr-2 ${loadingCorrections ? "animate-spin" : ""}`} />
								Actualitzar
							</Button>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Correccions Recents</CardTitle>
								<CardDescription>Llistat d'errors detectats i corregits ({corrections.length} registres)</CardDescription>
							</CardHeader>
							<CardContent>
								{loadingCorrections ? (
									<div className='text-center py-8 text-muted-foreground'>
										<RefreshCw className='h-8 w-8 mx-auto mb-4 animate-spin opacity-50' />
										<p>Carregant correccions...</p>
									</div>
								) : corrections.length > 0 ? (
									<div className='overflow-x-auto'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className='w-[150px]'>Data</TableHead>
													<TableHead>Text Original (fragment)</TableHead>
													<TableHead className='text-center'>Errors</TableHead>
													<TableHead className='text-center'>Latència</TableHead>
													<TableHead className='text-center'>Estat</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{corrections.map((correction, idx) => (
													<TableRow key={correction.requestId || idx}>
														<TableCell className='text-sm text-muted-foreground'>{formatDate(correction.timestamp?.value || correction.timestamp)}</TableCell>
														<TableCell className='max-w-[300px] truncate text-sm'>{correction.inputText?.substring(0, 60)}...</TableCell>
														<TableCell className='text-center'>
															<Badge variant={correction.matchesCount > 0 ? "destructive" : "secondary"}>{correction.matchesCount || 0}</Badge>
														</TableCell>
														<TableCell className='text-center text-sm text-muted-foreground'>{formatLatency(correction.latencyMs)}</TableCell>
														<TableCell className='text-center'>
															{correction.success ? (
																<Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
																	<CheckCircle2 className='h-3 w-3 mr-1' />
																	OK
																</Badge>
															) : (
																<Badge variant='destructive'>
																	<AlertCircle className='h-3 w-3 mr-1' />
																	Error
																</Badge>
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								) : (
									<div className='text-center py-8 text-muted-foreground'>
										<Type className='h-12 w-12 mx-auto mb-4 opacity-50' />
										<p>No hi ha correccions disponibles</p>
										<p className='text-xs mt-2'>Utilitza l'eina de correcció per generar dades</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='statistics' className='space-y-4'>
						<div className='flex justify-end'>
							<Button variant='outline' size='sm' onClick={fetchStats} disabled={loadingStats}>
								<RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? "animate-spin" : ""}`} />
								Actualitzar
							</Button>
						</div>

						<div className='grid gap-4 md:grid-cols-2'>
							<Card>
								<CardHeader>
									<CardTitle>Estadístiques de Rendiment</CardTitle>
									<CardDescription>Mètriques de qualitat ortogràfica i sintàctica</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='space-y-2'>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Taxa d'èxit</span>
											<Badge variant='outline'>{loadingStats ? "..." : getSuccessRate()}</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Latència mitjana</span>
											<Badge variant='outline'>{loadingStats ? "..." : formatLatency(stats?.avgLatencyMs)}</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Errors per document</span>
											<Badge variant='outline'>{loadingStats ? "..." : stats?.avgErrorsPerRequest?.toFixed(2) || "-"}</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Longitud mitjana del text</span>
											<Badge variant='outline'>{loadingStats ? "..." : stats?.avgInputLength ? `${Math.round(stats.avgInputLength)} caràcters` : "-"}</Badge>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Rendiment del Sistema</CardTitle>
									<CardDescription>Indicadors d'eficiència</CardDescription>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='space-y-2'>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Total peticions</span>
											<Badge variant='outline'>{loadingStats ? "..." : stats?.totalRequests || 0}</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Peticions exitoses</span>
											<Badge variant='outline' className='bg-green-50 text-green-700 border-green-200'>
												{loadingStats ? "..." : stats?.successfulRequests || 0}
											</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Peticions fallides</span>
											<Badge variant='outline' className={stats?.failedRequests > 0 ? "bg-red-50 text-red-700 border-red-200" : ""}>
												{loadingStats ? "..." : stats?.failedRequests || 0}
											</Badge>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-sm'>Total errors detectats</span>
											<Badge variant='outline'>{loadingStats ? "..." : stats?.totalErrorsDetected || 0}</Badge>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
						<Card>
							<CardHeader>
								<CardTitle>Descripció de les Estadístiques</CardTitle>
								<CardDescription>Què signifiquen les mètriques mostrades</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='space-y-3'>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Taxa de precisió</h4>
										<p className='text-xs text-muted-foreground'>
											Indica el percentatge d'encert del sistema en detectar i classificar correctament els errors. Una taxa alta significa que el sistema és fiable i no genera falsos positius.
										</p>
									</div>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Temps mitjà de correcció</h4>
										<p className='text-xs text-muted-foreground'>Mesura quant de temps triga el sistema a processar i analitzar un document. Valors baixos indiquen un sistema ràpid i eficient.</p>
									</div>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Errors per document</h4>
										<p className='text-xs text-muted-foreground'>Nombre mitjà d'errors detectats per cada document analitzat. Aquesta mètrica ajuda a entendre la qualitat inicial dels textos.</p>
									</div>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Documents processats avui</h4>
										<p className='text-xs text-muted-foreground'>Comptador del nombre de documents analitzats en el dia actual. Serveix per monitoritzar l'ús diari de la funcionalitat.</p>
									</div>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Temps de resposta</h4>
										<p className='text-xs text-muted-foreground'>Temps que triga el sistema a respondre a una petició. Inclou el temps de comunicació amb l'API de LanguageTool.</p>
									</div>
									<div>
										<h4 className='font-semibold text-sm mb-1'>Taxa d'èxit</h4>
										<p className='text-xs text-muted-foreground'>Percentatge de peticions completades amb èxit. Indica la fiabilitat del servei i la seva disponibilitat.</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='eina' className='space-y-4'>
						<Card>
							<CardHeader>
								<CardTitle>Eina de Correcció LanguageTool</CardTitle>
								<CardDescription>Comprova el text amb l'API de LanguageTool</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='text-input'>Text a analitzar</Label>
									<Input id='text-input' placeholder='Escriu el text aquí...' value={inputText} onChange={(e) => setInputText(e.target.value)} />
								</div>

								<div className='space-y-2'>
									<Label htmlFor='level-select'>Nivell de revisió</Label>
									<select
										id='level-select'
										value={level}
										onChange={(e) => setLevel(e.target.value)}
										className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
									>
										<option value='default'>Default - Revisió estàndard</option>
										<option value='picky'>Picky - Revisió més profunda i exigent</option>
									</select>
									<p className='text-xs text-muted-foreground'>
										{level === "default"
											? "Només aplica les regles més relevants (errors clars de gramàtica, ortografia i concordança)"
											: "Activa regles més exigents (sugerències d'estil, repeticions, construccions mejorables)"}
									</p>
								</div>

								<Button onClick={handleSend} disabled={loading || !inputText.trim()} className='w-full'>
									<Send className='mr-2 h-4 w-4' />
									{loading ? "Enviant..." : "Enviar"}
								</Button>

								{error && (
									<Card className='border-destructive'>
										<CardContent className='pt-6'>
											<div className='flex items-start space-x-2'>
												<AlertCircle className='h-5 w-5 text-destructive mt-0.5' />
												<div>
													<p className='font-semibold text-destructive'>Error</p>
													<p className='text-sm text-muted-foreground'>{error}</p>
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{apiResponse && (
									<Card>
										<CardHeader>
											<CardTitle className='text-lg'>Resultat de l'Anàlisi</CardTitle>
										</CardHeader>
										<CardContent>
											<div className='space-y-4'>
												<div className='flex items-center justify-between'>
													<span className='text-sm font-medium'>Errors detectats:</span>
													<Badge variant={apiResponse.matches?.length > 0 ? "destructive" : "default"}>{apiResponse.matches?.length || 0}</Badge>
												</div>

												{apiResponse.matches && apiResponse.matches.length > 0 ? (
													<div className='space-y-3 mt-4'>
														{apiResponse.matches.map((match, index) => (
															<Card key={index} className='border-l-4 border-l-yellow-500'>
																<CardContent className='pt-4'>
																	<div className='space-y-2'>
																		<div className='flex items-start justify-between'>
																			<p className='font-semibold text-sm'>{match.message}</p>
																			<Badge variant='outline' className='ml-2'>
																				{match.rule?.category?.name || "General"}
																			</Badge>
																		</div>
																		<div className='bg-muted p-2 rounded text-sm'>
																			<span className='line-through text-destructive'>{match.context?.text?.substring(match.context?.offset, match.context?.offset + match.context?.length)}</span>
																			{match.replacements && match.replacements.length > 0 && (
																				<>
																					<span className='mx-2'>→</span>
																					<span className='text-green-600 font-medium'>{match.replacements[0].value}</span>
																				</>
																			)}
																		</div>
																		{match.rule?.description && <p className='text-xs text-muted-foreground'>{match.rule.description}</p>}
																	</div>
																</CardContent>
															</Card>
														))}
													</div>
												) : (
													<div className='text-center py-4'>
														<CheckCircle2 className='h-12 w-12 mx-auto mb-2 text-green-600' />
														<p className='text-sm text-muted-foreground'>No s'han detectat errors!</p>
													</div>
												)}

												<details className='mt-4'>
													<summary className='cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground'>Veure resposta completa (JSON)</summary>
													<pre className='mt-2 bg-muted p-4 rounded-md text-xs overflow-auto max-h-96'>{JSON.stringify(apiResponse, null, 2)}</pre>
												</details>
											</div>
										</CardContent>
									</Card>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
