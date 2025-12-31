# Guia de Desenvolupament

## 🚀 Benvingut/da!

Aquesta guia t'ajudarà a començar a desenvolupar amb AINA, un demostrador tecnològic construït amb React + Vite + TypeScript i Firebase. Segueix els passos per configurar el teu entorn i contribuir al projecte.

## 📋 Prerequisits

### Software Requerit

- **Node.js**: >= 18.x LTS ([Descarregar](https://nodejs.org/))
- **npm**: >= 9.x (inclòs amb Node.js) o **yarn**: >= 1.22.x
- **Git**: >= 2.30.x ([Descarregar](https://git-scm.com/))
- **Firebase CLI**: Instal·la globalment
  ```bash
  npm install -g firebase-tools
  ```

### Comptes i Serveis

- **Compte GitHub**: Per clonar i contribuir al repositori
- **Compte Google/Firebase**: Per accedir a Firebase Console
- **Accés al projecte Firebase**: Demana accés a l'administrador

### Eines Recomanades

- **VS Code**: Editor recomanat ([Descarregar](https://code.visualstudio.com/))
- **Extensions de VS Code**:
  - ESLint
  - Prettier - Code formatter
  - Tailwind CSS IntelliSense
  - Firebase Explorer
  - GitLens
  - Error Lens
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Vue Plugin (Volar) - Per millor suport TypeScript

## 🔧 Configuració Inicial

### 1. Clonar el Repositori

```bash
git clone <repository-url>
cd CODE
```

### 2. Instal·lar Dependències

#### Frontend (React + Vite)

````bash
```bash
# Dins la carpeta aina
cd aina
npm install
````

**Instal·lar shadcn/ui Components** (si no estan ja):

```bash
cd aina

# Inicialitzar shadcn/ui (només la primera vegada)
npx shadcn@latest init

# Instal·lar components necessaris
npx shadcn@latest add button card input label alert

cd ..
```

> **Nota**: shadcn/ui està configurat amb:
>
> - Path aliases: `@/*` → `./src/*`
> - Tailwind CSS v4
> - Color mode: dark mode support
> - Style: New York (default shadcn style)

**Instal·lar lucide-react** (si no està ja):

```bash
cd aina
npm install lucide-react
cd ..
```

> **Nota**: lucide-react proporciona més de 1000 icones SVG optimitzades amb tree-shaking automàtic.

**Instal·lar Geist Font** (si no està ja):

```bash
cd aina
npm install geist
cd ..
```

> **Nota**: Geist és la tipografia moderna de Vercel, optimitzada per llegibilitat i rendiment web.

#### Backend (Cloud Functions)

````

**Instal·lar shadcn/ui Components** (si no estan ja):

```bash
cd aina

# Inicialitzar shadcn/ui (només la primera vegada)
npx shadcn@latest init

# Instal·lar components necessaris
npx shadcn@latest add button card input label alert

cd ..
````

> **Nota**: shadcn/ui està configurat amb:
>
> - Path aliases: `@/*` → `./src/*`
> - Tailwind CSS v4
> - Color mode: dark mode support
> - Style: New York (default shadcn style)

#### Backend (Cloud Functions)

```bash
# Dins la carpeta functions
cd functions
npm install
cd ..
```

### 3. Configurar Firebase

#### Login a Firebase

```bash
firebase login
```

#### Seleccionar el Projecte

```bash
firebase use --add
# Selecciona el projecte de la llista
# Dona-li un alias (ex: 'dev', 'prod')
```

#### Verificar Configuració

```bash
firebase projects:list
```

### 4. Variables d'Entorn

#### Frontend (.env.local)

Copia el fitxer d'exemple dins la carpeta `aina`:

```bash
cd aina
cp .env.example .env.local
```

Edita `aina/.env.local` amb les credencials del teu projecte Firebase (disponibles a Firebase Console > Project Settings):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# App Configuration
VITE_APP_NAME=AINA
VITE_APP_URL=http://localhost:5173

# Environment
NODE_ENV=development
```

> **Nota**: Vite utilitza el prefix `VITE_` per exposar variables d'entorn al client.

#### Backend (Functions)

Les functions utilitzen Firebase config o variables d'entorn específiques:

```bash
# Configurar secrets per functions
firebase functions:config:set \
  app.name="AINA" \
  app.environment="development"
```

### 5. Configurar Firestore i Storage

#### Crear Base de Dades Firestore

1. Ves a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el teu projecte
3. Firestore Database > Create Database
4. Tria mode: **Test mode** (per desenvolupament) o **Production mode**
5. Selecciona ubicació: **europe-west1** (recomanat per Europa)

#### Aplicar Regles de Seguretat

```bash
# Desplegar regles de Firestore
firebase deploy --only firestore:rules

# Desplegar regles de Storage
firebase deploy --only storage:rules
```

#### Inicialitzar Dades de Prova (Opcional)

```bash
npm run seed
# O crear script personalitzat per importar dades
```

### 6. Configurar Authentication

1. Firebase Console > Authentication
2. Get Started > Sign-in method
3. Habilita els mètodes desitjats:
   - **Email/Password**: Recomanat
   - **Google**: Opcional
   - Altres providers segons necessitat

### 7. Verificar la Instal·lació

#### Executar Emuladors

```bash
# Iniciar tots els emuladors
firebase emulators:start
```

Hauries de veure:

- ✓ Firestore Emulator: http://localhost:8080
- ✓ Functions Emulator: http://localhost:5001
- ✓ Auth Emulator: http://localhost:9099
- ✓ Storage Emulator: http://localhost:9199

#### Executar React + Vite

```bash
# En un altre terminal
cd aina
npm run dev
```

L'aplicació estarà disponible a: http://localhost:5173

## 📁 Estructura del Projecte

```
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json            # Root TypeScript config
│   ├── tsconfig.app.json        # App TypeScript config
│   ├── tsconfig.node.json       # Vite config TypeScript
│   ├── package.json
│   └── .env.local
│
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts             # Export de functions
│   │   ├── shared/              # Codi compartit
│   │   │   ├── logger.ts
│   │   │   └── utils.ts
│   │   ├── valoracio/             # Functions del mòdul 1
│   │   │   └── index.ts
│   │   ├── elaboracio/             # Functions del mòdul 2
│   │   │   └── index.ts
│   │   └── kit/             # Functions del mòdul 3
│   │       └── index.ts
│   ├── lib/                     # Compiled JavaScript
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.dev.json
│
├── aina/                         # Frontend React + TypeScript
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── vite-env.d.ts        # Vite type declarations
│   │   ├── components/
│   │   │   └── ui/              # shadcn/ui components
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── input.tsx
│   │   │       ├── label.tsx
│   │   │       └── alert.tsx
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions
│   │   └── ...
│   ├── tsconfig.json            # Root TS config with references
│   ├── tsconfig.app.json        # App-specific TS config with path aliases
│   ├── tsconfig.node.json       # Vite config TS settings
│   └── vite.config.ts           # Vite + Tailwind config
│
├── docs/                         # Documentació
│   ├── architecture.md
│   ├── api.md
│   └── development.md
│
├── firebase.json                 # Configuració Firebase
├── firestore.rules              # Regles de seguretat Firestore
├── firestore.indexes.json       # Índexs de Firestore
├── storage.rules                # Regles de seguretat Storage
├── apphosting.emulator.yaml     # Configuració emulador
└── README.md
```

## 🔀 Flux de Treball amb Git

### Estratègia de Branques

```
main                    # Producció (protegida)
  └── development       # Desenvolupament principal (protegida)
       ├── feature/xxx  # Noves funcionalitats
       ├── bugfix/xxx   # Correccions de bugs
       └── hotfix/xxx   # Correccions urgents
```

### Crear una Nova Feature

```bash
# Assegurar-se que estàs a development i està actualitzat
git checkout development
git pull origin development

# Crear nova branca
git checkout -b feature/nom-descriptiu

# Exemple:
git checkout -b feature/valoracio-data-export
```

### Fer Commits

Seguim [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat(valoracio): afegeix funcionalitat d'exportació"
```

**Format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: Nova funcionalitat
- `fix`: Correcció de bug
- `docs`: Canvis en documentació
- `style`: Format, puntuació (sense canvis de codi)
- `refactor`: Refactorització de codi
- `test`: Afegir o modificar tests
- `chore`: Manteniment, dependencies
- `perf`: Millores de rendiment

**Scopes:**

- `valoracio`, `elaboracio`, `kit`: Mòduls específics
- `auth`: Autenticació
- `firebase`: Configuració Firebase
- `ui`: Components d'interfície
- `functions`: Cloud Functions

**Exemples:**

```bash
git commit -m "feat(valoracio): afegeix pàgina de detall d'item"
git commit -m "fix(auth): corregeix error de logout"
git commit -m "docs: actualitza guia d'instal·lació"
git commit -m "refactor(elaboracio): simplifica lògica de validació"
git commit -m "test(functions): afegeix tests per valoracioCreateItem"
git commit -m "chore: actualitza dependències de Firebase"
```

### Push i Pull Request

```bash
# Push de la branca
git push origin feature/nom-descriptiu

# Crear Pull Request a GitHub
# - Base: development
# - Compare: feature/nom-descriptiu
# - Afegir descripció detallada
# - Assignar reviewers
# - Afegir labels
```

### Code Review

Abans de fer merge:

- ✅ CI/CD passa tots els checks
- ✅ Almenys 1 aprovació d'un reviewer
- ✅ Tots els comentaris resolts
- ✅ Actualitzat amb development

## 💻 Desenvolupament

### Executar en Mode Desenvolupament

#### Frontend

```bash
npm run dev
# http://localhost:3000
```

#### Emuladors Firebase

```bash
firebase emulators:start
# O només emuladors específics:
firebase emulators:start --only firestore,functions
```

#### Desenvolupament amb Hot Reload

El servidor de Vite té HMR (Hot Module Replacement) automàtic per canvis de codi.

Per functions, necessites reiniciar l'emulador o usar:

```bash
cd functions
npm run watch
```

### Scripts Disponibles

#### Aina (Frontend) Package.json

```bash
cd aina

npm run dev              # Vite dev server
npm run build            # TypeScript compilation + Vite build per producció
npm run preview          # Preview producció build
npm run lint             # ESLint
npm run type-check       # TypeScript type checking
```

#### Functions Package.json

```bash
cd functions

npm run build            # Compilar TypeScript
npm run watch            # Watch mode
npm run serve            # Emular functions
npm run shell            # Firebase functions shell
npm run deploy           # Desplegar functions
npm run logs             # Veure logs
npm run test             # Tests de functions
```

### Crear Components amb shadcn/ui

#### Afegir Nous Components

```bash
# Instal·lar un component específic
npx shadcn@latest add [component-name]

# Exemple: afegir un dialog
npx shadcn@latest add dialog

# Exemple: afegir múltiples components
npx shadcn@latest add dropdown-menu select tabs
```

#### Components Disponibles

Els components actuals instal·lats són:

- **Button**: Botons amb variants (default, destructive, outline, secondary, ghost, link)
- **Card**: Contenidors amb CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Input**: Camps de text amb accessibilitat
- **Label**: Etiquetes accessibles per formularis
- **Alert**: Notificacions amb AlertDescription i variants (default, destructive)

#### Utilitzar Components shadcn/ui

```javascript
// Importar components
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Exemple d'ús
function MyForm() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Formulari</CardTitle>
				<CardDescription>Omple els camps</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='name'>Nom</Label>
					<Input id='name' placeholder='Escriu el teu nom' />
				</div>
				<Button className='w-full'>Enviar</Button>
			</CardContent>
		</Card>
	)
}
```

#### Tailwind CSS Utility Classes

El projecte utilitza Tailwind CSS v4 amb classes utility-first:

```javascript
// Exemples de classes útils
<div className='flex items-center justify-between'>  {/* Flexbox */}
<div className='grid grid-cols-3 gap-4'>           {/* Grid */}
<div className='space-y-4'>                        {/* Spacing vertical */}
<div className='p-4 px-8 mt-2'>                    {/* Padding i margin */}
<div className='bg-primary text-primary-foreground'> {/* Colors del tema */}
<div className='rounded-lg border shadow-sm'>      {/* Borders i ombres */}
<div className='hover:bg-accent transition-colors'> {/* Hover states */}
<div className='dark:bg-slate-900'>                {/* Dark mode */}
```

#### Dark Mode

El projecte suporta dark mode automàtic basat en preferències del sistema:

```css
/* Les classes dark: s'apliquen automàticament */
<div className='bg-white dark:bg-slate-900'>
<p className='text-black dark:text-white'>
```

Variables de tema disponibles (definides a `index.css`):

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

#### Utilitzar lucide-react Icons

El projecte utilitza lucide-react per a totes les icones SVG:

```javascript
// Importar icones necessàries
import { Mail, Lock, Loader2, AlertCircle, Sparkles } from "lucide-react"

// Icona bàsica
<Mail className="h-4 w-4" />

// Icona amb color personalitzat
<AlertCircle className="h-4 w-4 text-destructive" />

// Icona animada (spinner)
<Loader2 className="h-4 w-4 animate-spin" />

// Icona amb mida més gran
<Sparkles className="h-6 w-6 text-primary" />

// Icona posicionada (dins input amb icona)
<div className='relative'>
  <Mail className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
  <Input className='pl-10' placeholder='Email' />
</div>
```

**Icones disponibles al projecte:**

- `Loader2`: Spinner animat per estats de càrrega
- `Mail`: Icona d'email per formularis
- `Lock`: Icona de contrasenya/seguretat
- `AlertCircle`: Icona d'alerta per missatges d'error
- `Sparkles`: Icona decorativa (logo de l'aplicació)

**Afegir noves icones:**

1. Cerca la icona a [lucide.dev](https://lucide.dev)
2. Importa-la al component:
   ```javascript
   import { IconName } from "lucide-react"
   ```
3. Utilitza-la com un component React:
   ```javascript
   <IconName className='h-4 w-4' />
   ```

> **Nota**: Les icones són tree-shakable, només s'inclouen al bundle les icones que importes.

#### Tipografia amb Geist Font

El projecte utilitza la tipografia Geist de Vercel per a tot el text:

**Configuració:**

La font s'importa automàticament a `index.css`:

```css
@import "geist/font/sans";
@import "geist/font/mono";
```

**Ús:**

- **Geist Sans** s'aplica automàticament a tot el body per text general
- **Geist Mono** s'aplica automàticament a elements `<code>` i `<pre>`

**Variables CSS disponibles:**

```css
body {
	font-family: var(--font-geist-sans), sans-serif;
}

code,
pre {
	font-family: var(--font-geist-mono), monospace;
}
```

**Avantatges:**

- Optimitzada per llegibilitat en pantalles
- Suport complet Unicode i múltiples idiomes
- Pesos de font variables per flexibilitat
- Rendiment web optimitzat amb subsetting automàtic

### Crear un Component Personalitzat

```typescript
// components/common/Button.tsx (si necessites un component custom)
import React from "react"

interface ButtonProps {
	children: React.ReactNode
	onClick?: () => void
	variant?: "primary" | "secondary"
	disabled?: boolean
}

export default function Button({ children, onClick, variant = "primary", disabled = false }: ButtonProps) {
	return (
		<button onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${disabled ? "opacity-50" : ""}`}>
			{children}
		</button>
	)
}
```

**Nota**: És recomanable utilitzar els components de shadcn/ui (`@/components/ui/button`) en lloc de crear components personalitzats per mantenir consistència i accessibilitat.

### Utilitzar Firebase al Frontend

#### Configuració Firebase

El fitxer `src/services/firebase.ts` exporta les instàncies configurades:

```typescript
// src/services/firebase.ts
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
```

#### Gestió d'Estat amb Zustand

Store d'autenticació amb persistència:

```typescript
// src/stores/authStore.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "firebase/auth"

interface AuthState {
	user: User | null
	loading: boolean
	error: string | null
	setUser: (user: User | null) => void
	setLoading: (loading: boolean) => void
	setError: (error: string | null) => void
	logout: () => void
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			loading: false,
			error: null,

			setUser: (user) => set({ user }),
			setLoading: (loading) => set({ loading }),
			setError: (error) => set({ error }),
			logout: () => set({ user: null, error: null }),
		}),
		{
			name: "auth-storage",
			storage: sessionStorage, // Usa sessionStorage per seguretat
			partialize: (state) => ({ user: state.user }), // Només persisteix user
		}
	)
)
```

**Usar el store en components:**

```typescript
import { useAuthStore } from "@/stores/authStore"

function Profile() {
	// Subscriure's només a user
	const user = useAuthStore((state) => state.user)

	// Accedir a actions
	const { setUser, logout } = useAuthStore()

	return <div>{user?.email}</div>
}
```

#### React Router - Navegació

**Configuració de rutes a App.tsx:**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import LoginForm from "./components/LoginForm"
import Dashboard from "./pages/Dashboard"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
	const user = useAuthStore((state) => state.user)

	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={user ? <Navigate to='/dashboard' replace /> : <Navigate to='/login' replace />} />
				<Route path='/login' element={<LoginForm />} />
				<Route
					path='/dashboard'
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	)
}
```

**Component de ruta protegida:**

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"

export default function ProtectedRoute({ children }) {
	const user = useAuthStore((state) => state.user)

	if (!user) {
		return <Navigate to='/login' replace />
	}

	return children
}
```

**Navegació programàtica:**

```javascript
import { useNavigate } from "react-router-dom"

function MyComponent() {
	const navigate = useNavigate()

	const goToDashboard = () => {
		navigate("/dashboard")
	}

	return <button onClick={goToDashboard}>Go to Dashboard</button>
}
```

#### Autenticació

**Formulari de login amb Firebase i shadcn/ui:**

```javascript
// src/components/LoginForm.jsx
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

export default function LoginForm() {
	const navigate = useNavigate()
	const { setUser, setLoading, setError } = useAuthStore()

	const [loading, setLocalLoading] = useState(false)
	const [error, setLocalError] = useState(null)
	const emailRef = useRef(null)
	const passwordRef = useRef(null)

	const onLogin = async () => {
		setLocalLoading(true)
		setLoading(true)
		setLocalError(null)
		setError(null)

		try {
			const userCredential = await signInWithEmailAndPassword(auth, emailRef.current.value, passwordRef.current.value)

			// Guardar usuari al store
			setUser({
				uid: userCredential.user.uid,
				email: userCredential.user.email,
				displayName: userCredential.user.displayName,
			})

			// Navegar al dashboard
			navigate("/dashboard")
		} catch (e) {
			let errorMessage = "Error desconegut"

			if (e.code === "auth/user-not-found") {
				errorMessage = "Usuari no trobat"
			} else if (e.code === "auth/wrong-password") {
				errorMessage = "Contrasenya incorrecta"
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

	return (
		<div className='min-h-screen flex items-center justify-center bg-background'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>AINA</CardTitle>
					<CardDescription>Accés a l'aplicació</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className='space-y-4'>
						{error && (
							<Alert variant='destructive'>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<div className='space-y-2'>
							<Label htmlFor='email'>Email</Label>
							<Input id='email' type='email' ref={emailRef} placeholder='example@domain.com' required />
						</div>
						<div className='space-y-2'>
							<Label htmlFor='password'>Contrasenya</Label>
							<Input id='password' type='password' ref={passwordRef} placeholder='••••••••' required />
						</div>
						<Button type='submit' className='w-full' disabled={loading}>
							{loading ? "Accedint..." : "Accedir"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
		</div>
	)
}
```

**Logout:**

```javascript
import { useAuthStore } from "@/stores/authStore"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

function LogoutButton() {
	const { logout } = useAuthStore()
	const navigate = useNavigate()

	const handleLogout = () => {
		logout()
		navigate("/login")
	}

	return (
		<Button variant='outline' onClick={handleLogout}>
			Tancar sessió
		</Button>
	)
}
```

````

#### Firestore

```typescript
// lib/firebase/firestore.ts
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "./config"

export async function getDocument(collectionName: string, docId: string) {
	const docRef = doc(db, collectionName, docId)
	const docSnap = await getDoc(docRef)

	if (docSnap.exists()) {
		return { id: docSnap.id, ...docSnap.data() }
	}
	return null
}

export async function getDocuments(collectionName: string, filters = {}) {
	const q = query(collection(db, collectionName))
	const querySnapshot = await getDocs(q)

	return querySnapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data(),
	}))
}

export async function createDocument(collectionName: string, data: any) {
	const docRef = await addDoc(collection(db, collectionName), {
		...data,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
	return docRef.id
}
````

#### Custom Hook

```typescript
// lib/hooks/useModule1Data.ts
"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "./useAuth"

export function useModule1Data() {
	const [data, setData] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { user } = useAuth()

	useEffect(() => {
		if (!user) {
			setLoading(false)
			return
		}

		const q = query(collection(db, "valoracio_data"), where("userId", "==", user.uid))

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const items = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				}))
				setData(items)
				setLoading(false)
			},
			(err) => {
				setError(err.message)
				setLoading(false)
			}
		)

		return () => unsubscribe()
	}, [user])

	return { data, loading, error }
}
```

### Crear una Cloud Function

```typescript
// functions/src/valoracio/api.ts
import { onCall, HttpsError } from "firebase-functions/v2/https"
import { getFirestore } from "firebase-admin/firestore"
import { z } from "zod"

