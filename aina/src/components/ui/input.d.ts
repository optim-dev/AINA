import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	className?: string
	type?: string
}

export declare function Input(props: InputProps): React.JSX.Element
