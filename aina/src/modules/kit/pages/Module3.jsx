import DashboardLayout from "@/components/DashboardLayout"
import GlossaryViewer from "../components/GlossaryViewer"
import { useSettingsStore } from "@/stores/settingsStore"

export default function Kit() {
	// TODO: Fetch real data
	const sampleTerms = []

	return (
		<DashboardLayout>
			<div className='space-y-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Kit Lingüístic</h1>
					<p className='text-muted-foreground'>Glossari Tècnic-Administratiu</p>
				</div>

				<GlossaryViewer initialTerms={sampleTerms} />
			</div>
		</DashboardLayout>
	)
}
