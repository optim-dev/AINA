# AINA - Demostrador Tecnològic

## 📋 Descripció del Projecte

AINA és una aplicació web desenvolupada amb **React + Vite + TypeScript** que funciona com a **demostrador tecnològic** integrant tres mòduls diferents sota un mateix punt d'accés. El projecte utilitza **Firebase** (Firestore, Storage i Authentication) com a backend i implementa **funcions serverless** per gestionar la lògica de negoci de cada mòdul de forma independent.

## 🎯 Objectius

- Demostrar la integració de múltiples tecnologies en una única aplicació
- Proporcionar tres mòduls independents amb funcionalitats diferenciades
- Implementar arquitectura serverless escalable amb Firebase Functions
- Garantir una experiència d'usuari fluida amb React + Vite
- Utilitzar Firebase com a backend complet (base de dades, storage i autenticació)

## 🧩 Mòduls de l'Aplicació

### Valoració d'Ofertes

Gestió i avaluació d'ofertes per a processos de contractació i licitacions.

### Elaboració Decrets

Gestió i elaboració de decrets administratius amb eines de suport lingüístic i formal.

### Kit Lingüístic

Eines i recursos lingüístics per assegurar la qualitat i coherència del llenguatge administratiu.

## ✨ Característiques Principals

- **React** 19.1.1: Biblioteca per construir interfícies d'usuari
- **Vite** 7.1.7: Eina de construcció i desenvolupament ràpid amb HMR
- **TypeScript** ^5.x: Type safety en tot el projecte
- **Tailwind CSS** v4: Framework CSS utility-first modern
- **shadcn/ui**: Components accessibles basats en Radix UI
- **Firebase Integration**: Firestore, Storage i Authentication
- **Serverless Functions**: Cloud Functions per a lògica customitzada per mòdul
- **Responsive Design**: Interfície adaptativa per a tots els dispositius
- **Modularitat**: Tres mòduls independents amb un punt d'accés comú
- **Zustand**: Gestió d'estat global lleugera i reactiva

## 🚀 Inici Ràpid

### Prerequisits

