# 3. Integració de Recursos AINA

Aquest document descriu exhaustivament com el projecte **AINA - Demostrador Tecnològic** utilitza les tecnologies i recursos del **Projecte AINA** (Iniciativa per la Llengua i la Intel·ligència Artificial en Català) del Barcelona Supercomputing Center (BSC).

---

## 3.1 Recursos AINA Utilitzats

### Llistat Complet de Models, Datasets i Eines

| Recurs                                           | Tipus              | Versió/Variant       | Font                            | Ús al Projecte                                               |
| ------------------------------------------------ | ------------------ | -------------------- | ------------------------------- | ------------------------------------------------------------ |
| **Salamandra-7B-Instruct**                       | LLM (Generatiu)    | 7B paràmetres        | Hugging Face / Vertex AI        | Generació de text, correcció lingüística, detecció de termes |
| **ALIA-40B-Instruct**                            | LLM (Generatiu)    | 40B paràmetres       | BSC-LT/Hugging Face / Vertex AI | Tasques complexes amb context ampliat (8k-32k)               |
| **ST-NLI-ca_paraphrase-multilingual-mpnet-base** | Model d'Embeddings | Sentence Transformer | projecte-aina                   | Generació de vectors semàntics per RAG                       |
| **ca_core_news_trf**                             | NLP (spaCy)        | Transformer-based    | spaCy                           | Lematització, tokenització, POS tagging                      |
| **ca_core_news_sm**                              | NLP (spaCy)        | Small model          | spaCy                           | Fallback per lematització (menys recursos)                   |

---

### 3.1.1 Salamandra-7B-Instruct

#### Descripció

Model de llenguatge generatiu de 7 mil milions de paràmetres, específicament entrenat per al català i altres llengües romàniques. Forma part de la família de models Salamandra del Projecte AINA.

#### Característiques Tècniques

```typescript
// Configuració a LLMService.ts
export enum LLMProvider {
	SALAMANDRA = "salamandra",
	SALAMANDRA_7B_INSTRUCT = "salamandra-7b-instruct",
	SALAMANDRA_7B_LOCAL = "salamandra-7b-local", // Via Ollama
}
```

#### Modalitats d'Ús

1. **Vertex AI (Producció)**: Desplegat a Google Cloud Vertex AI amb GPU NVIDIA L4
2. **Ollama (Desenvolupament local)**: Execució local per a proves i desenvolupament

#### Format de Prompt (ChatML)

```
<|im_start|>system
{instruccions_del_sistema}<|im_end|>
<|im_start|>user
{missatge_usuari}<|im_end|>
<|im_start|>assistant
```

#### Tokenització

El projecte utilitza un tokenitzador compatible amb Llama2 per al comptatge precís de tokens:

```typescript
// LLMService.ts
const tokenizer = await AutoTokenizer.from_pretrained("Xenova/llama2-tokenizer")
```

---

### 3.1.2 ALIA-40B-Instruct

#### Descripció

Model de llenguatge de 40 mil milions de paràmetres del BSC-LT, dissenyat per a tasques que requereixen major capacitat de raonament i context ampliat.

#### Característiques Tècniques

```python
# lifecycle_big.py - Configuració de desplegament
HF_MODEL_ID = "BSC-LT/ALIA-40b-instruct"
VLLM_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:..."
```

#### Configuracions de Context

| Context    | Machine Type   | GPUs  | VRAM Total |
| ---------- | -------------- | ----- | ---------- |
| 8k tokens  | g2-standard-48 | 4x L4 | 96 GB      |
| 16k tokens | g2-standard-96 | 8x L4 | 192 GB     |
| 32k tokens | g2-standard-96 | 8x L4 | 192 GB     |

#### Casos d'Ús

- Anàlisi de documents extensos
- Tasques de raonament complex
- Generació de text amb context ampli

---

### 3.1.3 Model d'Embeddings: ST-NLI-ca

#### Descripció

Model Sentence Transformer nativament dissenyat per al català, entrenat amb datasets d'Inferència de Llenguatge Natural (NLI) i paràfrasi.

#### Identificador

```python
# main.py / build_dynamic_index.py
MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"
```

#### Justificació de la Selecció

