import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string
}

export declare function Card(props: CardProps): React.JSX.Element
export declare function CardHeader(props: CardHeaderProps): React.JSX.Element
export declare function CardTitle(props: CardTitleProps): React.JSX.Element
export declare function CardDescription(props: CardDescriptionProps): React.JSX.Element
export declare function CardContent(props: CardContentProps): React.JSX.Element
export declare function CardFooter(props: CardFooterProps): React.JSX.Element
