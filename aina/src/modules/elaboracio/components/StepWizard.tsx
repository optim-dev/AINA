import { ReactNode } from "react"
import { Check, Circle, Lock, Download } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "pending" | "current" | "validated" | "locked"

export interface Step {
	id: string
	title: string
	status: StepStatus
	onDownload?: () => void // Optional download action
}

interface StepWizardProps {
	steps: Step[]
	currentStepIndex: number
	onStepClick: (index: number) => void
	children: ReactNode
}

export function StepWizard({ steps, currentStepIndex, onStepClick, children }: StepWizardProps) {
	return (
		<div className='space-y-6'>
			{/* Step indicators */}
			<div className='flex items-center justify-center'>
				<nav aria-label='Progress' className='w-full max-w-3xl'>
					<ol className='flex items-center'>
						{steps.map((step, index) => (
							<li key={step.id} className={cn("relative flex-1", index !== steps.length - 1 && "pr-8 sm:pr-20")}>
								{/* Connector line */}
								{index !== steps.length - 1 && (
									<div className='absolute top-4 left-0 -right-4 sm:-right-10 h-0.5 w-full' aria-hidden='true'>
										<div className={cn("h-full transition-colors duration-200", step.status === "validated" ? "bg-green-500" : "bg-gray-200")} />
									</div>
								)}

								{/* Step button */}
								<button
									onClick={() => {
										// Can only click on validated steps, pending steps (unlocked), or current step
										if (step.status === "validated" || step.status === "pending" || index === currentStepIndex) {
											onStepClick(index)
										}
									}}
									disabled={step.status === "locked"}
									className={cn("relative flex items-center justify-center group", step.status === "locked" && "cursor-not-allowed")}
								>
									<span className='flex flex-col items-center relative'>
										{/* Circle indicator */}
										<span
											className={cn(
												"flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
												step.status === "validated" && "border-green-500 bg-green-500 text-white",
												step.status === "current" && "border-blue-600 bg-blue-600 text-white",
												step.status === "pending" && "border-gray-300 bg-white text-gray-500",
												step.status === "locked" && "border-gray-200 bg-gray-100 text-gray-400"
											)}
										>
											{step.status === "validated" ? <Check className='h-4 w-4' /> : step.status === "locked" ? <Lock className='h-3 w-3' /> : <span className='text-sm font-medium'>{index + 1}</span>}
										</span>

										{/* Step title */}
										<span
											className={cn(
												"mt-2 text-xs font-medium text-center max-w-[100px]",
												step.status === "validated" && "text-green-600",
												step.status === "current" && "text-blue-600",
												step.status === "pending" && "text-gray-500",
												step.status === "locked" && "text-gray-400"
											)}
										>
											{step.title}
										</span>

										{/* Download button - absolutely positioned to not affect layout */}
										{step.status === "validated" && step.onDownload && (
											<button
												onClick={(e) => {
													e.stopPropagation()
													step.onDownload?.()
												}}
												className='absolute -bottom-8 p-1.5 rounded bg-green-600 hover:bg-green-700 text-white transition-colors'
												title={`Descarregar ${step.title}`}
											>
												<Download className='h-3.5 w-3.5' />
											</button>
										)}
									</span>
								</button>
							</li>
						))}
					</ol>
				</nav>
			</div>

			{/* Step content */}
			<div className='mt-8'>{children}</div>
		</div>
	)
}

interface StepContentProps {
	children: ReactNode
	isActive: boolean
}

export function StepContent({ children, isActive }: StepContentProps) {
	if (!isActive) return null
	return <div className='animate-in fade-in duration-200'>{children}</div>
}
