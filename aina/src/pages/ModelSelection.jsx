import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cpu, Zap, CheckCircle2, Server, MonitorSmartphone, Cloud, Brain } from "lucide-react"
import DashboardLayout from "@/components/DashboardLayout"
import { useSettingsStore } from "@/stores/settingsStore"

/** @typedef {import("@/modules/shared/types").LLMModel} LLMModel */

/** @type {{id: LLMModel, name: string, provider: string, url: string, description: string, specs: Record<string, string>, icon: any, performance: string}[]} */
const MODEL_OPTIONS = [
	{
		id: "salamandra-7b-vertex",
		name: "Salamandra 7B Instruct",
		provider: "Google Vertex AI",
		url: "https://huggingface.co/BSC-LT/salamandra-7b-instruct",
		description: "Model Salamandra 7B executant-se a Google Vertex AI amb GPU dedicada",
		specs: {
			vm: "G2-standard-8",
			cpu: "8 vCPUs",
			ram: "32GB RAM",
			gpu: "NVIDIA L4",
		},
		icon: Cloud,
		performance: "Alta",
	},
	{
		id: "alia-40b-vertex",
		name: "ALIA 40B Instruct",
		provider: "Google Vertex AI",
		url: "https://huggingface.co/BSC-LT/ALIA-40b-instruct",
		description: "Model ALIA 40B amb context de fins a 32K tokens, executant-se a Vertex AI amb múltiples GPUs",
		specs: {
			vm: "G2-standard-48/96",
			gpus: "4-8x NVIDIA L4",
			vram: "96-192GB VRAM",
			context: "8K/16K/32K",
		},
		icon: Brain,
		performance: "Molt Alta",
	},
	{
		id: "salamandra-ta-7b-local",
		name: "SalamandraTA 7B GGUF",
		provider: "Localhost",
		url: "https://huggingface.co/BSC-LT/salamandraTA-7B-instruct-GGUF",
		description: "Model quantitzat executant-se en local al MacBook Pro M4",
		specs: {
			device: "MacBook Pro M4",
			ram: "24GB RAM",
			architecture: "ARM64",
		},
		icon: MonitorSmartphone,
		performance: "Mitjana",
	},
	{
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		provider: "Google Vertex AI",
		url: "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini",
		description: "Model Gemini 2.5 Flash amb inferència gestionada per Vertex AI",
		specs: {
			service: "Vertex AI Inference",
			latency: "Baixa",
			scalability: "Alta",
		},
		icon: Zap,
		performance: "Molt Alta",
	},
]

export default function ModelSelection() {
	const selectedModel = useSettingsStore((state) => state.selectedModel)
	const setSelectedModel = useSettingsStore((state) => state.setSelectedModel)

	/** @param {LLMModel} modelId */
	const handleSelectModel = (modelId) => {
		setSelectedModel(modelId)
	}

	const getPerformanceBadgeColor = (performance) => {
		switch (performance) {
			case "Molt Alta":
				return "bg-green-500 hover:bg-green-600"
			case "Alta":
				return "bg-blue-500 hover:bg-blue-600"
			case "Mitjana":
				return "bg-yellow-500 hover:bg-yellow-600"
			default:
				return "bg-gray-500 hover:bg-gray-600"
		}
	}

	return (
		<DashboardLayout>
			<div className='container mx-auto p-6 space-y-6'>
				<div className='space-y-2'>
					<div className='flex items-center gap-2'>
						<Cpu className='h-8 w-8 text-primary' />
						<h1 className='text-3xl font-bold'>Selecció de Model LLM</h1>
					</div>
					<p className='text-muted-foreground'>Tria el model de llenguatge que vols utilitzar per a les tasques d'IA</p>
				</div>

				<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
					{MODEL_OPTIONS.map((model) => {
						const Icon = model.icon
						const isSelected = selectedModel === model.id

						return (
							<Card key={model.id} className={`relative transition-all hover:shadow-lg cursor-pointer ${isSelected ? "ring-2 ring-primary shadow-lg" : ""}`} onClick={() => handleSelectModel(model.id)}>
								<CardHeader>
									<div className='flex items-start justify-between'>
										<Icon className='h-10 w-10 text-primary mb-2' />
										{isSelected && <CheckCircle2 className='h-6 w-6 text-primary' />}
									</div>
									<CardTitle className='text-xl'>{model.name}</CardTitle>
									<CardDescription>{model.provider}</CardDescription>
								</CardHeader>

								<CardContent className='space-y-4'>
									<p className='text-sm text-muted-foreground'>{model.description}</p>

									<div className='space-y-2'>
										<div className='flex items-center justify-between'>
											<span className='text-sm font-medium'>Rendiment:</span>
											<Badge className={getPerformanceBadgeColor(model.performance)}>{model.performance}</Badge>
										</div>

										<div className='pt-2 border-t space-y-1'>
											<p className='text-xs font-semibold text-muted-foreground'>Especificacions:</p>
											{Object.entries(model.specs).map(([key, value]) => (
												<div key={key} className='flex justify-between text-xs'>
													<span className='text-muted-foreground capitalize'>{key}:</span>
													<span className='font-medium'>{value}</span>
												</div>
											))}
										</div>
									</div>

									<div className='pt-2'>
										<a href={model.url} target='_blank' rel='noopener noreferrer' className='text-xs text-primary hover:underline flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
											<Server className='h-3 w-3' />
											Més informació
										</a>
									</div>

									<Button
										className='w-full'
										variant={isSelected ? "default" : "outline"}
										onClick={(e) => {
											e.stopPropagation()
											handleSelectModel(model.id)
										}}
									>
										{isSelected ? "Model Actiu" : "Seleccionar Model"}
									</Button>
								</CardContent>
							</Card>
						)
					})}
				</div>

				{selectedModel && (
					<Card className='bg-muted/50'>
						<CardHeader>
							<CardTitle>Model Seleccionat</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex items-center gap-2'>
								<CheckCircle2 className='h-5 w-5 text-primary' />
								<span className='font-medium'>{MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name}</span>
								<span className='text-muted-foreground'>- {MODEL_OPTIONS.find((m) => m.id === selectedModel)?.provider}</span>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</DashboardLayout>
	)
}
