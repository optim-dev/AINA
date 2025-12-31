import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Upload, Filter, RefreshCw, Loader2, FileSpreadsheet } from "lucide-react"
import GlossaryTermCard from "./GlossaryTermCard"
import GlossaryEditor from "./GlossaryEditor.tsx"
import { GlossaryTerm, Category, Ambit, Priority, GlossaryFilters } from "../types/glossary"
import { fetchGlossaryTerms, importGlossaryCSV, saveGlossaryTerm, deleteGlossaryTermById, exportTermsToJSON, exportTermsToCSV } from "../lib/glossaryService"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface GlossaryViewerProps {
	initialTerms?: GlossaryTerm[]
}

const categoryLabels: Record<Category, string> = {
	[Category.VERB]: "Verb",
	[Category.NOM]: "Nom",
	[Category.ADJECTIU]: "Adjectiu",
	[Category.ADVERBI]: "Adverbi",
	[Category.LOCUCION]: "Locució",
	[Category.EXPRESSIO]: "Expressió",
	[Category.ALTRES]: "Altres",
}

export default function GlossaryViewer({ initialTerms = [] }: GlossaryViewerProps) {
	const [terms, setTerms] = useState<GlossaryTerm[]>(initialTerms)
	const [filters, setFilters] = useState<GlossaryFilters>({})
	const [isEditing, setIsEditing] = useState(false)
	const [editingTerm, setEditingTerm] = useState<GlossaryTerm | undefined>()
	const [showFilters, setShowFilters] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isImporting, setIsImporting] = useState(false)
	const [showImportDialog, setShowImportDialog] = useState(false)
	const [importFile, setImportFile] = useState<File | null>(null)
	const [replaceExisting, setReplaceExisting] = useState(false)
	const [importError, setImportError] = useState<string | null>(null)

	// Fetch terms from Firestore on mount
	const loadTerms = useCallback(async () => {
		setIsLoading(true)
		try {
			const fetchedTerms = await fetchGlossaryTerms()
			setTerms(fetchedTerms)
		} catch (error: any) {
			console.error("Error fetching glossary terms:", error)
			// Keep initialTerms if fetch fails
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadTerms()
	}, [loadTerms])

	// Filter terms
	const filteredTerms = useMemo(() => {
		return terms.filter((term) => {
			// Search filter
			if (filters.searchTerm) {
				const searchLower = filters.searchTerm.toLowerCase()
				const matchesTerm = term.terme_recomanat.toLowerCase().includes(searchLower)
				const matchesContext = term.context_d_us?.toLowerCase().includes(searchLower)
				const matchesVariants = term.variants_no_normatives?.some((variant) => variant.toLowerCase().includes(searchLower))
				if (!matchesTerm && !matchesContext && !matchesVariants) {
					return false
				}
			}

			// Category filter - compare string values
			if (filters.categoria) {
				const termCat = String(term.categoria)
				const filterCat = String(filters.categoria)
				if (termCat !== filterCat) {
					return false
				}
			}

			// Ambit filter - compare string values
			if (filters.ambit && String(term.ambit) !== String(filters.ambit)) {
				return false
			}

			// Priority filter - compare string values
			if (filters.prioritat && String(term.prioritat) !== String(filters.prioritat)) {
				return false
			}

			return true
		})
	}, [terms, filters])

	// Statistics
	const stats = useMemo(() => {
		const totalTerms = terms.length
		const termsByCategory: Record<Category, number> = {
			[Category.VERB]: 0,
			[Category.NOM]: 0,
			[Category.ADJECTIU]: 0,
			[Category.ADVERBI]: 0,
			[Category.LOCUCION]: 0,
			[Category.EXPRESSIO]: 0,
			[Category.ALTRES]: 0,
		}

		const termsByAmbit: Record<Ambit, number> = {
			[Ambit.ADMINISTRATIU_GENERIC]: 0,
			[Ambit.ADMINISTRATIU_JUDICIAL]: 0,
			[Ambit.URBANISME]: 0,
			[Ambit.TECNIC]: 0,
			[Ambit.LEGAL]: 0,
			[Ambit.FINANCER]: 0,
			[Ambit.EDUCATIU]: 0,
		}

		const termsByPriority: Record<Priority, number> = {
			[Priority.ALTA]: 0,
			[Priority.MITJANA]: 0,
			[Priority.BAIXA]: 0,
		}

		terms.forEach((term) => {
			termsByCategory[term.categoria]++
			termsByAmbit[term.ambit]++
			termsByPriority[term.prioritat]++
		})

		const now = new Date()
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
		const recentlyAdded = terms.filter((t) => new Date(t.createdAt) > sevenDaysAgo).length
		const recentlyUpdated = terms.filter((t) => new Date(t.updatedAt) > sevenDaysAgo).length

		return {
			totalTerms,
			termsByCategory,
			termsByAmbit,
			termsByPriority,
			recentlyAdded,
			recentlyUpdated,
		}
	}, [terms])

	const handleSaveTerm = async (term: GlossaryTerm) => {
		try {
			const savedTerm = await saveGlossaryTerm(term)
			if (editingTerm) {
				// Update existing term
				setTerms(terms.map((t) => (t.id === savedTerm.id ? savedTerm : t)))
			} else {
				// Add new term
				setTerms([...terms, savedTerm])
			}
			setIsEditing(false)
			setEditingTerm(undefined)
		} catch (error: any) {
			console.error("Error saving term:", error)
			alert("Error en desar el terme: " + error.message)
		}
	}

	const handleEditTerm = (term: GlossaryTerm) => {
		setEditingTerm(term)
		setIsEditing(true)
	}

	const handleDeleteTerm = async (termId: string) => {
		if (confirm("Segur que vols eliminar aquest terme?")) {
			try {
				await deleteGlossaryTermById(termId)
				setTerms(terms.filter((t) => t.id !== termId))
			} catch (error: any) {
				console.error("Error deleting term:", error)
				alert("Error en eliminar el terme: " + error.message)
			}
		}
	}

	const handleExport = (format: "json" | "csv" = "json") => {
		if (format === "csv") {
			exportTermsToCSV(terms)
		} else {
			exportTermsToJSON(terms)
		}
	}

	const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			setImportFile(file)
			setImportError(null)
			setShowImportDialog(true)
		}
		// Reset input
		event.target.value = ""
	}

	const handleImportConfirm = async () => {
		if (!importFile) return

		setIsImporting(true)
		setImportError(null)

		try {
			const result = await importGlossaryCSV(importFile, replaceExisting)

			if (result.success) {
				setShowImportDialog(false)
				setImportFile(null)
				setReplaceExisting(false)

				// Refresh terms from Firestore
				await loadTerms()

				const message = `S'han importat ${result.importedCount} de ${result.totalRows} termes correctament.`
				if (result.errors.length > 0) {
					alert(`${message}\n\nErrors:\n${result.errors.join("\n")}`)
				} else {
					alert(message)
				}
			}
		} catch (error: any) {
			console.error("Error importing CSV:", error)
			setImportError(error.message || "Error en importar el fitxer")
		} finally {
			setIsImporting(false)
		}
	}

	const handleImportCancel = () => {
		setShowImportDialog(false)
		setImportFile(null)
		setReplaceExisting(false)
		setImportError(null)
	}

	if (isEditing) {
		return (
			<GlossaryEditor
				term={editingTerm}
				onSave={handleSaveTerm}
				onCancel={() => {
					setIsEditing(false)
					setEditingTerm(undefined)
				}}
			/>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Import CSV Dialog */}
			<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Importar Glossari CSV</DialogTitle>
						<DialogDescription>
							S'importarà el fitxer: <strong>{importFile?.name}</strong>
						</DialogDescription>
					</DialogHeader>

					<div className='space-y-4 py-4'>
						<div className='flex items-center space-x-2'>
							<Checkbox id='replace-existing' checked={replaceExisting} onCheckedChange={(checked) => setReplaceExisting(checked as boolean)} />
							<Label htmlFor='replace-existing' className='text-sm'>
								Substituir tots els termes existents (esborra el glossari actual)
							</Label>
						</div>

						{importError && <div className='p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm'>{importError}</div>}

						<div className='text-sm text-muted-foreground'>
							<p>El fitxer CSV ha de tenir les columnes:</p>
							<ul className='list-disc list-inside mt-1'>
								<li>Terme recomanat (obligatori)</li>
								<li>Categoria, Àmbit, context d'ús</li>
								<li>Terme no normatiu o inadequat</li>
								<li>Exemples i comentaris</li>
							</ul>
						</div>
					</div>

					<DialogFooter>
						<Button variant='outline' onClick={handleImportCancel} disabled={isImporting}>
							Cancel·lar
						</Button>
						<Button onClick={handleImportConfirm} disabled={isImporting}>
							{isImporting ? (
								<>
									<Loader2 className='h-4 w-4 mr-2 animate-spin' />
									Important...
								</>
							) : (
								"Importar"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Header with Stats */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
				<Card>
					<CardHeader className='pb-3'>
						<CardDescription>Total Termes</CardDescription>
						<CardTitle className='text-3xl'>{isLoading ? "..." : stats.totalTerms}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className='pb-3'>
						<CardDescription>Afegits Recentment</CardDescription>
						<CardTitle className='text-3xl'>{isLoading ? "..." : stats.recentlyAdded}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className='pb-3'>
						<CardDescription>Actualitzats Recentment</CardDescription>
						<CardTitle className='text-3xl'>{isLoading ? "..." : stats.recentlyUpdated}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className='pb-3'>
						<CardDescription>Filtrats</CardDescription>
						<CardTitle className='text-3xl'>{isLoading ? "..." : filteredTerms.length}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Category Stats */}
			<Card>
				<CardHeader>
					<CardTitle>Distribució per Categories</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex flex-wrap gap-4'>
						{Object.entries(stats.termsByCategory).map(([category, count]) => (
							<div key={category} className='flex items-center gap-2'>
								<Badge variant={filters.categoria === category ? "default" : "outline"}>{categoryLabels[category as Category]}</Badge>
								<span className='text-sm text-gray-500'>{count}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Toolbar */}
			<Card>
				<CardContent className='pt-6'>
					<div className='flex flex-col md:flex-row gap-4'>
						{/* Search */}
						<div className='flex-1 relative'>
							<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
							<Input
								placeholder='Cercar termes, variants no normatives o context...'
								value={filters.searchTerm || ""}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, searchTerm: e.target.value })}
								className='pl-10'
							/>
						</div>

						{/* Actions */}
						<div className='flex gap-2 flex-wrap'>
							<Button variant='outline' onClick={loadTerms} disabled={isLoading}>
								{isLoading ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <RefreshCw className='h-4 w-4 mr-2' />}
								Actualitzar
							</Button>
							<Button variant='outline' onClick={() => setShowFilters(!showFilters)}>
								<Filter className='h-4 w-4 mr-2' />
								Filtres
							</Button>
							<Button variant='outline' onClick={() => handleExport("json")}>
								<Download className='h-4 w-4 mr-2' />
								JSON
							</Button>
							<Button variant='outline' onClick={() => handleExport("csv")}>
								<FileSpreadsheet className='h-4 w-4 mr-2' />
								CSV
							</Button>
							<Button variant='outline' onClick={() => document.getElementById("import-file")?.click()}>
								<Upload className='h-4 w-4 mr-2' />
								Importar CSV
							</Button>
							<input id='import-file' type='file' accept='.csv' onChange={handleImportFileSelect} style={{ display: "none" }} />
							<Button onClick={() => setIsEditing(true)}>
								<Plus className='h-4 w-4 mr-2' />
								Nou Terme
							</Button>
						</div>
					</div>

					{/* Filters Panel */}
					{showFilters && (
						<div className='mt-4 p-4 border rounded-lg bg-gray-50 space-y-4'>
							<div>
								<label className='text-sm font-medium mb-2 block'>Categoria</label>
								<div className='flex flex-wrap gap-2'>
									<Badge variant={!filters.categoria ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, categoria: undefined })}>
										Totes
									</Badge>
									{Object.entries(categoryLabels).map(([category, label]) => (
										<Badge key={category} variant={filters.categoria === category ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, categoria: category as Category })}>
											{label}
										</Badge>
									))}
								</div>
							</div>

							<div>
								<label className='text-sm font-medium mb-2 block'>Àmbit</label>
								<div className='flex flex-wrap gap-2'>
									<Badge variant={!filters.ambit ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, ambit: undefined })}>
										Tots
									</Badge>
									{Object.values(Ambit).map((ambit) => (
										<Badge key={ambit} variant={filters.ambit === ambit ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, ambit })}>
											{ambit}
										</Badge>
									))}
								</div>
							</div>

							<div>
								<label className='text-sm font-medium mb-2 block'>Prioritat</label>
								<div className='flex flex-wrap gap-2'>
									<Badge variant={!filters.prioritat ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, prioritat: undefined })}>
										Totes
									</Badge>
									{Object.values(Priority).map((prioritat) => (
										<Badge key={prioritat} variant={filters.prioritat === prioritat ? "default" : "outline"} className='cursor-pointer' onClick={() => setFilters({ ...filters, prioritat })}>
											{prioritat}
										</Badge>
									))}
								</div>
							</div>

							<Button variant='ghost' size='sm' onClick={() => setFilters({})}>
								Netejar tots els filtres
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Terms List */}
			<div className='space-y-4'>
				{isLoading ? (
					<Card>
						<CardContent className='py-12 text-center text-gray-500'>
							<Loader2 className='h-8 w-8 animate-spin mx-auto mb-4' />
							<p className='text-lg'>Carregant glossari...</p>
						</CardContent>
					</Card>
				) : filteredTerms.length === 0 ? (
					<Card>
						<CardContent className='py-12 text-center text-gray-500'>
							{terms.length === 0 ? (
								<div>
									<p className='text-lg mb-2'>No hi ha termes al glossari</p>
									<p className='text-sm'>Comença important un fitxer CSV o afegint el primer terme!</p>
								</div>
							) : (
								<div>
									<p className='text-lg mb-2'>No s'han trobat resultats</p>
									<p className='text-sm'>Prova amb altres criteris de cerca</p>
								</div>
							)}
						</CardContent>
					</Card>
				) : (
					filteredTerms.map((term) => <GlossaryTermCard key={term.id} term={term} onEdit={handleEditTerm} onDelete={handleDeleteTerm} />)
				)}
			</div>
		</div>
	)
}
