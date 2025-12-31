# Arquitectura del Demostrador Tecnològic AINA

## 📐 Visió General

AINA és una aplicació web construïda amb **React + Vite + TypeScript** que funciona com a **demostrador tecnològic**, integrant tres mòduls completament independents sota un mateix punt d'accés. L'arquitectura combina el poder de React amb Vite per al frontend amb Firebase com a backend complet (Firestore, Storage i Authentication) i Cloud Functions per implementar lògica de negoci serverless específica per a cada mòdul.

### Stack Tecnològic Frontend

- **React** 19.1.1: Biblioteca per construir interfícies d'usuari
- **TypeScript** ^5.x: Tipat estàtic per JavaScript
- **Vite** 7.1.7: Eina de construcció i desenvolupament
- **Tailwind CSS** v4.1.16: Framework CSS utility-first
- **Geist Font** 1.5.1: Tipografia moderna de Vercel (Sans i Mono)
- **shadcn/ui**: Biblioteca de components accessibles basats en Radix UI
- **lucide-react** 0.548.0: Biblioteca d'icones per React
- **React Router DOM** 7.9.4: Gestió de rutes
- **Zustand** 5.0.8: Gestió d'estat
- **Firebase SDK** 12.4.0: Autenticació, Firestore, Storage, Functions

## 🎯 Principis Arquitectònics

### 1. Modularitat

Cada mòdul és independent però comparteix infraestructura i punt d'accés comú.

### 2. Serverless-First

Tota la lògica de backend s'implementa mitjançant Cloud Functions escalables.

### 3. Type Safety

TypeScript en tot el projecte (frontend i backend).

### 4. Seguretat per Disseny

Autenticació i autorització en totes les capes.

### 5. Real-time Capabilities

Aprofitant les capacitats de temps real de Firestore.

## 🏗️ Diagrama d'Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARI / CLIENT                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           REACT + VITE APPLICATION (Frontend)                │
│  ┌─────────────┬─────────────┬─────────────┐               │
│  │  Valoració  │ Elaboració  │     Kit     │               │
│  │  Pages/UI   │  Pages/UI   │  Pages/UI   │               │
│  └──────┬──────┴──────┬──────┴──────┬──────┘               │
│         │             │             │                        │
│  ┌──────┴─────────────┴─────────────┴──────┐               │
│  │     Shared Components & Hooks            │               │
│  └──────────────────┬───────────────────────┘               │
└─────────────────────┼─────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                        │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ Firestore    │  Storage     │  Authentication      │ │
│  │ (Database)   │  (Files)     │  (Users)             │ │
│  └──────┬───────┴──────┬───────┴──────┬───────────────┘ │
└─────────┼──────────────┼──────────────┼──────────────────┘
          │              │              │
          └──────────────┴──────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           FIREBASE CLOUD FUNCTIONS (Serverless)              │
│  ┌─────────────┬─────────────┬─────────────┐               │
│  │ Valoració   │ Elaboració  │     Kit     │               │
│  │ Functions   │ Functions   │ Functions   │               │
│  │             │             │             │               │
│  │ • onCreate  │ • onCreate  │ • onCreate  │               │
│  │ • onUpdate  │ • onUpdate  │ • onUpdate  │               │
│  │ • onDelete  │ • onDelete  │ • onDelete  │               │
│  │ • HTTP API  │ • HTTP API  │ • HTTP API  │               │
│  │ • Scheduled │ • Scheduled │ • Scheduled │               │
│  └─────────────┴─────────────┴─────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Components Principals

### 1. Frontend - React + Vite Application

#### Project Structure

```
aina/
├── public/                    # Fitxers estàtics
├── src/
│   ├── main.tsx              # Entry point de l'aplicació
│   ├── App.tsx               # Component principal amb React Router
│   ├── vite-env.d.ts         # Vite type declarations
│   ├── index.css             # Estils globals + Tailwind + shadcn/ui theme
│   ├── assets/               # Imatges, fonts, etc.
│   ├── components/           # Components reutilitzables
│   │   ├── LoginForm.tsx     # Formulari d'autenticació (shadcn/ui)
│   │   ├── ProtectedRoute.tsx # HOC per rutes protegides
│   │   ├── common/           # Components comuns
│   │   ├── layout/           # Components de layout
│   │   └── ui/               # shadcn/ui components
│   │       ├── button.tsx    # Component Button
│   │       ├── card.tsx      # Component Card
│   │       ├── input.tsx     # Component Input
│   │       ├── label.tsx     # Component Label
│   │       └── alert.tsx     # Component Alert
│   ├── lib/                  # Utilitats
│   │   └── utils.ts          # Funcions utils (cn, etc.)
│   ├── pages/                # Pàgines de l'aplicació
│   │   ├── Dashboard.tsx     # Pàgina principal amb mòduls (shadcn/ui Cards)
│   │   ├── valoracio/        # Pàgines del mòdul Valoració
│   │   ├── elaboracio/       # Pàgines del mòdul Elaboració
│   │   └── kit/              # Pàgines del mòdul Kit
│   ├── stores/               # Zustand state management
│   │   └── authStore.ts      # Store d'autenticació (persisted)
│   ├── services/             # Serveis (Firebase, API)
│   │   ├── firebase.ts       # Configuració Firebase
│   │   └── api.ts
│   ├── utils/                # Utilitats
│   └── hooks/                # Custom hooks
├── index.html                # HTML principal
├── vite.config.ts            # Configuració de Vite + path aliases
├── tsconfig.json             # Root TypeScript config with references
├── tsconfig.app.json         # App-specific TypeScript config with path aliases
├── tsconfig.node.json        # Vite config TypeScript settings
├── components.json           # Configuració shadcn/ui
├── package.json
├── .env.local                # Variables d'entorn
└── .env.example              # Template de variables d'entorn
```

