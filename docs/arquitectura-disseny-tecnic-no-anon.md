# 4. Arquitectura i Disseny Tècnic

## Visió General

El demostrador tecnològic AINA és una plataforma web completa que integra múltiples serveis d'Intel·ligència Artificial per donar suport a tasques administratives en català. L'arquitectura segueix un model **serverless-first** amb separació clara de responsabilitats entre frontend, backend i serveis especialitzats d'IA.

---

## 4.1 Diagrama d'Arquitectura

### Diagrama General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USUARIS / CLIENTS                                         │
│                              (Navegadors Web - Chrome, Firefox, etc.)                        │
└─────────────────────────────────────────────────────────┬───────────────────────────────────┘
                                                          │ HTTPS
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE HOSTING (Frontend SPA)                                       │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     REACT + VITE + TYPESCRIPT APPLICATION                              │  │
│  │  ┌─────────────────┬─────────────────┬─────────────────┐                              │  │
│  │  │   VALORACIÓ     │   ELABORACIÓ    │      KIT        │                              │  │
│  │  │  (Ofertes)      │   (Decrets)     │  (Lingüístic)   │                              │  │
│  │  └────────┬────────┴────────┬────────┴────────┬────────┘                              │  │
│  │           │    Components Compartits (UI, Hooks, Services)                             │  │
│  │           └─────────────────┴─────────────────┴──────────────┐                        │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │                        │  │
│  │  │ Zustand (State) │ React Router │ Firebase SDK │ shadcn/ui│                        │  │
│  │  └─────────────────────────────────────────────────────────┘ │                        │  │
│  └──────────────────────────────────────────────────────────────┘                        │  │
└────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    FIREBASE     │     │      FIREBASE       │     │     FIREBASE        │
│ AUTHENTICATION  │     │     FIRESTORE       │     │      STORAGE        │
│   (Usuaris)     │     │    (Base Dades)     │     │    (Fitxers)        │
│  • Email/Pass   │     │  • valoracions/     │     │  • PDFs             │
│  • OAuth        │     │  • decrets/         │     │  • Documents        │
│  • JWT Tokens   │     │  • glossary/        │     │  • CSVs             │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE CLOUD FUNCTIONS (Backend Serverless)                             │
│                           Node.js + TypeScript (europe-west4)                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                              MÒDULS FUNCIONALS                                       │    │
│  │  ┌─────────────────┬─────────────────────────┬──────────────────────────────────┐   │    │
│  │  │   VALORACIÓ     │      ELABORACIÓ         │            KIT                    │   │    │
│  │  │ • extractLots   │ • extractSubvencio      │ • checkLanguageTool              │   │    │
│  │  │ • evaluateLot   │ • elaboracioMetrics     │ • importGlossaryCSV              │   │    │
│  │  │ • compareOffers │                         │ • processRAGTerminologic         │   │    │
│  │  │ • valoracioApi  │                         │ • validateStyleTone              │   │    │
│  │  └─────────────────┴─────────────────────────┴──────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                           SERVEIS COMPARTITS (Shared)                                │    │
│  │  ┌────────────────┬──────────────┬────────────────┬────────────────────────────┐    │    │
│  │  │   LLMService   │  BigQuery    │ MetricsEngine  │    HealthCheck              │    │    │
│  │  │  (Multi-LLM)   │   Logger     │  (Dashboard)   │   (Monitoratge)             │    │    │
│  │  └────────────────┴──────────────┴────────────────┴────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   VERTEX AI (GCP)   │  │   RAG SERVICE       │  │   LANGUAGETOOL      │
│   (LLM Models)      │  │   (Cloud Run)       │  │   (Cloud Run)       │
│                     │  │                     │  │                     │
│ • Gemini 2.5 Flash  │  │ • FastAPI/Python    │  │ • Docker Container  │
│ • Gemini 2.5 Pro    │  │ • FAISS (vectors)   │  │ • API HTTP          │
│ • Salamandra 7B     │  │ • spaCy NLP         │  │ • Català suportat   │
│ • Alia 40B          │  │ • Sentence-Transf.  │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────┐
                        │   GOOGLE BIGQUERY   │
                        │   (Observabilitat)  │
                        │                     │
                        │ • llm_logs          │
                        │ • languagetool_logs │
                        │ • style_tone_logs   │
                        │ • module_metrics    │
                        └─────────────────────┘
