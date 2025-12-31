import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { Folder, FolderOpen, Target, HardDriveUpload, LayoutGrid, Wrench, MessageSquare, BarChart3, Type, Palette, Cpu, Activity, ArrowDownUp } from "lucide-react"

import {
	Sidebar,
	SidebarSeparator,
	SidebarFooter,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarHeader,
	SidebarTrigger,
	SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
	const location = useLocation()
	const pathname = location.pathname

	// Detectar quin mòdul està actiu
	const activeModule = React.useMemo(() => {
		if (pathname.startsWith("/valoracio")) return "valoracio"
		if (pathname.startsWith("/elaboracio")) return "elaboracio"
		if (pathname.startsWith("/kit")) return "kit"
		if (pathname.startsWith("/seleccio-model")) return "seleccio-model"
		return null
	}, [pathname])

	return (
		<Sidebar collapsible='icon' variant='inset'>
			<SidebarHeader className='border-b border-sidebar-border'>
				<div className='flex items-center justify-between gap-2 px-2'>
					<SidebarMenu className='flex-1'>
						<SidebarMenuItem>
							<SidebarMenuButton size='lg' asChild className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'>
								<Link to='/dashboard'>
									<div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2d5c3f] to-[#3d7a4f] text-white'>
										<FolderOpen className='size-4' />
									</div>
									<div className='grid flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-semibold'>AINA</span>
										<span className='truncate text-xs text-muted-foreground'>Demostradors</span>
									</div>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
					<SidebarTrigger className='ml-auto' />
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>General</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton tooltip='Mòduls' asChild isActive={pathname === "/moduls"}>
									<Link to='/moduls'>
										<LayoutGrid />
										<span>Mòduls</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							<SidebarMenuItem>
								<SidebarMenuButton tooltip='Selecció de model' asChild isActive={pathname === "/seleccio-model"}>
									<Link to='/seleccio-model'>
										<Cpu />
										<span>Selecció de model</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							<SidebarMenuItem>
								<SidebarMenuButton tooltip='Monitor de Salut' asChild isActive={pathname === "/health"}>
									<Link to='/health'>
										<Activity />
										<span>Monitor de Salut</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarSeparator />

				<SidebarGroup>
					<SidebarGroupLabel>Mòduls Individuals</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton tooltip="Valoració d'Ofertes" asChild isActive={pathname.startsWith("/valoracio")}>
									<Link to='/valoracio'>
										<Target />
										<span>Valoració d'Ofertes</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							<SidebarMenuItem>
								<SidebarMenuButton tooltip='Elaboració Decrets' asChild isActive={pathname.startsWith("/elaboracio")}>
									<Link to='/elaboracio'>
										<Target />
										<span>Elaboració Decrets</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							<SidebarMenuItem>
								<SidebarMenuButton tooltip='Kit Lingüístic' asChild isActive={pathname.startsWith("/kit")}>
									<Link to='/kit'>
										<Target />
										<span>Kit Lingüístic</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Menú contextual per Valoració d'Ofertes */}
				{activeModule === "valoracio" && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel>Valoració d'Ofertes</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Eina' asChild isActive={pathname === "/valoracio"}>
											<Link to='/valoracio'>
												<Wrench />
												<span>Eina</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Mètriques' asChild isActive={pathname === "/valoracio/metriques"}>
											<Link to='/valoracio/metriques'>
												<BarChart3 />
												<span>Mètriques</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}

				{/* Menú contextual per Elaboració Decrets */}
				{activeModule === "elaboracio" && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel>Elaboració Decrets</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Eina' asChild isActive={pathname === "/elaboracio"}>
											<Link to='/elaboracio'>
												<Wrench />
												<span>Eina</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Mètriques' asChild isActive={pathname === "/elaboracio/metriques"}>
											<Link to='/elaboracio/metriques'>
												<BarChart3 />
												<span>Mètriques</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}

				{/* Menú contextual per Kit Lingüístic */}
				{activeModule === "kit" && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel>Kit Lingüístic</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Correcció ortogràfica i sintàctica' asChild isActive={pathname === "/kit/correccio-ortografica"}>
											<Link to='/kit/correccio-ortografica'>
												<Type />
												<span>Correcció ortogràfica</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='RAG Terminològic' asChild isActive={pathname === "/kit"}>
											<Link to='/kit'>
												<Wrench />
												<span>RAG Terminològic</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip="Validació d'estil i to" asChild isActive={pathname === "/kit/validacio-estil"}>
											<Link to='/kit/validacio-estil'>
												<Palette />
												<span>Validació d'estil</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Instruct' asChild isActive={pathname === "/kit/instruct"}>
											<Link to='/kit/instruct'>
												<MessageSquare />
												<span>Instruct</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Processament Vertical' asChild isActive={pathname === "/kit/processament-vertical"}>
											<Link to='/kit/processament-vertical'>
												<ArrowDownUp />
												<span>Processament Vertical</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Mètriques' asChild isActive={pathname === "/kit/metriques"}>
											<Link to='/kit/metriques'>
												<BarChart3 />
												<span>Mètriques</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}

				{/* Menú contextual per Selecció de model */}
				{activeModule === "seleccio-model" && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel>Selecció de model</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Selecció de model' asChild isActive={pathname === "/seleccio-model"}>
											<Link to='/seleccio-model'>
												<Cpu />
												<span>Seleccionar model</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton tooltip='Mètriques globals LLM' asChild isActive={pathname === "/seleccio-model/metriques"}>
											<Link to='/seleccio-model/metriques'>
												<BarChart3 />
												<span>Mètriques</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				)}
			</SidebarContent>

			<SidebarFooter className='border-t border-sidebar-border'>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size='sm' className='text-xs text-muted-foreground hover:text-foreground'>
							<span className='truncate'>OptimTech © 2025</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
