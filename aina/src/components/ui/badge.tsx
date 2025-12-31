import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "secondary" | "outline"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => {
	const variantClasses = {
		default: "bg-blue-100 text-blue-800 border-blue-200",
		secondary: "bg-slate-100 text-slate-800 border-slate-200",
		outline: "bg-white text-slate-700 border-slate-300",
	}

	return <div ref={ref} className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors", variantClasses[variant], className)} {...props} />
})

Badge.displayName = "Badge"

export { Badge }
