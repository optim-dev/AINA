import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { functions } from "@/services/firebase"
import { httpsCallable } from "firebase/functions"
import { useSettingsStore } from "@/stores/settingsStore"
import type { AinaModule } from "@/modules/shared/types"

const MODULE: AinaModule = "kit"

interface Message {
	role: "user" | "assistant"
	content: string
}

export default function Instruct() {
	const [prompt, setPrompt] = useState("")
	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const scrollRef = useRef<HTMLDivElement>(null)

	// Get selected model from settings store
	const selectedModel = useSettingsStore((state) => state.selectedModel)

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [messages, loading])

	const handleSend = async () => {
		if (!prompt.trim()) return

		const userMessage: Message = { role: "user", content: prompt }
		setMessages((prev) => [...prev, userMessage])
		setPrompt("")
		setLoading(true)
		setError(null)

		try {
			const askLLM = httpsCallable(functions, "askLLM")
			const result = await askLLM({
				prompt: userMessage.content,
				module: MODULE,
				model: selectedModel || "gemini-2.5-flash",
			})
			const data = result.data

			// Handle responses - API now returns JSON directly (array or object)
			const content = typeof data === "object" ? JSON.stringify(data, null, 2) : (data as string) || "No response data"
			console.log("Instruct response data:", data)
			console.log("Instruct response content:", content)

			setMessages((prev) => [...prev, { role: "assistant", content }])
		} catch (err: any) {
			console.error("Error calling instruct endpoint:", err)
			setError(err.message || "Failed to get response")
		} finally {
			setLoading(false)
		}
	}

	return (
		<DashboardLayout>
			<div className='space-y-6 p-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Instruct</h1>
					<p className='text-muted-foreground mt-2'>Interactua amb el model de llenguatge directament.</p>
				</div>

				<div className='grid gap-6 md:grid-cols-1'>
					<Card className='h-[calc(100vh-250px)] flex flex-col'>
						<CardHeader>
							<CardTitle>Xat amb el Model</CardTitle>
						</CardHeader>
						<CardContent className='flex-1 flex flex-col gap-4'>
							<div ref={scrollRef} className='flex-1 overflow-y-auto border rounded-md p-4 space-y-4 bg-muted/10'>
								{messages.length === 0 && !loading && !error && <div className='h-full flex items-center justify-center text-muted-foreground text-sm italic'>Escriu un prompt per començar...</div>}

								{messages.map((msg, index) => (
									<div key={index} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
										<div className={cn("p-2 rounded-full h-fit", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
											{msg.role === "user" ? <User className='h-5 w-5' /> : <Bot className='h-5 w-5' />}
										</div>
										<div className={cn("border rounded-lg p-3 shadow-sm max-w-[80%]", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card")}>
											<p className='whitespace-pre-wrap text-sm'>{msg.content}</p>
										</div>
									</div>
								))}

								{loading && (
									<div className='flex gap-3'>
										<div className='bg-muted text-muted-foreground p-2 rounded-full h-fit'>
											<Bot className='h-5 w-5' />
										</div>
										<div className='bg-card border rounded-lg p-3 shadow-sm'>
											<div className='flex space-x-2'>
												<div className='w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]'></div>
												<div className='w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]'></div>
												<div className='w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce'></div>
											</div>
										</div>
									</div>
								)}

								{error && <div className='p-3 text-sm text-destructive bg-destructive/10 rounded-md'>{error}</div>}
							</div>

							<div className='flex gap-2'>
								<Textarea
									placeholder='Escriu el teu prompt aquí...'
									value={prompt}
									onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
									className='min-h-[80px] resize-none'
									onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault()
											handleSend()
										}
									}}
								/>
								<Button onClick={handleSend} disabled={loading || !prompt.trim()} className='h-auto px-6'>
									{loading ? <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div> : <Send className='h-5 w-5' />}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</DashboardLayout>
	)
}
