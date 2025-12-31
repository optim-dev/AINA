# Documentació Firebase Cloud Functions

## 📡 Introducció

Aquest document descriu les **Firebase Cloud Functions** implementades per a cada mòdul del demostrador tecnològic AINA. Les functions actuen com a backend serverless que gestiona la lògica de negoci, validacions, processos asíncrons i integracions amb serveis externs.

## 🏗️ Estructura de Functions

```
functions/
├── src/
│   ├── index.ts              # Export de totes les functions
│   ├── common/               # Codi compartit
│   │   ├── middleware.ts    # Middleware de validació
│   │   ├── logger.ts        # Utilitats de logging
│   │   └── validators.ts    # Validadors comuns
│   ├── valoracio/           # Functions del Mòdul Valoració
│   │   ├── api.ts           # HTTP Callable Functions
│   │   ├── triggers.ts      # Firestore Triggers
│   │   ├── scheduled.ts     # Scheduled Functions
│   │   └── types.ts         # Definicions de tipus
│   ├── elaboracio/          # Functions del Mòdul Elaboració
│   │   ├── api.ts
│   │   ├── triggers.ts
│   │   ├── scheduled.ts
│   │   └── types.ts
│   └── kit/                 # Functions del Mòdul Kit
│       ├── api.ts
│       ├── triggers.ts
│       ├── scheduled.ts
│       └── types.ts
├── package.json
├── tsconfig.json
└── .eslintrc.js
```

## 🔑 Autenticació

Totes les functions callables requereixen autenticació. Firebase proporciona automàticament el context d'autenticació:

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https"

export const myFunction = onCall(async (request) => {
	// request.auth conté la informació de l'usuari autenticat
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "User must be authenticated")
	}

	const userId = request.auth.uid
	const email = request.auth.token.email

	// Lògica de la function
})
```

## 📦 Format de Resposta

Totes les functions retornen un objecte amb el següent format:

### Resposta Exitosa

```typescript
{
  success: true,
  data: {
    // Dades retornades
  },
  message?: "Missatge opcional"
}
```

### Resposta amb Error

```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Descripció de l'error",
    details?: {}
  }
}
```

## 🧩 Valoració d'Ofertes - Functions

### API Callable Functions

#### `valoracioCreateItem`

Crea un nou element per al mòdul de Valoració d'Ofertes.

**Request:**

```typescript
{
  title: string;
  description: string;
  category: string;
  metadata?: Record<string, any>;
}
```

**Exemple de crida des del frontend:**

```typescript
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase/config"

const createItem = httpsCallable(functions, "valoracioCreateItem")

