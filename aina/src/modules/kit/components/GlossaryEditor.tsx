import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { GlossaryTerm, Category, Ambit, Priority } from "../types/glossary"

interface GlossaryEditorProps {
	term?: GlossaryTerm
	onSave: (term: GlossaryTerm) => void
	onCancel: () => void
}

const categoryOptions: { value: Category; label: string }[] = [
	{ value: Category.VERB, label: "Verb" },
	{ value: Category.NOM, label: "Nom" },
	{ value: Category.ADJECTIU, label: "Adjectiu" },
	{ value: Category.ADVERBI, label: "Adverbi" },
	{ value: Category.LOCUCION, label: "Locució" },
	{ value: Category.EXPRESSIO, label: "Expressió" },
	{ value: Category.ALTRES, label: "Altres" },
]

const ambitOptions: { value: Ambit; label: string }[] = [
	{ value: Ambit.ADMINISTRATIU_GENERIC, label: "Administratiu genèric" },
	{ value: Ambit.ADMINISTRATIU_JUDICIAL, label: "Administratiu i judicial" },
	{ value: Ambit.URBANISME, label: "Urbanisme" },
	{ value: Ambit.TECNIC, label: "Tècnic" },
	{ value: Ambit.LEGAL, label: "Legal" },
	{ value: Ambit.FINANCER, label: "Financer" },
	{ value: Ambit.EDUCATIU, label: "Educatiu" },
]

const priorityOptions: { value: Priority; label: string }[] = [
	{ value: Priority.ALTA, label: "Alta" },
	{ value: Priority.MITJANA, label: "Mitjana" },
	{ value: Priority.BAIXA, label: "Baixa" },
]

