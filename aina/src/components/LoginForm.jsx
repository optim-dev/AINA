import { useState, useRef } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { auth } from "@/services/firebase"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Mail, Lock, AlertCircle, Loader2, FlaskConical } from "lucide-react"

export default function LoginForm() {
	const navigate = useNavigate()
	const { setUser, setLoading, setError } = useAuthStore()

	const [loading, setLocalLoading] = useState(false)
	const [error, setLocalError] = useState(null)
	const [email, setEmail] = useState("s@s.com")
	const [password, setPassword] = useState("12345678")
	const [touched, setTouched] = useState({ email: false, password: false })

	const emailRef = useRef(null)
	const passwordRef = useRef(null)

	// Email validation
	const isValidEmail = (email) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	}

	const emailError = touched.email && email && !isValidEmail(email)
	const passwordError = touched.password && password && password.length < 6

	const onLogin = async () => {
		setLocalLoading(true)
		setLoading(true)
		setLocalError(null)
		setError(null)

		const emailValue = emailRef.current?.value
		const passwordValue = passwordRef.current?.value

		if (!emailValue || !passwordValue) {
			setLocalLoading(false)
			setLoading(false)
			return
		}

		try {
			const userCredential = await signInWithEmailAndPassword(auth, emailValue, passwordValue)

			// Store user in Zustand
			setUser({
				uid: userCredential.user.uid,
				email: userCredential.user.email,
				displayName: userCredential.user.displayName,
			})

			// Navigate to health monitor
			navigate("/health")
		} catch (e) {
			let errorMessage = "Unknown error"

			if (e.code === "auth/internal-error") {
				errorMessage = "Error intern del sistema"
			} else if (e.code === "auth/user-not-found") {
				errorMessage = "Usuari no trobat"
			} else if (e.code === "auth/wrong-password") {
				errorMessage = "Contrasenya incorrecta"
			} else if (e.code === "auth/too-many-requests") {
				errorMessage = "Massa intents. Prova-ho més tard"
			} else if (e.code === "auth/invalid-email") {
				errorMessage = "Email invàlid"
			} else if (e.code === "auth/user-disabled") {
				errorMessage = "El teu usuari ha estat deshabilitat"
			} else if (e.code === "auth/invalid-credential") {
				errorMessage = "Credencials incorrectes"
			}

			setLocalError(errorMessage)
			setError(errorMessage)
		} finally {
			setLocalLoading(false)
			setLoading(false)
		}
	}

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && email && password && !emailError && !passwordError) {
			onLogin()
		}
	}

	return (
		<Card className='mx-auto max-w-sm min-w-[400px] shadow-xl'>
			<CardHeader className='space-y-1'>
				<div className='flex items-center gap-2'>
					<FlaskConical className='h-6 w-6 text-primary' />
					<CardTitle className='text-2xl font-bold'>Aina - demostradors</CardTitle>
				</div>
				<CardDescription>
					<ul className='list-disc list-inside space-y-1'>
						<li>Funcionalitat 1: Elaboració d'informes de valoració d'ofertes en licitacions públiques.</li>
						<li>Funcionalitat 2: Elaboració de decrets de subvenció a partir de les sol·licituds rebudes.</li>
						<li>Funcionalitat 3: Funcionalitat lingüística de correcció i adequació al català administratiu.</li>
					</ul>
				</CardDescription>
			</CardHeader>

			<CardContent>
				<div className='grid gap-4'>
					{error && (
						<Alert variant='destructive' className='animate-in fade-in-0 slide-in-from-top-2'>
							<AlertCircle className='h-4 w-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className='grid gap-2'>
						<Label htmlFor='email'>Email</Label>
						<div className='relative'>
							<Mail className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
							<Input
								id='email'
								type='email'
								placeholder='exemple@correu.com'
								required
								ref={emailRef}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onBlur={() => setTouched({ ...touched, email: true })}
								onKeyPress={handleKeyPress}
								className={`pl-9 transition-all ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
								disabled={loading}
							/>
						</div>
						{emailError && <p className='text-xs text-destructive animate-in fade-in-0'>Introdueix un email vàlid</p>}
					</div>

					<div className='grid gap-2'>
						<Label htmlFor='password'>Contrasenya</Label>
						<div className='relative'>
							<Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
							<Input
								id='password'
								type='password'
								required
								ref={passwordRef}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onBlur={() => setTouched({ ...touched, password: true })}
								onKeyPress={handleKeyPress}
								className={`pl-9 transition-all ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
								disabled={loading}
							/>
						</div>
						{passwordError && <p className='text-xs text-destructive animate-in fade-in-0'>La contrasenya ha de tenir mínim 6 caràcters</p>}
					</div>

					<Button
						type='submit'
						className={`w-full transition-all ${!email || !password || emailError || passwordError ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}`}
						onClick={onLogin}
						disabled={!email || !password || !!emailError || !!passwordError || loading}
					>
						{loading && (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Accedint...
							</>
						)}
						{!loading && "Accedir"}
					</Button>
				</div>

				<div className='mt-4 text-center text-sm text-muted-foreground'>
					<p>Demostradors funcionals</p>
				</div>
			</CardContent>
		</Card>
	)
}