##### Per què NO s'utilitza roberta-base-ca-v2?

El model fundacional `projecte-aina/roberta-base-ca-v2` és un model MLM (Masked Language Model) **no optimitzat** per a tasques de similitud semàntica:

```
⚠️ Warnings detectats:
- "No sentence-transformers model found... Creating a new one with MEAN pooling"
- "Some weights [...] are newly initialized: ['pooler.dense.bias', 'pooler.dense.weight']"
- "You should probably TRAIN this model on a down-stream task..."
```

##### Avantatges de ST-NLI-ca

1. **Arquitectura Sentence-Transformer**: Dissenyat específicament per a `sentence-transformers`
2. **Entrenament NLI & Paraphrase**: Entén equivalències semàntiques ("Com sol·licitar un ajut" ≈ "Tramitació de subvencions")
3. **Base mpnet robusta**: Un dels millors models multilingües per embeddings densos
4. **Plug & Play**: Integració directa sense configuracions manuals de pooling

---

### 3.1.4 Models NLP (spaCy)

#### ca_core_news_trf (Primari)

Model transformer per a català amb màxima precisió:

- Lematització
- Part-of-Speech (POS) tagging
- Reconeixement d'entitats (NER)
- Parsing de dependències

```python
# main.py
nlp_model = spacy.load("ca_core_news_trf")
```

#### ca_core_news_sm (Fallback)

Model petit per a entorns amb recursos limitats:

```python
# Fallback si transformer no disponible
nlp_model = spacy.load("ca_core_news_sm")
```

---

## 3.2 Estratègia d'Implementació

### Resum Executiu

| Model                  | Estratègia         | Fine-tuning                         | RAG                      |
| ---------------------- | ------------------ | ----------------------------------- | ------------------------ |
| Salamandra-7B-Instruct | Inferència directa | ❌ No                               | ✅ Sí (combinat)         |
| ALIA-40B-Instruct      | Inferència directa | ❌ No                               | ✅ Sí (combinat)         |
| ST-NLI-ca              | Inferència directa | ❌ No (pre-entrenat per a la tasca) | ✅ És el core del RAG    |
| spaCy ca_core_news     | Inferència directa | ❌ No                               | ✅ Detecció de candidats |

---

### 3.2.1 Inferència Directa dels Models Oficials

#### Salamandra i ALIA

Els models generatius s'utilitzen mitjançant **inferència directa** sense cap modificació ni fine-tuning:

```typescript
// LLMService.ts - Crida a Salamandra via Vertex AI
private async callSalamandra(request: LLMRequest, options: LLMRequestOptions) {
    const endpointResourceName = await this.findSalamandraEndpoint()

    const instanceValue = helpers.toValue({
        prompt: formattedPrompt,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
    })

    const [response] = await this.getPredictionClient().predict(predictionRequest)
    return { text, usage, latencyMs }
}
```

#### Model d'Embeddings

El model ST-NLI-ca s'utilitza directament amb `sentence-transformers`:

```python
# build_dynamic_index.py
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(MODEL_NAME)
embeddings = model.encode(texts_to_embed, convert_to_numpy=True)
```

---

### 3.2.2 Estratègia RAG (Retrieval-Augmented Generation)

El projecte implementa un sistema **RAG complet** per a la correcció terminològica, combinant:

1. Recuperació vectorial amb embeddings AINA
2. Generació amb LLMs (Salamandra/ALIA/Gemini)