#### Característiques del Frontend

- **TypeScript**: Type safety per tot el projecte amb configuració multi-project
- **Vite Dev Server**: Hot Module Replacement (HMR) ultraràpid
- **Tailwind CSS v4**:
  - Utility-first CSS framework
  - Configuració amb @theme inline
  - Dark mode suport amb oklch colors
  - Custom variants i animacions
- **Geist Font**:
  - Tipografia moderna i llegible de Vercel
  - Geist Sans per a text general (`--font-geist-sans`)
  - Geist Mono per a codi i elements monospace (`--font-geist-mono`)
  - Optimitzada per llegibilitat i rendiment
- **shadcn/ui Components**:
  - Biblioteca de components accessibles basada en Radix UI
  - Components estilitzats amb Tailwind CSS
  - Totalment customitzables i de codi obert
  - Components disponibles: Button, Card, Input, Label, Alert
- **lucide-react Icons**:
  - Biblioteca d'icones SVG amb més de 1000 icones
  - Tree-shakable (només s'inclouen les icones utilitzades)
  - Icones utilitzades: Loader2, Mail, Lock, AlertCircle, Sparkles
  - Totalment customitzables amb props (color, size, strokeWidth)
- **React Router DOM**: Gestió de navegació client-side amb BrowserRouter
  - Ruta `/`: Redirecció automàtica segons estat d'autenticació
  - Ruta `/login`: Formulari d'autenticació amb shadcn/ui
  - Ruta `/dashboard`: Pàgina principal protegida amb accés als mòduls
  - Rutes protegides amb component `ProtectedRoute`
- **Zustand**: Gestió d'estat global lleugera i reactiva
  - Store d'autenticació amb persistència en sessionStorage
  - Sincronització automàtica entre pestanyes
- **Component-Based**: Arquitectura modular i reutilitzable
- **Path Aliases**: Imports nets amb `@/*` apuntant a `src/`
- **Hooks**: useState, useEffect, custom hooks
- **Firebase SDK**: Integració directa amb Authentication, Firestore i Storage

### 2. Firebase Services

#### Firestore (Database)

Estructura de col·leccions per mòdul:

```
firestore/
├── users/                     # Usuaris globals
│   └── {userId}/
│       ├── profile
│       └── settings
├── valoracio_data/            # Dades del mòdul Valoració d'Ofertes
│   └── {documentId}/
├── elaboracio_data/           # Dades del mòdul Elaboració Decrets
│   └── {documentId}/
└── kit_data/                  # Dades del mòdul Kit Lingüístic
    └── {documentId}/
```

**Característiques:**

- NoSQL document-based
- Real-time listeners
- Queries complexes amb índexs

#### Firebase Storage

Estructura d'emmagatzematge:

```
storage/
├── users/                     # Avatars i fitxers d'usuari
│   └── {userId}/
├── valoracio/                 # Fitxers del mòdul Valoració
│   └── {resourceId}/
├── elaboracio/                # Fitxers del mòdul Elaboració
│   └── {resourceId}/
└── kit/                       # Fitxers del mòdul Kit
    └── {resourceId}/
```

**Característiques:**

- Upload/download de fitxers
- URLs signades amb expiració

#### Firebase Authentication

**Mètodes suportats:**

- Email/Password
- Google OAuth
- Altres providers (opcionals)

**Flux d'autenticació:**

1. Usuari fa login al frontend
2. Firebase Auth retorna token JWT
3. Token s'utilitza per autenticar crides a Functions
4. Functions validen el token abans d'executar lògica

### 3. Cloud Functions (Backend Serverless)

Cada mòdul té les seves pròpies functions:

#### Tipus de Functions

##### HTTP Functions (Callable)

```typescript
// functions/src/valoracio/api.ts
export const valoracioCreateItem = onCall(async (request) => {
	const { auth, data } = request

	// Validar autenticació
	if (!auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	// Lògica de negoci
	const result = await processModule1Logic(data)

	return { success: true, data: result }
})
```

##### Firestore Triggers

```typescript
// functions/src/valoracio/triggers.ts
export const onValoracioItemCreated = onDocumentCreated("valoracio_data/{itemId}", async (event) => {
	const data = event.data?.data()

	// Processar creació
	await sendNotification(data)
	await updateAnalytics(data)
})
```

##### Scheduled Functions

```typescript
// functions/src/valoracio/scheduled.ts
export const dailyCleanup = onSchedule("every 24 hours", async (event) => {
	// Neteja diària de dades antigues
	await cleanupOldData()
})
```

##### Storage Triggers

```typescript
// functions/src/elaboracio/storage.ts
export const onImageUpload = onObjectFinalized(async (event) => {
	const filePath = event.data.name

	// Processar imatge (resize, optimize, etc.)
	await processImage(filePath)
})
```

## 🔄 Flux de Dades

### Flux de Lectura (Read)

```
User Action → React Component → Firebase SDK → Firestore
                                                    ↓
                                              Read Data
                                                    ↓
                                            Return to UI
```

### Flux d'Escriptura (Write)

```
User Action → React Component → Cloud Function (Callable)
                                        ↓
                                  Validate & Process
                                        ↓
                                   Write to Firestore
                                        ↓
                                  Firestore Trigger
                                        ↓
                            Additional Processing (if needed)
                                        ↓
                                  Real-time Update → UI
```

## 🔐 Seguretat

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Funció helper per verificar autenticació
    function isAuthenticated() {
      return request.auth != null;
    }

    // Funció helper per verificar propietari
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Valoració d'Ofertes
    match /valoracio_data/{docId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
    }

    // Elaboració Decrets
    match /elaboracio_data/{docId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
    }

    // Kit Lingüístic
    match /kit_data/{docId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated()
        && resource.data.userId == request.auth.uid;
    }

    // Similar per altres mòduls
  }
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Users folder
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Valoració d'Ofertes
    match /valoracio/{docId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Elaboració Decrets
    match /elaboracio/{docId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Kit Lingüístic
    match /kit/{docId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Authentication en Cloud Functions

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https"

export const secureFunction = onCall(async (request) => {
	// Validar autenticació
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "Must be authenticated")
	}

	// Validar autorització
	const userId = request.auth.uid
	const hasPermission = await checkUserPermission(userId)

	if (!hasPermission) {
		throw new HttpsError("permission-denied", "Insufficient permissions")
	}

	// Executar lògica
	return await executeLogic(request.data)
})
```

## 📦 Gestió d'Estat

### Client State - Zustand

AINA utilitza Zustand per a la gestió d'estat global per la seva simplicitat i rendiment:

```javascript
// src/stores/authStore.js
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useAuthStore = create(
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
			storage: sessionStorage,
			partialize: (state) => ({ user: state.user }),
		}
	)
)
```

**Avantatges de Zustand:**

- API minimalista sense boilerplate
- Persistència automàtica amb middleware
- Rendiment òptim (no re-renders innecessaris)
- TypeScript-friendly
- DevTools support

**Ús en components:**

```javascript
import { useAuthStore } from "@/stores/authStore"

