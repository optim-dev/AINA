import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/DashboardLayout"
import { Activity, CheckCircle2, XCircle, AlertCircle, Database, Lock, HardDrive, Zap, FileText, BookOpen, Languages, RefreshCw, Brain, Sparkles, Cpu, Network, Database as DatabaseIcon, Clock } from "lucide-react"
import { auth, db, storage, functions } from "@/services/firebase"
import { collection, getDocs, limit, query } from "firebase/firestore"
import { ref, listAll } from "firebase/storage"
import { httpsCallable } from "firebase/functions"
import { Button } from "@/components/ui/button"
import { checkAllLLMHealth, mapHealthStatus } from "@/services/llmHealthService"

const STATUS = {
	HEALTHY: "healthy",
	WARNING: "warning",
	ERROR: "error",
	CHECKING: "checking",
	UNAVAILABLE: "unavailable",
}

export default function Health() {
	const [systemHealth, setSystemHealth] = useState({
		auth: { status: STATUS.CHECKING, message: "" },
		firestore: { status: STATUS.CHECKING, message: "" },
		storage: { status: STATUS.CHECKING, message: "" },
		functions: { status: STATUS.CHECKING, message: "" },
	})

	const [moduleHealth, setModuleHealth] = useState({
		valoracio: { status: STATUS.CHECKING, message: "" },
		elaboracio: { status: STATUS.CHECKING, message: "" },
		kit: { status: STATUS.CHECKING, message: "" },
	})

	const [llmHealth, setLlmHealth] = useState({
		vertexGemini: { status: STATUS.CHECKING, message: "", latencyMs: null },
		vertexSalamandra: { status: STATUS.CHECKING, message: "", latencyMs: null },
		vertexAlia: { status: STATUS.CHECKING, message: "", latencyMs: null },
		localSalamandra: { status: STATUS.CHECKING, message: "", latencyMs: null },
		embeddingService: { status: STATUS.CHECKING, message: "", latencyMs: null },
		vectorDB: { status: STATUS.CHECKING, message: "", latencyMs: null },
	})

	const [lastCheck, setLastCheck] = useState(new Date())

	const checkHealth = async () => {
		setLastCheck(new Date())

		// Reset all to checking
		setSystemHealth({
			auth: { status: STATUS.CHECKING, message: "" },
			firestore: { status: STATUS.CHECKING, message: "" },
			storage: { status: STATUS.CHECKING, message: "" },
			functions: { status: STATUS.CHECKING, message: "" },
		})
		setModuleHealth({
			valoracio: { status: STATUS.CHECKING, message: "" },
			elaboracio: { status: STATUS.CHECKING, message: "" },
			kit: { status: STATUS.CHECKING, message: "" },
		})
		setLlmHealth({
			vertexGemini: { status: STATUS.CHECKING, message: "", latencyMs: null },
			vertexSalamandra: { status: STATUS.CHECKING, message: "", latencyMs: null },
			vertexAlia: { status: STATUS.CHECKING, message: "", latencyMs: null },
			localSalamandra: { status: STATUS.CHECKING, message: "", latencyMs: null },
			embeddingService: { status: STATUS.CHECKING, message: "", latencyMs: null },
			vectorDB: { status: STATUS.CHECKING, message: "", latencyMs: null },
		})

		// Check Auth
		try {
			if (auth.currentUser) {
				setSystemHealth((prev) => ({
					...prev,
					auth: { status: STATUS.HEALTHY, message: `Authenticated as ${auth.currentUser.email}` },
				}))
			} else {
				setSystemHealth((prev) => ({
					...prev,
					auth: { status: STATUS.WARNING, message: "No user authenticated" },
				}))
			}
		} catch (error) {
			setSystemHealth((prev) => ({
				...prev,
				auth: { status: STATUS.ERROR, message: error.message },
			}))
		}

		// Check Firestore
		try {
			const testQuery = query(collection(db, "_health_check"), limit(1))
			await getDocs(testQuery)
			setSystemHealth((prev) => ({
				...prev,
				firestore: { status: STATUS.HEALTHY, message: "Connected and responding" },
			}))
		} catch (error) {
			setSystemHealth((prev) => ({
				...prev,
				firestore: { status: STATUS.ERROR, message: error.message },
			}))
		}

		// Check Storage
		try {
			const storageRef = ref(storage, "/")
			await listAll(storageRef)
			setSystemHealth((prev) => ({
				...prev,
				storage: { status: STATUS.HEALTHY, message: "Connected and accessible" },
			}))
		} catch (error) {
			setSystemHealth((prev) => ({
				...prev,
				storage: { status: STATUS.ERROR, message: error.message },
			}))
		}

		// Check Functions
		try {
			const healthCheck = httpsCallable(functions, "healthCheck")
			const result = await healthCheck()
			setSystemHealth((prev) => ({
				...prev,
				functions: { status: STATUS.HEALTHY, message: result.data?.message || "Connected" },
			}))
		} catch (error) {
			// If healthCheck function doesn't exist, that's still "healthy" infrastructure
			if (error.code === "functions/not-found") {
				setSystemHealth((prev) => ({
					...prev,
					functions: { status: STATUS.WARNING, message: "No health check function deployed" },
				}))
			} else {
				setSystemHealth((prev) => ({
					...prev,
					functions: { status: STATUS.ERROR, message: error.message },
				}))
			}
		}

		// Check Module: Valoració
		try {
			const valoracioQuery = query(collection(db, "valoracions"), limit(1))
			const snapshot = await getDocs(valoracioQuery)
			setModuleHealth((prev) => ({
				...prev,
				valoracio: {
					status: STATUS.HEALTHY,
					message: `Database accessible, ${snapshot.size} record(s) found`,
				},
			}))
		} catch {
			setModuleHealth((prev) => ({
				...prev,
				valoracio: { status: STATUS.WARNING, message: "Collection may not exist yet" },
			}))
		}

		// Check Module: Elaboració
		try {
			const elaboracioQuery = query(collection(db, "decrets"), limit(1))
			const snapshot = await getDocs(elaboracioQuery)
			setModuleHealth((prev) => ({
				...prev,
				elaboracio: {
					status: STATUS.HEALTHY,
					message: `Database accessible, ${snapshot.size} record(s) found`,
				},
			}))
		} catch {
			setModuleHealth((prev) => ({
				...prev,
				elaboracio: { status: STATUS.WARNING, message: "Collection may not exist yet" },
			}))
		}

		// Check Module: Kit
		try {
			const kitQuery = query(collection(db, "linguistic_resources"), limit(1))
			const snapshot = await getDocs(kitQuery)
			setModuleHealth((prev) => ({
				...prev,
				kit: {
					status: STATUS.HEALTHY,
					message: `Database accessible, ${snapshot.size} record(s) found`,
				},
			}))
		} catch {
			setModuleHealth((prev) => ({
				...prev,
				kit: { status: STATUS.WARNING, message: "Collection may not exist yet" },
			}))
		}

		// Check LLM Services via Firebase Function
		try {
			const llmHealthResult = await checkAllLLMHealth()

			if (llmHealthResult.success && llmHealthResult.data) {
				const services = llmHealthResult.data.services

				// Vertex AI Gemini
				setLlmHealth((prev) => ({
					...prev,
					vertexGemini: {
						status: mapHealthStatus(services.vertexGemini.status),
						message: services.vertexGemini.message,
						latencyMs: services.vertexGemini.latencyMs,
					},
				}))

				// Vertex AI Salamandra 7B Instruct
				setLlmHealth((prev) => ({
					...prev,
					vertexSalamandra: {
						status: mapHealthStatus(services.vertexSalamandra.status),
						message: services.vertexSalamandra.message,
						latencyMs: services.vertexSalamandra.latencyMs,
					},
				}))

				// Vertex AI ALIA-40b
				setLlmHealth((prev) => ({
					...prev,
					vertexAlia: {
						status: mapHealthStatus(services.vertexAlia.status),
						message: services.vertexAlia.message,
						latencyMs: services.vertexAlia.latencyMs,
					},
				}))

				// Localhost Salamandra 7B GGUF
				setLlmHealth((prev) => ({
					...prev,
					localSalamandra: {
						status: mapHealthStatus(services.localSalamandra.status),
						message: services.localSalamandra.message,
						latencyMs: services.localSalamandra.latencyMs,
					},
				}))

				// Embedding Service
				setLlmHealth((prev) => ({
					...prev,
					embeddingService: {
						status: mapHealthStatus(services.embeddingService.status),
						message: services.embeddingService.message,
						latencyMs: services.embeddingService.latencyMs,
					},
				}))

				// Vector DB Service
				setLlmHealth((prev) => ({
					...prev,
					vectorDB: {
						status: mapHealthStatus(services.vectorDB.status),
						message: services.vectorDB.message,
						latencyMs: services.vectorDB.latencyMs,
					},
				}))
			} else {
				// If the overall check failed, set all to error
				const errorMessage = llmHealthResult.error || "Health check failed"
				setLlmHealth({
					vertexGemini: { status: STATUS.ERROR, message: errorMessage },
					vertexSalamandra: { status: STATUS.ERROR, message: errorMessage },
					vertexAlia: { status: STATUS.ERROR, message: errorMessage },
					localSalamandra: { status: STATUS.ERROR, message: errorMessage },
					embeddingService: { status: STATUS.ERROR, message: errorMessage },
					vectorDB: { status: STATUS.ERROR, message: errorMessage },
				})
			}
		} catch (error) {
			console.error("LLM health check error:", error)
			setLlmHealth({
				vertexGemini: { status: STATUS.ERROR, message: error.message || "Check failed" },
				vertexSalamandra: { status: STATUS.ERROR, message: error.message || "Check failed" },
				vertexAlia: { status: STATUS.ERROR, message: error.message || "Check failed" },
				localSalamandra: { status: STATUS.ERROR, message: error.message || "Check failed" },
				embeddingService: { status: STATUS.ERROR, message: error.message || "Check failed" },
				vectorDB: { status: STATUS.ERROR, message: error.message || "Check failed" },
			})
		}
	}

	useEffect(() => {
		checkHealth()
	}, [])

	const getStatusColor = (status) => {
		switch (status) {
			case STATUS.HEALTHY:
				return "bg-green-500/10 text-green-700 border-green-500/20"
			case STATUS.WARNING:
				return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
			case STATUS.ERROR:
				return "bg-red-500/10 text-red-700 border-red-500/20"
			case STATUS.UNAVAILABLE:
				return "bg-gray-500/10 text-gray-500 border-gray-500/20"
			default:
				return "bg-gray-500/10 text-gray-700 border-gray-500/20"
		}
	}

	const getStatusIcon = (status) => {
		switch (status) {
			case STATUS.HEALTHY:
				return <CheckCircle2 className='h-5 w-5 text-green-600' />
			case STATUS.WARNING:
				return <AlertCircle className='h-5 w-5 text-yellow-600' />
			case STATUS.ERROR:
				return <XCircle className='h-5 w-5 text-red-600' />
			case STATUS.UNAVAILABLE:
				return <XCircle className='h-5 w-5 text-gray-500' />
			default:
				return <RefreshCw className='h-5 w-5 text-gray-600 animate-spin' />
		}
	}

	const getStatusText = (status) => {
		switch (status) {
			case STATUS.HEALTHY:
				return "Operatiu"
			case STATUS.WARNING:
				return "Advertència"
			case STATUS.ERROR:
				return "Error"
			case STATUS.UNAVAILABLE:
				return "No disponible"
			default:
				return "Comprovant..."
		}
	}

	const overallStatus = () => {
		const allStatuses = [...Object.values(systemHealth), ...Object.values(moduleHealth), ...Object.values(llmHealth)]
		if (allStatuses.some((s) => s.status === STATUS.ERROR)) return STATUS.ERROR
		if (allStatuses.some((s) => s.status === STATUS.WARNING || s.status === STATUS.UNAVAILABLE)) return STATUS.WARNING
		if (allStatuses.every((s) => s.status === STATUS.HEALTHY)) return STATUS.HEALTHY
		return STATUS.CHECKING
	}

	return (
		<DashboardLayout>
			<div className='space-y-6'>
				{/* Header */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<Activity className='h-8 w-8 text-primary' />
						<div>
							<h1 className='text-3xl font-bold'>Monitor de Salut del Sistema</h1>
							<p className='text-sm text-muted-foreground'>Última comprovació: {lastCheck.toLocaleTimeString("ca-ES")}</p>
						</div>
					</div>
					<Button onClick={checkHealth} variant='outline' className='gap-2'>
						<RefreshCw className='h-4 w-4' />
						Actualitzar
					</Button>
				</div>

				{/* Overall Status */}
				<Card className='border-2'>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<CardTitle className='text-xl'>Estat General del Sistema</CardTitle>
							<Badge className={`${getStatusColor(overallStatus())} text-sm px-3 py-1`}>
								{getStatusIcon(overallStatus())}
								<span className='ml-2'>{getStatusText(overallStatus())}</span>
							</Badge>
						</div>
					</CardHeader>
				</Card>

				{/* Firebase Services */}
				<div>
					<h2 className='text-xl font-semibold mb-4'>Serveis Firebase</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Lock className='h-5 w-5 text-blue-600' />
										<CardTitle className='text-base'>Authentication</CardTitle>
									</div>
									{getStatusIcon(systemHealth.auth.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(systemHealth.auth.status)}>{getStatusText(systemHealth.auth.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{systemHealth.auth.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Database className='h-5 w-5 text-orange-600' />
										<CardTitle className='text-base'>Firestore</CardTitle>
									</div>
									{getStatusIcon(systemHealth.firestore.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(systemHealth.firestore.status)}>{getStatusText(systemHealth.firestore.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{systemHealth.firestore.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<HardDrive className='h-5 w-5 text-purple-600' />
										<CardTitle className='text-base'>Storage</CardTitle>
									</div>
									{getStatusIcon(systemHealth.storage.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(systemHealth.storage.status)}>{getStatusText(systemHealth.storage.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{systemHealth.storage.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Zap className='h-5 w-5 text-yellow-600' />
										<CardTitle className='text-base'>Functions</CardTitle>
									</div>
									{getStatusIcon(systemHealth.functions.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(systemHealth.functions.status)}>{getStatusText(systemHealth.functions.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{systemHealth.functions.message}</p>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Application Modules */}
				<div>
					<h2 className='text-xl font-semibold mb-4'>Mòduls d'Aplicació</h2>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<FileText className='h-5 w-5 text-green-600' />
										<CardTitle className='text-base'>Valoració d'Ofertes</CardTitle>
									</div>
									{getStatusIcon(moduleHealth.valoracio.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(moduleHealth.valoracio.status)}>{getStatusText(moduleHealth.valoracio.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{moduleHealth.valoracio.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<BookOpen className='h-5 w-5 text-blue-600' />
										<CardTitle className='text-base'>Elaboració Decrets</CardTitle>
									</div>
									{getStatusIcon(moduleHealth.elaboracio.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(moduleHealth.elaboracio.status)}>{getStatusText(moduleHealth.elaboracio.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{moduleHealth.elaboracio.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Languages className='h-5 w-5 text-indigo-600' />
										<CardTitle className='text-base'>Kit Lingüístic</CardTitle>
									</div>
									{getStatusIcon(moduleHealth.kit.status)}
								</div>
							</CardHeader>
							<CardContent>
								<Badge className={getStatusColor(moduleHealth.kit.status)}>{getStatusText(moduleHealth.kit.status)}</Badge>
								<p className='text-xs text-muted-foreground mt-2'>{moduleHealth.kit.message}</p>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* LLM Services */}
				<div>
					<h2 className='text-xl font-semibold mb-4'>Serveis LLM i IA</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Sparkles className='h-5 w-5 text-purple-600' />
										<CardTitle className='text-sm'>Vertex AI Gemini</CardTitle>
									</div>
									{getStatusIcon(llmHealth.vertexGemini.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.vertexGemini.status)}>{getStatusText(llmHealth.vertexGemini.status)}</Badge>
									{llmHealth.vertexGemini.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.vertexGemini.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.vertexGemini.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Brain className='h-5 w-5 text-blue-600' />
										<CardTitle className='text-sm'>Salamandra 7B</CardTitle>
									</div>
									{getStatusIcon(llmHealth.vertexSalamandra.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.vertexSalamandra.status)}>{getStatusText(llmHealth.vertexSalamandra.status)}</Badge>
									{llmHealth.vertexSalamandra.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.vertexSalamandra.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.vertexSalamandra.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Brain className='h-5 w-5 text-purple-600' />
										<CardTitle className='text-sm'>ALIA 40B</CardTitle>
									</div>
									{getStatusIcon(llmHealth.vertexAlia.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.vertexAlia.status)}>{getStatusText(llmHealth.vertexAlia.status)}</Badge>
									{llmHealth.vertexAlia.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.vertexAlia.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.vertexAlia.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Cpu className='h-5 w-5 text-green-600' />
										<CardTitle className='text-sm'>Local Salamandra</CardTitle>
									</div>
									{getStatusIcon(llmHealth.localSalamandra.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.localSalamandra.status)}>{getStatusText(llmHealth.localSalamandra.status)}</Badge>
									{llmHealth.localSalamandra.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.localSalamandra.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.localSalamandra.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<Network className='h-5 w-5 text-orange-600' />
										<CardTitle className='text-sm'>Embedding Service</CardTitle>
									</div>
									{getStatusIcon(llmHealth.embeddingService.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.embeddingService.status)}>{getStatusText(llmHealth.embeddingService.status)}</Badge>
									{llmHealth.embeddingService.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.embeddingService.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.embeddingService.message}</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<DatabaseIcon className='h-5 w-5 text-indigo-600' />
										<CardTitle className='text-sm'>Vector DB</CardTitle>
									</div>
									{getStatusIcon(llmHealth.vectorDB.status)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex items-center gap-2'>
									<Badge className={getStatusColor(llmHealth.vectorDB.status)}>{getStatusText(llmHealth.vectorDB.status)}</Badge>
									{llmHealth.vectorDB.latencyMs && (
										<span className='text-xs text-muted-foreground flex items-center gap-1'>
											<Clock className='h-3 w-3' />
											{llmHealth.vectorDB.latencyMs}ms
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground mt-2'>{llmHealth.vectorDB.message}</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</DashboardLayout>
	)
}
