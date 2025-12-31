import * as React from "react"

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
	className?: string
}

export declare function Label(props: LabelProps): React.JSX.Element