try {
	const result = await createItem({
		title: "Nou Item",
		description: "Descripció del item",
		category: "technology",
	})

	console.log(result.data)
	// { success: true, data: { id: '...', ... } }
} catch (error) {
	console.error(error)
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    title: string;
    description: string;
    category: string;
    createdAt: Timestamp;
    userId: string;
  }
}
```

#### `valoracioUpdateItem`

Actualitza un element existent.

**Request:**

```typescript
{
  itemId: string;
  updates: {
    title?: string;
    description?: string;
    category?: string;
    metadata?: Record<string, any>;
  }
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    // camps actualitzats
    updatedAt: Timestamp;
  }
}
```

#### `valoracioDeleteItem`

Elimina un element.

**Request:**

```typescript
{
	itemId: string
}
```

**Response:**

```typescript
{
  success: true,
  message: "Item eliminat correctament"
}
```

#### `valoracioGetItemDetails`

Obté els detalls complets d'un element amb dades processades.

**Request:**

```typescript
{
	itemId: string
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    title: string;
    description: string;
    category: string;
    // dades processades addicionals
    analytics: {
      views: number;
      likes: number;
    };
    relatedItems: Array<{ id: string; title: string }>;
  }
}
```

### Firestore Triggers

#### `onModule1ItemCreated`

S'executa automàticament quan es crea un document a `valoracio_data`.

```typescript
export const onModule1ItemCreated = onDocumentCreated("valoracio_data/{itemId}", async (event) => {
	const itemId = event.params.itemId
	const data = event.data?.data()

	// Processos automàtics:
	// - Enviar notificació
	// - Actualitzar estadístiques
	// - Indexar per cerca
	// - Generar miniatures (si aplica)
})
```

#### `onModule1ItemUpdated`

S'executa quan s'actualitza un document.

```typescript
export const onModule1ItemUpdated = onDocumentUpdated("valoracio_data/{itemId}", async (event) => {
	const before = event.data?.before.data()
	const after = event.data?.after.data()

	// Detectar canvis específics i actuar en conseqüència
})
```

#### `onModule1ItemDeleted`

S'executa quan s'elimina un document.

```typescript
export const onModule1ItemDeleted = onDocumentDeleted("valoracio_data/{itemId}", async (event) => {
	const itemId = event.params.itemId

	// Neteja:
	// - Eliminar fitxers associats de Storage
	// - Actualitzar referències
	// - Arxivar dades si cal
})
```

### Scheduled Functions

#### `valoracioDailyCleanup`

Neteja diària de dades antigues.

```typescript
export const valoracioDailyCleanup = onSchedule("every day 02:00", async (event) => {
	// Eliminar dades temporals
	// Arxivar dades antigues
	// Optimitzar índexs
})
```

#### `valoracioWeeklyReport`

Generació setmanal de reports.

```typescript
export const valoracioWeeklyReport = onSchedule("every monday 09:00", async (event) => {
	// Generar report d'ús
	// Enviar per email
	// Guardar a Firestore
})
```

### Storage Triggers

#### `onModule1FileUploaded`

Processar fitxers pujats a Storage.

```typescript
export const onModule1FileUploaded = onObjectFinalized({ bucket: "valoracio" }, async (event) => {
	const filePath = event.data.name

	// Processar fitxer:
	// - Validar format
	// - Optimitzar/comprimir
	// - Generar miniatures
	// - Extreure metadata
	// - Actualitzar Firestore
})
```

## 🎨 Elaboració Decrets - Functions

### API Callable Functions

#### `elaboracioProcessData`

Processa dades específiques del mòdul 2.

**Request:**

```typescript
{
  data: any;
  options?: {
    format: string;
    validate: boolean;
  }
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    processed: any;
    metadata: {
      processedAt: Timestamp;
      duration: number;
    }
  }
}
```

#### `elaboracioGenerateReport`

Genera un report personalitzat.

**Request:**

```typescript
{
  startDate: string;  // ISO 8601
  endDate: string;
  filters?: Record<string, any>;
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    reportId: string;
    downloadUrl: string;  // URL temporal de Storage
    expiresAt: Timestamp;
  }
}
```

#### `elaboracioBatchOperation`

Executa operacions en batch.

**Request:**

```typescript
{
	operation: "create" | "update" | "delete"
	items: Array<any>
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    processed: number;
    successful: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
  }
}
```

### Firestore Triggers

#### `onModule2DataChanged`

Reacciona a canvis en les dades del mòdul 2.

```typescript
export const onModule2DataChanged = onDocumentWritten("elaboracio_data/{docId}", async (event) => {
	// Processar qualsevol escriptura (create, update, delete)
})
```

### Scheduled Functions

#### `elaboracioHourlySync`

Sincronització horària amb sistemes externs.

```typescript
export const elaboracioHourlySync = onSchedule("every 1 hours", async (event) => {
	// Sincronitzar dades
	// Actualitzar cache
})
```

## 🔧 Kit Lingüístic - Functions

### API Callable Functions

#### `kitAnalyzeContent`

Analitza contingut utilitzant serveis externs (ex: AI APIs).

**Request:**

```typescript
{
	content: string
	analysisType: "sentiment" | "keywords" | "summary"
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    analysis: {
      type: string;
      result: any;
      confidence: number;
    }
  }
}
```

#### `kitExportData`

Exporta dades en diferents formats.

**Request:**

```typescript
{
  format: 'json' | 'csv' | 'pdf';
  filters?: Record<string, any>;
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    exportId: string;
    downloadUrl: string;
    size: number;
    expiresAt: Timestamp;
  }
}
```

#### `kitImportData`

Importa dades des de fitxers externs.

**Request:**

```typescript
{
  fileUrl: string;
  format: 'json' | 'csv';
  options?: {
    validate: boolean;
    skipErrors: boolean;
  }
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    imported: number;
    skipped: number;
    errors?: Array<string>;
  }
}
```

### Pubsub Triggers

#### `onModule3TaskQueued`

Processa tasques de la cua.

```typescript
export const onModule3TaskQueued = onMessagePublished("kit-tasks", async (event) => {
	const task = event.data.message.json

	// Processar tasca
	// Actualitzar estat
})
```

## 🛠️ Utilities & Middleware

### Validació d'Inputs

```typescript
// common/validators.ts
import { z } from "zod"
import { HttpsError } from "firebase-functions/v2/https"

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
	try {
		return schema.parse(data)
	} catch (error) {
		throw new HttpsError("invalid-argument", "Invalid input data", error.errors)
	}
}

// Exemple d'ús
const ItemSchema = z.object({
	title: z.string().min(3).max(100),
	description: z.string().min(10),
	category: z.enum(["tech", "business", "other"]),
})

export const createItem = onCall(async (request) => {
	const data = validateInput(ItemSchema, request.data)
	// Continuar amb dades validades
})
```

### Logging

```typescript
// common/logger.ts
import { logger } from "firebase-functions/v2"

export const log = {
	info: (message: string, data?: any) => {
		logger.info(message, { structuredData: data })
	},

	error: (message: string, error: Error, context?: any) => {
		logger.error(message, {
			error: error.message,
			stack: error.stack,
			context,
		})
	},

	warn: (message: string, data?: any) => {
		logger.warn(message, { structuredData: data })
	},
}
```

### Error Handling

```typescript
// common/errors.ts
import { HttpsError } from "firebase-functions/v2/https"

