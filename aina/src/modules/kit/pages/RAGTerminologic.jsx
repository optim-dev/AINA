import { useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import GlossaryViewer from "../components/GlossaryViewer"
import RAGProcessMonitor from "../components/RAGProcessMonitor"
import VectorizationTracker from "../components/VectorizationTracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettingsStore } from "@/stores/settingsStore"

export default function RAGTerminologic() {
	const [activeTab, setActiveTab] = useState("glossary")

	// TODO: Fetch real data
	const sampleTerms = []

	console.log("RAGTerminologic - activeTab:", activeTab)

	return (
		<DashboardLayout>
			<div className='space-y-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>RAG Terminològic</h1>
					<p className='text-muted-foreground'>Sistema de correcció terminològica amb cerca vectorial semàntica</p>
				</div>

				<Tabs defaultValue='glossary' value={activeTab} onValueChange={setActiveTab} className='w-full'>
					<TabsList className='grid w-full grid-cols-3'>
						<TabsTrigger value='glossary'>Glossari Terminològic</TabsTrigger>
						<TabsTrigger value='vectorization'>Vectorització</TabsTrigger>
						<TabsTrigger value='rag-process'>Procés RAG</TabsTrigger>
					</TabsList>

					<TabsContent value='glossary' className='space-y-4 mt-6'>
						<div className='rounded-lg border bg-card p-4'>
							<h2 className='text-lg font-semibold mb-2'>Glossari Tècnic-Administratiu</h2>
							<p className='text-sm text-muted-foreground mb-4'>Base de coneixement lingüística utilitzada pel sistema RAG per identificar i corregir termes no normatius.</p>
							<GlossaryViewer initialTerms={sampleTerms} />
						</div>
					</TabsContent>

					<TabsContent value='vectorization' className='space-y-4 mt-6'>
						<VectorizationTracker />
					</TabsContent>

					<TabsContent value='rag-process' className='space-y-4 mt-6'>
						<RAGProcessMonitor />
					</TabsContent>
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
