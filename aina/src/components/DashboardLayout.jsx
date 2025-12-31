import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { NavHeader } from "@/components/NavHeader"

export default function DashboardLayout({ children }) {
	return (
		<SidebarProvider defaultOpen={true}>
			<AppSidebar />
			<SidebarInset className='overflow-hidden'>
				<NavHeader />
				<div className='h-[calc(100vh-3.5rem)] overflow-y-auto p-4 md:p-6 lg:p-8'>
					<div className='flex flex-col gap-4 md:gap-8'>{children}</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
