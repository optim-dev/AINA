import React from "react"
import { Link, useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/authStore"
import { useSettingsStore } from "@/stores/settingsStore"
import { Cpu } from "lucide-react"
import { MODEL_LABELS } from "@/modules/shared/types"

/** @typedef {import("@/modules/shared/types").LLMModel} LLMModel */

export function NavHeader() {
	const { user, logout } = useAuthStore()
	const selectedModel = useSettingsStore((state) => state.selectedModel)
	const navigate = useNavigate()

	const handleLogout = () => {
		logout()
		navigate("/login")
	}

	const getUserInitials = (email) => {
		if (!email) return "U"
		return email.substring(0, 2).toUpperCase()
	}

	/** @param {LLMModel} modelId */
	const getModelDisplayName = (modelId) => {
		return MODEL_LABELS[modelId] || "No seleccionat"
	}

	return (
		<header className='flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-gradient-to-r from-[#2d5c3f]/5 via-[#3d7a4f]/5 to-[#4a9960]/5'>
			<div className='flex flex-1 items-center gap-2'>
				<Link to='/dashboard' className='transition-opacity hover:opacity-80'>
					<h1 className='text-xl font-bold bg-gradient-to-r from-[#2d5c3f] via-[#3d7a4f] to-[#4a9960] bg-clip-text text-transparent'>AINA - Demostradors</h1>
				</Link>
			</div>
			<div className='flex items-center gap-4'>
				<Badge variant='outline' className='text-xs flex items-center gap-1.5'>
					<Cpu className='h-3 w-3' />
					{getModelDisplayName(selectedModel)}
				</Badge>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='ghost' className='relative h-10 w-10 rounded-full hover:bg-accent'>
							<Avatar className='h-10 w-10 border-2 border-[#3d7a4f]/20 hover:border-[#3d7a4f]/40 transition-colors'>
								<AvatarFallback className='bg-gradient-to-br from-[#2d5c3f]/10 via-[#3d7a4f]/10 to-[#4a9960]/10 text-[#2d5c3f] font-semibold'>{getUserInitials(user?.email)}</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className='w-56' align='end' forceMount sideOffset={8}>
						<DropdownMenuLabel className='font-normal'>
							<div className='flex flex-col space-y-1'>
								<p className='text-sm font-medium leading-none'>Compte</p>
								<p className='text-xs leading-none text-muted-foreground'>{user?.email}</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout} className='text-red-600 focus:text-red-600 cursor-pointer'>
							<LogOut className='mr-2 h-4 w-4' />
							<span>Tancar sessió</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}