#### Arquitectura RAG

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE RAG TERMINOLÒGIC                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   TEXT ENTRADA   │───>│    DETECCIÓ      │───>│  VECTOR SEARCH   │  │
│  │                  │    │  DE CANDIDATS    │    │     (FAISS)      │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│                                  │                        │             │
│                    ┌─────────────┴─────────────┐         │             │
│                    │                           │         │             │
│                    ▼                           ▼         ▼             │
│            ┌──────────────┐          ┌──────────────┐   ┌──────────┐  │
│            │ NLP (spaCy)  │          │  Hash Table  │   │ Glossari │  │
│            │ Lematització │          │   Matching   │   │ Indexat  │  │
│            └──────────────┘          └──────────────┘   └──────────┘  │
│                    │                           │              │        │
│                    └───────────────────────────┴──────────────┘        │
│                                      │                                  │
│                                      ▼                                  │
│                        ┌──────────────────────────┐                    │
│                        │    LLM (Salamandra/      │                    │
│                        │    ALIA/Gemini)          │                    │
│                        │    Generació i Correcció │                    │
│                        └──────────────────────────┘                    │
│                                      │                                  │
│                                      ▼                                  │
│                        ┌──────────────────────────┐                    │
│                        │     TEXT CORREGIT        │                    │
│                        └──────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
graph TD
    subgraph S1 ["PIPELINE RAG TERMINOLÒGIC"]
        direction TB

        %% Nodes
        Input(["TEXT ENTRADA"])
        Detect["DETECCIÓ<br>DE CANDIDATS"]
        Vector["VECTOR SEARCH<br>(FAISS)"]

        NLP["NLP spaCy<br>Lematització"]
        Hash["Hash Table<br>Matching"]
        Gloss["Glossari<br>Indexat"]

        LLM["LLM Salamandra/ALIA/Gemini<br>Generació i Correcció"]
        Output(["TEXT CORREGIT"])

        %% Connexions
        Input --> Detect

        %% Connexions des de Detecció (Flux principal i paral·lel)
        Detect --> Vector
        Detect --> NLP
        Detect --> Hash

        %% Flux de Vector Search
        Vector --> Gloss

        %% Convergència cap al LLM
        NLP --> LLM
        Hash --> LLM
        Gloss --> LLM

        %% Sortida
        LLM --> Output
    end

    %% Estils
    style Input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Output fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style LLM fill:#fff9c4,stroke:#fbc02d,stroke-width:2px
    style S1 fill:#f5f5f5,stroke:#333,stroke-width:1px,stroke-dasharray:5 5
```

#### Fase 1: Detecció de Candidats

El sistema utilitza tres mètodes complementaris:

##### 1.1 NLP amb spaCy (Primari)

```python
# main.py - Detecció via lematització
doc = nlp_model(text)
for token in doc:
    lemma = token.lemma_.lower()
    if lemma in variants_lookup:
        # "conformen" → lemma "conformar" → match al glossari
        candidates.append(DetectedCandidate(...))
```

##### 1.2 Hash Table Matching (Ràpid)

```typescript
// ragProcessHandler.ts
const match = tables.exact.get(ngramLower)
if (!match && ngramSize === 1) {
	const stem = getCatalanStem(ngramLower)
	match = tables.stems.get(stem)
}
```

##### 1.3 LLM Fallback (Semàntic)

```typescript
// ragProcessHandler.ts - Quan hash no troba res
const prompt = `Analitza el text i identifica termes que podrien ser 
no normatius, col·loquials, castellanismes o variants no recomanades...`

const response = await llm.callModel({
	prompt,
	module: "kit",
	jsonResponse: true,
})
```

#### Fase 2: Recuperació Vectorial (FAISS)

```python
# main.py - Cerca semàntica
vectors = model.encode(request.candidates, convert_to_numpy=True)
vectors = vectors.astype(np.float32)
faiss.normalize_L2(vectors)  # Normalitzar per cerca cosinus

# Cerca en batch
distances, indices = index.search(vectors, request.k)

# Filtrar per threshold
if score >= request.threshold:  # default: 0.80
    matches.append(MatchResult(
        terme_recomanat=entry['terme_recomanat'],
        similitud=float(score),
        context=entry.get('context_d_us', ''),
        variants=entry.get('variants_no_normatives', []),
        ...
    ))
```

#### Fase 3: Generació de Correccions (LLM)

Els candidats detectats i els matches del glossari s'envien a l'LLM per generar el text corregit amb context.

---

### 3.2.3 Absència de Fine-tuning

**No s'ha realitzat fine-tuning** de cap model AINA en aquest projecte. Les raons són:

1. **Models ja optimitzats**: Els models oficials AINA estan altament optimitzats per al català
2. **Estratègia RAG**: El RAG permet adaptar els resultats sense modificar el model
3. **Flexibilitat**: Permet actualitzar el glossari sense re-entrenar
4. **Costos**: Evita els costos computacionals elevats del fine-tuning

#### Possibilitats Futures (Roadmap)

Segons la documentació del projecte (`kit-validacio-estil-to-requeriments.md`):

```markdown
#### 2.4.2 Entrenament i Manteniment (REQ-MOD-002)

