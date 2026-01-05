# Estratègies de Chunking i Fallback per a LLMs

## Resum Executiu

Aquest document descriu les estratègies implementades a AINA per gestionar documents grans que excedeixen els límits de context dels models LLM. El sistema ofereix múltiples nivells de protecció:

1. **Pre-validació** - Verifica el límit abans de fer la crida
2. **Fallback automàtic** - Canvia a models amb més context
3. **Map-Reduce automàtic** - Processa per chunks quan no hi ha fallback disponible
4. **Chunking adaptatiu** - Ajusta la mida dels chunks segons el model

---

## Límits de Context dels Models

| Model                      | Context Window | Ús Recomanat                       |
| -------------------------- | -------------- | ---------------------------------- |
| **Gemini 2.5 Flash**       | 1M tokens      | Documents grans, alta velocitat    |
| **Gemini 2.5 Pro**         | 1M tokens      | Raonament complex amb context gran |
| **ALIA-40B (16k)**         | 16,384 tokens  | Català optimitzat, context mitjà   |
| **ALIA-40B (32k)**         | 32,768 tokens  | Català optimitzat, context gran    |
| **Salamandra 7B (Vertex)** | 8,192 tokens   | Català optimitzat, context petit   |
| **Salamandra 7B Local**    | 4,096 tokens   | Desenvolupament local (Ollama)     |

---

## 1. Pre-validació del Context

Cada crida a `callModel()` valida automàticament si el prompt cap en el context del model **abans** de fer la crida a l'API.

```typescript
// LLMService.ts - Validació automàtica
const validation = await this.validateContextWindow(request, options)

if (!validation.fits) {
	// Activa estratègies de fallback/map-reduce
}
```

### Càlcul de Tokens Disponibles

```
availableInputTokens = contextLimit - maxOutputTokens
```

**Exemple per Salamandra Local:**

- Context limit: 4,096 tokens
- Max output: 512 tokens
- Disponible per input: 3,584 tokens

---

## 2. Estratègia de Fallback Automàtic

Quan el context s'excedeix, el sistema intenta automàticament amb models de major capacitat.

### Cadena de Fallback

```
Salamandra Local (4k)
  → Salamandra Vertex (8k)
    → ALIA-40B (32k)
      → Gemini Flash (1M)

ALIA-40B (16k)
  → ALIA-40B (32k)
    → Gemini Flash (1M)
```

### Configuració

| Variable d'Entorn              | Default | Descripció                  |
| ------------------------------ | ------- | --------------------------- |
| `CONTEXT_WINDOW_AUTO_FALLBACK` | `true`  | Habilita fallback automàtic |

### Exemple d'Ús

```typescript
// El servei intenta ALIA, si no cap → Gemini
const service = createAliaService(projectId, region, "16k")

const response = await service.callModel({
	prompt: documentGran, // 50k tokens
})

// La resposta indica si s'ha usat fallback
console.log(response.metadata.fallbackUsed) // true
console.log(response.metadata.originalProvider) // "alia-40b-instruct"
console.log(response.provider) // "gemini-2.5-flash"
```

### Desactivar Fallback

```typescript
// Desactivar per cas específic
const service = createAliaService(projectId, region, "16k", false)

// O globalment via .env
CONTEXT_WINDOW_AUTO_FALLBACK = false
```

---

## 3. Estratègia Map-Reduce Automàtica

Quan el fallback no està disponible o també falla, el sistema pot processar automàticament el document per chunks.

### Quan s'Activa

1. Context excedit
2. Fallback desactivat O fallback també falla (404/403 en local)
3. `CONTEXT_WINDOW_AUTO_MAP_REDUCE=true`

### Configuració