- **Node.js** >= 18.x
- **npm** >= 9.x o **yarn** >= 1.22.x
- **Firebase CLI**: `npm install -g firebase-tools`
- **Compte de Firebase**: Projecte creat a [Firebase Console](https://console.firebase.google.com/)
- **Git**

### Instal·lació

```bash
# Clonar el repositori
git clone <repository-url>
cd CODE

# Instal·lar dependències
npm install

# Configurar Firebase
firebase login
firebase use --add  # Selecciona el teu projecte Firebase

# Configurar variables d'entorn
cp .env.local.example .env.local
# Edita .env.local amb les teves credencials de Firebase

# Executar en mode desenvolupament
npm run dev
```

L'aplicació estarà disponible a [http://localhost:3000](http://localhost:3000)

### Configuració de Firebase

1. Crea un projecte a [Firebase Console](https://console.firebase.google.com/)
2. Activa **Firestore Database**
3. Activa **Storage**
4. Configura **Authentication** (Email/Password, Google, etc.)
5. Copia les credencials al fitxer `.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Configuració de Firebase Functions

Les Cloud Functions requereixen les següents variables d'entorn configurades a `functions/.env.local` (desenvolupament) i `functions/.env.aina-demostradors` (producció):

```env
# Project Configuration
PROJECT_ID=aina-demostradors

# BigQuery Dataset
BQ_DATASET=aina_logs_dev  # o aina_logs_prod per producció

# LanguageTool Container URL
LANGUAGETOOL_URL=http://localhost:8010  # local, o URL de Cloud Run per producció

# RAG Service URL
RAG_SERVICE_URL=http://localhost:8080  # local, o URL de Cloud Run per producció

# Storage Bucket
STORAGE_BUCKET=your-project.firebasestorage.app
```

_Nota: Les credencials de Gemini API es gestionen internament per LLMService mitjançant Application Default Credentials (ADC)._

### Scripts Disponibles

```bash
npm run dev              # Executa Vite dev server (frontend)
npm run build            # Build per a producció
npm run preview          # Preview del build de producció
npm run lint             # Executa ESLint
npm run type-check       # Comprova els tipus de TypeScript (si configurat)

# Firebase Functions
npm run functions:serve  # Emula les functions localment
npm run functions:deploy # Desplega les functions a Firebase
npm run functions:logs   # Veure logs de les functions
```

## 📚 Documentació

La documentació completa del projecte es troba a la carpeta `/docs`:

- [Arquitectura](docs/architecture.md) - Arquitectura React + Vite + TypeScript + Firebase + Serverless
- [API & Functions](docs/api.md) - Documentació de Cloud Functions i endpoints
- [Registre i Monitoratge (BigQuery)](docs/BigQueryLogs.md) - Documentació dels models de dades i logs
- [Guia de Desenvolupament](docs/development.md) - Guia per a desenvolupadors
- [Migració TypeScript](docs/typescript-migration.md) - Detalls de la migració a TypeScript

## 📄 Llicència

Copyright 2025 OptimTech.

Aquest projecte està llicenciat sota **Apache License 2.0**. Vegeu el fitxer [LICENSE](LICENSE).

## 🏗️ Estructura del Projecte

```
.
├── aina/                          # Aplicació principal (Vite + React + TypeScript)
│   ├── src/
│   │   ├── App.tsx               # Component principal
│   │   ├── main.tsx              # Punt d'entrada
│   │   ├── index.css             # Estils globals
│   │   ├── App.css               # Estils App
│   │   ├── vite-env.d.ts         # Vite type declarations
│   │   ├── components/           # Components UI globals
│   │   │   ├── AppSidebar.jsx   # Navegació lateral
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── LoginForm.jsx    # Formulari autenticació
│   │   │   ├── LoginForm.css
│   │   │   ├── NavHeader.jsx    # Capçalera navegació
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ui/              # Components UI reutilitzables (shadcn)
│   │   ├── modules/              # Mòduls de l'aplicació
│   │   │   ├── README.md        # Documentació dels mòduls
│   │   │   ├── valoracio/       # Mòdul Valoració d'Ofertes
│   │   │   │   ├── README.md
│   │   │   │   ├── index.js
│   │   │   │   ├── components/  # Components específics
│   │   │   │   ├── lib/         # Lògica de negoci
│   │   │   │   ├── pages/       # Pàgines del mòdul
│   │   │   │   ├── services/    # Serveis específics
│   │   │   │   └── types/       # Tipus TypeScript
│   │   │   ├── elaboracio/      # Mòdul Elaboració Decrets
│   │   │   │   ├── README.md
│   │   │   │   ├── QUICK_START.md
│   │   │   │   ├── INFORME_TECNIC_STEPS.md
│   │   │   │   ├── index.js
│   │   │   │   ├── components/
│   │   │   │   ├── lib/
│   │   │   │   ├── pages/
│   │   │   │   ├── services/
│   │   │   │   └── types/
│   │   │   ├── kit/             # Mòdul Kit Lingüístic
│   │   │   │   ├── index.js
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/       # Custom hooks del mòdul
│   │   │   │   ├── lib/
│   │   │   │   ├── pages/
│   │   │   │   └── types/
│   │   │   └── shared/          # Components i lògica compartida
│   │   │       ├── index.js
│   │   │       ├── components/
│   │   │       ├── lib/
│   │   │       └── types/
│   │   ├── pages/                # Pàgines principals
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Health.jsx       # Monitoratge salut del sistema
│   │   │   ├── ModelMetriques.jsx
│   │   │   ├── ModelSelection.jsx
│   │   │   └── Moduls.jsx
│   │   ├── services/             # Serveis externs globals
│   │   │   ├── firebase.js      # Configuració Firebase
│   │   │   ├── kitService.ts    # Servei Kit Lingüístic
│   │   │   ├── llmHealthService.ts
│   │   │   └── metricsService.ts
│   │   ├── stores/               # Gestió d'estat (Zustand)
│   │   │   ├── authStore.js
│   │   │   └── settingsStore.js
│   │   ├── hooks/                # Custom React hooks globals
│   │   │   ├── use-mobile.jsx
│   │   │   └── useMetrics.ts
│   │   ├── lib/                  # Utilitats generals
│   │   │   └── utils.js
│   │   └── assets/               # Recursos estàtics (imatges, etc.)
│   ├── public/                   # Recursos estàtics públics
│   ├── components.json           # Configuració shadcn/ui
│   ├── vite.config.ts            # Configuració Vite
│   ├── tsconfig.json             # Configuració TypeScript
│   ├── tsconfig.app.json         # Config TS per l'app
│   ├── tsconfig.node.json        # Config TS per Node
│   ├── eslint.config.js          # Configuració ESLint
│   ├── index.html                # HTML principal
│   └── package.json              # Dependències frontend
├── functions/                     # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts             # Export de totes les functions
│   │   ├── genkit-sample.ts     # Exemple Genkit
│   │   ├── auth/                # Functions d'autenticació
│   │   ├── valoracio/           # Functions del mòdul Valoració
│   │   │   ├── README.md
│   │   │   ├── IMPLEMENTATION_SUMMARY.md
│   │   │   ├── index.ts
│   │   │   └── lib/
│   │   ├── elaboracio/          # Functions del mòdul Elaboració
│   │   │   ├── index.ts
│   │   │   └── lib/
│   │   ├── kit/                 # Functions del mòdul Kit
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   ├── types/
│   │   │   ├── glossaryHandler.ts
│   │   │   ├── languageToolHandler.ts
│   │   │   ├── ragProcessHandler.ts
│   │   │   ├── styleToneHandler.ts
│   │   │   ├── styleRulesEngine.ts
│   │   │   ├── LanguageToolLogger.ts
│   │   │   ├── RAGProcessLogger.ts
│   │   │   └── StyleToneLogger.ts
│   │   ├── shared/              # Utilitats compartides
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── utils.ts
│   │   │   ├── BigQueryLogger.ts
│   │   │   ├── LLMService.ts
│   │   │   ├── MetricsEngine.ts
│   │   │   ├── bigQueryApi.ts
│   │   │   ├── healthCheck.ts
│   │   │   ├── llmApi.ts
│   │   │   ├── llmHealthCheck.ts
│   │   │   ├── metricsApi.ts
│   │   │   ├── verticalProcessHandler.ts
│   │   │   └── README_*.md
│   │   └── types/               # Tipus TypeScript compartits
│   ├── lib/                     # Codi compilat (JavaScript)
│   ├── .env.local               # Variables d'entorn (desenvolupament)
│   ├── .env.aina-demostradors   # Variables d'entorn (producció)
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.dev.json
├── languagetool/                  # Servei LanguageTool (Docker/Cloud Run)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── deploy.sh                # Script desplegament a Cloud Run
│   ├── README.md                # Documentació infra
│   └── BACKEND_INTEGRATION.md   # Guia integració backend
├── rag_service/                   # Servei RAG (NLP + FAISS)
│   ├── main.py                  # FastAPI server
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── deploy.sh                # Script desplegament a Cloud Run
│   ├── build_index.py           # Construcció índex FAISS
│   ├── build_dynamic_index.py   # Construcció dinàmica
│   ├── test_nlp_detection.py   # Tests NLP
│   ├── test_service.sh          # Script de testing
│   ├── README.md                # Documentació servei
│   ├── ARCHITECTURE.md          # Arquitectura tècnica
│   ├── NLP_IMPLEMENTATION_SUMMARY.md
│   ├── model_embeddings_selection.md
│   └── data/                    # Índex FAISS i metadades
│       ├── glossari_index.faiss
│       ├── glossari_metadata.pkl
│       └── termes.csv
├── scripts_infra_vertex/          # Scripts gestió infra Vertex AI
│   ├── README.md
│   ├── VERTEX_CONFIG.md
│   ├── JSON_CALL.md
│   ├── base.py
│   ├── lifecycle.py
│   ├── lifecycle_big.py
│   ├── lifecycle.js
│   ├── shutdown.py
│   ├── shutdown_big.py
│   └── curl.post.txt
├── docs/                          # Documentació del projecte
│   ├── architecture.md          # Arquitectura general
│   ├── arquitectura-disseny-tecnic.md
│   ├── arquitectura-disseny-tecnic-no-anon.md
│   ├── api.md                   # Documentació API
│   ├── development.md           # Guia desenvolupament
│   ├── decret-developer-guide.md
│   ├── BigQueryLogs.md          # Esquema logs BigQuery
│   ├── bigquery-schema.md       # Esquema detallat BigQuery
│   ├── 5-validacio-avaluacio-metriques.md
│   ├── 7-manual-desplegament-us.md
│   ├── integracio-recursos-aina.md
│   ├── kit-validacio-estil-to-requeriments.md
│   ├── validateToneStyle.md     # Validació to i estil
│   ├── validateToneStyleHuman.md
│   └── incidencies.md
├── firebase.json                  # Configuració Firebase
├── firestore.rules               # Regles de seguretat Firestore
├── firestore.indexes.json        # Índexs Firestore
├── storage.rules                 # Regles de seguretat Storage
├── apphosting.emulator.yaml      # Configuració emulador
├── package.json                  # Scripts root del projecte
└── README.md                     # Aquest fitxer
```

## 🔧 Tecnologies

### Frontend

- **React 19+**: Llibreria UI moderna
- **Vite 7+**: Build tool i dev server ràpid amb HMR
- **TypeScript 5+**: Tipat estàtic
- **Tailwind CSS v4**: Framework CSS utility-first
- **Shadcn/ui**: Components UI accessibles basats en Radix UI
- **Zustand**: Gestió d'estat lleugera

### Backend

- **Firebase Firestore**: Base de dades NoSQL en temps real
- **Firebase Storage**: Emmagatzematge de fitxers
- **Firebase Authentication**: Gestió d'usuaris i autenticació
- **Cloud Functions**: Funcions serverless (Node.js/TypeScript)

### DevOps & Tools

- **Firebase Hosting**: Desplegament del frontend
- **ESLint**: Linter per JavaScript/TypeScript
- **Prettier**: Formatatge de codi
- **Git**: Control de versions

## 🤝 Contribució

Les contribucions són benvingudes! Si us plau, llegiu la [Guia de Desenvolupament](docs/development.md) abans de contribuir.

### Procés de Contribució

1. Fork el projecte
2. Crea una branca per a la teva feature (`git checkout -b feature/nova-funcionalitat`)
3. Commit els teus canvis (`git commit -m 'feat: afegeix nova funcionalitat'`)
4. Push a la branca (`git push origin feature/nova-funcionalitat`)
5. Obre un Pull Request

## 🚀 Desplegament

### Desplegament a Firebase Hosting

```bash
# Build de l'aplicació
npm run build

# Desplegar frontend i functions
firebase deploy

# Només frontend
firebase deploy --only hosting

# Només functions
firebase deploy --only functions
```

### Variables d'Entorn en Producció

Configura les variables d'entorn a Firebase:

```bash
firebase functions:config:set \
  app.name="AINA" \
  app.environment="production"
```

### Infra: LanguageTool (Correcció Ortogràfica)

El mòdul **Kit Lingüístic** integra LanguageTool mitjançant una **Firebase Callable Function**. La infraestructura del servei LanguageTool (contenidor Docker / Cloud Run) es gestiona a la carpeta [`languagetool/`](languagetool/).

- **Guia completa d'infra (local + Cloud Run):** [`languagetool/README.md`](languagetool/README.md)
- **Guia d'integració backend (frontend → functions → LanguageTool):** [`languagetool/BACKEND_INTEGRATION.md`](languagetool/BACKEND_INTEGRATION.md)
- **Deploy a Cloud Run (script que retorna la URL):** `./languagetool/deploy.sh EL_TEU_PROJECT_ID` (fa smoke test i imprimeix `LANGUAGETOOL_URL` + enllaç al recurs de Cloud Run)

Resum (high-level):

- **Local (Docker):**

  - `cd languagetool && docker compose up -d`
  - Configura a `functions/.env.dev` la variable `LANGUAGETOOL_URL=http://host.docker.internal:8010`
  - Executa emuladors: `cd functions && npm run serve`

- **Producció (Cloud Run):**
  > **Info:** El desplegament es realitza a Cloud Run mitjançant Artifact Registry. Cal configurar la URL del servei resultant a `functions/.env.prod` sota la variable `LANGUAGETOOL_URL`.
  - Dona permís execució (`chmod +x languagetool/deploy.sh`) i executa `./languagetool/deploy.sh EL_TEU_PROJECT_ID` i copia el **Service URL**. Pots saber el teu project ID: `firebase projects:list`
  - Actualitza `functions/.env.prod` amb `LANGUAGETOOL_URL=<service-url>` (**requerit** per poder desplegar/arrencar les Firebase Functions)
  - Desplega la function que fa de proxy cap a LanguageTool

### Infra: RAG Service (Cerca Vectorial i Detecció NLP)

El mòdul **Kit Lingüístic** utilitza un servei RAG per a la detecció de candidats mitjançant NLP (lematització amb spaCy) i cerca semàntica amb vectors FAISS. La infraestructura es gestiona a la carpeta [`rag_service/`](rag_service/).

- **Documentació completa:** [`rag_service/README.md`](rag_service/README.md)
- **Arquitectura del servei:** [`rag_service/ARCHITECTURE.md`](rag_service/ARCHITECTURE.md)
- **Deploy a Cloud Run (script amb persistència):** `./rag_service/deploy.sh EL_TEU_PROJECT_ID`

**Característiques tècniques:**

- **Model d'embeddings:** `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base`
- **Model NLP:** spaCy `ca_core_news_trf` (transformer-based per a lematització catalana)
- **Índex vectorial:** FAISS amb persistència a Google Cloud Storage
- **Memòria requerida:** 8Gi (per carregar models spaCy transformer + SentenceTransformer)

Resum (high-level):

- **Local (Docker):**

  - `cd rag_service && docker build -t aina-rag-service .`
  - `docker run -p 8080:8080 aina-rag-service`
  - Configura a `functions/.env.dev` la variable `RAG_SERVICE_URL=http://localhost:8080`

- **Producció (Cloud Run amb persistència):**
  > **Info:** El desplegament crea un bucket GCS (`aina-rag-data-<project-id>`) que es munta com a volum a `/app/data`. Això permet que l'índex FAISS (`glossari_index.faiss`) i les metadades (`glossari_metadata.pkl`) es mantinguin entre reinicis del contenidor.
  - Dona permís execució (`chmod +x rag_service/deploy.sh`) i executa `./rag_service/deploy.sh EL_TEU_PROJECT_ID`
  - El script:
    1. Crea el repositori a Artifact Registry
    2. Crea el bucket GCS per a persistència de l'índex
    3. Puja els fitxers locals si existeixen (`data/glossari_index.faiss`, `data/glossari_metadata.pkl`)
    4. Construeix i puja la imatge Docker (linux/amd64)
    5. Desplega a Cloud Run amb volum GCS muntat a `/app/data`
    6. Executa smoke test (`/health`)
  - Actualitza `functions/.env.prod` amb `RAG_SERVICE_URL=<service-url>`
  - Si no existeix índex, crida `POST /vectorize` amb les dades del glossari

**Endpoints principals:**

| Endpoint             | Mètode | Descripció                                 |
| -------------------- | ------ | ------------------------------------------ |
| `/health`            | GET    | Estat del servei i models carregats        |
| `/detect-candidates` | POST   | Detecció NLP amb lematització spaCy        |
| `/search`            | POST   | Cerca semàntica vectorial amb FAISS        |
| `/vectorize`         | POST   | Reconstrueix l'índex amb dades de Firebase |

## 🔐 Seguretat

- **Firestore Rules**: Regles de seguretat configurades a `firestore.rules`
- **Storage Rules**: Regles de seguretat configurades a `storage.rules`
- **Authentication**: Validació d'usuaris en totes les operacions sensibles
- **HTTPS Only**: Totes les comunicacions xifrades
- **Environment Variables**: Secrets mai al repositori

### IAM Permissions per Cloud Functions

Les Cloud Functions utilitzen el compte de servei per defecte de Compute Engine (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`). Aquest compte necessita els següents rols IAM per funcionar correctament:

| Rol                        | Descripció                                  | Requerit per                                            |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `roles/datastore.user`     | Lectura/escriptura a Firestore              | Glossari, Vectorització, totes les operacions Firestore |
| `roles/bigquery.dataOwner` | Crear datasets i taules, lectura/escriptura | Mètriques, Logs LLM                                     |
| `roles/bigquery.jobUser`   | Executar consultes BigQuery                 | Dashboard de mètriques                                  |

**Configuració dels permisos:**

```bash
# Obtenir el número de projecte
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Afegir permisos de Firestore
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"

# Afegir permisos de BigQuery (datasets, taules, dades)
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.dataOwner"

# Afegir permisos per executar queries BigQuery
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

**Verificar els permisos actuals:**

```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --format="table(bindings.role,bindings.members)" \
  | grep -E "(datastore|bigquery)"
```

> **Nota**: Aquests permisos són necessaris perquè el Firebase Admin SDK, tot i que bypassa les Firestore Security Rules, encara requereix permisos IAM a nivell de compte de servei.

## �️ Resolució de Problemes

### Error d'autenticació (invalid_rapt)

Si trobes errors com `invalid_grant` o `reauth related error (invalid_rapt)` als logs de les functions (especialment connectant amb BigQuery o Vertex AI), és probable que les credencials locals hagin caducat.

**Solució:**

```bash
# 1. Re-autenticar Firebase CLI
firebase login --reauth

# 2. Re-autenticar Google Cloud SDK (Application Default Credentials)
gcloud auth application-default login
```

## 📄 Llicència

Copyright 2025 OptimTech.

Aquest projecte està llicenciat sota **Apache License 2.0**. Vegeu el fitxer [LICENSE](LICENSE).

## 👥 Equip

Desenvolupat per l'equip d'OptimTech.

## 📞 Contacte

Per a qualsevol dubte o suggeriment, si us plau contacta amb l'equip de desenvolupament.

---

**Nota**: Aquest és un projecte en desenvolupament actiu. Consulta la documentació per a més informació sobre l'estat actual i les funcionalitats planificades.