export default function GlossaryEditor({ term, onSave, onCancel }: GlossaryEditorProps) {
	const [formData, setFormData] = useState<Partial<GlossaryTerm>>({
		terme_recomanat: term?.terme_recomanat || "",
		variants_no_normatives: term?.variants_no_normatives || [],
		context_d_us: term?.context_d_us || "",
		exemples_correctes: term?.exemples_correctes || [],
		exemples_incorrectes: term?.exemples_incorrectes || [],
		notes_linguistiques: term?.notes_linguistiques || "",
		categoria: term?.categoria || Category.ALTRES,
		ambit: term?.ambit || Ambit.ADMINISTRATIU_GENERIC,
		prioritat: term?.prioritat || Priority.MITJANA,
		font: term?.font || "",
	})

	const [newVariant, setNewVariant] = useState("")
	const [newExampleCorrect, setNewExampleCorrect] = useState("")
	const [newExampleIncorrect, setNewExampleIncorrect] = useState("")

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!formData.terme_recomanat) {
			alert("El terme recomanat és obligatori")
			return
		}

		const glossaryTerm: GlossaryTerm = {
			id: term?.id || `term-${Date.now()}`,
			terme_recomanat: formData.terme_recomanat,
			variants_no_normatives: formData.variants_no_normatives,
			context_d_us: formData.context_d_us,
			exemples_correctes: formData.exemples_correctes || [],
			exemples_incorrectes: formData.exemples_incorrectes || [],
			notes_linguistiques: formData.notes_linguistiques,
			categoria: formData.categoria || Category.ALTRES,
			ambit: formData.ambit || Ambit.ADMINISTRATIU_GENERIC,
			prioritat: formData.prioritat || Priority.MITJANA,
			font: formData.font,
			createdAt: term?.createdAt || new Date(),
			updatedAt: new Date(),
		}

		onSave(glossaryTerm)
	}

	const addItem = (field: "variants_no_normatives" | "exemples_correctes" | "exemples_incorrectes", value: string, setter: (val: string) => void) => {
		if (value.trim()) {
			setFormData({
				...formData,
				[field]: [...(formData[field] || []), value.trim()],
			})
			setter("")
		}
	}

	const removeItem = (field: "variants_no_normatives" | "exemples_correctes" | "exemples_incorrectes", index: number) => {
		setFormData({
			...formData,
			[field]: formData[field]?.filter((_, i) => i !== index),
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{term ? "Editar Terme" : "Nou Terme del Glossari"}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-6'>
					{/* Terme recomanat */}
					<div className='space-y-2'>
						<Label htmlFor='terme_recomanat'>Terme recomanat *</Label>
						<Input
							id='terme_recomanat'
							value={formData.terme_recomanat}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, terme_recomanat: e.target.value })}
							placeholder='Introdueix el terme recomanat'
							required
						/>
					</div>
					{/* Categoria */}
					<div className='space-y-2'>
						<Label htmlFor='categoria'>Categoria *</Label>
						<select id='categoria' value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value as Category })} className='w-full px-3 py-2 border rounded-md'>
							{categoryOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					{/* Àmbit */}
					<div className='space-y-2'>
						<Label htmlFor='ambit'>Àmbit *</Label>
						<select id='ambit' value={formData.ambit} onChange={(e) => setFormData({ ...formData, ambit: e.target.value as Ambit })} className='w-full px-3 py-2 border rounded-md'>
							{ambitOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					{/* Prioritat */}
					<div className='space-y-2'>
						<Label htmlFor='prioritat'>Prioritat *</Label>
						<select id='prioritat' value={formData.prioritat} onChange={(e) => setFormData({ ...formData, prioritat: e.target.value as Priority })} className='w-full px-3 py-2 border rounded-md'>
							{priorityOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					{/* Context d'ús */}
					<div className='space-y-2'>
						<Label htmlFor='context_d_us'>Context d'ús</Label>
						<textarea
							id='context_d_us'
							value={formData.context_d_us}
							onChange={(e) => setFormData({ ...formData, context_d_us: e.target.value })}
							placeholder="Descripció del context d'ús del terme"
							className='w-full min-h-[80px] px-3 py-2 border rounded-md'
						/>
					</div>
					{/* Variants no normatives */}
					<div className='space-y-2'>
						<Label>Variants NO normatives</Label>
						<div className='flex flex-wrap gap-2 mb-2'>
							{formData.variants_no_normatives?.map((variant, index) => (
								<Badge key={index} variant='secondary' className='cursor-pointer bg-red-100 text-red-800' onClick={() => removeItem("variants_no_normatives", index)}>
									{variant} <X className='h-3 w-3 ml-1' />
								</Badge>
							))}
						</div>
						<div className='flex gap-2'>
							<Input
								value={newVariant}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVariant(e.target.value)}
								placeholder='Afegir variant no normativa'
								onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.preventDefault(), addItem("variants_no_normatives", newVariant, setNewVariant))}
							/>
							<Button type='button' onClick={() => addItem("variants_no_normatives", newVariant, setNewVariant)} size='icon'>
								<Plus className='h-4 w-4' />
							</Button>
						</div>
					</div>
					{/* Exemples correctes */}
					<div className='space-y-2'>
						<Label>Exemples correctes</Label>
						<div className='space-y-1 mb-2'>
							{formData.exemples_correctes?.map((example, index) => (
								<div key={index} className='flex items-center gap-2 p-2 border rounded-md bg-green-50'>
									<span className='flex-1 text-sm'>{example}</span>
									<Button type='button' variant='ghost' size='icon' onClick={() => removeItem("exemples_correctes", index)}>
										<X className='h-4 w-4' />
									</Button>
								</div>
							))}
						</div>
						<div className='flex gap-2'>
							<Input
								value={newExampleCorrect}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExampleCorrect(e.target.value)}
								placeholder='Afegir exemple correcte'
								onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.preventDefault(), addItem("exemples_correctes", newExampleCorrect, setNewExampleCorrect))}
							/>
							<Button type='button' onClick={() => addItem("exemples_correctes", newExampleCorrect, setNewExampleCorrect)} size='icon'>
								<Plus className='h-4 w-4' />
							</Button>
						</div>
					</div>
					{/* Exemples incorrectes */}
					<div className='space-y-2'>
						<Label>Exemples incorrectes</Label>
						<div className='space-y-1 mb-2'>
							{formData.exemples_incorrectes?.map((example, index) => (
								<div key={index} className='flex items-center gap-2 p-2 border rounded-md bg-red-50'>
									<span className='flex-1 text-sm line-through'>{example}</span>
									<Button type='button' variant='ghost' size='icon' onClick={() => removeItem("exemples_incorrectes", index)}>
										<X className='h-4 w-4' />
									</Button>
								</div>
							))}
						</div>
						<div className='flex gap-2'>
							<Input
								value={newExampleIncorrect}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExampleIncorrect(e.target.value)}
								placeholder='Afegir exemple incorrecte'
								onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.preventDefault(), addItem("exemples_incorrectes", newExampleIncorrect, setNewExampleIncorrect))}
							/>
							<Button type='button' onClick={() => addItem("exemples_incorrectes", newExampleIncorrect, setNewExampleIncorrect)} size='icon'>
								<Plus className='h-4 w-4' />
							</Button>
						</div>
					</div>
					{/* Notes lingüístiques */}
					<div className='space-y-2'>
						<Label htmlFor='notes_linguistiques'>Notes lingüístiques</Label>
						<textarea
							id='notes_linguistiques'
							value={formData.notes_linguistiques}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes_linguistiques: e.target.value })}
							placeholder="Notes addicionals sobre l'ús del terme"
							className='w-full min-h-[100px] px-3 py-2 border rounded-md'
						/>
					</div>
					{/* Font */}
					<div className='space-y-2'>
						<Label htmlFor='font'>Font</Label>
						<Input id='font' value={formData.font} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, font: e.target.value })} placeholder='Ex: TERMCAT; Optimot' />
					</div>{" "}
					{/* Actions */}
					<div className='flex justify-end gap-2 pt-4'>
						<Button type='button' variant='outline' onClick={onCancel}>
							Cancel·lar
						</Button>
						<Button type='submit'>{term ? "Actualitzar" : "Crear"} Terme</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
