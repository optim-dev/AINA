import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/DashboardLayout"
import OptimEvaluator from "./OptimEvaluator"

export default function Valoracio() {
	return (
		<DashboardLayout>
			<div className='space-y-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Evaluador d'ofertes de Licitacions</h1>
					<p className='text-muted-foreground'>Sistema potenciat amb IA per a l'Avaluació de Licitacions</p>
				</div>

				<Card>
					<OptimEvaluator />
				</Card>
			</div>
		</DashboardLayout>
	)
}
