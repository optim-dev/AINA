import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/DashboardLayout"
import { useNavigate } from "react-router-dom"

export default function Moduls() {
	const navigate = useNavigate()

	return (
		<DashboardLayout>
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				<Card className='hover:shadow-lg transition-all hover:-translate-y-1 border-2'>
					<CardHeader>
						<CardTitle>Valoració d'Ofertes</CardTitle>
						<CardDescription>Gestió i avaluació d'ofertes</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => navigate("/valoracio")} className='w-full bg-gradient-to-r from-[#2d5c3f] via-[#3d7a4f] to-[#4a9960] hover:from-[#244a32] hover:via-[#2d5c3f] hover:to-[#3d7a4f] text-white'>
							Accedir
						</Button>
					</CardContent>
				</Card>

				<Card className='hover:shadow-lg transition-all hover:-translate-y-1 border-2'>
					<CardHeader>
						<CardTitle>Elaboració Decrets</CardTitle>
						<CardDescription>Gestió i elaboració de decrets</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => navigate("/elaboracio")} className='w-full bg-gradient-to-r from-[#2d5c3f] via-[#3d7a4f] to-[#4a9960] hover:from-[#244a32] hover:via-[#2d5c3f] hover:to-[#3d7a4f] text-white'>
							Accedir
						</Button>
					</CardContent>
				</Card>

				<Card className='hover:shadow-lg transition-all hover:-translate-y-1 border-2'>
					<CardHeader>
						<CardTitle>Kit Lingüístic</CardTitle>
						<CardDescription>Eines i recursos lingüístics</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => navigate("/kit")} className='w-full bg-gradient-to-r from-[#2d5c3f] via-[#3d7a4f] to-[#4a9960] hover:from-[#244a32] hover:via-[#2d5c3f] hover:to-[#3d7a4f] text-white'>
							Accedir
						</Button>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