| REQ-MOD-002.1 | Crear dataset d'entrenament amb exemples etiquetats |
| REQ-MOD-002.3 | Permetre re-entrenament periòdic amb dades de feedback |
```

---

### 3.2.4 Pipeline Vertical Complet

El projecte implementa un **processament vertical** que combina totes les tecnologies AINA:

```typescript
// verticalProcessHandler.ts
export interface VerticalProcessRequest {
	text: string
	language?: string // Default: "ca"
	model?: string // "gemini-2.5-flash", "salamandra-7b-vertex", etc.
	options?: {
		// Step 1: LanguageTool
		skipLanguageTool?: boolean

		// Step 2: RAG AINA
		skipRAG?: boolean
		ragSearchK?: number
		ragSearchThreshold?: number
		useNLPDetection?: boolean
		useLLMFallback?: boolean

		// Step 3: Style/Tone
		skipStyleTone?: boolean
	}
}
```

#### Flux de Processament

| Pas                          | Tecnologia                | Funció                  |
| ---------------------------- | ------------------------- | ----------------------- |
| **1. Correcció Ortogràfica** | LanguageTool + Softcatalà | Ortografia i sintaxi    |
| **2. RAG Terminològic**      | ST-NLI-ca + FAISS + LLM   | Terminologia normativa  |
| **3. Validació d'Estil**     | LLM (Salamandra/ALIA)     | To administratiu formal |

---

## 3.3 Infraestructura de Desplegament

### Vertex AI (Google Cloud)

#### Salamandra-7B

```bash
# Endpoint típic
gcloud ai endpoints list --region=europe-west4
# -> salamandra-7b-endpoint
```

#### ALIA-40B

```python
# lifecycle_big.py
ENDPOINT_DISPLAY_NAME = "alia-40b-endpoint-{8k|16k|32k}"
MACHINE_TYPE = "g2-standard-{48|96}"
ACCELERATOR = "NVIDIA_L4"
```

### Cloud Run (RAG Service)

```bash
# Desplegament amb persistència
gcloud run deploy aina-rag-service \
  --source . \
  --region europe-west4 \
  --execution-environment gen2 \
  --add-volume name=rag-data,type=cloud-storage,bucket=aina-rag-data-prod \
  --add-volume-mount volume=rag-data,mount-path=/app/data
```

### Gestió del Cicle de Vida

Per evitar costos innecessaris, el projecte inclou scripts de gestió:

```bash
# Arrencar endpoint
python lifecycle_big.py 8k  # o 16k, 32k

# Aturar endpoint (CRÍTIC per evitar costos)
python shutdown.py
```

---

## 3.4 Dependències i Versions

### Python (RAG Service)

```
sentence-transformers==2.3.1
faiss-cpu>=1.8.0
spacy>=3.7.0
fastapi==0.109.0
```

### TypeScript (Cloud Functions)

```typescript
import { AutoTokenizer, type PreTrainedTokenizer } from "@xenova/transformers"
import { PredictionServiceClient, EndpointServiceClient } from "@google-cloud/aiplatform"
```

---

## 3.5 Conclusió

El projecte AINA Demostrador utilitza de forma exhaustiva els recursos del Projecte AINA mitjançant:

1. **Inferència directa** dels models oficials sense modificacions
2. **Arquitectura RAG** per adaptar les respostes a terminologia específica
3. **Combinació sinèrgica** de múltiples models (LLMs + Embeddings + NLP)
4. **Infraestructura escalable** a Google Cloud (Vertex AI + Cloud Run)

Aquesta aproximació permet:

- ✅ Màxima qualitat lingüística en català
- ✅ Actualització dinàmica del glossari sense re-entrenament
- ✅ Flexibilitat per canviar entre models (Salamandra, ALIA, Gemini)
- ✅ Costos controlats mitjançant gestió del cicle de vida
- ✅ Sobirania de dades (models catalans per a processament de text català)