// Schema de validació
const CreateItemSchema = z.object({
	title: z.string().min(3).max(100),
	description: z.string().min(10),
	category: z.enum(["tech", "business", "other"]),
})

export const valoracioCreateItem = onCall(async (request) => {
	// Validar autenticació
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "Must be authenticated")
	}

	// Validar i parsejar dades
	const parseResult = CreateItemSchema.safeParse(request.data)
	if (!parseResult.success) {
		throw new HttpsError("invalid-argument", "Invalid data", parseResult.error.errors)
	}

	const data = parseResult.data
	const userId = request.auth.uid

	try {
		const db = getFirestore()
		const docRef = await db.collection("valoracio_data").add({
			...data,
			userId,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		return {
			success: true,
			data: {
				id: docRef.id,
				...data,
			},
		}
	} catch (error: any) {
		throw new HttpsError("internal", error.message)
	}
})
```

### Cridar Cloud Functions des del Frontend

```typescript
// components/valoracio/CreateItemForm.tsx
"use client"

import { useState } from "react"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/services/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function CreateItemForm() {
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)

		try {
			const createItem = httpsCallable(functions, "valoracioCreateItem")
			const result = await createItem({
				title,
				description,
				category: "tech",
			})

			console.log("Item created:", result.data)
			// Reset form
			setTitle("")
			setDescription("")
		} catch (error: any) {
			console.error("Error:", error)
			alert(error.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Crear Item</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='title'>Títol</Label>
						<Input id='title' type='text' value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Títol' required />
					</div>
					<div className='space-y-2'>
						<Label htmlFor='description'>Descripció</Label>
						<Input id='description' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Descripció' required />
					</div>
					<Button type='submit' disabled={loading} className='w-full'>
						{loading ? "Creant..." : "Crear Item"}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
```

### Estructura de Pàgines

#### Dashboard Principal

La pàgina del dashboard (`src/pages/Dashboard.jsx`) mostra els tres mòduls disponibles amb shadcn/ui:

```javascript
// src/pages/Dashboard.jsx
import { useAuthStore } from "@/stores/authStore"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function Dashboard() {
	const { user, logout } = useAuthStore()
	const navigate = useNavigate()

	const handleLogout = () => {
		logout()
		navigate("/login")
	}

	return (
		<div className='min-h-screen bg-background p-8'>
			<header className='flex justify-between items-center mb-8'>
				<h1 className='text-3xl font-bold'>AINA - Demostradors</h1>
				<div className='flex items-center gap-4'>
					<span className='text-sm text-muted-foreground'>{user?.email}</span>
					<Button variant='outline' onClick={handleLogout}>
						Tancar sessió
					</Button>
				</div>
			</header>

			<main>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					<Card>
						<CardHeader>
							<CardTitle>Valoració d'Ofertes</CardTitle>
							<CardDescription>Descripció del primer mòdul</CardDescription>
						</CardHeader>
						<CardContent>
							<Button className='w-full'>Accedir</Button>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Elaboració Decrets</CardTitle>
							<CardDescription>Descripció del segon mòdul</CardDescription>
						</CardHeader>
						<CardContent>
							<Button className='w-full'>Accedir</Button>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Kit Lingüístic</CardTitle>
							<CardDescription>Descripció del tercer mòdul</CardDescription>
						</CardHeader>
						<CardContent>
							<Button className='w-full'>Accedir</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}
```

## 📘 TypeScript

### Configuració TypeScript

El projecte utilitza una configuració TypeScript multi-project per separar la configuració de l'app i les eines de build:

- **tsconfig.json**: Configuració arrel amb referències als sub-projectes
- **tsconfig.app.json**: Configuració específica per l'aplicació (src/\*)
- **tsconfig.node.json**: Configuració per Vite i eines de Node.js

### Executar Type Check

```bash
cd aina
npm run type-check
```

Aquest comandament comprova tots els errors de tipat sense generar fitxers JavaScript.

### Bones Pràctiques TypeScript

#### Definir Tipus per Components

```typescript
// src/components/UserCard.tsx
interface UserCardProps {
	user: {
		name: string
		email: string
		avatar?: string
	}
	onEdit?: (userId: string) => void
	className?: string
}

export default function UserCard({ user, onEdit, className }: UserCardProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{user.name}</CardTitle>
				<CardDescription>{user.email}</CardDescription>
			</CardHeader>
			{onEdit && (
				<CardContent>
					<Button onClick={() => onEdit(user.email)}>Editar</Button>
				</CardContent>
			)}
		</Card>
	)
}
```

#### Tipus per API Responses

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: {
		code: string
		message: string
	}
}

export interface ValoracioItem {
	id: string
	title: string
	description: string
	category: "tech" | "business" | "other"
	createdAt: Date
	updatedAt: Date
}

// Ús en un component
async function fetchItems(): Promise<ApiResponse<ValoracioItem[]>> {
	const response = await fetch("/api/items")
	return response.json()
}
```

#### Custom Hooks amb TypeScript

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import { auth } from "@/services/firebase"

interface UseAuthReturn {
	user: User | null
	loading: boolean
	error: string | null
}

export function useAuth(): UseAuthReturn {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged(
			(user) => {
				setUser(user)
				setLoading(false)
			},
			(error) => {
				setError(error.message)
				setLoading(false)
			}
		)

		return () => unsubscribe()
	}, [])

	return { user, loading, error }
}
```

#### Migració Gradual de JSX a TSX

Per migrar un fitxer existent:

1. Canvia l'extensió de `.jsx` a `.tsx`
2. Afegeix tipus per props dels components
3. Afegeix tipus per estats i variables
4. Executa `npm run type-check` per veure errors
5. Corregeix errors de tipat un per un

```bash
# Exemple de migració
mv src/components/MyComponent.jsx src/components/MyComponent.tsx
```

### Errors Comuns i Solucions

#### Error: Cannot find module '@/...'

Assegura't que `tsconfig.app.json` té la configuració de path aliases:

```json
{
	"compilerOptions": {
		"baseUrl": ".",
		"paths": {
			"@/*": ["./src/*"]
		}
	}
}
```

#### Error: JSX element implicitly has type 'any'

Afegeix tipus explícits per les props del component:

```typescript
// Abans
function MyComponent({ name, age }) {
	// ...
}

