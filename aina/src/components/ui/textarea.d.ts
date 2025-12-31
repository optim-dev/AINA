import * as React from "react"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	className?: string
}

export declare function Textarea(props: TextareaProps): React.JSX.Element