```

### Diagrama de Flux de Dades (Pipeline IA)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE DE PROCESSAMENT D'IA - KIT LINGÜÍSTIC                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  TEXT D'ENTRADA │
                    │  (Usuari)       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌──────────────────────┐     ┌──────────────────────┐
   │  FASE 1: DETECCIÓ    │     │  LANGUAGETOOL        │
   │  (Paral·lel)         │     │  (Gramàtica)         │
   └──────────┬───────────┘     └──────────┬───────────┘
              │                             │
   ┌──────────┴──────────────┐              │
   │     MÈTODES             │              │
   │                         │              │
   │  1.1 NLP Detection      │              │
   │      (spaCy/Lemma)      │              │
   │           ↓             │              │
   │  1.2 Hash Detection     │              │
   │      (Exact/Stem)       │              │
   │           ↓             │              │
   │  1.3 LLM Detection      │              │
   │      (Gemini/Fallback)  │              │
   │                         │              │
   └──────────┬──────────────┘              │
              │                             │
              ▼                             │
   ┌──────────────────────┐                 │
   │  FASE 2: VECTOR      │                 │
   │  SEARCH (FAISS/RAG)  │                 │
   │  Cerca semàntica     │                 │
   │  al glossari         │                 │
   └──────────┬───────────┘                 │
              │                             │
              ▼                             │
   ┌──────────────────────┐                 │
   │  FASE 3: VALIDACIÓ   │                 │
   │  ESTIL I TO          │                 │
   │  (LLM + Regles)      │                 │
   │  • Castellanismes    │                 │
   │  • Col·loquialismes  │                 │
   │  • Registre          │                 │
   └──────────┬───────────┘                 │
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  FASE 4: MILLORA TEXT    │
              │  (LLM - Gemini)          │
              │  Aplicació correccions   │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  TEXT MILLORAT           │
              │  + Mètriques             │
              │  + Alertes               │
              └──────────────────────────┘
```

---

## 4.2 Components i Flux de Dades

### Frontend

#### Tecnologies Utilitzades

| Component    | Tecnologia       | Versió  | Propòsit                 |
| ------------ | ---------------- | ------- | ------------------------ |
| Framework    | React            | 19.1.1  | Biblioteca UI            |
| Bundler      | Vite             | 7.1.7   | Build i HMR              |
| Llenguatge   | TypeScript       | 5.x     | Type safety              |
| Estils       | Tailwind CSS     | 4.1.16  | Utility-first CSS        |
| Components   | shadcn/ui        | -       | Components accessibles   |
| Icones       | lucide-react     | 0.548.0 | Icones SVG               |
| Routing      | React Router DOM | 7.9.4   | Navegació SPA            |
| Estat Global | Zustand          | 5.0.8   | State management         |
| Firebase     | Firebase SDK     | 12.4.0  | Auth, Firestore, Storage |
| Tipografia   | Geist Font       | 1.5.1   | Font Vercel              |

#### Estructura de Mòduls

```
aina/src/
├── modules/
│   ├── valoracio/          # Mòdul Valoració d'Ofertes
│   │   ├── pages/          # Pàgines del mòdul
│   │   ├── components/     # Components específics
│   │   └── services/       # Serveis API
│   │
│   ├── elaboracio/         # Mòdul Elaboració Decrets
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   │
│   ├── kit/                # Mòdul Kit Lingüístic
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── LanguageToolPanel.jsx
│   │   │   ├── GlossaryManager.jsx
│   │   │   ├── RAGProcessMonitor.jsx
│   │   │   └── StyleToneValidator.jsx
│   │   └── services/
│   │
│   └── shared/             # Components compartits
│       ├── components/
│       ├── hooks/
│       └── utils/
```

#### Flux de Dades Frontend

1. **Autenticació**: L'usuari es connecta via Firebase Authentication (Email/Password o OAuth)
2. **Navegació**: React Router gestiona les rutes protegides amb `ProtectedRoute`
3. **Estat Global**: Zustand manté l'estat d'autenticació i configuracions amb persistència a sessionStorage
4. **Crides API**: El Firebase SDK gestiona les crides a Cloud Functions (callables) i l'accés a Firestore/Storage
5. **Real-time**: Firestore listeners permeten actualitzacions en temps real

---

### Backend / APIs

#### Arquitectura Serverless

Les Cloud Functions s'executen a **europe-west4** (Països Baixos) seguint un model serverless amb escalat automàtic.

##### Tipus de Functions

