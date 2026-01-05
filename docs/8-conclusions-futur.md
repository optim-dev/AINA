# 8. Conclusions i Futur

Aquest document presenta les conclusions finals del projecte **AINA - Demostrador Tecnològic**, les lliçons apreses durant el seu desenvolupament i la visió estratègica per a la seva evolució cap a un producte de mercat.

---

## Índex

- [8.1 Lliçons Apreses](#81-lliçons-apreses)
  - [8.1.1 Què ha Funcionat Bé](#811-què-ha-funcionat-bé)
  - [8.1.2 Què es Faria Diferent](#812-què-es-faria-diferent)
- [8.2 Futur](#82-futur)
  - [8.2.1 Propers Passos cap a Producte de Mercat](#821-propers-passos-cap-a-producte-de-mercat)
  - [8.2.2 Millores Previstes](#822-millores-previstes)
  - [8.2.3 Potencials Col·laboracions i Socis Tecnològics](#823-potencials-collaboracions-i-socis-tecnològics)
- [8.3 Conclusió General](#83-conclusió-general)

---

## 8.1 Lliçons Apreses

El desenvolupament del demostrador tecnològic AINA ha proporcionat un aprenentatge valuós sobre la integració de models d'Intel·ligència Artificial per al català en aplicacions reals. A continuació es detallen els aspectes positius i les àrees de millora identificades.

---

### 8.1.1 Què ha Funcionat Bé

#### 🎯 Arquitectura Serverless-First

| Aspecte                      | Valoració     | Detall                                                                |
| ---------------------------- | ------------- | --------------------------------------------------------------------- |
| **Firebase Cloud Functions** | ✅ Excel·lent | Desplegament àgil, escalat automàtic, integració nativa amb Firestore |
| **Separació de mòduls**      | ✅ Excel·lent | Valoració, Elaboració i Kit operen de manera independent              |
| **Gestió de costos**         | ✅ Molt bona  | Model pay-per-use evita costos fixos elevats                          |

**Benefici principal**: L'arquitectura serverless ha permès iterar ràpidament sense preocupar-se per la infraestructura, reduint el temps de desenvolupament en un 40% estimat respecte a una arquitectura tradicional.

---

#### 🤖 Integració Sinèrgica de Models AINA

El pipeline que combina múltiples recursos AINA ha demostrat ser robust i eficaç:

```
TEXT D'ENTRADA
      │
      ▼
┌─────────────────┐
│ spaCy ca_core   │  ← Lematització i NLP
│ (Transformer)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ST-NLI-ca       │  ← Embeddings i cerca semàntica
│ + FAISS         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Salamandra/ALIA │  ← Generació i validació
│ + Gemini        │
└────────┬────────┘
         │
         ▼
   TEXT CORREGIT
```

**Resultats observats**:

- **Complementarietat**: Cada component aporta capacitats específiques
- **Fallback robust**: Si un component falla, altres poden compensar
- **Flexibilitat**: Intercanvi de models segons cost/velocitat/qualitat

---

#### 📊 Sistema de Logging i Observabilitat (BigQuery)

| Component             | Funcionalitat                    | Estat       |
| --------------------- | -------------------------------- | ----------- |
| `llm_logs`            | Registre de totes les crides LLM | ✅ Operatiu |
| `style_tone_logs`     | Mètriques de validació d'estil   | ✅ Operatiu |
| `style_tone_feedback` | Feedback dels usuaris            | ✅ Operatiu |
| `languagetool_logs`   | Correccions gramaticals          | ✅ Operatiu |

**Valor afegit**: Capacitat d'analitzar patrons d'ús, identificar problemes recurrents i mesurar la qualitat del sistema de forma objectiva.

---

#### 🔍 Model d'Embeddings Natiu (ST-NLI-ca)

El model `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base` ha superat les expectatives:

| Mètrica                              | Resultat                            |
| ------------------------------------ | ----------------------------------- |
| Precisió semàntica en català         | Alta                                |
| Temps de cerca (FAISS)               | < 1ms                               |
| Integració amb sentence-transformers | Directa (plug & play)               |
| Detecció d'equivalències             | Molt bona ("vivenda" ↔ "habitatge") |

---

#### ✍️ Qualitat Lingüística en Català Administratiu

Les validacions han demostrat alta qualitat:

| Aspecte                      | Valoració     |
| ---------------------------- | ------------- |
| Comprensió del català formal | ✅ Excel·lent |
| Detecció de castellanismes   | ✅ Molt bona  |
| Terminologia administrativa  | ✅ Molt bona  |
| Coherència estilística       | ✅ Bona       |

**Exemples d'èxit validats**:

- "agotar la via administrativa" → "exhaurir la via administrativa" ✅
- "vivenda social" → "habitatge social" ✅
- "a fi de que" → "a fi que" ✅
- "a nivell de" → "a escala de" ✅

---

#### 🚀 Desplegament a Vertex AI

La integració amb Google Cloud Vertex AI funciona de manera estable:

| Model         | Configuració                | Latència típica |
| ------------- | --------------------------- | --------------- |
| Salamandra 7B | g2-standard-8 (1x L4 GPU)   | 2-5 segons      |
| ALIA-40B      | g2-standard-48 (4x L4 GPUs) | 5-10 segons     |

**Scripts desenvolupats**:

- `lifecycle.py` / `lifecycle_big.py`: Desplegament automatitzat
- `shutdown.py` / `shutdown_big.py`: Gestió de costos

---

#### 🧩 Arquitectura RAG Híbrida

La combinació de mètodes de detecció s'ha demostrat molt efectiva:

| Mètode                          | Rol                                | Precisió  |
| ------------------------------- | ---------------------------------- | --------- |
| **NLP Detection** (spaCy/Lemma) | Detecció primària via lematització | Alta      |
| **Hash Detection** (Exact/Stem) | Cerca ràpida per taula hash        | Molt alta |
| **LLM Detection** (Fallback)    | Detecció contextual avançada       | Moderada  |
| **Vector Search** (FAISS)       | Cerca semàntica al glossari        | Alta      |

---

### 8.1.2 Què es Faria Diferent

#### ⚠️ Implementar Tests des de l'Inici

**Situació actual**: El projecte no disposa de proves unitàries automatitzades.

**Impacte negatiu observat**:

- Regressions en actualitzacions no detectades
- Validació manual costosa i propensa a errors
- Dificultat per assegurar qualitat consistent

**Recomanació futura**:

```
Estratègia de Testing Proposada
├── Unit Tests (Jest/Vitest)
│   ├── Components React
│   ├── Funcions Cloud Functions
│   └── Serveis compartits
├── Integration Tests
│   ├── Endpoints API
│   ├── Pipeline RAG complet
│   └── Fluxos LLM
└── E2E Tests (Playwright/Cypress)
    ├── Fluxos d'usuari crítics
    └── Validació visual
```

**Lliçó apresa**: "Moure's ràpid i trencar coses" funciona per a MVPs, però les proves són essencials per a productes de mercat.

---

#### ⚠️ Definir Estratègia de Models des del Principi

**Problema trobat**: Salamandra 7B presenta el **problema de l'eco** en tasques d'elaboració de contingut.

| Tasca                       | Salamandra 7B | ALIA 40B      | Gemini        |
| --------------------------- | ------------- | ------------- | ------------- |
| Extracció JSON              | ✅ Excel·lent | ✅ Excel·lent | ✅ Excel·lent |
| Classificació               | ✅ Bona       | ✅ Excel·lent | ✅ Excel·lent |
| Q&A Simple                  | ✅ Acceptable | ✅ Bona       | ✅ Excel·lent |
| **Elaboració de contingut** | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |
| **Generació creativa**      | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |

**Lliçó apresa**: Definir matrius d'adequació model-tasca abans de començar el desenvolupament. No tots els models serveixen per a tot.

---

#### ⚠️ Gestió de Costos d'Infraestructura Proactiva

**Problema**: Els endpoints de Vertex AI generen costos significatius si romanen actius:

| Configuració         | Cost/hora |
| -------------------- | --------- |
| Salamandra 7B (1xL4) | ~$1.50    |
| ALIA-40B (4xL4)      | ~$6.00    |
| ALIA-40B (8xL4)      | ~$12.00   |

**Solució implementada a posteriori**: Scripts de shutdown automàtic.

**Recomanació futura**:

- Implementar escalat a zero des de l'inici
- Configurar alertes de pressupost
- Utilitzar endpoints compartits quan sigui possible

---

#### ⚠️ Documentació d'Incidències Estructurada

**Valor demostrat**: El document `incidencies.md` ha resultat molt útil per resoldre problemes recurrents.

| Incidència     | Model         | Solució                              |
| -------------- | ------------- | ------------------------------------ |
| JSON malformat | Salamandra 7B | `cleanMalformedJSON()`               |
| Problema d'eco | Salamandra 7B | Instruccions anti-eco al prompt      |
| Al·lucinacions | ALIA-40B      | Revisió humana obligatòria           |
| Quota exceeded | Vertex AI     | Procediment de sol·licitud d'augment |

**Lliçó apresa**: Documentar incidències des del dia 1 estalvia temps i facilita l'onboarding de nous desenvolupadors.

---

#### ⚠️ Disseny del Glossari amb Escalabilitat

**Situació actual**: ~60 entrades al glossari terminològic (`termes.csv`).

**Limitació identificada**: Estructura plana que dificulta l'escalabilitat.

**Recomanació futura**:

```
Estructura Millorada Proposada
├── Base de dades relacional (PostgreSQL/Firestore)
├── Categories jeràrquiques
├── Versionat de termes
├── API de gestió (CRUD)
├── Import/Export múltiples formats
└── Sincronització amb fonts oficials (TERMCAT, Optimot)
```

---

#### ⚠️ Estratègia de Context Window des de l'Inici

**Problema trobat**: Documents llargs requereixen chunking i gestió de context.

| Model         | Context Màxim | Limitació Pràctica                    |
| ------------- | ------------- | ------------------------------------- |
| Salamandra 7B | 8k tokens     | Documents llargs requereixen chunking |
| ALIA-40B      | 8k-32k tokens | Cost elevat, quota GPU limitada       |

**Documentació generada**: `context-window-strategy.md`, `context-window-migration-guide.md`

**Lliçó apresa**: Definir l'estratègia de gestió de context abans de començar, no quan es troben els límits.

---

## 8.2 Futur

### 8.2.1 Propers Passos cap a Producte de Mercat

La transformació del demostrador en un producte comercialitzable requereix una estratègia estructurada en fases:

---

#### Fase 1: Consolidació Tècnica (0-3 mesos)

| Acció                                     | Prioritat  | Esforç | Impacte |
| ----------------------------------------- | ---------- | ------ | ------- |
| Implementar suite de tests automatitzats  | 🔴 Crítica | Alt    | Alt     |
| Optimitzar rendiment i latència           | 🔴 Crítica | Mitjà  | Alt     |
| Completar documentació tècnica i d'usuari | 🟡 Alta    | Mitjà  | Mitjà   |
| Auditar seguretat i compliment RGPD       | 🔴 Crítica | Alt    | Alt     |
| Establir pipeline CI/CD robust            | 🟡 Alta    | Mitjà  | Alt     |

**Lliurables esperats**:

- Cobertura de tests > 80%
- Latència p95 < 3 segons
- Documentació completa (API, usuari, desplegament)
- Certificació RGPD
- Pipeline automatitzat de desplegament

---

#### Fase 2: Validació de Mercat (3-6 mesos)

| Acció                      | Objectiu                                                |
| -------------------------- | ------------------------------------------------------- |
| **Pilots amb ajuntaments** | Validar casos d'ús reals amb usuaris objectiu           |
| **Feedback estructurat**   | Recollir i prioritzar millores segons demanda           |
| **Mètriques d'adopció**    | Mesurar engagement, retenció, NPS                       |
| **Refinament de UX**       | Iterar interfície segons feedback                       |
| **Definició de pricing**   | Validar models de negoci (SaaS, llicència, consultoria) |

**Pilots potencials**:

- Ajuntaments de municipis mitjans (5.000-50.000 habitants)
- Consells comarcals
- Diputacions provincials
- Organismes autònoms de la Generalitat

---

#### Fase 3: Escalabilitat i Comercialització (6-12 mesos)

| Àrea                | Accions                                                 |
| ------------------- | ------------------------------------------------------- |
| **Infraestructura** | Multi-tenancy, escalat horitzontal, alta disponibilitat |
| **Producte**        | Personalització per client, integracions, API pública   |
| **Comercial**       | Equip de vendes, material de màrqueting, esdeveniments  |
| **Suport**          | Documentació, formació, SLA definits                    |

**Model de negoci proposat**:

```
Estructura de Preus (Exemple)
├── Pla Bàsic (Gratuït)
│   ├── 100 validacions/mes
│   ├── Model Salamandra 7B
│   └── Suport comunitari
│
├── Pla Professional (€99/mes)
│   ├── 1.000 validacions/mes
│   ├── Accés a ALIA-40B + Gemini
│   ├── Dashboard de mètriques
│   └── Suport prioritari
│
└── Pla Enterprise (Personalitzat)
    ├── Validacions il·limitades
    ├── Desplegament on-premise/privat
    ├── Glossaris personalitzats
    ├── Integracions a mida
    ├── SLA garantit
    └── Gestor de compte dedicat
```

---

#### Fase 4: Expansió (12-24 mesos)

| Direcció        | Descripció                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------- |
| **Geogràfica**  | Altres comunitats autònomes amb llengües cooficials (Euskadi, Galícia, Balears, País Valencià) |
| **Funcional**   | Nous mòduls (contractació pública, recursos humans, atenció ciutadana)                         |
| **Tecnològica** | Models més avançats, multimodalitat (OCR + LLM), agents autònoms                               |
| **Sectorial**   | Sector privat (despatxos d'advocats, consultores, empreses amb comunicació institucional)      |

---

### 8.2.2 Millores Previstes

#### A. Millores de Models i IA

| Millora                          | Descripció                                   | Prioritat  | Complexitat |
| -------------------------------- | -------------------------------------------- | ---------- | ----------- |
| **Model intermedi (13B-30B)**    | Millor equilibri entre capacitat i cost      | 🔴 Alta    | Mitjana     |
| **Fine-tuning domini-específic** | Adaptar models a terminologia administrativa | 🟡 Mitjana | Alta        |
| **Detecció multi-idioma**        | Suport castellà, anglès en documents mixtos  | 🟡 Mitjana | Mitjana     |
| **Agents autònoms**              | Flux de treball automatitzat complet         | 🟢 Baixa   | Molt alta   |

---

#### B. Millores d'Infraestructura

| Millora                                   | Benefici                                 | Estat          |
| ----------------------------------------- | ---------------------------------------- | -------------- |
| **Escalat a zero (serverless endpoints)** | Reducció dràstica de costos              | 🔴 Prioritària |
| **Cache de respostes LLM**                | Reducció de latència i cost              | 🟡 Planificada |
| **CDN per assets estàtics**               | Millora de rendiment global              | 🟡 Planificada |
| **Regions múltiples**                     | Alta disponibilitat, compliment normatiu | 🟢 Futura      |

---

#### C. Millores de Producte

| Funcionalitat                          | Descripció                               | Impacte  |
| -------------------------------------- | ---------------------------------------- | -------- |
| **Editor col·laboratiu**               | Múltiples usuaris editant simultàniament | Alt      |
| **Historial de versions**              | Traçabilitat de canvis en documents      | Alt      |
| **Plantilles personalitzables**        | Accelerar creació de documents tipus     | Mitjà    |
| **Integració amb gestors documentals** | Alfresco, SharePoint, etc.               | Molt alt |
| **API pública documentada**            | Permetre integracions de tercers         | Alt      |
| **Aplicació mòbil**                    | Revisió i aprovació en mobilitat         | Mitjà    |

---

#### D. Millores del Glossari

| Millora                        | Descripció                              |
| ------------------------------ | --------------------------------------- |
| **Ampliació a 500+ termes**    | Cobertura més exhaustiva                |
| **Categories jeràrquiques**    | Urbanisme, contractació, personal, etc. |
| **Versionat i historial**      | Traçabilitat de canvis terminològics    |
| **Sincronització amb TERMCAT** | Actualització automàtica                |
| **Contribucions d'usuaris**    | Crowdsourcing verificat                 |

---

#### E. Millores d'Observabilitat

| Àrea                        | Millora                                         |
| --------------------------- | ----------------------------------------------- |
| **Dashboard en temps real** | Mètriques live amb actualització automàtica     |
| **Alertes proactives**      | Notificacions per anomalies de rendiment        |
| **Anàlisi de tendències**   | Identificar patrons d'ús i problemes recurrents |
| **Exportació de reports**   | PDF, Excel per a direcció i stakeholders        |

---

### 8.2.3 Potencials Col·laboracions i Socis Tecnològics

#### Institucions Públiques

| Entitat                                              | Tipus de Col·laboració      | Valor Aportat                                                    |
| ---------------------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| **Barcelona Supercomputing Center (BSC)**            | Tecnològica                 | Accés a models AINA, suport tècnic, validació                    |
| **Generalitat de Catalunya**                         | Usuari pilot / Patrocinador | Casos d'ús reals, feedback institucional, recursos terminològics |
| **Consorci Administració Oberta de Catalunya (AOC)** | Integració                  | Connexió amb plataformes d'administració electrònica             |
| **Institut d'Estudis Catalans (IEC)**                | Lingüística                 | Validació terminològica, recursos normatius                      |
| **TERMCAT**                                          | Continguts                  | Sincronització de glossaris, actualitzacions                     |
| **Secretaria de Política Lingüística**               | Institucional               | Difusió, reconeixement, recursos                                 |

---

#### Empreses Tecnològiques

| Empresa                 | Àrea de Col·laboració       | Sinergies                                    |
| ----------------------- | --------------------------- | -------------------------------------------- |
| **Google Cloud**        | Infraestructura             | Vertex AI, Firebase, BigQuery - ja integrats |
| **Microsoft Azure**     | Infraestructura alternativa | Azure OpenAI, Cosmos DB per multi-cloud      |
| **Hugging Face**        | Models                      | Accés a models, visibilitat de l'ecosistema  |
| **LangChain/LangGraph** | Frameworks                  | Orquestració d'agents, workflows complexos   |
| **Weights & Biases**    | MLOps                       | Monitoratge de models, experiments           |

---

#### Empreses del Sector Públic

| Empresa             | Perfil                   | Oportunitat                                         |
| ------------------- | ------------------------ | --------------------------------------------------- |
| **Everis/NTT Data** | Consultora sector públic | Canal de distribució, projectes conjunts            |
| **Indra**           | Tecnologia sector públic | Integració en plataformes existents                 |
| **T-Systems**       | Infraestructura          | Desplegament on-premise per a grans administracions |
| **Semic**           | Gestió documental        | Integració amb sistemes de gestió d'expedients      |

---

#### Startups i Ecosistema

| Tipus                  | Oportunitat                                        |
| ---------------------- | -------------------------------------------------- |
| **Startups LegalTech** | Col·laboració en productes complementaris          |
| **Startups RegTech**   | Compliance i normativa automatitzada               |
| **Acceleradores**      | Barcelona Activa, ACCIÓ, StartUPC                  |
| **Inversors**          | Business angels sector GovTech, VCs especialitzats |

---

#### Universitats i Centres de Recerca

| Institució                                  | Àrea                       |
| ------------------------------------------- | -------------------------- |
| **UPC - Natural Language Processing Group** | Recerca en NLP català      |
| **UPF - TALN**                              | Tecnologies del llenguatge |
| **UB - GRIAL**                              | Lingüística computacional  |
| **Universitat de Lleida**                   | IA aplicada                |

---

#### Model de Col·laboració Proposat

```
Nivells de Partnership
│
├── Nivell 1: Tecnològic
│   ├── Accés preferent a APIs
│   ├── Suport tècnic prioritari
│   └── Roadmap compartit
│
├── Nivell 2: Comercial
│   ├── Co-venda i co-màrqueting
│   ├── Comissions per referència
│   └── Casos d'èxit conjunts
│
└── Nivell 3: Estratègic
    ├── Desenvolupament conjunt
    ├── Inversió/participació
    └── Exclusivitat en territoris/sectors
```

---

## 8.3 Conclusió General

### Resum del Projecte

El demostrador tecnològic AINA ha aconseguit els seus objectius principals:

| Objectiu                                                 | Resultat      |
| -------------------------------------------------------- | ------------- |
| Demostrar viabilitat de models AINA en aplicacions reals | ✅ Aconseguit |
| Crear arquitectura escalable i mantenible                | ✅ Aconseguit |
| Validar casos d'ús de llenguatge administratiu           | ✅ Aconseguit |
| Documentar bones pràctiques i incidències                | ✅ Aconseguit |
| Contribuir recursos a l'ecosistema AINA                  | ✅ Aconseguit |

---

### Impacte i Valor Generat

| Àmbit           | Contribució                                                            |
| --------------- | ---------------------------------------------------------------------- |
| **Tecnològic**  | Demostració pràctica d'integració de múltiples models AINA             |
| **Lingüístic**  | Glossari terminològic estructurat i documentat                         |
| **Metodològic** | Guies, incidències i bones pràctiques reutilitzables                   |
| **Comunitari**  | Codi, documentació i aprenentatges compartits amb llicència Apache 2.0 |

---

### Viabilitat com a Producte de Mercat

| Factor                    | Avaluació    | Comentari                                                              |
| ------------------------- | ------------ | ---------------------------------------------------------------------- |
| **Demanda de mercat**     | ✅ Alta      | Les administracions públiques necessiten eines de qualitat lingüística |
| **Diferenciació**         | ✅ Alta      | Únic producte integrant models AINA natius per a català administratiu  |
| **Escalabilitat tècnica** | ✅ Bona      | Arquitectura serverless preparada per créixer                          |
| **Model de negoci**       | 🟡 A validar | Pilots necessaris per confirmar pricing i canals                       |
| **Competència**           | ✅ Favorable | Pocs competidors especialitzats en català administratiu                |
| **Riscos**                | 🟡 Moderats  | Dependència de costos cloud, evolució de models AINA                   |

---

### Visió a 5 Anys

> **AINA esdevé la plataforma de referència per a la qualitat lingüística en l'administració pública de parla catalana**, integrant-se als fluxos de treball quotidians de milers de funcionaris i contribuint a la normalització i dignificació del català en l'àmbit institucional.

---

### Agraïments

El projecte AINA - Demostrador Tecnològic ha estat possible gràcies a:

- **Barcelona Supercomputing Center (BSC)**: Per desenvolupar i mantenir els models AINA
- **Projecte AINA**: Per la visió d'una IA en català de qualitat
- **Comunitat de codi obert**: spaCy, Hugging Face, FastAPI, React, Firebase
- **Google Cloud**: Per la infraestructura Vertex AI i Firebase
- **OptimTech**: Per l'execució del projecte

---

### Recomanació Final

El demostrador ha validat la viabilitat tècnica i la demanda potencial. **Es recomana procedir a la fase de consolidació tècnica i pilots** per transformar aquest prototip en un producte de mercat que aporti valor real a les administracions públiques catalanes.

---

**Última actualització**: Gener 2026  
**Versió del document**: 1.0  
**Llicència**: Apache License 2.0

---

© 2025-2026 OptimTech. Aquest document forma part del lliurable del projecte AINA Demostrador Tecnològic.