function Profile() {
	const user = useAuthStore((state) => state.user)
	const logout = useAuthStore((state) => state.logout)

	return (
		<div>
			<p>{user?.email}</p>
			<button onClick={logout}>Logout</button>
		</div>
	)
}
```

### Component State (React Hooks)

Per estat local de components s'utilitzen hooks estàndard de React:

```javascript
import { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/services/firebase"

export function useModule1Data() {
	const [data, setData] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const unsubscribe = onSnapshot(collection(db, "module1_data"), (snapshot) => {
			const items = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}))
			setData(items)
			setLoading(false)
		})

		return () => unsubscribe()
	}, [])

	return { data, loading }
}
```

### Server State (Firebase)

- **Firestore**: Font única de veritat
- **Real-time Subscriptions**: Sincronització automàtica
- **Optimistic Updates**: Actualitzacions locals immediates

## 🚀 Escalabilitat

### Horizontal Scaling

- **React + Vite**: Aplicació estàtica distribuïda via CDN
- **Cloud Functions**: Escalat automàtic segons demanda
- **Firestore**: Escalat automàtic sense límits pràctics

### Performance Optimization

#### Frontend

- **Code Splitting**: Lazy loading amb React.lazy() i Suspense
- **Asset Optimization**: Vite optimitza automàticament imatges i assets
- **Caching**: Service Workers per cache de recursos
- **CDN**: Firebase Hosting amb CDN global

#### Backend

- **Batching**: Agrupar operacions de Firestore
- **Caching**: Redis o Firestore per cache temporal
- **Indexes**: Índexs optimitzats a Firestore

## 🧪 Testing Strategy

### Frontend Tests

```typescript
// components/__tests__/Module1Component.test.tsx
import { render, screen } from "@testing-library/react"
import Module1Component from "../Module1Component"

