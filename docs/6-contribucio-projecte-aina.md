# 6. Contribució al Projecte AINA

Aquest document detalla les contribucions del projecte **AINA - Demostrador Tecnològic** a l'ecosistema AINA (Iniciativa per la Llengua i la Intel·ligència Artificial en Català) del Barcelona Supercomputing Center (BSC).

---

## Índex

- [6.1 Recursos que s'Incorporaran a l'AINA Kit](#61-recursos-que-sincorporaran-a-laina-kit)
  - [6.1.1 Conjunts de Dades (Datasets)](#611-conjunts-de-dades-datasets)
  - [6.1.2 Guies Tècniques i Documentació](#612-guies-tècniques-i-documentació)
  - [6.1.3 Scripts i Pipelines](#613-scripts-i-pipelines)
  - [6.1.4 Models Entrenats](#614-models-entrenats)
- [6.2 Fortaleses del Sistema Usant AINA](#62-fortaleses-del-sistema-usant-aina)
- [6.3 Limitacions i Àrees de Millora](#63-limitacions-i-àrees-de-millora)
- [6.4 Feedback per a l'Ecosistema AINA](#64-feedback-per-a-lecosistema-aina)

---

## 6.1 Recursos que s'Incorporaran a l'AINA Kit

### 6.1.1 Conjunts de Dades (Datasets)

#### Glossari Terminològic Administratiu (`termes.csv`)

| Atribut             | Descripció                                                                         |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Nom del recurs**  | `termes.csv`                                                                       |
| **Ubicació**        | `rag_service/data/termes.csv`                                                      |
| **Format**          | CSV (separador `;`)                                                                |
| **Llicència**       | Apache License 2.0                                                                 |
| **Volum**           | ~60 entrades terminològiques                                                       |
| **Àmbit**           | Llenguatge administratiu i jurídic català                                          |
| **Fonts originals** | Optimot, TERMCAT, Manual d'elaboració de normes (Generalitat), diccionaris tècnics |

##### Estructura del Dataset

| Camp                            | Tipus  | Descripció                                                   |
| ------------------------------- | ------ | ------------------------------------------------------------ |
| `ID`                            | String | Identificador únic (ex: N001, V001, L001, A001, E001)        |
| `Terme recomanat`               | String | Forma normativa recomanada                                   |
| `Categoria`                     | String | Classificació: nom, verb, adjectiu, locució, expressió       |
| `Terme no normatiu o inadequat` | String | Formes incorrectes, castellanismes o variants no recomanades |
| `Àmbit`                         | String | Context temàtic: administratiu genèric, urbanisme, etc.      |
| `Context d'ús`                  | String | Situacions on aplica la recomanació                          |
| `Comentari/notes lingüístiques` | String | Justificació lingüística o explicació normativa              |
| `Font`                          | String | Referència bibliogràfica o institucional                     |
| `Exemple 1-3`                   | String | Frases d'exemple d'ús correcte                               |
| `Exemple incorrecte 1-2`        | String | Frases d'exemple d'ús incorrecte                             |

##### Categories de Termes Inclosos

| Categoria   | Prefix ID | Exemples                                                            |
| ----------- | --------- | ------------------------------------------------------------------- |
| Noms        | N0XX      | certificat (no "certificació"), preàmbul (no "exposició de motius") |
| Verbs       | V0XX      | exhaurir (no "agotar"), complir (no "acomplir" en context normatiu) |
| Adjectius   | A0XX      | aplicable (no "d'aplicació"), cadastral (no "catastral")            |
| Locucions   | L0XX      | a fi que (no "a fi de que"), amb relació a (no "en relació a")      |
| Expressions | E0XX      | el que estableix (no "l'establert")                                 |

##### Valor Diferencial

1. **Especificitat administrativa**: Recopilació focalitzada en llenguatge normatiu i jurídic
2. **Estructura rica**: Inclou context, justificació i exemples (correctes i incorrectes)
3. **Fonts autoritzades**: Basat en recursos oficials de la Generalitat i institucions lingüístiques
4. **Format interoperable**: CSV amb camps estructurats per a fàcil integració

##### Atribucions i Reconeixements

- **Optimot** (Generalitat de Catalunya) - Consultes lingüístiques
- **TERMCAT** - Centre de Terminologia Catalana
- **Manual d'elaboració de normes** (Generalitat de Catalunya)
- **Diccionari de dret administratiu** (TERMCAT)
- **Terminologia jurídica i administrativa** (Departament de Justícia)

---

### 6.1.2 Guies Tècniques i Documentació

#### Documentació Lliurada

| Document                             | Descripció                                                  | Llicència  |
| ------------------------------------ | ----------------------------------------------------------- | ---------- |
| `integracio-recursos-aina.md`        | Guia exhaustiva d'integració dels recursos AINA al projecte | Apache 2.0 |
| `incidencies.md`                     | Registre de problemes trobats i solucions amb models AINA   | Apache 2.0 |
| `architecture.md`                    | Arquitectura del sistema amb integració de models AINA      | Apache 2.0 |
| `5-validacio-avaluacio-metriques.md` | Metodologia d'avaluació i mètriques del sistema             | Apache 2.0 |
| `context-window-strategy.md`         | Estratègies de gestió de context per a LLMs                 | Apache 2.0 |
| `ARCHITECTURE.md` (rag_service)      | Decisions arquitectòniques del servei RAG                   | Apache 2.0 |
| `model_embeddings_selection.md`      | Justificació de la selecció de models d'embeddings          | Apache 2.0 |

#### Contingut Clau de la Documentació

##### Guia d'Incidències amb Models AINA

El document `incidencies.md` recull problemes reals trobats amb els models AINA i les seves solucions:

| Incidència                                    | Model Afectat | Solució Documentada                            |
| --------------------------------------------- | ------------- | ---------------------------------------------- |
| JSON malformat en respostes                   | Salamandra 7B | Funció `cleanMalformedJSON` per parsing robust |
| Problema d'eco (repetició del text d'entrada) | Salamandra 7B | Instruccions anti-eco explícites al prompt     |
| Al·lucinacions en dades generades             | ALIA-40B      | Recomanació de revisió humana obligatòria      |
| Quota exceeded per GPUs L4                    | ALIA-40B      | Procediment de sol·licitud d'augment de quota  |

##### Matriu d'Adequació de Models

Documentada la idoneïtat de cada model per a diferents tasques:

| Tipus de Tasca              | Salamandra 7B | ALIA 40B      | Gemini Flash  |
| --------------------------- | ------------- | ------------- | ------------- |
| Extracció JSON              | ✅ Excel·lent | ✅ Excel·lent | ✅ Excel·lent |
| Classificació               | ✅ Bona       | ✅ Excel·lent | ✅ Excel·lent |
| Q&A Simple                  | ✅ Acceptable | ✅ Bona       | ✅ Excel·lent |
| **Elaboració de contingut** | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |
| **Generació creativa**      | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |
| **Transformació de text**   | ❌ Pobra      | ✅ Acceptable | ✅ Excel·lent |

---

### 6.1.3 Scripts i Pipelines

#### Scripts de Desplegament i Infraestructura

| Script                   | Descripció                                             | Llicència  |
| ------------------------ | ------------------------------------------------------ | ---------- |
| `lifecycle.py`           | Desplegament de Salamandra 7B a Vertex AI              | Apache 2.0 |
| `lifecycle_big.py`       | Desplegament de ALIA-40B amb configuracions de context | Apache 2.0 |
| `lifecycle.js`           | Versió JavaScript del desplegament (Node.js)           | Apache 2.0 |
| `shutdown.py`            | Aturada d'endpoints per gestió de costos               | Apache 2.0 |
| `shutdown_big.py`        | Aturada específica per ALIA-40B                        | Apache 2.0 |
| `build_index.py`         | Construcció d'índex FAISS per RAG                      | Apache 2.0 |
| `build_dynamic_index.py` | Construcció dinàmica d'índex amb actualització         | Apache 2.0 |

##### Exemple: Configuració de Desplegament Salamandra

```python
# lifecycle.py - Configuració per a Vertex AI
PROJECT_ID = "aina-474214"
REGION = "europe-west4"
HF_MODEL_ID = "BSC-LT/salamandra-7b-instruct"
VLLM_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:20251211_0916_RC01_stable"

# Configuració del contenidor
serving_container_args=[
    f"--model={HF_MODEL_ID}",
    "--dtype=bfloat16",
    "--tensor-parallel-size=1",
    "--gpu-memory-utilization=0.90",
    "--max-model-len=8192",
    "--trust-remote-code",
    "--disable-log-stats"
]
```

#### Pipeline RAG Terminològic

| Component               | Descripció                               | Tecnologies          |
| ----------------------- | ---------------------------------------- | -------------------- |
| `main.py`               | Servei FastAPI per cerca semàntica       | FastAPI, FAISS       |
| `test_nlp_detection.py` | Tests de detecció NLP amb spaCy          | spaCy, pytest        |
| `test_service.sh`       | Script de test dels endpoints REST       | curl, bash           |
| `ragProcessHandler.ts`  | Handler de Firebase per processament RAG | TypeScript, Firebase |

---

### 6.1.4 Models Entrenats

**No s'han entrenat models nous en aquest projecte.**

El projecte utilitza **inferència directa** dels models oficials AINA sense fine-tuning:

| Model                    | Ús                                 | Modificació |
| ------------------------ | ---------------------------------- | ----------- |
| Salamandra-7B-Instruct   | Generació de text, correcció       | ❌ Cap      |
| ALIA-40B-Instruct        | Tasques complexes, context ampliat | ❌ Cap      |
| ST-NLI-ca                | Embeddings per RAG                 | ❌ Cap      |
| ca_core_news_trf (spaCy) | Lematització, POS tagging          | ❌ Cap      |

**Raons per no fer fine-tuning:**

1. Els models oficials AINA ja estan altament optimitzats per al català
2. L'estratègia RAG permet adaptar resultats sense modificar el model
3. Permet actualitzar el glossari sense re-entrenar
4. Evita els costos computacionals elevats del fine-tuning

---

## 6.2 Fortaleses del Sistema Usant AINA

### 6.2.1 Integració Sinèrgica de Múltiples Models

El sistema combina de forma efectiva diversos recursos AINA en un pipeline coherent:

```
TEXT → [spaCy ca_core] → [ST-NLI-ca + FAISS] → [Salamandra/ALIA] → TEXT CORREGIT
        Lematització      Cerca Semàntica       Generació Final
```

**Beneficis observats:**

- **Complementarietat**: Cada model aporta capacitats específiques
- **Fallback robust**: Si un component falla, altres poden compensar
- **Flexibilitat**: Permet canviar models segons necessitat (cost, velocitat, qualitat)

### 6.2.2 Qualitat Lingüística en Català

| Aspecte                      | Avaluació     |
| ---------------------------- | ------------- |
| Comprensió del català formal | ✅ Excel·lent |
| Detecció de castellanismes   | ✅ Molt bona  |
| Terminologia administrativa  | ✅ Molt bona  |
| Coherència estilística       | ✅ Bona       |

**Exemples d'èxit:**

- Detecció correcta de "a nivell de" → "a escala de"
- Identificació de "agotar la via administrativa" → "exhaurir la via administrativa"
- Correcció de "vivenda social" → "habitatge social"

### 6.2.3 Model d'Embeddings Natiu (ST-NLI-ca)

El model `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base` ha demostrat:

- **Alta precisió semàntica**: Entén equivalències conceptuals en català
- **Integració directa**: Compatible out-of-the-box amb sentence-transformers
- **Rendiment adequat**: Latència de cerca < 1ms amb FAISS local

### 6.2.4 Salamandra per a Extracció JSON

Salamandra 7B excel·leix en tasques d'extracció estructurada:

- Respostes JSON ben formatades (amb parsing robust)
- Classificació de text precisa
- Detecció d'entitats i categories

### 6.2.5 Desplegament a Vertex AI

El desplegament dels models AINA a Google Cloud Vertex AI funciona de manera estable:

- **Salamandra 7B**: g2-standard-8 (1x L4 GPU), context 8k tokens
- **ALIA-40B**: g2-standard-48/96 (4-8x L4 GPUs), context fins a 32k tokens
- **Latència típica**: 2-10 segons per resposta

### 6.2.6 Arquitectura RAG Eficient

L'arquitectura RAG implementada combina:

1. **Detecció híbrida**: NLP (lematització) + Hash Table + LLM fallback
2. **Cerca vectorial**: FAISS local (latència < 1ms)
3. **Generació contextual**: LLM amb termes del glossari injectats

---

## 6.3 Limitacions i Àrees de Millora

### 6.3.1 Problema de l'Eco (Echo Problem) - Salamandra 7B

**Descripció:** En tasques d'elaboració de contingut, Salamandra 7B tendeix a copiar literalment el text d'entrada en lloc de generar contingut nou.

**Exemple documentat:**

| Prompt                                                 | Resposta esperada           | Resposta obtinguda               |
| ------------------------------------------------------ | --------------------------- | -------------------------------- |
| "Genera una descripció detallada de les actuacions..." | Text elaborat i transformat | Còpia literal del text d'entrada |

**Solució parcial implementada:**

```typescript
const antiEchoInstructions = `
INSTRUCCIONS IMPORTANTS:
- NO copiïs ni repeteixis el text d'entrada.
- GENERA contingut NOU i ORIGINAL basat en les dades proporcionades.
- EXPANDEIX i ELABORA la informació, no la repeteixis textualment.
- La teva resposta ha de ser DIFERENT del text que t'he proporcionat.`
```

**Eficàcia:** Millora el comportament però no garanteix resultats òptims per a tasques d'elaboració.

**Recomanació:** Per a tasques d'elaboració i generació creativa, utilitzar ALIA-40B o Gemini.

---

### 6.3.2 Al·lucinacions amb ALIA-40B

**Descripció:** ALIA-40B genera contingut de qualitat però pot inventar dades específiques no presents al prompt.

**Exemples detectats:**

| Dada Generada                        | Origen      |
| ------------------------------------ | ----------- |
| "1.200 persones assistents"          | ❌ Inventat |
| "Es va promocionar a xarxes socials" | ❌ Inventat |

**Mitigació recomanada:**

- Revisió humana obligatòria per a documents oficials
- Validació creuada de dades numèriques
- Avís a la interfície sobre possibles al·lucinacions

---

### 6.3.3 JSON Malformat de Salamandra Local (Ollama)

**Descripció:** El model retorna ocasionalment JSON amb errors de format:

```json
{"issues": [], "toneAnalysis": {}}}  // Extra '}'
```

**Solució implementada:**

```typescript
function cleanMalformedJSON(jsonStr: string): string {
	// 1. Comptatge de claus/claudàtors per detectar desbalancejos
	// 2. Truncament quan hi ha més tancaments que obertures
	// 3. Eliminació de comes finals invàlides
	// 4. Truncament progressiu des del final per trobar JSON vàlid
}
```

**Estat:** ✅ Solucionat satisfactòriament amb parsing robust.

---

### 6.3.4 Limitacions de Context

| Model         | Context Màxim | Limitació Pràctica                                 |
| ------------- | ------------- | -------------------------------------------------- |
| Salamandra 7B | 8k tokens     | Documents llargs requereixen chunking              |
| ALIA-40B      | 8k-32k tokens | Cost elevat per contexts grans, quota GPU limitada |

---

### 6.3.5 Costos d'Infraestructura

**Problema:** Els endpoints de Vertex AI generen costos significatius si romanen actius:

| Configuració         | Cost/hora aprox. |
| -------------------- | ---------------- |
| Salamandra 7B (1xL4) | ~$1.50           |
| ALIA-40B (4xL4)      | ~$6.00           |
| ALIA-40B (8xL4)      | ~$12.00          |

**Mitigació:** Scripts de shutdown automàtic (`shutdown.py`, `shutdown_big.py`)

---

### 6.3.6 Manca de Tests Automatitzats

**Estat actual:** El projecte no disposa de proves unitàries automatitzades.

**Impacte:**

- Risc de regressions en actualitzacions
- Validació manual costosa
- Dificultat per assegurar qualitat consistent

**Recomanació:** Implementar suite de tests amb casos d'ús reals.

---

## 6.4 Feedback per a l'Ecosistema AINA

### 6.4.1 Suggeriments Tècnics de Millora

#### Per a Salamandra 7B

| Suggeriment                                     | Justificació                                            |
| ----------------------------------------------- | ------------------------------------------------------- |
| **Millorar seguiment d'instruccions complexes** | El model tendeix a l'eco en tasques de transformació    |
| **Optimitzar generació JSON**                   | Errors de format freqüents requereixen parsing robust   |
| **Documentar millor el format ChatML**          | Variacions en el format afecten la qualitat de resposta |

#### Per a ALIA-40B

| Suggeriment                                     | Justificació                                  |
| ----------------------------------------------- | --------------------------------------------- |
| **Reduir al·lucinacions en dades específiques** | Genera números i dades no presents al context |
| **Optimitzar per a context més llarg**          | El cost per a 32k tokens és prohibitiu        |
| **Millorar documentació de desplegament**       | La configuració de GPUs i VRAM no és trivial  |

#### Per a ST-NLI-ca

| Suggeriment                               | Justificació                                   |
| ----------------------------------------- | ---------------------------------------------- |
| **Oferir versions quantitzades**          | Reduiria temps de càrrega i memòria            |
| **Exemples de fine-tuning per a dominis** | Permetria adaptar a terminologies específiques |

---

### 6.4.2 Models i Funcionalitats Desitjables

#### Nous Models Recomanats

| Model/Funcionalitat                 | Cas d'Ús                                         | Prioritat |
| ----------------------------------- | ------------------------------------------------ | --------- |
| **Salamandra 13B o 30B**            | Millor capacitat de raonament sense cost de 40B  | Alta      |
| **Model específic per a extracció** | Optimitzat per parsejar documents administratius | Mitjana   |
| **Model de classificació**          | Classificar tipus de documents automàticament    | Mitjana   |
| **Model de resum**                  | Resumir documents llargs administratius          | Alta      |
| **Model multimodal (OCR + LLM)**    | Processar documents escanejats                   | Baixa     |

#### Funcionalitats d'Infraestructura

| Funcionalitat                          | Benefici                                                 |
| -------------------------------------- | -------------------------------------------------------- |
| **Endpoints serverless (escalat a 0)** | Reduiria costos dramàticament                            |
| **API gestionada tipus OpenAI**        | Simplificaria integració sense gestionar infraestructura |
| **Batching de peticions**              | Reduiria latència i cost per processament massiu         |

---

### 6.4.3 Casos d'Ús Addicionals Recomanats

Basant-nos en l'experiència del demostrador, es recomanen els següents casos d'ús per a futurs projectes AINA:

#### 1. Correcció Automàtica de Documentació Administrativa

**Descripció:** Pipeline complet per validar i corregir automàticament documents oficials.

**Components AINA necessaris:**

- Salamandra/ALIA per a detecció d'errors
- ST-NLI-ca per a cerca de termes correctes
- spaCy per a anàlisi sintàctica

#### 2. Generació d'Informes Estructurats

**Descripció:** Generació automàtica d'informes tècnics a partir de dades estructurades.

**Aprenentatge del projecte:** ALIA-40B funciona bé però requereix revisió humana per a dades numèriques.

#### 3. Chatbot Administratiu en Català

**Descripció:** Assistent conversacional per a consultes ciutadanes.

**Recomanació:** Salamandra 7B és adequat per a Q&A simple; ALIA per a consultes complexes.

#### 4. Classificació de Documents

**Descripció:** Categorització automàtica de documents entrants.

**Model recomanat:** Salamandra 7B ha demostrat bona capacitat de classificació.

#### 5. Extracció d'Entitats de Subvencions

**Descripció:** Identificar automàticament beneficiaris, imports, dates de documents de subvenció.

**Experiència:** El mòdul de valoració d'ofertes ha validat aquesta capacitat.

---

### 6.4.4 Recomanacions per a l'Ecosistema

#### Documentació

1. **Guies de desplegament a Vertex AI**: Pas a pas amb configuracions provades
2. **Millors pràctiques per a prompting**: Exemples específics per a cada model
3. **Matriu de costos**: Comparativa clara de cost/rendiment
4. **Casos d'ús validats**: Repositori d'exemples reals amb resultats

#### Comunitat

1. **Repositori de prompts**: Biblioteca de prompts optimitzats per tasques comunes
2. **Benchmark de qualitat**: Dataset de referència per avaluar models en català
3. **Canal de feedback**: Mecanisme estructurat per reportar problemes

#### Infraestructura

1. **API pública gestionada**: Reduiria barrera d'entrada per a projectes petits
2. **Sandbox de proves**: Entorn per experimentar sense costos inicials
3. **Monitoratge de models**: Dashboard de rendiment i disponibilitat

---

## Resum Executiu

### Recursos Lliurats

| Tipus        | Recurs                      | Llicència  |
| ------------ | --------------------------- | ---------- |
| Dataset      | `termes.csv` (~60 entrades) | Apache 2.0 |
| Documentació | 7+ documents tècnics        | Apache 2.0 |
| Scripts      | 7+ scripts de desplegament  | Apache 2.0 |
| Codi         | Pipeline RAG complet        | Apache 2.0 |

### Fortaleses Principals

- ✅ Integració sinèrgica de múltiples models AINA
- ✅ Qualitat lingüística excel·lent en català administratiu
- ✅ Arquitectura RAG eficient i escalable
- ✅ Model d'embeddings natiu funcional

### Limitacions Clau

- ⚠️ Salamandra 7B: problema d'eco en tasques generatives
- ⚠️ ALIA-40B: risc d'al·lucinacions en dades específiques
- ⚠️ Costos d'infraestructura elevats sense gestió activa

### Recomanacions Prioritàries

1. Model intermedi (13B-30B) amb millor seguiment d'instruccions
2. API gestionada amb escalat a zero
3. Documentació de desplegament ampliada
4. Benchmark de qualitat per al català

---

**Última actualització**: Gener 2026  
**Versió del document**: 1.0  
**Llicència**: Apache License 2.0

---

© 2025-2026 OptimTech. Aquest document forma part del lliurable del projecte AINA Demostrador Tecnològic.