// Després
interface MyComponentProps {
	name: string
	age: number
}

function MyComponent({ name, age }: MyComponentProps) {
	// ...
}
```

#### Error amb imports de Vite

Si hi ha errors amb `import.meta.env`, assegura't que tens `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

## 🧪 Testing

### Frontend Tests

```bash
npm test
```

#### Component Test

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import Button from "@/components/common/Button"

describe("Button", () => {
	it("renders correctly", () => {
		render(<Button>Click me</Button>)
		expect(screen.getByText("Click me")).toBeInTheDocument()
	})

	it("calls onClick when clicked", () => {
		const handleClick = jest.fn()
		render(<Button onClick={handleClick}>Click me</Button>)

		fireEvent.click(screen.getByText("Click me"))
		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	it("is disabled when disabled prop is true", () => {
		render(<Button disabled>Click me</Button>)
		expect(screen.getByText("Click me")).toBeDisabled()
	})
})
```

### Functions Tests

```bash
cd functions
npm test
```

#### Function Test

```typescript
// functions/src/valoracio/__tests__/api.test.ts
import { valoracioCreateItem } from "../api"

describe("valoracioCreateItem", () => {
	it("creates item successfully", async () => {
		const request = {
			auth: { uid: "test-user", token: {} },
			data: {
				title: "Test Item",
				description: "Test description",
				category: "tech",
			},
		}

		const result = await valoracioCreateItem(request as any)

		expect(result.success).toBe(true)
		expect(result.data).toHaveProperty("id")
	})

	it("rejects unauthenticated requests", async () => {
		const request = {
			auth: null,
			data: {},
		}

		await expect(valoracioCreateItem(request as any)).rejects.toThrow()
	})
})
```

## 🚀 Desplegament

### Build Local

```bash
npm run build
```

### Desplegar a Firebase

#### Tot el Projecte

```bash
firebase deploy
```

#### Només Hosting

```bash
firebase deploy --only hosting
```

#### Només Functions

```bash
firebase deploy --only functions
```

#### Només Regles

```bash
firebase deploy --only firestore:rules,storage:rules
```

#### Function Específica

```bash
firebase deploy --only functions:valoracioCreateItem
```

### Variables d'Entorn en Producció

```bash
# Configurar secrets
firebase functions:config:set \
  api.key="production-key" \
  api.url="https://api.production.com"

# Verificar
firebase functions:config:get
```

## 🐛 Debugging

### VS Code Launch Configuration

Crea `.vscode/launch.json`:

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"name": "React + Vite: debug client-side",
			"type": "chrome",
			"request": "launch",
			"url": "http://localhost:5173"
		}
	]
}
```

### Logs

#### Frontend

```javascript
console.log("Debug info:", data)
```

#### Functions

```typescript
import { logger } from "firebase-functions/v2"

logger.info("Processing item", { itemId })
logger.error("Error occurred", { error })
```

Ver logs:

```bash
firebase functions:log
```

## 📊 Millors Pràctiques

### 1. Seguretat

- ✅ Validar sempre autenticació
- ✅ Implementar regles de seguretat estrictes
- ✅ Sanititzar tots els inputs
- ✅ No exposar secrets al client
- ✅ Utilitzar HTTPS sempre

### 2. Performance

- ✅ Lazy loading de components amb React.lazy()
- ✅ Optimitzar assets amb Vite
- ✅ Code splitting estratègic
- ✅ Caching estratègic
- ✅ Minimitzar reads de Firestore

### 3. Codi Net

- ✅ Seguir convencions de nomenament
- ✅ Components petits i reutilitzables
- ✅ Documentar funcions complexes
- ✅ Tests per funcionalitats crítiques

### 4. Git

- ✅ Commits petits i atòmics
- ✅ Missatges descriptius
- ✅ Pull abans de push
- ✅ No committejar .env files
- ✅ Revisar abans de push

## 🆘 Problemes Comuns

### Error: Firebase not initialized

```typescript
// Assegura't que inicialitzes Firebase correctament
// lib/firebase/config.ts
import { initializeApp, getApps } from "firebase/app"

if (!getApps().length) {
	initializeApp(firebaseConfig)
}
```

### Error: Module not found

```bash
# Reinstal·lar dependències
rm -rf node_modules package-lock.json
npm install
```

### Functions no es despleguen

```bash
# Compilar functions primer
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Emulators no inicien

```bash
# Verificar que els ports no estan en ús
lsof -i :8080  # Firestore
lsof -i :5001  # Functions
lsof -i :9099  # Auth

# Matar procés si cal
kill -9 <PID>
```

## ✅ Checklist abans de PR

- [ ] El codi compila sense errors
- [ ] Tots els tests passen
- [ ] No hi ha errors de linting
- [ ] He afegit tests per la nova funcionalitat
- [ ] He actualitzat la documentació
- [ ] He seguit les convencions de commits
- [ ] He revisat el meu propi codi
- [ ] No hi ha console.logs en producció
- [ ] Variables d'entorn actualitzades si cal
- [ ] Funciona amb emuladors locals

## 📚 Recursos

### Documentació Oficial

- [React Docs](https://react.dev/)
- [Vite Docs](https://vite.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Router](https://reactrouter.com/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

### Dependències Principals

**Frontend (aina/package.json):**

```json
{
	"dependencies": {
		"react": "^19.1.1",
		"react-dom": "^19.1.1",
		"react-router-dom": "^7.1.3",
		"zustand": "^5.0.4",
		"firebase": "^11.2.0"
	},
	"devDependencies": {
		"vite": "^7.1.7",
		"@vitejs/plugin-react": "^4.3.4",
		"eslint": "^9.17.0"
	}
}
```

**Backend (functions/package.json):**

```json
{
	"dependencies": {
		"firebase-admin": "^13.0.1",
		"firebase-functions": "^6.3.0"
	},
	"devDependencies": {
		"typescript": "^5.7.3"
	}
}
```

### Comunitat

- Slack: #aina-dev
- Email: dev@aina.example.com
- Issues: GitHub Issues

---

**Benvingut/da a l'equip AINA!** 🎉

Si tens qualsevol dubte, no dubtis en preguntar al canal de Slack.

---

**Última actualització**: Octubre 2025  
**Versió**: 2.0.0 (React + Vite + Firebase)
