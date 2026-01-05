import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import LoginForm from "./components/LoginForm"
import Dashboard from "./pages/Dashboard"
import Health from "./pages/Health"
import Moduls from "./pages/Moduls"
import ModelSelection from "./pages/ModelSelection"
import ModelMetriques from "./pages/ModelMetriques"
import ProtectedRoute from "./components/ProtectedRoute"
import Valoracio from "./modules/valoracio/pages/Module1"
import Elaboracio from "./modules/elaboracio/pages/Module2"
import Kit from "./modules/kit/pages/RAGTerminologic"
import MetriquesValoracio from "./modules/valoracio/pages/Metriques"
import MetriquesElaboracio from "./modules/elaboracio/pages/Metriques"
import MetriquesKit from "./modules/kit/pages/Metriques"
import CorreccioOrtografica from "./modules/kit/pages/CorreccioOrtografica"
import ValidacioEstil from "./modules/kit/pages/ValidacioEstil"
import ProcessamentVertical from "./modules/kit/pages/ProcessamentVertical"
import Instruct from "./modules/kit/pages/Instruct"

function App() {
	const user = useAuthStore((state: any) => state.user)

	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={user ? <Navigate to='/health' replace /> : <Navigate to='/login' replace />} />
				<Route
					path='/login'
					element={
						<main className='relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20'>
							{/* Decorative background elements */}
							{/* <div className='absolute inset-0 -z-10'>
								<div className='absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl' />
								<div className='absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl' />
							</div> */}

							<section className='container mx-auto flex justify-center items-center px-4 py-8'>
								<div className='animate-in fade-in-0 zoom-in-95 duration-500'>
									<LoginForm />
								</div>
							</section>
						</main>
					}
				/>
				<Route
					path='/dashboard'
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/health'
					element={
						<ProtectedRoute>
							<Health />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/moduls'
					element={
						<ProtectedRoute>
							<Moduls />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/seleccio-model'
					element={
						<ProtectedRoute>
							<ModelSelection />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/seleccio-model/metriques'
					element={
						<ProtectedRoute>
							<ModelMetriques />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/valoracio'
					element={
						<ProtectedRoute>
							<Valoracio />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/elaboracio'
					element={
						<ProtectedRoute>
							<Elaboracio />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit'
					element={
						<ProtectedRoute>
							<Kit />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/valoracio/metriques'
					element={
						<ProtectedRoute>
							<MetriquesValoracio />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/elaboracio/metriques'
					element={
						<ProtectedRoute>
							<MetriquesElaboracio />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit/metriques'
					element={
						<ProtectedRoute>
							<MetriquesKit />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit/correccio-ortografica'
					element={
						<ProtectedRoute>
							<CorreccioOrtografica />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit/instruct'
					element={
						<ProtectedRoute>
							<Instruct />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit/validacio-estil'
					element={
						<ProtectedRoute>
							<ValidacioEstil />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/kit/processament-vertical'
					element={
						<ProtectedRoute>
							<ProcessamentVertical />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	)
}

export default App
