import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	className?: string
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
	size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
	asChild?: boolean
}

export declare function Button(props: ButtonProps): React.JSX.Element
export declare const buttonVariants: (props?: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string }) => string
