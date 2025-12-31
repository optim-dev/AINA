import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Database, RefreshCw, CheckCircle2, Clock, AlertCircle, Layers, Zap, Activity } from "lucide-react"
import { getFunctions, httpsCallable } from "firebase/functions"

export default function VectorizationTracker() {
	const [vectorizationStatus, setVectorizationStatus] = useState({
		isVectorized: false,
		lastVectorization: null,
		status: "pending", // 'pending', 'processing', 'completed', 'failed'
		glossaryEntries: 0,
		vectorizedEntries: 0,
		embeddingModel: "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
		vectorDimensions: 768,
		indexType: "FAISS FlatIP",
		processingTime: null,
		indexSize: null,
		lastGlossaryUpdate: null,
		error: null,
	})

	const [isProcessing, setIsProcessing] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)

	// Initialize Firebase functions - memoize to prevent recreation on each render
	const functions = useMemo(() => getFunctions(undefined, "europe-west4"), [])
	const getVectorizationStatusFn = useMemo(() => httpsCallable(functions, "getVectorizationStatus"), [functions])
	const triggerVectorizationFn = useMemo(() => httpsCallable(functions, "triggerVectorization"), [functions])

	// Fetch vectorization status from Firebase
	const fetchStatus = useCallback(async () => {
		try {
			setError(null)
			const result = await getVectorizationStatusFn()

			if (result.data.success) {
				const status = result.data.status
				setVectorizationStatus({
					isVectorized: status.isVectorized,
					lastVectorization: status.lastVectorization ? new Date(status.lastVectorization) : null,
					status: status.status,
					glossaryEntries: status.glossaryEntries || 0,
					vectorizedEntries: status.vectorizedEntries || 0,
					embeddingModel: status.embeddingModel || "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base",
					vectorDimensions: status.vectorDimensions || 768,
					indexType: status.indexType || "FAISS FlatIP",
					processingTime: status.processingTime,
					indexSize: status.indexSize,
					lastGlossaryUpdate: status.lastGlossaryUpdate ? new Date(status.lastGlossaryUpdate) : null,
					error: status.error,
				})
			}
		} catch (err) {
			console.error("Error fetching vectorization status:", err)
			setError(err.message || "Error carregant l'estat de vectorització")
		} finally {
			setIsLoading(false)
		}
	}, [getVectorizationStatusFn])

	// Load status on mount only
	useEffect(() => {
		fetchStatus()
	}, []) // Empty dependency array - run only on mount

	const handleVectorize = async () => {
		setIsProcessing(true)
		setError(null)

		// Update local status to processing
		setVectorizationStatus((prev) => ({
			...prev,
			status: "processing",
		}))

		try {
			const result = await triggerVectorizationFn()

			if (result.data.success) {
				// Refresh the status after successful vectorization
				await fetchStatus()
			}
		} catch (err) {
			console.error("Error triggering vectorization:", err)
			setError(err.message || "Error durant la vectorització")
			setVectorizationStatus((prev) => ({
				...prev,
				status: "failed",
				error: err.message,
			}))
		} finally {
			setIsProcessing(false)
		}
	}

	const needsUpdate =
		vectorizationStatus.lastGlossaryUpdate && vectorizationStatus.lastVectorization
			? vectorizationStatus.lastGlossaryUpdate > vectorizationStatus.lastVectorization
			: vectorizationStatus.lastGlossaryUpdate && !vectorizationStatus.lastVectorization

	const getStatusBadge = () => {
		if (isLoading) {
			return <Badge variant='secondary'>Carregant...</Badge>
		}
		if (needsUpdate) {
			return <Badge variant='destructive'>Actualització Pendent</Badge>
		}
		switch (vectorizationStatus.status) {
			case "completed":
				return (
					<Badge variant='default' className='bg-green-600'>
						Vectoritzat
					</Badge>
				)
			case "processing":
				return (
					<Badge variant='default' className='bg-blue-600'>
						Processant...
					</Badge>
				)
			case "failed":
				return <Badge variant='destructive'>Error</Badge>
			default:
				return <Badge variant='secondary'>Pendent</Badge>
		}
	}

	// Format date for display
	const formatDate = (date) => {
		if (!date) return "Mai"
		return date.toLocaleString("ca-ES", {
			dateStyle: "short",
			timeStyle: "short",
		})
	}

	if (isLoading) {
		return (
			<div className='space-y-6'>
				<Card>
					<CardHeader>
						<div className='flex items-center gap-3'>
							<Database className='h-6 w-6' />
							<div>
								<CardTitle>Estat de Vectorització</CardTitle>
								<CardDescription>Carregant...</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className='flex items-center justify-center py-8'>
						<RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Global Error Message */}
			{error && (
				<div className='bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3'>
					<AlertCircle className='h-5 w-5 text-red-600 mt-0.5' />
					<div className='flex-1'>
						<p className='text-sm font-medium text-red-900'>Error</p>
						<p className='text-sm text-red-700 mt-1'>{error}</p>
					</div>
				</div>
			)}

			{/* Status Overview */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<Database className='h-6 w-6' />
							<div>
								<CardTitle>Estat de Vectorització</CardTitle>
								<CardDescription>Índex vectorial del glossari terminològic</CardDescription>
							</div>
						</div>
						{getStatusBadge()}
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>Última Vectorització</p>
							<p className='text-lg font-semibold'>{formatDate(vectorizationStatus.lastVectorization)}</p>
						</div>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>Última Actualització Glossari</p>
							<p className='text-lg font-semibold'>{formatDate(vectorizationStatus.lastGlossaryUpdate)}</p>
						</div>
					</div>

					{needsUpdate && (
						<div className='bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3'>
							<AlertCircle className='h-5 w-5 text-orange-600 mt-0.5' />
							<div className='flex-1'>
								<p className='text-sm font-medium text-orange-900'>El glossari ha estat actualitzat des de l'última vectorització</p>
								<p className='text-sm text-orange-700 mt-1'>Es recomana re-vectoritzar per garantir la precisió de les cerques semàntiques.</p>
							</div>
						</div>
					)}

					{vectorizationStatus.error && (
						<div className='bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3'>
							<AlertCircle className='h-5 w-5 text-red-600 mt-0.5' />
							<div className='flex-1'>
								<p className='text-sm font-medium text-red-900'>Error en l'última vectorització</p>
								<p className='text-sm text-red-700 mt-1'>{vectorizationStatus.error}</p>
							</div>
						</div>
					)}

					<Button onClick={handleVectorize} disabled={isProcessing || vectorizationStatus.status === "processing"} className='w-full'>
						{isProcessing || vectorizationStatus.status === "processing" ? (
							<>
								<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
								Vectoritzant...
							</>
						) : (
							<>
								<Zap className='mr-2 h-4 w-4' />
								{needsUpdate ? "Actualitzar Vectorització" : "Re-vectoritzar Glossari"}
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			{/* Vectorization Details */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Layers className='h-5 w-5' />
						Detalls de Vectorització
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<p className='text-sm font-medium text-muted-foreground'>Entrades del Glossari</p>
							<p className='text-2xl font-bold'>{vectorizationStatus.glossaryEntries}</p>
						</div>
						<div className='space-y-2'>
							<p className='text-sm font-medium text-muted-foreground'>Entrades Vectoritzades</p>
							<p className='text-2xl font-bold'>{vectorizationStatus.vectorizedEntries}</p>
						</div>
					</div>

					<Separator />

					<div className='space-y-3'>
						<div className='flex justify-between items-center'>
							<span className='text-sm font-medium'>Model d'Embeddings</span>
							<span className='text-sm text-muted-foreground font-mono'>{vectorizationStatus.embeddingModel}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span className='text-sm font-medium'>Dimensions Vectorials</span>
							<span className='text-sm text-muted-foreground'>{vectorizationStatus.vectorDimensions}D</span>
						</div>
						<div className='flex justify-between items-center'>
							<span className='text-sm font-medium'>Tipus d'Índex</span>
							<span className='text-sm text-muted-foreground'>{vectorizationStatus.indexType}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span className='text-sm font-medium'>Temps de Processament</span>
							<span className='text-sm text-muted-foreground'>{vectorizationStatus.processingTime || "—"}</span>
						</div>
						<div className='flex justify-between items-center'>
							<span className='text-sm font-medium'>Mida de l'Índex</span>
							<span className='text-sm text-muted-foreground'>{vectorizationStatus.indexSize || "—"}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Index Configuration */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Activity className='h-5 w-5' />
						Configuració de l'Índex FAISS
					</CardTitle>
					<CardDescription>Paràmetres de l'índex vectorial</CardDescription>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='flex justify-between items-center'>
						<span className='text-sm font-medium'>Tipus d'Índex</span>
						<span className='text-sm text-muted-foreground'>{vectorizationStatus.indexType}</span>
					</div>
					<div className='flex justify-between items-center'>
						<span className='text-sm font-medium'>Mètrica de Similaritat</span>
						<span className='text-sm text-muted-foreground'>Producte Intern (Cosinus)</span>
					</div>
					<Separator />
					<div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
						<p className='text-xs text-blue-900'>
							<strong>FAISS FlatIP:</strong> Índex exacte que calcula el producte intern entre vectors. Amb vectors normalitzats, això és equivalent a la similitud del cosinus. Ideal per a conjunts de dades de mida
							mitjana amb alta precisió.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Process Description */}
			<Card>
				<CardHeader>
					<CardTitle>Procés de Vectorització</CardTitle>
					<CardDescription>Pas a pas de com es genera l'índex vectorial del glossari</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-4'>
						{/* Step 1 */}
						<div className='flex gap-4'>
							<div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
								<span className='text-sm font-semibold text-blue-700'>1</span>
							</div>
							<div className='flex-1'>
								<h4 className='font-semibold text-sm mb-1'>Càrrega del Glossari</h4>
								<p className='text-sm text-muted-foreground'>Es carrega el glossari complet des de Firestore amb tots els termes recomanats, variants no normatives, contextos d'ús i exemples.</p>
							</div>
						</div>

						{/* Step 2 */}
						<div className='flex gap-4'>
							<div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
								<span className='text-sm font-semibold text-blue-700'>2</span>
							</div>
							<div className='flex-1'>
								<h4 className='font-semibold text-sm mb-1'>Preparació dels Textos</h4>
								<p className='text-sm text-muted-foreground'>Per cada entrada es combina el terme recomanat, context d'ús i variants no normatives en un text únic per vectoritzar.</p>
							</div>
						</div>

						{/* Step 3 */}
						<div className='flex gap-4'>
							<div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
								<span className='text-sm font-semibold text-blue-700'>3</span>
							</div>
							<div className='flex-1'>
								<h4 className='font-semibold text-sm mb-1'>Generació d'Embeddings</h4>
								<p className='text-sm text-muted-foreground'>
									Utilitzant el model <code className='text-xs bg-gray-100 px-1 py-0.5 rounded'>{vectorizationStatus.embeddingModel}</code>, es generen vectors de {vectorizationStatus.vectorDimensions} dimensions per
									cada entrada del glossari.
								</p>
							</div>
						</div>

						{/* Step 4 */}
						<div className='flex gap-4'>
							<div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
								<span className='text-sm font-semibold text-blue-700'>4</span>
							</div>
							<div className='flex-1'>
								<h4 className='font-semibold text-sm mb-1'>Construcció de l'Índex</h4>
								<p className='text-sm text-muted-foreground'>Es construeix un índex FAISS FlatIP per permetre cerques vectorials precises basades en similitud del cosinus. L'índex es guarda per reutilització futura.</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