| Variable d'Entorn                       | Default     | Descripció                                   |
| --------------------------------------- | ----------- | -------------------------------------------- |
| `CONTEXT_WINDOW_AUTO_MAP_REDUCE`        | `false`     | Habilita map-reduce automàtic                |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE`     | `12000`     | Mida per defecte dels chunks                 |
| `CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY` | `paragraph` | Estratègia: `sentence`, `paragraph`, `fixed` |
| `CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS` | `500`       | Solapament entre chunks                      |

### Flux de Processament

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCUMENT GRAN (62k tokens)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         CHUNKING                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ...     │
│  │Chunk 1│ │Chunk 2│ │Chunk 3│ │Chunk 4│ │Chunk 5│          │
│  │ 1.5k  │ │ 1.5k  │ │ 1.5k  │ │ 1.5k  │ │ 1.5k  │          │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FASE MAP (Paral·lel)                    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ mapInstruction │ │ mapInstruction │ │ mapInstruction │   │
│  │   + Chunk 1    │ │   + Chunk 2    │ │   + Chunk N    │   │
│  │       ↓        │ │       ↓        │ │       ↓        │   │
│  │   Result 1     │ │   Result 2     │ │   Result N     │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FASE REDUCE                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ reduceInstruction + [Result 1, Result 2, ..., Result N]│ │
│  │                          ↓                              │ │
│  │                   RESULTAT FINAL                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Chunking Adaptatiu

El sistema calcula automàticament la mida òptima dels chunks basant-se en:

1. **Límit de context del model**
2. **Tokens reservats per output**
3. **Overhead de les instruccions**
4. **Marge de seguretat (10%)**

### Fórmula

```typescript
adaptiveChunkSize = contextLimit - maxOutputTokens - instructionOverhead - safetyMargin
```

### Exemple per Salamandra Local (4k)

```
Context limit:        4,096 tokens
- Max output:           512 tokens
- Instruction overhead: 200 tokens
- Safety margin (10%):  410 tokens
─────────────────────────────────
= Adaptive chunk size: 2,974 tokens
```

### Selecció Final

El sistema utilitza el **mínim** entre:

- Chunk size adaptatiu calculat
- Chunk size configurat per variable d'entorn

```typescript
const effectiveChunkSize = Math.min(adaptiveChunkSize, envChunkSize)
```

---

## 5. Estratègies de Chunking

### 5.1 Per Paràgraf (`paragraph`) - **Recomanat**

Divideix el text respectant els paràgrafs naturals del document.

**Avantatges:**

- Manté context semàntic
- Bons resultats per documents estructurats

**Ús:**

```bash
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
```

### 5.2 Per Frase (`sentence`)

Divideix el text per frases completes.

**Avantatges:**

- Chunks molt precisos
- Ideal per anàlisi detallada

**Desavantatges:**

- Pot perdre context entre frases

**Ús:**

```bash
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=sentence
```

### 5.3 Mida Fixa (`fixed`)

Divideix per nombre fix de tokens.

**Avantatges:**

- Chunks uniformes
- Previsible

**Desavantatges:**

- Pot tallar mid-sentence

**Ús:**

```bash
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=fixed
```

---

## 6. Configuració per Entorn

### Desenvolupament Local

```bash
# .env.local
# Fallback desactivat (ALIA/Gemini retornen 404/403)
CONTEXT_WINDOW_AUTO_FALLBACK=false

# Map-reduce activat (única opció per documents grans)
CONTEXT_WINDOW_AUTO_MAP_REDUCE=true

# Chunks petits per Salamandra Local (4k context)
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=1500
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=100
```

### Producció (Cloud Run / GCP)

```bash
# .env o Cloud Run env vars
# Fallback activat (ALIA i Gemini disponibles)
CONTEXT_WINDOW_AUTO_FALLBACK=true

# Map-reduce com a backup
CONTEXT_WINDOW_AUTO_MAP_REDUCE=true

# Chunks grans per ALIA/Gemini
CONTEXT_WINDOW_DEFAULT_CHUNK_SIZE=12000
CONTEXT_WINDOW_DEFAULT_CHUNK_STRATEGY=paragraph
CONTEXT_WINDOW_DEFAULT_OVERLAP_TOKENS=500
```

---

## 7. Ús Programàtic de Map-Reduce

### Map-Reduce Bàsic

```typescript
import { mapReduce } from "./PromptChunking"

const result = await mapReduce(
	llmService,
	documentGran,
	{
		mapInstruction: "Extreu els lots d'aquesta secció.",
		reduceInstruction: "Combina tots els lots eliminant duplicats.",
	}
	// Utilitza defaults de les variables d'entorn
)
```

### Map-Reduce amb Opcions Personalitzades

```typescript
const result = await mapReduce(
	llmService,
	documentGran,
	{
		mapInstruction: "...",
		reduceInstruction: "...",
		includeMetadata: true, // Afegeix [Chunk X/N] al prompt
	},
	{
		maxTokensPerChunk: 5000,
		overlapTokens: 200,
		strategy: "sentence",
	},
	512 // maxOutputTokens per fase map
)
```

### Refinament Iteratiu

Per a tasques que requereixen context acumulat (resum progressiu):

```typescript
import { iterativeRefinement } from "./PromptChunking"

const result = await iterativeRefinement(llmService, documentGran, "Resumeix aquesta secció del document.", "Actualitza el resum amb la informació d'aquesta nova secció.")
```

---

## 8. Gestió d'Errors

### Error de Context Excedit

```typescript
import { ContextWindowExceededError } from "./LLMService"