| Tipus                 | Trigger             | Ús Principal                    |
| --------------------- | ------------------- | ------------------------------- |
| **onCall**            | Callable des de SDK | APIs autenticades               |
| **onRequest**         | HTTP directe        | Webhooks, integracions externes |
| **onDocumentCreated** | Firestore trigger   | Processament asíncron           |
| **onSchedule**        | Cron                | Tasques periòdiques             |
| **onObjectFinalized** | Storage trigger     | Processament fitxers            |

##### Endpoints per Mòdul

**Valoració d'Ofertes**

```
POST /valoracioApi/api/upload/process-storage  → Processament PDFs
POST /valoracioApi/api/:lang/extract-lots      → Extracció lots
POST /valoracioApi/api/:lang/evaluate-lot      → Avaluació lot
POST /valoracioApi/api/:lang/compare-proposals → Comparació ofertes
```

**Kit Lingüístic**

```
CALLABLE checkLanguageTool       → Verificació gramàtica
CALLABLE importGlossaryCSV       → Importació glossari
CALLABLE processRAGTerminologic  → Correcció terminològica RAG
CALLABLE validateStyleTone       → Validació estil i to
CALLABLE improveText             → Millora de text amb IA
```

**Shared (Compartits)**

```
CALLABLE askLLM                  → Interfície unificada LLM
HTTP     metricsForDashboard     → Mètriques per dashboard
HTTP     bigQueryStats           → Estadístiques BigQuery
HTTP     healthCheck             → Estat del sistema
```

---

### Mòduls d'IA (LLM, NLP, Vectors)

#### LLMService - Interfície Unificada Multi-Model

El sistema implementa una capa d'abstracció que permet utilitzar diferents models LLM de manera intercanviable:

```typescript
enum LLMProvider {
	GEMINI_FLASH = "gemini-2.5-flash", // Model principal (ràpid)
	GEMINI_PRO = "gemini-2.5-pro", // Model avançat
	SALAMANDRA_7B_INSTRUCT = "salamandra-7b-instruct", // Model AINA/BSC
	SALAMANDRA_7B_LOCAL = "salamandra-7b-local", // Ollama local
	ALIA_40B_INSTRUCT = "alia-40b-instruct", // Model gran AINA
}
```

**Característiques del LLMService:**

- ✅ Comptatge de tokens automàtic
- ✅ Estimació de costos en temps real
- ✅ Logging a BigQuery per observabilitat
- ✅ Retry automàtic amb backoff exponencial
- ✅ Mode JSON forçat per respostes estructurades
- ✅ Gestió de timeouts i errors

**Integració amb Vertex AI:**

- Els models Gemini s'accedeixen directament via Vertex AI API
- Salamandra i Alia es despleguen com a endpoints privats a Vertex AI
- Suport per Salamandra local via Ollama per desenvolupament

#### Servei RAG (Retrieval Augmented Generation)

Microservei Python independent desplegat a **Cloud Run** per a cerca semàntica al glossari terminològic.

**Stack Tecnològic:**
| Component | Tecnologia | Propòsit |
|-----------|------------|----------|
| Framework | FastAPI | API REST async |
| Embeddings | Sentence-Transformers | Vectorització de text |
| Model Embeddings | `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base` | Model català |
| Vector Store | FAISS | Cerca KNN en memòria |
| NLP | spaCy `ca_core_news_trf` | Lematització catalana |

**Per què FAISS en lloc d'una Vector DB externa?**