describe("Module1Component", () => {
	it("renders correctly", () => {
		render(<Module1Component />)
		expect(screen.getByText("Module 1")).toBeInTheDocument()
	})
})
```

### Cloud Functions Tests

```typescript
// functions/src/module1/__tests__/api.test.ts
import { describe, it, expect } from "@jest/globals"
import { module1CreateItem } from "../api"

describe("module1CreateItem", () => {
	it("creates item successfully", async () => {
		const request = {
			auth: { uid: "test-user" },
			data: { name: "Test Item" },
		}

		const result = await module1CreateItem(request)
		expect(result.success).toBe(true)
	})
})
```

### Integration Tests

```typescript
// __tests__/integration/module1.test.ts
import { initializeTestEnvironment } from "@firebase/rules-unit-testing"

describe("Module 1 Integration", () => {
	it("creates and reads data", async () => {
		const testEnv = await initializeTestEnvironment({
			projectId: "test-project",
		})

		// Test complet del flux
	})
})
```

## 📊 Monitoring & Logging

### Firebase Console

- **Authentication**: Usuaris actius, mètodes de login
- **Firestore**: Reads/writes, costs
- **Functions**: Execucions, errors, latència
- **Hosting**: Tràfic, bandwidth

### Custom Logging

```typescript
// functions/src/common/logger.ts
import { logger } from "firebase-functions/v2"

export function logInfo(message: string, data?: any) {
	logger.info(message, { structuredData: data })
}

export function logError(message: string, error: Error) {
	logger.error(message, {
		error: error.message,
		stack: error.stack,
	})
}
```

## 🔗 Integració entre Mòduls

Tot i que els mòduls són independents, poden compartir:

### Recursos Compartits

- **Components UI**: Biblioteca de components comuns
- **Hooks**: Custom hooks reutilitzables
- **Utilitats**: Funcions helpers
- **Types**: Definicions de tipus compartides

### Comunicació entre Mòduls

- **Shared State**: Zustand per estat global (autenticació, configuració, etc.)
- **Events**: Sistema d'esdeveniments personalitzat si és necessari
- **Shared Data**: Col·leccions de Firestore compartides

## 📝 Millors Pràctiques

### 1. Separació de Concerns

- UI en components de React
- Lògica de negoci en Cloud Functions
- Dades en Firestore

### 2. Type Safety

- Definir interfaces per totes les dades
- Utilitzar TypeScript strict mode
- Validar dades amb Zod o similar

### 3. Error Handling

- Try-catch en totes les operations asíncrones
- Missatges d'error user-friendly
- Logging detallat d'errors

### 4. Security First

- Validar sempre l'autenticació
- Implementar regles de seguretat estrictes
- Sanititzar inputs

### 5. Performance

- Lazy loading de components
- Optimistic updates
- Caching estratègic

---

**Última actualització**: Octubre 2025  
**Versió**: 2.0.0 (React + Vite + Firebase)

## 📋 Implementació Actual

### ✅ Components Implementats

**Autenticació:**

- `LoginForm.jsx` - Formulari de login amb validació i gestió d'errors
- `ProtectedRoute.jsx` - Component HOC per protegir rutes
- Store d'autenticació amb Zustand i persistència en sessionStorage

**Navegació:**

- React Router DOM amb BrowserRouter
- Rutes: `/` (redirect), `/login`, `/dashboard` (protegida)
- Navegació programàtica amb useNavigate hook

**Pàgines:**

- `Dashboard.jsx` - Pàgina principal amb accés als 3 mòduls
- Layout amb header, informació d'usuari i botó de logout

**Serveis:**

- `firebase.js` - Configuració i exportació de serveis Firebase
- Integració amb Firebase Authentication, Firestore i Storage

### 🚧 Pendent d'Implementar

- Pàgines i funcionalitats dels Mòduls 1, 2 i 3
- Funcions Cloud Functions per cada mòdul
- Col·leccions específiques de Firestore per mòduls
- Components UI comuns i reutilitzables
- Tests unitaris i d'integració

---

**Última actualització**: Octubre 2025  
**Versió**: 2.0.0 (React + Vite + Firebase)