try {
	await llmService.callModel({ prompt: documentMassiu })
} catch (error) {
	if (error instanceof ContextWindowExceededError) {
		console.log(`Prompt: ${error.promptTokens} tokens`)
		console.log(`Límit: ${error.maxTokens} tokens`)
		console.log(`Model: ${error.provider}`)
	}
}
```

### Selecció Intel·ligent de Model

El sistema selecciona automàticament Salamandra Local per map-reduce quan els providers cloud no estan disponibles:

```typescript
// LLMService.ts - Selecció automàtica
if (this.config.provider === LLMProvider.ALIA_40B_INSTRUCT || this.config.provider === LLMProvider.GEMINI_FLASH) {
	// ALIA/Gemini no disponibles localment → usa Salamandra Local
	mapReduceService = createSalamandraLocalService()
}
```

---

## 9. Monitorització i Observabilitat

### Logs de Chunking

El sistema genera logs detallats:

```json
{
	"message": "Calculated adaptive chunk size",
	"provider": "salamandra-7b-local",
	"contextLimit": 4096,
	"maxOutputTokens": 512,
	"adaptiveChunkSize": 2974,
	"envChunkSize": 1500
}
```

```json
{
	"message": "Map-reduce completed",
	"totalChunks": 42,
	"mapTokens": 15000,
	"reduceTokens": 2000,
	"totalLatency": 120000
}
```

### Consultes BigQuery

```sql
-- Taxa de fallback
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total,
  SUM(CASE WHEN JSON_EXTRACT_SCALAR(metadata, '$.fallbackUsed') = 'true'
      THEN 1 ELSE 0 END) as fallbacks
FROM `project.dataset.llm_logs_v2`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date;

-- Estadístiques de chunking
SELECT
  AVG(CAST(JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') AS INT64)) as avg_chunks,
  MAX(CAST(JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') AS INT64)) as max_chunks
FROM `project.dataset.llm_logs_v2`
WHERE JSON_EXTRACT_SCALAR(metadata, '$.totalChunks') IS NOT NULL;
```

---

## 10. Bones Pràctiques

### ✅ Recomanacions

1. **Utilitza Salamandra/ALIA per defecte** - Optimitzats per català
2. **Activa auto-fallback en producció** - Garanteix disponibilitat
3. **Activa auto-map-reduce en desenvolupament** - Única opció local
4. **Instruccions de map curtes** - ~150 tokens màxim per deixar espai al chunk
5. **Monitoritza la taxa de fallback** - Si > 20%, considera models més grans

### ❌ Evita

1. **No desactivis ambdues estratègies** - Deixaria errors sense gestionar
2. **No utilitzis chunks massa grans** - Han de deixar espai per instruccions
3. **No oblidis `_skipAutoStrategies`** - Evita recursió infinita en map-reduce
4. **No confiïs en Gemini per català** - Prefereix ALIA/Salamandra

---

## 11. Diagrama de Decisions

```
                    ┌──────────────────┐
                    │  callModel()     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Validar Context │
                    │     Window       │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
         ┌────▼────┐                   ┌─────▼─────┐
         │  FITS   │                   │ EXCEEDS   │
         └────┬────┘                   └─────┬─────┘
              │                              │
              ▼                    ┌─────────▼─────────┐
        Crida normal               │ AUTO_FALLBACK?    │
                                   └─────────┬─────────┘
                                             │
                           ┌─────────────────┴──────────────────┐
                           │                                     │
                     ┌─────▼─────┐                        ┌──────▼──────┐
                     │   true    │                        │    false    │
                     └─────┬─────┘                        └──────┬──────┘
                           │                                     │
                    ┌──────▼──────┐                      ┌───────▼───────┐
                    │ Try Fallback│                      │ AUTO_MAP_RED? │
                    │   Model     │                      └───────┬───────┘
                    └──────┬──────┘                              │
                           │                       ┌─────────────┴─────────────┐
            ┌──────────────┴──────────────┐        │                           │
            │                              │  ┌────▼────┐               ┌──────▼──────┐
      ┌─────▼─────┐                 ┌──────▼──────┐     │               │    false    │
      │  SUCCESS  │                 │   FAIL      │     │   true        └──────┬──────┘
      └─────┬─────┘                 └──────┬──────┘     │                      │
            │                              │      ┌─────▼─────┐         ┌──────▼──────┐
            ▼                              │      │ Map-Reduce│         │ Throw Error │
       Retorna amb                         │      │ Chunks    │         │ Context     │
       fallbackUsed=true                   │      └─────┬─────┘         │ Exceeded    │
                                           │            │               └─────────────┘
                                           │            ▼
                                           └─────► Retorna resultat
```

---

## 12. Versions i Canvis

| Versió | Data       | Canvis                                         |
| ------ | ---------- | ---------------------------------------------- |
| 1.0    | 2026-01-04 | Documentació inicial                           |
| -      | -          | Implementació de pre-validació                 |
| -      | -          | Fallback automàtic configurable                |
| -      | -          | Map-reduce automàtic amb `_skipAutoStrategies` |
| -      | -          | Chunking adaptatiu segons model                |
| -      | -          | Selecció intel·ligent de Salamandra Local      |

---

## Referències

- [Context Window Strategy](context-window-strategy.md) - Documentació completa
- [Migration Guide](context-window-migration-guide.md) - Guia de migració
- [LLMService.ts](../functions/src/shared/LLMService.ts) - Implementació
- [PromptChunking.ts](../functions/src/shared/PromptChunking.ts) - Estratègies de chunking
