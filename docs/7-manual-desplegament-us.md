# 7. Manual de Desplegament i Ús

**Versió del document:** 1.0  
**Data:** Desembre 2025  
**Projecte:** AINA - Demostrador Tecnològic

---

## Índex

1. [Visió General del Sistema](#visió-general-del-sistema)
2. [7.1 Requisits](#71-requisits)
   - [7.1.1 Hardware](#711-hardware)
   - [7.1.2 Software i Dependències](#712-software-i-dependències)
   - [7.1.3 Comptes i Serveis Cloud](#713-comptes-i-serveis-cloud)
3. [7.2 Instal·lació](#72-installació)
   - [7.2.1 Preparació de l'Entorn](#721-preparació-de-lentorn)
   - [7.2.2 Configuració de Firebase](#722-configuració-de-firebase)
   - [7.2.3 Instal·lació del Frontend](#723-installació-del-frontend)
   - [7.2.4 Instal·lació del Backend (Functions)](#724-installació-del-backend-functions)
   - [7.2.5 Instal·lació del Servei RAG](#725-installació-del-servei-rag)
   - [7.2.6 Instal·lació de LanguageTool](#726-installació-de-languagetool)
   - [7.2.7 Configuració de Vertex AI](#727-configuració-de-vertex-ai)
4. [7.3 Instruccions d'Ús](#73-instruccions-dús)
   - [7.3.1 Execució Local](#731-execució-local)
   - [7.3.2 Desplegament a Producció](#732-desplegament-a-producció)
   - [7.3.3 Endpoints Disponibles](#733-endpoints-disponibles)
   - [7.3.4 Modes de Prova](#734-modes-de-prova)
   - [7.3.5 Monitoratge i Logs](#735-monitoratge-i-logs)
5. [Solució de Problemes](#solució-de-problemes)
6. [Annexos](#annexos)

---

## Visió General del Sistema

AINA és un demostrador tecnològic que integra tres mòduls independents:

- **Valoració d'Ofertes**: Gestió i avaluació d'ofertes per a processos de contractació
- **Elaboració de Decrets**: Eines de suport per a l'elaboració de documents administratius
- **Kit Lingüístic**: Validació i correcció lingüística de textos en català

L'arquitectura combina:

- **Frontend**: React + Vite + TypeScript
- **Backend**: Firebase Functions (Node.js 22)
- **Base de Dades**: Firestore
- **Emmagatzematge**: Firebase Storage
- **Autenticació**: Firebase Authentication
- **IA**: Vertex AI (Gemini models) + Servei RAG personalitzat
- **Correcció Lingüística**: LanguageTool + NLP amb spaCy

---

## 7.1 Requisits

### 7.1.1 Hardware

#### Desenvolupament Local

**Requisits Mínims:**

- **CPU**: Intel Core i5 / AMD Ryzen 5 o equivalent (4 cores)
- **RAM**: 8 GB
- **Emmagatzematge**: 20 GB disponibles
- **Connexió a Internet**: 10 Mbps

**Requisits Recomanats:**

- **CPU**: Intel Core i7 / AMD Ryzen 7 o equivalent (8 cores)
- **RAM**: 16 GB o més
- **Emmagatzematge**: 50 GB SSD
- **Connexió a Internet**: 50 Mbps

**Notes:**

- El servei RAG amb models spaCy transformer requereix **mínim 4 GB de RAM**
- Docker Desktop per a LanguageTool necessita **2 GB RAM addicionals**
- Per a desenvolupament complet (tots els serveis locals): **16 GB RAM recomanat**

#### Producció (Google Cloud)

**Servei RAG (Cloud Run):**

- **CPU**: 2 vCPUs (recomanat)
- **RAM**: 4 GB (mínim per model spaCy transformer)
- **Emmagatzematge**: 1 GB per índex FAISS

**LanguageTool (Cloud Run):**

- **CPU**: 1 vCPU
- **RAM**: 2 GB
- **Java Heap**: Xms=512m, Xmx=2g

**Firebase Functions:**

- **CPU**: Assignació automàtica segons Gen2
- **RAM**: 512 MB - 2 GB segons funció
- **Timeout**: 60-540 segons

**Vertex AI:**

- **Models utilitzats**: Gemini 2.0 Flash Experimental, Gemini 1.5 Flash
- **GPU**: No requereix (models servits per Google)

### 7.1.2 Software i Dependències

#### Eines de Desenvolupament

| Software       | Versió Mínima | Versió Recomanada | Instal·lació                                    |
| -------------- | ------------- | ----------------- | ----------------------------------------------- |
| Node.js        | 18.x          | 22.x              | https://nodejs.org/                             |
| npm            | 9.x           | 10.x              | Inclòs amb Node.js                              |
| Python         | 3.9           | 3.11              | https://www.python.org/                         |
| pip            | 21.x          | 24.x              | Inclòs amb Python                               |
| Docker Desktop | 4.x           | Latest            | https://www.docker.com/products/docker-desktop/ |
| Git            | 2.30+         | Latest            | https://git-scm.com/                            |
| Firebase CLI   | 12.x          | Latest            | `npm install -g firebase-tools`                 |
| gcloud CLI     | 450+          | Latest            | https://cloud.google.com/sdk/docs/install       |

#### Dependències Node.js (Frontend)

```json
{
	"react": "^19.1.2",
	"react-dom": "^19.1.2",
	"react-router-dom": "^7.9.4",
	"vite": "^7.1.7",
	"typescript": "^5.9.3",
	"tailwindcss": "^4.1.16",
	"firebase": "^12.4.0",
	"zustand": "^5.0.8",
	"lucide-react": "^0.548.0",
	"@radix-ui/react-*": "Latest",
	"docx": "^9.5.1",
	"jspdf": "^3.0.3"
}
```

#### Dependències Node.js (Backend - Functions)

```json
{
	"firebase-admin": "^12.6.0",
	"firebase-functions": "^6.0.1",
	"genkit": "^1.21.0",
	"@genkit-ai/firebase": "^1.21.0",
	"@genkit-ai/vertexai": "^1.21.0",
	"@google/genai": "^1.9.0",
	"@xenova/transformers": "^2.17.2",
	"zod": "^3.22.4",
	"mammoth": "^1.6.0",
	"pdf-parse": "^1.1.1",
	"cors": "^2.8.5",
	"helmet": "^7.1.0",
	"compression": "^1.7.4"
}
```

**Engine requerida**: Node.js 22

#### Dependències Python (Servei RAG)

```txt
fastapi==0.109.0
uvicorn==0.27.0
sentence-transformers==2.3.1
faiss-cpu>=1.8.0
pandas==2.2.0
numpy==1.26.3
python-multipart
pyarrow
spacy>=3.7.0
```

**Models spaCy necessaris:**

- `ca_core_news_trf` (transformer-based, recomanat) - ~500 MB
- `ca_core_news_sm` (petit, fallback) - ~15 MB

#### Llibreries i Serveis Externs

**LanguageTool:**

- Versió: 6.5 o superior
- Java Runtime: Inclòs al Docker
- Llenguatge: Català (ca)

**Models d'IA:**

- **Embeddings**: `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base`
- **LLM**: Gemini 2.0 Flash Experimental, Gemini 1.5 Flash via Vertex AI

### 7.1.3 Comptes i Serveis Cloud

#### Compte de Google Cloud (Obligatori)

1. **Projecte de Google Cloud** amb facturació habilitada
2. **APIs habilitades:**

   - Vertex AI API
   - Cloud Run API
   - Cloud Build API
   - Cloud Storage API
   - Artifact Registry API
   - BigQuery API (per logging)

3. **Permisos IAM necessaris:**
   - `roles/editor` o superior al projecte
   - `roles/cloudfunctions.admin`
   - `roles/run.admin`
   - `roles/storage.admin`
   - `roles/artifactregistry.admin`
   - `roles/bigquery.dataEditor`

#### Compte de Firebase (Obligatori)

1. **Projecte Firebase** (pot ser el mateix que Google Cloud)
2. **Serveis configurats:**

   - Firestore Database (Native mode, regió: europe-west4)
   - Firebase Storage
   - Firebase Authentication (Email/Password com a mínim)
   - Firebase Hosting (opcional, per frontend)

3. **Configuració de seguretat:**
   - Firestore Rules configurades segons entorn
   - Storage Rules configurades segons entorn

---

## 7.2 Instal·lació

### 7.2.1 Preparació de l'Entorn

#### 1. Clonar el Repositori

```bash
git clone <URL_DEL_REPOSITORI>
cd CODE
```

#### 2. Verificar Eines Instal·lades

```bash
# Verificar Node.js i npm
node --version  # Ha de mostrar v22.x o superior
npm --version   # Ha de mostrar v10.x o superior

# Verificar Python i pip
python3 --version  # Ha de mostrar 3.11 o superior
pip3 --version

# Verificar Docker
docker --version
docker compose version

# Verificar Firebase CLI
firebase --version

# Verificar gcloud CLI
gcloud --version
```

#### 3. Autenticació amb Google Cloud

```bash
# Autenticació principal
gcloud auth login

# Configurar projecte per defecte
gcloud config set project <EL_TEU_PROJECT_ID>

# Configurar Application Default Credentials (per a desenvolupament local)
gcloud auth application-default login

# Verificar configuració
gcloud config list
```

#### 4. Autenticació amb Firebase

```bash
# Login a Firebase
firebase login

# Associar projecte local amb Firebase
firebase use --add
# Selecciona el teu projecte i assigna un alias (ex: "default" o "prod")
```

### 7.2.2 Configuració de Firebase

#### 1. Crear Projecte Firebase

Si no tens un projecte Firebase:

1. Ves a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nou projecte o enllaça un projecte Google Cloud existent
3. Selecciona la regió: **europe-west4** (Holanda)

#### 2. Configurar Firestore

```bash
# Inicialitzar Firestore via Firebase CLI
firebase firestore:databases:create default --location=europe-west4
```

O manualment des de Firebase Console:

1. Firestore Database → Create database
2. Selecciona **Production mode** o **Test mode** (segons necessitat)
3. Regió: **eur3** (europe-west4)

#### 3. Configurar Firebase Storage

1. Storage → Get started
2. Règims: Selecciona regió **europe-west4**
3. Regles de seguretat: Utilitza `storage.rules` del projecte

#### 4. Configurar Firebase Authentication

1. Authentication → Get started
2. Habilita proveïdors:
   - Email/Password (obligatori)
   - Google Sign-In (opcional)
3. Configura dominis autoritzats si és necessari

#### 5. Obtenir Credencials del Frontend

1. Project Settings → General
2. A "Your apps", registra una aplicació web
3. Copia la configuració Firebase:

```javascript
const firebaseConfig = {
	apiKey: "...",
	authDomain: "...",
	projectId: "...",
	storageBucket: "...",
	messagingSenderId: "...",
	appId: "...",
}
```

### 7.2.3 Instal·lació del Frontend

#### 1. Navegar al Directori del Frontend

```bash
cd aina
```

#### 2. Instal·lar Dependències

```bash
npm install
```

Això instal·larà totes les dependències especificades a `package.json`, incloent:

- React 19
- Vite 7
- TypeScript 5
- Tailwind CSS 4
- Firebase SDK
- Radix UI components
- Zustand
- Lucide React icons

#### 3. Configurar Variables d'Entorn

Crea un fitxer `.env.local` (no commitejat a Git):

```bash
cp .env.example .env.local  # Si existeix un exemple
```

O crea manualment `.env.local`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Environment identifier
VITE_ENVIRONMENT=development
```

**Important**: Reemplaça tots els valors amb les credencials del teu projecte Firebase.

#### 4. Configurar Fitxer firebase.js

Si no està configurat, edita `src/services/firebase.js`:

```javascript
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getFunctions } from "firebase/functions"

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
export const functions = getFunctions(app, "europe-west4")
```

#### 5. Verificar Instal·lació

```bash
# Executar type check
npm run type-check

# Executar linter
npm run lint

# Executar en desenvolupament
npm run dev
```

L'aplicació hauria d'estar accessible a: http://localhost:5173

### 7.2.4 Instal·lació del Backend (Functions)

#### 1. Navegar al Directori de Functions

```bash
cd ../functions  # Des d'aina/ torna enrere i entra a functions/
```

#### 2. Instal·lar Dependències

```bash
npm install
```

#### 3. Configurar Variables d'Entorn

Crea dos fitxers d'entorn:

**`.env.local`** (desenvolupament local):

```env
# Project Configuration
PROJECT_ID=<el-teu-project-id>

# BigQuery Dataset
BQ_DATASET=aina_logs_dev

# LanguageTool Container URL (local)
LANGUAGETOOL_URL=http://localhost:8010

# RAG Service URL (local)
RAG_SERVICE_URL=http://localhost:8080

# Storage Bucket
STORAGE_BUCKET=<el-teu-project-id>.firebasestorage.app

# Gemini Configuration (opcional, usa ADC per defecte)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**`.env.aina-demostradors`** (producció):

```env
# Project Configuration
PROJECT_ID=aina-demostradors

# BigQuery Dataset
BQ_DATASET=aina_logs_prod

# LanguageTool Container URL (Cloud Run)
LANGUAGETOOL_URL=https://languagetool-xxxxx-ew.a.run.app

# RAG Service URL (Cloud Run)
RAG_SERVICE_URL=https://aina-rag-service-xxxxx-ew.a.run.app

# Storage Bucket
STORAGE_BUCKET=aina-demostradors.firebasestorage.app
```

**Important**: Els URLs de Cloud Run s'obtenen després de desplegar els serveis (seccions 7.2.5 i 7.2.6).

#### 4. Configurar firebase.json

Verifica que el fitxer `firebase.json` a l'arrel del projecte contingui:

```json
{
	"functions": [
		{
			"source": "functions",
			"codebase": "default",
			"predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"],
			"ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log", "*.local"]
		}
	]
}
```

#### 5. Compilar TypeScript

```bash
npm run build
```

Això generarà el codi JavaScript compilat a la carpeta `lib/`.

#### 6. Verificar Instal·lació

```bash
# Compilar i observar canvis
npm run build:watch

# En un altre terminal, executar emuladors
firebase emulators:start --only functions
```

Les functions haurien d'estar disponibles a: http://localhost:5001

### 7.2.5 Instal·lació del Servei RAG

El servei RAG (Retrieval-Augmented Generation) proporciona detecció NLP de termes lingüístics i cerca vectorial.

#### 1. Navegar al Directori del Servei

```bash
cd ../rag_service  # Des de functions/
```

#### 2. Crear Entorn Virtual Python

```bash
# Crear entorn virtual
python3 -m venv venv

# Activar entorn virtual
# macOS/Linux:
source venv/bin/activate
# Windows:
# .\venv\Scripts\activate
```

#### 3. Instal·lar Dependències

```bash
pip install -r requirements.txt
```

Això instal·la:

- FastAPI (framework web)
- Uvicorn (servidor ASGI)
- sentence-transformers (embeddings)
- faiss-cpu (cerca vectorial)
- pandas, numpy (processament de dades)
- spaCy (NLP)

#### 4. Descarregar Model spaCy

```bash
# Model transformer (recomanat per màxima precisió)
python -m spacy download ca_core_news_trf

# O model petit (si tens limitacions de memòria)
python -m spacy download ca_core_news_sm
```

**Notes:**

- `ca_core_news_trf`: ~500 MB, requereix 4 GB RAM, màxima precisió
- `ca_core_news_sm`: ~15 MB, requereix 1 GB RAM, precisió reduïda

#### 5. Preparar Dades del Glossari

Assegura't que tens el fitxer `termes.csv` a la carpeta `data/`:

```bash
# Si el fitxer està en una altra ubicació
cp /path/to/termes.csv ./data/termes.csv
```

El fitxer ha de tenir com a mínim les columnes:

- `id`: Identificador únic
- `terme_recomanat`: Terme correcte
- `variants_no_normatives`: Variants incorrectes
- `categoria`: Categoria del terme

#### 6. Generar Índex FAISS

```bash
python build_index.py
```

Això genera:

- `data/glossari_index.faiss`: Índex de cerca vectorial
- `data/glossari_data.pkl`: Metadades del glossari

#### 7. Verificar Instal·lació

```bash
# Test de detecció NLP
python test_nlp_detection.py

# Executar servidor
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

El servei hauria d'estar disponible a: http://localhost:8080

Endpoints de test:

- Health check: http://localhost:8080/health
- Docs: http://localhost:8080/docs

#### 8. Desplegament a Cloud Run (Producció)

**Opció A: Build local i push**

```bash
# Construir imatge Docker
docker build -t gcr.io/<PROJECT_ID>/aina-rag-service .

# Push a Google Container Registry
docker push gcr.io/<PROJECT_ID>/aina-rag-service

# Desplegar a Cloud Run
gcloud run deploy aina-rag-service \
  --image gcr.io/<PROJECT_ID>/aina-rag-service \
  --platform managed \
  --region europe-west4 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --allow-unauthenticated
```

**Opció B: Build al núvol amb persistència (Recomanat)**

```bash
# 1. Crear bucket per dades persistents
gcloud storage buckets create gs://aina-rag-data-prod \
  --location=europe-west4

# 2. Desplegar amb Cloud Build + volum muntat
gcloud run deploy aina-rag-service \
  --source . \
  --region europe-west4 \
  --execution-environment gen2 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --allow-unauthenticated \
  --add-volume name=rag-data,type=cloud-storage,bucket=aina-rag-data-prod \
  --add-volume-mount volume=rag-data,mount-path=/app/data
```

**Important**: Després del desplegament, copia la URL del servei (ex: `https://aina-rag-service-xxxxx-ew.a.run.app`) i actualitza `RAG_SERVICE_URL` a `.env.aina-demostradors`.

**Inicialitzar Índex al Cloud:**

```bash
# Cridar endpoint /vectorize amb el glossari de Firestore
curl -X POST "https://aina-rag-service-xxxxx-ew.a.run.app/vectorize" \
  -H "Content-Type: application/json" \
  -d @glossari_payload.json
```

### 7.2.6 Instal·lació de LanguageTool

LanguageTool proporciona correcció ortogràfica i gramatical per al català.

#### 1. Navegar al Directori

```bash
cd ../languagetool
```

#### 2. Execució Local amb Docker

```bash
# Construir imatge
docker compose build

# Iniciar servei
docker compose up -d

# Verificar estat
docker compose ps

# Veure logs
docker compose logs -f
```

El servei estarà disponible a: http://localhost:8010

#### 3. Verificar Funcionament

```bash
# Test bàsic
curl -X POST "http://localhost:8010/v2/check" \
  -d "language=ca" \
  -d "text=Això es una prova de correccio ortografica."

# Hauria de retornar errors detectats (ex: "es" → "és", "correccio" → "correcció")
```

#### 4. Desplegament a Cloud Run (Producció)

**Utilitzar script automatitzat:**

```bash
# Executar des de l'arrel del projecte
./languagetool/deploy.sh <EL_TEU_PROJECT_ID>
```

Aquest script:

1. Crea/valida Artifact Registry
2. Construeix la imatge Docker
3. Push a Artifact Registry
4. Desplega a Cloud Run
5. Executa smoke test
6. **Mostra la URL del servei**

**Important**: Copia la URL mostrada (ex: `https://languagetool-xxxxx-ew.a.run.app`) i actualitza `LANGUAGETOOL_URL` a `.env.aina-demostradors`.

**Desplegament manual:**

```bash
# Build i push
gcloud builds submit --tag gcr.io/<PROJECT_ID>/languagetool

# Deploy
gcloud run deploy languagetool \
  --image gcr.io/<PROJECT_ID>/languagetool \
  --platform managed \
  --region europe-west4 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 60 \
  --allow-unauthenticated
```

#### 5. Aturar Servei Local

```bash
docker compose down
```

### 7.2.7 Configuració de Vertex AI

Vertex AI s'utilitza per als models d'IA (Gemini) al backend.

#### 1. Habilitar API

```bash
gcloud services enable aiplatform.googleapis.com
```

O des de [Google Cloud Console](https://console.cloud.google.com/):

1. APIs & Services → Enable APIs and Services
2. Cerca "Vertex AI API"
3. Enable

#### 2. Configurar Credencials

Les Firebase Functions utilitzen **Application Default Credentials (ADC)** automàticament. No cal configurar res addicional si les functions estan desplegades a Firebase.

Per a desenvolupament local:

```bash
# Si ja has fet `gcloud auth application-default login`, ja està
# Si no:
gcloud auth application-default login
```

#### 3. Configurar Quota i Límits

Per defecte, Vertex AI té quotes generoases per Gemini. Pots verificar-les:

1. [Quotas & System Limits](https://console.cloud.google.com/iam-admin/quotas)
2. Filtra per "Vertex AI API"
3. Verifica "Requests per minute per model"

#### 4. Scripts d'Infraestructura (Opcional)

El projecte inclou scripts per gestionar endpoints de Vertex AI:

```bash
cd ../scripts_infra_vertex

# Crear entorn virtual
python3 -m venv venv
source venv/bin/activate  # macOS/Linux

# Instal·lar dependències
pip install google-cloud-aiplatform google-cloud-storage

# Executar scripts (exemples)
python lifecycle.py      # Crear endpoint amb model
python shutdown.py       # Aturar endpoint
```

**Notes:**

- Els scripts són opcionals i per a gestió avançada
- El projecte utilitza models Gemini servits directament, no endpoints customitzats
- Útil si vols desplegar models customitzats o fine-tuned

---

## 7.3 Instruccions d'Ús

### 7.3.1 Execució Local

#### Mode de Desenvolupament Complet

Per executar tot el sistema localment:

**Terminal 1: Frontend (React + Vite)**

```bash
cd aina
npm run dev
```

URL: http://localhost:5173

**Terminal 2: Backend (Firebase Emulators)**

```bash
cd functions
npm run build:watch  # Compilació automàtica TypeScript

# En un altre terminal dins de l'arrel del projecte:
firebase emulators:start
```

URLs:

- Functions: http://localhost:5001
- Firestore UI: http://localhost:4000/firestore
- Auth UI: http://localhost:4000/auth
- Storage UI: http://localhost:4000/storage

**Terminal 3: Servei RAG**

```bash
cd rag_service
source venv/bin/activate  # macOS/Linux
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

URL: http://localhost:8080

**Terminal 4: LanguageTool**

```bash
cd languagetool
docker compose up
```

URL: http://localhost:8010

#### Mode Desenvolupament Simplificat

Si no necessites tots els serveis (per exemple, només frontend + backend):

```bash
# Terminal 1: Emulators
firebase emulators:start --only functions,firestore,auth,storage

# Terminal 2: Frontend
cd aina && npm run dev
```

**Important**: Comenta o desactiva les crides a RAG i LanguageTool si no estan en execució.

#### Accedir a l'Aplicació

1. Obre el navegador a http://localhost:5173
2. Crea un compte d'usuari (Authentication)
3. Inicia sessió
4. Accedeix als tres mòduls des del sidebar

#### Dades de Test

Per provar l'aplicació, pots:

1. **Crear usuari de test** via Firebase Console:

   - Authentication → Add user
   - Email: `test@example.com`
   - Password: `test123456`

2. **Carregar dades de demo** (si hi ha scripts):
   ```bash
   # Exemple: Carregar glossari a Firestore
   firebase emulators:exec --only firestore \
     "node scripts/seed-firestore.js"
   ```

### 7.3.2 Desplegament a Producció

#### Prerequisits

1. Tots els serveis configurats (RAG, LanguageTool)
2. URLs de producció actualitzades a `.env.aina-demostradors`
3. Firestore rules configurades per producció

#### 1. Desplegar Firebase Functions

```bash
# Des de l'arrel del projecte

# Compilar TypeScript
cd functions
npm run build

# Tornar a l'arrel i desplegar
cd ..
firebase deploy --only functions --project aina-demostradors
```

Opcions de desplegament selectiu:

```bash
# Només functions del mòdul Kit
firebase deploy --only functions:kit* --project aina-demostradors

# Només functions HTTP
firebase deploy --only functions:http* --project aina-demostradors
```

**Verificar desplegament:**

```bash
firebase functions:list --project aina-demostradors
```

#### 2. Desplegar Frontend

**Opció A: Firebase Hosting**

```bash
# Build del frontend
cd aina
npm run build

# Desplegar
cd ..
firebase deploy --only hosting --project aina-demostradors
```

URL de producció: https://aina-demostradors.web.app

**Opció B: Altres plataformes (Vercel, Netlify, etc.)**

```bash
# Build
cd aina
npm run build

# El directori `dist/` conté els fitxers estàtics per desplegar
```

#### 3. Configurar Dominis Personalitzats (Opcional)

**Firebase Hosting:**

1. Hosting → Add custom domain
2. Segueix els passos per verificar propietat
3. Configura DNS records
4. Firebase gestiona SSL automàticament

#### 4. Configurar Variables d'Entorn de Producció

**Frontend:**

Crea `.env.production`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=aina-demostradors.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aina-demostradors
VITE_FIREBASE_STORAGE_BUCKET=aina-demostradors.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ENVIRONMENT=production
```

**Backend:**

Configura variables d'entorn a Firebase:

```bash
firebase functions:config:set \
  languagetool.url="https://languagetool-xxxxx-ew.a.run.app" \
  rag.url="https://aina-rag-service-xxxxx-ew.a.run.app" \
  bigquery.dataset="aina_logs_prod"

# O utilitza el fitxer .env.aina-demostradors (recomanat)
```

#### 5. Verificar Desplegament

**Frontend:**

- Accedeix a la URL de producció
- Verifica que es carrega correctament
- Prova login/logout
- Verifica que els mòduls funcionen

**Backend:**

- Comprova Firebase Console → Functions
- Verifica logs: `firebase functions:log --project aina-demostradors`
- Prova endpoints HTTP directament

**Serveis Externs:**

```bash
# Test RAG
curl https://aina-rag-service-xxxxx-ew.a.run.app/health

# Test LanguageTool
curl https://languagetool-xxxxx-ew.a.run.app/v2/languages
```

### 7.3.3 Endpoints Disponibles

#### Frontend (React App)

| Ruta          | Descripció                   |
| ------------- | ---------------------------- |
| `/`           | Pàgina principal / Dashboard |
| `/login`      | Autenticació d'usuaris       |
| `/valoracio`  | Mòdul Valoració d'Ofertes    |
| `/elaboracio` | Mòdul Elaboració de Decrets  |
| `/kit`        | Mòdul Kit Lingüístic         |

#### Backend (Firebase Functions)

**Mòdul Valoració:**

| Endpoint                  | Tipus    | Descripció         |
| ------------------------- | -------- | ------------------ |
| `valoracioCreateItem`     | Callable | Crear nova oferta  |
| `valoracioUpdateItem`     | Callable | Actualitzar oferta |
| `valoracioDeleteItem`     | Callable | Eliminar oferta    |
| `valoracioGenerateReport` | Callable | Generar informe    |

**Mòdul Elaboració:**

| Endpoint                   | Tipus    | Descripció            |
| -------------------------- | -------- | --------------------- |
| `elaboracioCreateDecret`   | Callable | Crear nou decret      |
| `elaboracioAnalyzeText`    | Callable | Analitzar text amb IA |
| `elaboracioValidateDecret` | Callable | Validar estructura    |
| `elaboracioExportDocument` | Callable | Exportar a DOCX/PDF   |

**Mòdul Kit:**

| Endpoint            | Tipus    | Descripció               |
| ------------------- | -------- | ------------------------ |
| `kitValidateText`   | Callable | Validar text lingüístic  |
| `kitDetectTerms`    | Callable | Detectar termes glossari |
| `kitCorrectText`    | Callable | Corregir ortografia      |
| `kitGetSuggestions` | Callable | Obtenir suggeriments     |
| `kitAnalyzeStyle`   | Callable | Analitzar estil i to     |

**Nota**: Endpoints `Callable` s'invoquen des del frontend via Firebase SDK:

```javascript
import { getFunctions, httpsCallable } from "firebase/functions"

const functions = getFunctions()
const validateText = httpsCallable(functions, "kitValidateText")

const result = await validateText({ text: "El meu text..." })
```

#### Servei RAG

| Endpoint             | Mètode | Descripció              |
| -------------------- | ------ | ----------------------- |
| `/health`            | GET    | Health check            |
| `/detect-candidates` | POST   | Detectar termes via NLP |
| `/search`            | POST   | Cerca vectorial FAISS   |
| `/vectorize`         | POST   | Reconstruir índex       |

**Exemple: Detectar candidats**

```bash
curl -X POST "http://localhost:8080/detect-candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Les entitats que conformen el sector públic.",
    "context_window": 3
  }'
```

**Resposta:**

```json
{
	"success": true,
	"candidates": [
		{
			"term": "conformen",
			"lemma": "conformar",
			"position": 3,
			"context": "entitats que conformen el sector",
			"pos_tag": "VERB",
			"glossary_id": "V006",
			"terme_recomanat": "formar",
			"categoria": "verb",
			"source": "nlp"
		}
	],
	"nlp_model_used": "ca_core_news_trf"
}
```

#### LanguageTool

| Endpoint        | Mètode | Descripció              |
| --------------- | ------ | ----------------------- |
| `/v2/check`     | POST   | Correcció ortogràfica   |
| `/v2/languages` | GET    | Llenguatges disponibles |

**Exemple: Correcció**

```bash
curl -X POST "http://localhost:8010/v2/check" \
  -d "language=ca" \
  -d "text=Això es una prova."
```

### 7.3.4 Modes de Prova

#### Proves Automatitzades

El projecte no inclou tests automatitzats en aquesta versió, però pots afegir:

**Frontend (Vitest + React Testing Library):**

```bash
cd aina
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Backend (Jest + Firebase Test SDK):**

```bash
cd functions
npm install -D jest @types/jest firebase-functions-test
```

#### Proves Manuals

**1. Proves del Mòdul Kit Lingüístic:**

1. Accedir a `/kit`
2. Introduir text: "Les entitats que conformen el sector públic"
3. Clicar "Validar"
4. Verificar que detecta "conformen" i suggereix "formar"
5. Aplicar correcció
6. Verificar que el text es modifica

**2. Proves del Mòdul Elaboració:**

1. Accedir a `/elaboracio`
2. Crear nou decret
3. Pujar fitxer DOCX o escriure text
4. Clicar "Analitzar amb IA"
5. Verificar suggeriments
6. Exportar a PDF/DOCX
7. Verificar que el fitxer es descarrega correctament

**3. Proves del Mòdul Valoració:**

1. Accedir a `/valoracio`
2. Crear nova oferta
3. Omplir camps
4. Guardar
5. Verificar que apareix a la llista
6. Generar informe
7. Verificar que el PDF es genera

#### Proves de Càrrega

**LanguageTool:**

```bash
# Instal·lar Apache Bench
brew install httpd  # macOS

# Test de càrrega
ab -n 1000 -c 10 -p request.txt -T "application/x-www-form-urlencoded" \
  http://localhost:8010/v2/check

# request.txt conté:
# language=ca&text=Prova+de+text
```

**Servei RAG:**

```bash
# Instal·lar k6
brew install k6  # macOS

# Script de test (test.js)
import http from 'k6/http';

export default function () {
  const payload = JSON.stringify({
    text: 'Les entitats que conformen el sector públic.',
    context_window: 3
  });

  http.post('http://localhost:8080/detect-candidates', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}

# Executar
k6 run --vus 10 --duration 30s test.js
```

### 7.3.5 Monitoratge i Logs

#### Firebase Console

**Functions Logs:**

1. [Firebase Console](https://console.firebase.google.com/) → Functions
2. Selecciona una funció
3. Visualitza logs en temps real
4. Filtra per severitat (INFO, WARN, ERROR)

**Firestore:**

1. Firebase Console → Firestore Database
2. Navega per col·leccions i documents
3. Verifica dades en temps real

#### Google Cloud Console

**Cloud Run Logs:**

1. [Cloud Console](https://console.cloud.google.com/) → Cloud Run
2. Selecciona servei (aina-rag-service o languagetool)
3. Pestanya "Logs"
4. Filtra per severitat i timestamp

**Vertex AI:**

1. Cloud Console → Vertex AI → Dashboard
2. Visualitza ús de models
3. Quota i límits

#### BigQuery Logs

El sistema registra logs estructurats a BigQuery per anàlisi:

**Dataset:** `aina_logs_prod` (o `aina_logs_dev`)

**Taules:**

- `elaboracio_logs`: Logs del mòdul Elaboració
- `kit_logs`: Logs del mòdul Kit
- `valoracio_logs`: Logs del mòdul Valoració

**Consultar logs:**

```sql
-- Logs del mòdul Kit de les últimes 24h
SELECT
  timestamp,
  user_id,
  operation,
  status,
  duration_ms,
  error_message
FROM `aina-demostradors.aina_logs_prod.kit_logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC
LIMIT 100;
```

**Crear dashboard:**

1. BigQuery → Explorar dades
2. Executar consultes
3. Guardar resultats
4. Crear visualitzacions a Looker Studio

#### Alertes (Opcional)

**Cloud Monitoring:**

```bash
# Crear alerta per errors a Cloud Run
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="RAG Service Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="aina-rag-service"
    AND metric.type="run.googleapis.com/request_count"
    AND metric.labels.response_code_class="5xx"'
```

#### Eines de Línia de Comandes

**Firebase CLI:**

```bash
# Logs en temps real de totes les functions
firebase functions:log --project aina-demostradors

# Logs d'una funció específica
firebase functions:log --only kitValidateText --project aina-demostradors

# Logs amb filtrat
firebase functions:log --only kitValidateText --limit 50 --project aina-demostradors
```

**gcloud CLI:**

```bash
# Logs de Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aina-rag-service" \
  --limit 50 --format json

# Logs de Vertex AI
gcloud logging read "resource.type=aiplatform.googleapis.com/Endpoint" \
  --limit 50
```

---

## Solució de Problemes

### Problemes Comuns

#### 1. Frontend no es connecta al backend

**Símptoma:**

```
Error: Failed to call function: kitValidateText
FirebaseError: INTERNAL
```

**Solució:**

1. Verifica que les functions estan desplegades:

   ```bash
   firebase functions:list
   ```

2. Comprova la configuració de la regió:

   ```javascript
   // src/services/firebase.js
   export const functions = getFunctions(app, "europe-west4")
   ```

3. Verifica CORS a les functions (hauria d'estar configurat):
   ```typescript
   // functions/src/index.ts
   import * as cors from "cors"
   const corsHandler = cors({ origin: true })
   ```

#### 2. Servei RAG no detecta termes

**Símptoma:**

```json
{
	"success": true,
	"candidates": []
}
```

**Solució:**

1. Verifica que el model spaCy està instal·lat:

   ```bash
   python -c "import spacy; nlp = spacy.load('ca_core_news_trf'); print('OK')"
   ```

2. Comprova que l'índex FAISS existeix:

   ```bash
   ls -lh data/glossari_index.faiss
   ```

3. Verifica logs del servei:

   ```bash
   # Local
   # Veure terminal on corre uvicorn

   # Cloud Run
   gcloud logging read "resource.labels.service_name=aina-rag-service" --limit 50
   ```

#### 3. LanguageTool no respon

**Símptoma:**

```
Error: connect ECONNREFUSED 127.0.0.1:8010
```

**Solució:**

1. Verifica que Docker està en execució:

   ```bash
   docker ps | grep languagetool
   ```

2. Si no hi ha contenidor:

   ```bash
   cd languagetool
   docker compose up -d
   ```

3. Comprova logs:

   ```bash
   docker compose logs -f
   ```

4. Verifica port:
   ```bash
   lsof -i :8010
   ```

#### 4. Firebase Emulators no inicien

**Símptoma:**

```
Error: Port 8080 is already in use
```

**Solució:**

1. Comprova quins ports estan ocupats:

   ```bash
   lsof -i :8080
   lsof -i :5001
   lsof -i :9099
   ```

2. Mata processos si cal:

   ```bash
   kill -9 <PID>
   ```

3. O canvia els ports a `firebase.json`:
   ```json
   "emulators": {
     "firestore": {
       "port": 8090
     }
   }
   ```

#### 5. Errors de permisos a Google Cloud

**Símptoma:**

```
ERROR: (gcloud.run.deploy) User [email] does not have permission to access service [...]
```

**Solució:**

1. Verifica permisos IAM:

   ```bash
   gcloud projects get-iam-policy <PROJECT_ID> \
     --flatten="bindings[].members" \
     --filter="bindings.members:user:YOUR_EMAIL"
   ```

2. Afegeix permisos necessaris (com a Owner del projecte):
   ```bash
   gcloud projects add-iam-policy-binding <PROJECT_ID> \
     --member="user:YOUR_EMAIL" \
     --role="roles/run.admin"
   ```

#### 6. Build de TypeScript falla

**Símptoma:**

```
error TS2307: Cannot find module 'firebase-functions'
```

**Solució:**

1. Reinstal·la dependències:

   ```bash
   cd functions
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Verifica versió de Node.js:

   ```bash
   node --version  # Ha de ser v22.x
   ```

3. Neteja caché de TypeScript:
   ```bash
   rm -rf lib/
   npm run build
   ```

### Logs de Depuració

Activa mode verbose per obtenir més informació:

```bash
# Firebase CLI
firebase --debug emulators:start

# gcloud CLI
gcloud --verbosity=debug run deploy ...

# npm
npm run dev --verbose
```

---

## Annexos

### Annex A: Estructura Completa de Fitxers

```
CODE/
├── README.md
├── LICENSE
├── package.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── apphosting.emulator.yaml
│
├── aina/                           # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   ├── .env.local                  # Git ignored
│   ├── .env.production             # Git ignored
│   ├── public/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── modules/
│   │   │   ├── valoracio/
│   │   │   ├── elaboracio/
│   │   │   ├── kit/
│   │   │   └── shared/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── firebase.js
│   │   └── stores/
│   └── dist/                       # Build output
│
├── functions/                      # Backend (Firebase Functions)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.local                  # Git ignored
│   ├── .env.aina-demostradors      # Git ignored
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth/
│   │   ├── elaboracio/
│   │   ├── kit/
│   │   ├── valoracio/
│   │   └── shared/
│   └── lib/                        # Compiled output
│
├── rag_service/                    # Servei RAG (Python + FastAPI)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── main.py
│   ├── build_index.py
│   ├── build_dynamic_index.py
│   ├── test_nlp_detection.py
│   ├── README.md
│   ├── data/
│   │   ├── termes.csv
│   │   ├── glossari_index.faiss
│   │   └── glossari_data.pkl
│   └── venv/                       # Git ignored
│
├── languagetool/                   # LanguageTool (Docker)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── deploy.sh
│   └── README.md
│
├── scripts_infra_vertex/           # Scripts Vertex AI (Opcional)
│   ├── base.py
│   ├── lifecycle.py
│   ├── lifecycle_big.py
│   ├── shutdown.py
│   ├── README.md
│   └── venv/                       # Git ignored
│
└── docs/                           # Documentació
    ├── architecture.md
    ├── api.md
    ├── development.md
    ├── BigQueryLogs.md
    ├── bigquery-schema.md
    └── 7-manual-desplegament-us.md
```

### Annex B: Variables d'Entorn Completes

#### Frontend (`.env.local` / `.env.production`)

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional
VITE_ENVIRONMENT=development  # o production
VITE_API_BASE_URL=https://your-domain.com  # Si tens API externa
```

#### Backend Functions (`.env.local` / `.env.aina-demostradors`)

```env
# Project Configuration
PROJECT_ID=your-project-id

# BigQuery Configuration
BQ_DATASET=aina_logs_dev  # o aina_logs_prod

# External Services
LANGUAGETOOL_URL=http://localhost:8010  # Local
# LANGUAGETOOL_URL=https://languagetool-xxxxx-ew.a.run.app  # Cloud Run

RAG_SERVICE_URL=http://localhost:8080  # Local
# RAG_SERVICE_URL=https://aina-rag-service-xxxxx-ew.a.run.app  # Cloud Run

# Firebase Storage
STORAGE_BUCKET=your-project-id.firebasestorage.app

# Optional: Application Default Credentials (ADC per defecte)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Annex C: Comandes Útils de Referència

#### Desenvolupament

```bash
# Frontend
npm run dev              # Servidor desenvolupament
npm run build            # Build producció
npm run preview          # Preview build local
npm run lint             # Linter
npm run type-check       # Type checking

# Functions
npm run build            # Compilar TypeScript
npm run build:watch      # Compilar + watch mode
firebase emulators:start # Iniciar emuladors
firebase serve           # Servir localment

# RAG Service
python -m uvicorn main:app --reload  # Servidor desenvolupament
python build_index.py                # Reconstruir índex
python test_nlp_detection.py         # Test NLP

# LanguageTool
docker compose up -d     # Iniciar servei
docker compose down      # Aturar servei
docker compose logs -f   # Veure logs
```

#### Desplegament

```bash
# Frontend
firebase deploy --only hosting

# Functions
firebase deploy --only functions
firebase deploy --only functions:kitValidateText  # Funció específica

# RAG Service
gcloud run deploy aina-rag-service --source .

# LanguageTool
./languagetool/deploy.sh <PROJECT_ID>
```

#### Monitoratge

```bash
# Logs
firebase functions:log
firebase functions:log --only kitValidateText
gcloud logging read "resource.labels.service_name=aina-rag-service"

# Estat
firebase functions:list
gcloud run services list
docker compose ps

# BigQuery
bq query --use_legacy_sql=false "SELECT * FROM aina_logs_prod.kit_logs LIMIT 10"
```

### Annex D: Recursos i Referències

#### Documentació Oficial

- **Firebase**: https://firebase.google.com/docs
- **Google Cloud**: https://cloud.google.com/docs
- **Vertex AI**: https://cloud.google.com/vertex-ai/docs
- **React**: https://react.dev/
- **Vite**: https://vite.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **spaCy**: https://spacy.io/usage
- **LanguageTool**: https://dev.languagetool.org/

#### Models i Recursos Lingüístics

- **Projecte AINA**: https://projecteaina.cat/
- **spaCy Català Models**: https://spacy.io/models/ca
- **Sentence Transformers**: https://www.sbert.net/
- **FAISS**: https://github.com/facebookresearch/faiss

#### Suport i Comunitat

- **Firebase Support**: https://firebase.google.com/support
- **Google Cloud Support**: https://cloud.google.com/support
- **Stack Overflow**: https://stackoverflow.com/ (tags: firebase, google-cloud, react, vite)

---

## Resum Executiu

Aquest document proporciona una guia completa per desplegar i utilitzar el demostrador tecnològic AINA. El sistema combina tecnologies modernes (React, Vite, Firebase, Vertex AI) amb serveis especialitzats (LanguageTool, RAG amb spaCy) per oferir tres mòduls d'aplicació administrativa amb suport lingüístic avançat.

**Temps estimat d'instal·lació completa:** 2-3 hores
**Requisits clau:** Node.js 22, Python 3.11, Docker, comptes Google Cloud/Firebase
**Entorns suportats:** Desenvolupament local + Producció (Firebase + Cloud Run)

Per a qualsevol qüestió o problema, consulta la secció [Solució de Problemes](#solució-de-problemes) o els recursos a l'[Annex D](#annex-d-recursos-i-referències).

---

**Document generat el:** 31 de desembre de 2025  
**Versió:** 1.0  
**Mantenidor:** Equip OptimTech