1. **Volum de dades**: El glossari té milers d'entrades (no milions)
2. **Latència**: Accés en memòria < 1ms vs 20-100ms de xarxa
3. **Cost**: Zero cost addicional (s'executa dins el contenidor)
4. **Simplicitat**: L'índex és un fitxer `.faiss` que es carrega a l'inici

**Endpoints RAG:**

```
POST /search           → Cerca semàntica de termes
POST /detect-candidates → Detecció NLP amb lematització
GET  /health           → Health check
POST /vectorize        → Reconstruir índex
```

#### LanguageTool - Verificació Gramatical

Contenidor Docker amb el servei LanguageTool configurat per a català:

```dockerfile
FROM erikvl87/languagetool:latest
EXPOSE 8010
```

**Funcionalitats:**

- Verificació ortogràfica i gramatical
- Suport complet per a català
- Suggeriments de correcció
- Integració via API HTTP

---

### Vector DB / Bases de Dades

#### Firestore (Base de Dades Principal)

Base de dades NoSQL document-based per a dades operacionals:

```
firestore/
├── users/                  # Perfils d'usuari
│   └── {userId}/
│       ├── registerDate
│       ├── lastAccess
│       └── email
├── valoracions/            # Documents de valoració
├── decrets/                # Documents elaboració
├── linguistic_resources/   # Recursos kit lingüístic
└── glossary/               # Termes del glossari
    └── {termId}/
        ├── terme_recomanat
        ├── variants_no_normatives[]
        ├── categoria
        ├── context_d_us
        └── exemples[]
```

#### BigQuery (Observabilitat i Analítica)

Data warehouse per a logs, mètriques i analítica:

| Taula               | Propòsit                | Camps Clau                                                  |
| ------------------- | ----------------------- | ----------------------------------------------------------- |
| `llm_logs`          | Interaccions LLM        | request_id, provider, tokens, latency_ms, cost_estimate_usd |
| `languagetool_logs` | Verificacions gramàtica | text_length, errors_found, correction_count                 |
| `style_tone_logs`   | Validacions estil       | document_type, scores, alerts_by_severity                   |
| `module_metrics`    | Mètriques per mòdul     | module, metric_name, value, timestamp                       |

**Particionament**: Per dia (`timestamp`) per optimitzar costos i rendiment.

#### FAISS (Vector Store)

Índex vectorial en memòria per a cerca semàntica:

```python
# Construcció de l'índex
embeddings = model.encode(glossary_terms)
index = faiss.IndexFlatIP(embedding_dim)  # Inner Product
index.add(embeddings)
faiss.write_index(index, "glossari_index.faiss")
```

---

### Pipelines de Dades

#### Pipeline d'Importació de Glossari

```
CSV Upload → Firebase Storage → Cloud Function → Parse CSV
    → Validació → Firestore (glossary/) → Trigger Vectorització
    → RAG Service /vectorize → Nou índex FAISS
```

#### Pipeline de Processament RAG Terminològic

```
Text entrada
    │
    ├─→ Fase 1.1: NLP Detection (spaCy lematització)
    │       └─→ Match lemmes contra variants_lookup
    │
    ├─→ Fase 1.2: Hash Detection (fallback)
    │       └─→ Match exacte + stems
    │
    ├─→ Fase 1.3: LLM Detection (fallback final)
    │       └─→ Gemini detecta termes problemàtics
    │
    ├─→ Fase 2: Vector Search (FAISS)
    │       └─→ Cerca KNN per cada candidat
    │
    ├─→ Fase 3: Validació Estil (LLM + Regles)
    │       └─→ Castellanismes, registre, etc.
    │
    └─→ Fase 4: Millora Text (LLM)
            └─→ Aplica correccions amb context
```

#### Pipeline de Valoració d'Ofertes

```
PDF Oferta → Firebase Storage → Cloud Function (onFinalized)
    → Extracció Text (pdf-parse) → Identificació Lots (LLM)
    → Avaluació Criteris (LLM) → Comparació Ofertes
    → Resultat estructurat → Firestore + BigQuery log
```

---

## 4.3 Privacitat i Protecció de Dades

### Tractament de Dades als Logs

> ⚠️ **Nota important**: Actualment, els textos complets (prompts i respostes) **sí que s'emmagatzemen** a BigQuery per a finalitats de monitoratge i depuració. No hi ha implementada cap anonimització automàtica dels continguts.

| Tipus de Dada         | Tractament                                       | Implementació                            |
| --------------------- | ------------------------------------------------ | ---------------------------------------- |
| **Textos processats** | S'emmagatzemen complets a BigQuery (`llm_logs`)  | Camps `prompt`, `system_prompt`, `response` |
| **Usuaris**           | Identificador intern (Firebase UID)              | Camp `user_id` als logs                  |
| **Sessions**          | ID aleatori temporal                             | `session_{timestamp}_{random}`           |
| **Peticions**         | ID únic per petició                              | `req_{timestamp}_{random}`               |

### Recomanacions per a Entorns de Producció amb Dades Sensibles

Si es processen dades amb PII, caldria implementar:

```typescript
// Exemple d'anonimització (NO implementat actualment)
function hashText(text: string): string {
	return crypto.createHash("sha256").update(text).digest("hex").substring(0, 16)
}
```

### Controls d'Accés

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Només usuaris autenticats poden llegir/escriure
    match /valoracions/{document=**} {
      allow read, write: if request.auth != null;
    }

    match /glossary/{document=**} {
      allow read, write: if request.auth != null;
    }

    // Default: denegar tot
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

#### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Autenticació Cloud Functions

```typescript
export const secureFunction = onCall(async (request) => {
	if (!request.auth) {
		throw new HttpsError("unauthenticated", "Must be authenticated")
	}
	// Token JWT validat automàticament per Firebase
	const userId = request.auth.uid
	// ... lògica
})
```

### Tractament de Logs

| Log Type        | Retenció | Dades Sensibles              | Mesures                                          |
| --------------- | -------- | ---------------------------- | ------------------------------------------------ |
| **LLM Logs**    | 90 dies  | Prompts i respostes complets | ⚠️ Textos sense anonimitzar (veure nota superior)|
| **Error Logs**  | 30 dies  | Stack traces                 | Sanitització automàtica                          |
| **Access Logs** | 7 dies   | IPs                          | Agregació per anàlisi                            |
| **Metrics**     | 1 any    | Cap                          | Només mètriques numèriques                       |

### Compliment Normatiu (RGPD)

| Requisit RGPD                     | Implementació                                     |
| --------------------------------- | ------------------------------------------------- |
| **Minimització de dades**         | Només es recullen dades necessàries per al servei |
| **Limitació de finalitat**        | Dades usades només per millorar el servei         |
| **Exactitud**                     | Usuaris poden actualitzar les seves dades         |
| **Limitació d'emmagatzematge**    | Polítiques de retenció definides                  |
| **Integritat i confidencialitat** | Xifrat en trànsit (HTTPS) i en repòs (GCP)        |
| **Responsabilitat proactiva**     | Logging d'accés, security rules                   |

**Mesures Addicionals:**

- **Ubicació de dades**: Tots els serveis s'executen a **europe-west4** (UE)
- **Xifrat**: TLS 1.3 per trànsit, xifrat AES-256 per dades en repòs (GCP managed)
- **Accés API**: Només via tokens JWT validats per Firebase Auth
- **Vertex AI**: Les dades enviades a models no s'utilitzen per entrenar (configuració per defecte a GCP)

---

## 4.4 Principals Reptes Tècnics

### 1. Detecció de Variacions Morfològiques

**Problema**: El glossari conté termes en forma base (ex: "conformar") però els textos contenen formes conjugades (ex: "conformen", "conformaven").

**Impacte**: El sistema de cerca exacta i per stems fallava en detectar molts termes problemàtics.

### 2. Latència en Pipelines Multi-Fase

**Problema**: El pipeline complet (detecció → cerca vectorial → validació → millora) podia trigar >10 segons amb múltiples crides a LLM.

**Impacte**: Experiència d'usuari degradada per temps d'espera llargs.

### 3. Gestió de Múltiples Proveïdors LLM

**Problema**: Cada model (Gemini, Salamandra, Alia) té APIs, formats i configuracions diferents. A més, models locals (Ollama) vs cloud requereixen tractament diferent.

**Impacte**: Codi duplicat, dificultat de testing, inconsistència en logging.

### 4. Parsing de JSON Malformat

**Problema**: Models locals (Salamandra via Ollama) generen JSON amb errors: claus extra, comes trailing, text addicional.

**Impacte**: Errors de parsing que trencaven el pipeline.

### 5. Escalabilitat del Servei RAG

**Problema**: Carregar models grans (spaCy transformer + Sentence-Transformers) consumeix molta memòria i temps d'arrencada.

**Impacte**: Cold starts de 30-60 segons a Cloud Run.

### 6. Observabilitat Multi-Servei

**Problema**: Traces distribuïdes entre Firebase Functions, Cloud Run (RAG), i Cloud Run (LanguageTool) sense correlació.

**Impacte**: Dificultat per debugar problemes end-to-end.

### 7. Gestió de Secrets i Configuració

**Problema**: Múltiples entorns (local, emulador, producció) amb URLs i credencials diferents.

**Impacte**: Errors de configuració, riscos de seguretat.

---

## 4.5 Solucions Implementades

### 1. NLP amb spaCy per Lematització

**Solució**: Implementar detecció basada en NLP usant el model transformer català de spaCy (`ca_core_news_trf`).

```python
# RAG Service - Lematització
nlp_model = spacy.load("ca_core_news_trf")

for token in doc:
    lemma = token.lemma_.lower()
    if lemma in variants_lookup:
        # "conformen" → "conformar" → Match!
        candidates.append(...)
```

**Resultat**: Detecció de formes conjugades amb >95% d'accuracy.

### 2. Pipeline amb Fallback Progressiu

**Solució**: Arquitectura de detecció en cascada amb mètodes de diferent velocitat i cost:

```
NLP Detection (50-100ms, alt accuracy)
    ↓ si no troba candidats
Hash Detection (1-5ms, match exacte)
    ↓ si no troba candidats
LLM Detection (500-2000ms, casos complexos)
```

**Resultat**: Temps mitjà de detecció reduït a 80ms per la majoria de casos.

### 3. LLMService Unificat

**Solució**: Capa d'abstracció amb factory pattern i cache de serveis:

```typescript
function getLLMService(provider: LLMProvider): LLMService {
  if (serviceCache.has(provider)) {
    return serviceCache.get(provider)!;
  }

  switch (provider) {
    case LLMProvider.GEMINI_FLASH:
      service = createGeminiService(...);
      break;
    case LLMProvider.SALAMANDRA_7B_INSTRUCT:
      service = createSalamandraService(...);
      break;
    // ...
  }

  service.setLogCallback(createBigQueryLogger());
  serviceCache.set(provider, service);
  return service;
}
```

**Resultat**: Interfície unificada, logging automàtic, canvi de model amb un paràmetre.

### 4. Neteja de JSON Robusta

**Solució**: Parser amb múltiples estratègies de neteja:

```typescript
function cleanMalformedJSON(jsonStr: string): string {
	// 1. Comptar parèntesis i truncar si sobren
	// 2. Eliminar comes trailing
	// 3. Provar parsing progressiu des del final
	// 4. Fallback: retornar {response: text}
}
```

**Resultat**: 99%+ de respostes parsejades correctament.

### 5. Optimització de Cold Starts

**Solució**:

- Cloud Run amb `min-instances: 1` per mantenir instància calenta
- Lazy loading de models pesants
- FAISS índex pre-construït a la imatge Docker

```dockerfile
# Dockerfile RAG Service
RUN python build_index.py  # Índex construït a build time
```

**Resultat**: Cold starts reduïts a <10 segons.

### 6. Logging Centralitzat a BigQuery

**Solució**: Callback de logging injectable a tots els serveis:

```typescript
export function createBigQueryLogger() {
	return async (log: LLMInteractionLog) => {
		await bigquery
			.dataset(datasetId)
			.table(tableId)
			.insert([formatLogForBQ(log)])
	}
}
```

**Consultes tipus per analítica:**

```sql
-- Latència per proveïdor
SELECT provider, AVG(latency_ms) as avg_latency
FROM llm_logs
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY provider;
```

**Resultat**: Visibilitat completa de totes les interaccions, dashboards i alertes.

### 7. Gestió de Configuració per Entorn

**Solució**: Variables d'entorn amb fallbacks i validació:

```typescript
const REGION = "europe-west4"
const PROJECT_ID = process.env.PROJECT_ID || "aina-demostradors"
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8080"
```

**Fitxers de configuració:**

- `functions/.env.local` → Desenvolupament local
- `functions/.env.aina-demostradors` → Producció
- Firebase Functions config per a secrets sensibles

**Resultat**: Desplegament consistent entre entorns sense canvis de codi.

---

## Resum d'Arquitectura

| Capa               | Tecnologia       | Ubicació         | Escalabilitat    |
| ------------------ | ---------------- | ---------------- | ---------------- |
| **Frontend**       | React + Vite     | Firebase Hosting | CDN global       |
| **Autenticació**   | Firebase Auth    | Managed          | Automàtica       |
| **Base de Dades**  | Firestore        | europe-west4     | Automàtica       |
| **Storage**        | Firebase Storage | europe-west4     | Automàtica       |
| **Backend**        | Cloud Functions  | europe-west4     | 0-100 instàncies |
| **LLM**            | Vertex AI        | europe-west4     | Managed          |
| **RAG Service**    | Cloud Run        | europe-west4     | 0-10 instàncies  |
| **LanguageTool**   | Cloud Run        | europe-west4     | 1-5 instàncies   |
| **Observabilitat** | BigQuery         | EU               | Automàtica       |

**Temps de resposta típics:**

- Verificació gramàtica: 200-500ms
- Detecció terminològica (NLP): 50-150ms
- Validació estil complet: 2-5 segons
- Processament PDF: 30-60 segons
