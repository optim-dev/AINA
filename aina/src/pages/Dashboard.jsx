import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/DashboardLayout"
import { Construction } from "lucide-react"

export default function Dashboard() {
	return (
		<DashboardLayout>
			<div className='flex items-center justify-center min-h-[60vh]'>
				<Card className='max-w-md w-full'>
					<CardHeader className='text-center'>
						<div className='flex justify-center mb-4'>
							<Construction className='h-16 w-16 text-muted-foreground' />
						</div>
						<CardTitle className='text-2xl'>En Construcció</CardTitle>
					</CardHeader>
					<CardContent className='text-center text-muted-foreground'>
						<p>Aquesta pàgina està en desenvolupament.</p>
						<p className='mt-2'>Aviat estarà disponible.</p>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
