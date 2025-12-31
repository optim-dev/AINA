import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { GlossaryTerm, Category, Ambit, Priority } from "../types/glossary"

interface GlossaryTermCardProps {
	term: GlossaryTerm
	onEdit?: (term: GlossaryTerm) => void
	onDelete?: (termId: string) => void
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

const ambitLabels: Record<Ambit, string> = {
	[Ambit.ADMINISTRATIU_GENERIC]: "Administratiu genèric",
	[Ambit.ADMINISTRATIU_JUDICIAL]: "Administratiu i judicial",
	[Ambit.URBANISME]: "Urbanisme",
	[Ambit.TECNIC]: "Tècnic",
	[Ambit.LEGAL]: "Legal",
	[Ambit.FINANCER]: "Financer",
	[Ambit.EDUCATIU]: "Educatiu",
}

const priorityLabels: Record<Priority, string> = {
	[Priority.ALTA]: "Alta",
	[Priority.MITJANA]: "Mitjana",
	[Priority.BAIXA]: "Baixa",
}

const categoryColors: Record<Category, string> = {
	[Category.VERB]: "bg-blue-100 text-blue-800",
	[Category.NOM]: "bg-purple-100 text-purple-800",
	[Category.ADJECTIU]: "bg-pink-100 text-pink-800",
	[Category.ADVERBI]: "bg-orange-100 text-orange-800",
	[Category.LOCUCION]: "bg-cyan-100 text-cyan-800",
	[Category.EXPRESSIO]: "bg-teal-100 text-teal-800",
	[Category.ALTRES]: "bg-gray-100 text-gray-800",
}

const priorityColors: Record<Priority, string> = {
	[Priority.ALTA]: "bg-red-100 text-red-800",
	[Priority.MITJANA]: "bg-yellow-100 text-yellow-800",
	[Priority.BAIXA]: "bg-green-100 text-green-800",
}

export default function GlossaryTermCard({ term, onEdit, onDelete }: GlossaryTermCardProps) {
	return (
		<Card className='hover:shadow-md transition-shadow'>
			<CardHeader>
				<div className='flex justify-between items-start'>
					<div className='space-y-2 flex-1'>
						<div className='flex items-center gap-2 flex-wrap'>
							<CardTitle className='text-xl'>{term.terme_recomanat}</CardTitle>
							<Badge className={categoryColors[term.categoria]}>{categoryLabels[term.categoria]}</Badge>
							<Badge variant='outline'>{ambitLabels[term.ambit]}</Badge>
							<Badge className={priorityColors[term.prioritat]}>{priorityLabels[term.prioritat]}</Badge>
						</div>
						{term.context_d_us && <CardDescription className='text-base'>{term.context_d_us}</CardDescription>}
					</div>
					<div className='flex gap-2'>
						{onEdit && (
							<Button variant='ghost' size='icon' onClick={() => onEdit(term)}>
								<Edit className='h-4 w-4' />
							</Button>
						)}
						{onDelete && (
							<Button variant='ghost' size='icon' onClick={() => onDelete(term.id)}>
								<Trash2 className='h-4 w-4' />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Variants no normatives */}
				{term.variants_no_normatives && term.variants_no_normatives.length > 0 && (
					<div>
						<h4 className='font-semibold mb-2 text-sm text-red-700'>❌ Variants NO normatives:</h4>
						<div className='flex flex-wrap gap-1'>
							{term.variants_no_normatives.map((variant, index) => (
								<Badge key={index} variant='secondary' className='font-normal bg-red-100 text-red-800'>
									{variant}
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Exemples correctes */}
				{term.exemples_correctes && term.exemples_correctes.length > 0 && (
					<div>
						<h4 className='font-semibold mb-2 text-sm text-green-700 flex items-center gap-1'>
							<CheckCircle2 className='h-4 w-4' />
							Exemples correctes:
						</h4>
						<ul className='space-y-1'>
							{term.exemples_correctes.map((example, index) => (
								<li key={index} className='text-sm text-gray-700 pl-4 border-l-2 border-green-500 bg-green-50 py-1 px-2 rounded'>
									{example}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Exemples incorrectes */}
				{term.exemples_incorrectes && term.exemples_incorrectes.length > 0 && (
					<div>
						<h4 className='font-semibold mb-2 text-sm text-red-700 flex items-center gap-1'>
							<XCircle className='h-4 w-4' />
							Exemples incorrectes:
						</h4>
						<ul className='space-y-1'>
							{term.exemples_incorrectes.map((example, index) => (
								<li key={index} className='text-sm text-gray-700 pl-4 border-l-2 border-red-500 bg-red-50 py-1 px-2 rounded line-through'>
									{example}
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Notes lingüístiques */}
				{term.notes_linguistiques && (
					<div>
						<h4 className='font-semibold mb-2 text-sm'>📝 Notes lingüístiques:</h4>
						<p className='text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-400'>{term.notes_linguistiques}</p>
					</div>
				)}

				{/* Font */}
				{term.font && (
					<div className='flex items-center gap-2 text-xs text-gray-500 pt-2 border-t'>
						<span className='font-semibold'>Font:</span>
						<span>{term.font}</span>
					</div>
				)}

				{/* Metadata */}
				<div className='text-xs text-gray-400 pt-2 border-t'>
					Creat: {new Date(term.createdAt).toLocaleDateString("ca-ES")} | Actualitzat: {new Date(term.updatedAt).toLocaleDateString("ca-ES")}
				</div>
			</CardContent>
		</Card>
	)
}