export class AppError extends Error {
	constructor(public code: string, message: string, public details?: any) {
		super(message)
	}

	toHttpsError(): HttpsError {
		return new HttpsError(this.code as any, this.message, this.details)
	}
}

// Exemple d'ús
export const myFunction = onCall(async (request) => {
	try {
		// Lògica
	} catch (error) {
		if (error instanceof AppError) {
			throw error.toHttpsError()
		}
		throw new HttpsError("internal", "Unexpected error")
	}
})
```

### Rate Limiting

```typescript
// common/rateLimit.ts
import { HttpsError } from "firebase-functions/v2/https"
import { getFirestore } from "firebase-admin/firestore"

export async function checkRateLimit(userId: string, action: string, maxRequests: number, windowMs: number): Promise<void> {
	const db = getFirestore()
	const rateLimitDoc = db.collection("rate_limits").doc(`${userId}_${action}`)

	const doc = await rateLimitDoc.get()
	const now = Date.now()

	if (doc.exists) {
		const data = doc.data()!
		const resetTime = data.resetAt.toMillis()

		if (now < resetTime) {
			if (data.count >= maxRequests) {
				throw new HttpsError("resource-exhausted", "Rate limit exceeded")
			}

			await rateLimitDoc.update({
				count: data.count + 1,
			})
		} else {
			await rateLimitDoc.set({
				count: 1,
				resetAt: new Date(now + windowMs),
			})
		}
	} else {
		await rateLimitDoc.set({
			count: 1,
			resetAt: new Date(now + windowMs),
		})
	}
}
```

## 🧪 Testing Functions

### Test Unitari

```typescript
// functions/src/valoracio/__tests__/api.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals"
import { valoracioCreateItem } from "../api"

describe("valoracioCreateItem", () => {
	beforeEach(() => {
		// Setup
	})

	it("should create item successfully", async () => {
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

	it("should reject unauthenticated requests", async () => {
		const request = {
			auth: null,
			data: {},
		}

		await expect(valoracioCreateItem(request as any)).rejects.toThrow("unauthenticated")
	})
})
```

### Emulador Local

```bash
# Iniciar emuladors
firebase emulators:start

# Provar functions localment
curl -X POST \
  http://localhost:5001/PROJECT_ID/us-central1/valoracioCreateItem \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"data": {"title": "Test"}}'
```

## 📊 Monitorització

### Logs

```bash
# Veure logs en temps real
firebase functions:log

# Filtrar per function
firebase functions:log --only valoracioCreateItem

# Veure errors
firebase functions:log --only-errors
```

### Mètriques

A Firebase Console pots veure:

- **Execucions**: Nombre total d'invocacions
- **Temps d'execució**: Durada mitjana
- **Errors**: Taxa d'error
- **Memòria**: Ús de memòria
- **Cost**: Cost estimat

## ⚙️ Configuració

### Variables d'Entorn

```bash
# Configurar variables
firebase functions:config:set \
  api.key="your-api-key" \
  api.url="https://api.example.com"

# Obtenir configuració actual
firebase functions:config:get

# Utilitzar en functions
import { defineString } from 'firebase-functions/params';

const apiKey = defineString('API_KEY');

export const myFunction = onCall(async (request) => {
  const key = apiKey.value();
  // Usar la clau
});
```

### Regions

```typescript
import { onCall } from "firebase-functions/v2/https"

export const myFunction = onCall({ region: "europe-west1" }, async (request) => {
	// Function desplegada a Europa
})
```

## 🔐 Seguretat

### Validació d'Autenticació

Sempre valida que l'usuari està autenticat:

```typescript
if (!request.auth) {
	throw new HttpsError("unauthenticated", "Must be authenticated")
}
```

### Validació d'Autorització

Verifica que l'usuari té permisos:

```typescript
const userId = request.auth.uid
const resource = await getResource(resourceId)

if (resource.ownerId !== userId) {
	throw new HttpsError("permission-denied", "Not authorized")
}
```

### Sanitització d'Inputs

Sempre valida i sanititza inputs:

```typescript
import { validateInput } from "./common/validators"

const data = validateInput(Schema, request.data)
```

## 📝 Codis d'Error

| Codi                 | Descripció           |
| -------------------- | -------------------- |
| `unauthenticated`    | Usuari no autenticat |
| `permission-denied`  | Sense permisos       |
| `invalid-argument`   | Arguments invàlids   |
| `not-found`          | Recurs no trobat     |
| `already-exists`     | Recurs ja existeix   |
| `resource-exhausted` | Rate limit excedit   |
| `internal`           | Error intern         |
| `unavailable`        | Servei no disponible |

---

**Última actualització**: Octubre 2025  
**Versió**: 2.0.0 (Firebase Cloud Functions)
