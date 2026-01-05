# validateStyleTone — What it does and how it works

This document explains **everything that happens** inside the `validateStyleTone` feature (Kit Lingüístic — Phase 3), from request input to detection, scoring, recommendations, and logging.

**⚠️ Updated (v2.0.0):** Linguistic detection now uses **LLM (Gemini 2.5 Flash)** instead of local dictionaries. Metric-based alerts remain local computations.

It is based on the current implementation in:

- [functions/src/kit/index.ts](functions/src/kit/index.ts)
- [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)
- [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts) _(metrics only)_
- [functions/src/kit/types/styleTone.ts](functions/src/kit/types/styleTone.ts)
- [functions/src/kit/StyleToneLogger.ts](functions/src/kit/StyleToneLogger.ts)
- [functions/src/shared/LLMService.ts](functions/src/shared/LLMService.ts) _(LLM integration)_

---

## 1) Entry points (Cloud Functions)

There are two public endpoints that run the same core logic:

### A) Callable function (frontend → Firebase)

- Export: `validateStyleTone`
- Location: [functions/src/kit/index.ts](functions/src/kit/index.ts)
- Type: `onCall`
- Region: `europe-west4`
- Limits: `memory: 512MiB`, `timeoutSeconds: 60`
- Auth:
  - `request.auth` may exist (Firebase Auth user). When present, `userId` is logged.

### B) HTTP endpoint (external/MCP)

- Export: `validateStyleToneHttp`
- Route semantics: `POST /kit/validate-style-tone` (as documented in comments)
- Location: [functions/src/kit/index.ts](functions/src/kit/index.ts)
- Type: `onRequest`
- Limits: `memory: 512MiB`, `timeoutSeconds: 60`
- CORS: enabled
- Auth:
  - No Firebase Auth is required or extracted here.
  - It still runs the same validation logic, but the log entry won’t include `userId`.

Both endpoints call the same handler:

- `validateStyleToneHandler(request, auth?)`
- Location: [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)

---

## 2) Request and response shapes

### Request: `ValidateStyleToneRequest`

Defined in [functions/src/kit/types/styleTone.ts](functions/src/kit/types/styleTone.ts)

```ts
export interface ValidateStyleToneRequest {
	text: string
	documentType?: "decret" | "informe_valoracio" | "comunicacio_interna" | "notificacio_ciutada" | "generic"
	targetAudience?: "intern" | "ciutadania" | "empreses" | "altres_administracions"
	originalText?: string
	sessionId?: string
}
```

Notes:

- `text` is required and must be a non-empty string.
- `originalText` exists in the type but is not currently used by the handler.
- `targetAudience` is passed to the rules engine signature but is not currently used by the implemented rules.

### Response: `ValidateStyleToneResponse`

Defined in [functions/src/kit/types/styleTone.ts](functions/src/kit/types/styleTone.ts)

```ts
export interface ValidateStyleToneResponse {
	scores: StyleToneScores
	toneAnalysis: ToneAnalysis
	styleMetrics: StyleMetrics
	alerts: StyleAlert[]
	recommendations: StyleRecommendation[]
	metadata: ValidationMetadata
}
```

### What the callable returns

The callable endpoint (`validateStyleTone`) returns only `result`:

```ts
const { result } = await validateStyleToneHandler(data, request.auth)
return result
```

### What the HTTP endpoint returns

The HTTP endpoint returns `{ status, logId, processingTimeMs, data: result }`.

---

## 3) High-level pipeline (end-to-end)

Inside `validateStyleToneHandler` the work happens in this order:

1. **Validate input** (`text` must be a non-empty string)
2. **Calculate style metrics** (`calculateStyleMetrics(text)`)
3. **Detect issues (alerts)** (`detectAllIssues(text, documentType, targetAudience)`)
4. **Compute numeric scores** (`calculateScores(metrics, alerts)`)
5. **Analyze tone** (`analyzeTone(text, alerts, metrics)`) — rule-based in current version
6. **Generate recommendations** (`generateRecommendations(alerts, metrics, scores)`)
7. **Build response** with metadata
8. **Log to BigQuery asynchronously** (does not block response)

The handler returns:

- `result` (the response payload)
- `logId` (unique id for the run)
- `processingTimeMs` (wall-clock time measured inside the handler)

---

## 4) Detection: what is detected and how

Detections are “rule-based” (dictionary + regex patterns) plus “metric alerts”.

All alerts implement the `StyleAlert` type:

```ts
export interface StyleAlert {
	id: string
	type: "castellanisme" | "colloquialisme" | "ambiguitat" | "registre_inadequat" | "frase_llarga" | "passiva_excessiva" | "repeticio"
	severity: "error" | "warning" | "info"
	message: string
	context: {
		text: string
		startOffset: number
		endOffset: number
		sentence: string
	}
	suggestion?: string
	rule?: string
}
```

### 4.1 Castellanismes

File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

- Source: `CASTELLANISMES` array (dictionary entries)
- Detection approach:
  - For each entry, create a word-boundary regex: `\b<incorrect>\b` (case-insensitive)
  - For each match, emit an alert:
    - `type: "castellanisme"`
    - `severity` comes from the dictionary entry
    - `suggestion`: “Substituir per: <correct>”
    - `rule`: `castellanisme_<incorrect>`

Context:

- `startOffset/endOffset` are the match offsets in the input string.
- `sentence` is extracted by splitting on punctuation boundaries (`findSentence(...)`).

### 4.2 Col·loquialismes

File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

- Source: `COLLOQUIALISMES` array
- Detection approach:
  - Similar regex matching to castellanismes.
  - Some entries have `applicableContexts` (document types). If it’s non-empty, the rule only applies when `documentType` is provided and included.

Alert:

- `type: "colloquialisme"`
- `suggestion`: the `formal` alternative
- `rule`: `colloquialisme_<normalized phrase>`

### 4.3 Registre administratiu violations

File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

- Source: `REGISTRE_PATTERNS` (regex-based patterns)
- Each rule includes:
  - `pattern: RegExp`
  - `message`
  - `suggestion`
  - `severity`
  - `applicableDocTypes`

Alert:

- `type: "registre_inadequat"`
- `rule`: `registre_<matched_text>` (lowercased + spaces → `_`)

### 4.4 Ambigüitats

File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

- Source: `AMBIGUITY_PATTERNS` (regex-based)
- Examples include:
  - Vague temporal references (e.g. “aviat”, “en breu”)
  - Vague quantities (e.g. “alguns”, “diversos”, “varis”)
  - A simple heuristic for ambiguous pronouns across sentence boundaries

Alert:

- `type: "ambiguitat"`
- `rule`: `ambiguitat_<first 20 chars>` (spaces → `_`)

### 4.5 Metric-based alerts

File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

Even if no dictionary/pattern matches are found, the system can still emit alerts from metrics:

- **Long sentence average**: if `averageSentenceLength > 40`

  - `type: "frase_llarga"`
  - `severity: "warning"`
  - Context sentence is a placeholder: “Mètrica global del document”

- **Excessive passive voice**: if `passiveVoicePercentage > 30`

  - `type: "passiva_excessiva"`
  - `severity: "warning"`

- **Low lexical diversity**: if `lexicalDiversity < 0.3` AND `wordCount > 50`
  - `type: "repeticio"`
  - `severity: "info"`

### 4.6 Sorting

After generating alerts from all sources, `detectAllIssues` sorts them by severity:

- `error` first
- then `warning`
- then `info`

---

## 5) Style metrics: what is computed and how

Metrics are computed in `calculateStyleMetrics(text)`.
File: [functions/src/kit/styleRulesEngine.ts](functions/src/kit/styleRulesEngine.ts)

### 5.1 Sentence splitting

- `splitSentences(text)` splits on `[.!?]+`.
- It trims and removes empty entries.

### 5.2 Word splitting

- `splitWords(text)` splits on whitespace, then removes non-letter/number chars using Unicode classes (`\p{L}\p{N}`), then filters empty tokens.

### 5.3 Passive voice estimate

- `countPassiveConstructions(text)` counts matches for:
  1. “és/són/va ser/han estat/... + participi”
  2. Pronominal passive-ish patterns like “es fa”, “s'aprova”

Then:

- `passiveVoicePercentage = passiveCount / sentenceCount * 100`.

### 5.4 Lexical diversity

- `lexicalDiversity = uniqueLowercasedWords / totalWords`.

### 5.5 Syntactic complexity

`determineSyntacticComplexity(sentences)` computes:

- average sentence length, and
- average count of subordinate-clause indicators (`que`, `perquè`, `ja que`, `atès que`, ...)

It returns:

- `alta` if avg length > 30 OR avg subordinates > 2
- `mitjana` if avg length > 20 OR avg subordinates > 1
- else `baixa`

### 5.6 Readability score

`calculateReadabilityScore(sentences, words)` uses an adapted Flesch-like formula:

- It estimates syllables by counting vowel groups per word.
- It computes a score on a 0–100 scale.

The final metrics are rounded:

- average sentence length: 1 decimal
- passive voice %: 1 decimal
- lexical diversity: 2 decimals
- readability: integer

---

## 6) Scores: how the numeric scores are computed

File: [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)

### 6.1 Score dimensions

The response includes these scores (0–100):

- `styleCoherence`
- `toneAdequacy`
- `clarity`
- `formality`
- `terminologyConsistency`
- `overall` (weighted)

Weights (current implementation):

```ts
styleCoherence: 0.25
toneAdequacy: 0.25
clarity: 0.2
formality: 0.15
terminologyConsistency: 0.15
```

### 6.2 Alert impact (penalties)

Each alert severity has a fixed impact:

- `error`: -5
- `warning`: -2
- `info`: -0.5

These penalties are applied to specific dimensions depending on `alert.type`:

- `castellanisme`, `colloquialisme` → penalize `formality` and `terminologyConsistency`
- `registre_inadequat` → penalize `toneAdequacy` and `formality`
- `ambiguitat` → penalize `clarity`
- `frase_llarga`, `passiva_excessiva` → penalize `styleCoherence` and `clarity`
- `repeticio` → penalize `styleCoherence`

### 6.3 Metric-based score adjustments

After alert penalties, the handler applies metric adjustments:

- If `averageSentenceLength > 30`:

  - clarity penalty: $\min(15, (avg - 25) \times 1.5)$
  - styleCoherence penalty: half of that

- If `passiveVoicePercentage > 20`:

  - styleCoherence penalty: $\min(10, (pct - 20) \times 0.5)$

- If `lexicalDiversity < 0.4` AND `wordCount > 50`:

  - styleCoherence penalty: $\min(10, (0.4 - diversity) \times 25)$

- Readability:
  - if `readabilityScore > 70` → clarity +5
  - if `readabilityScore < 40` → clarity -10

### 6.4 Clamping and rounding

- All dimensions are clamped to 0–100.
- Scores are rounded to 1 decimal.

---

## 7) Tone analysis (rule-based in current version)

File: [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)

The current `MODEL_VERSION` is `rules-only-v1`. (A comment indicates it may later be replaced by a RoBERTa model.)

### 7.1 Detected tone (`detectedTone`)

It counts “informality indicators”:

- alerts of type `colloquialisme` and `registre_inadequat`
- plus number of `castellanisme` alerts

Then it assigns a bucket:

- `formal_administratiu` if total issues = 0 AND `syntacticComplexity` is not `baixa`
- `semiformal` if total issues ≤ 2
- `mixt` if total issues ≤ 5
- `informal` otherwise

### 7.2 Emotional tone (`emotionalTone`)

A simple keyword heuristic:

- If text matches a “positive” set → `positiu`
- Else if matches a “negative” set → `negatiu`
- Then, if “assertive” patterns match (e.g. “ha de”, “cal que”, “és obligatori”) → override to `assertiu`

### 7.3 Objectivity (`objectivity`)

- Starts at 100.
- Looks for subjective markers (e.g. “jo”, “nosaltres”, “crec”, “penso”, “opino”, “sembla”).
- Each match subtracts 10.
- Clamped to 0.

### 7.4 Confidence (`confidence`)

- Fixed to `0.7` in rule-based mode.

---

## 8) Recommendations: how they are generated

File: [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)

Recommendations are built from alerts + metrics + scores.

### 8.1 Rule triggers

Current recommendation logic includes:

- **Urgent register review** (priority `alta`)

  - Trigger: ≥ 3 alerts with `severity === "error"`

- **Correct castellanismes**

  - Trigger: at least 1 `castellanisme` alert
  - Priority: `alta` if >3 castellanismes, else `mitjana`
  - Includes up to 2 examples (original fragment + first suggestion)

- **Formalize expressions**

  - Trigger: at least 1 `colloquialisme` alert
  - Priority: `alta` if >3 colloquialismes, else `mitjana`

- **Simplify sentences**

  - Trigger: `averageSentenceLength > 30`
  - Priority: `alta` if >40, else `mitjana`

- **Reduce passive voice**

  - Trigger: `passiveVoicePercentage > 30`

- **Improve clarity**
  - Trigger: `scores.clarity < 70` (priority `alta`)

### 8.2 Sorting

Recommendations are sorted by priority:

- `alta` first
- then `mitjana`
- then `baixa`

---

## 9) Metadata

File: [functions/src/kit/styleToneHandler.ts](functions/src/kit/styleToneHandler.ts)

Metadata fields:

- `processedAt` (ISO string)
- `processingTimeMs`
- `modelVersion` (currently `rules-only-v1`)
- `pipelineVersion` (currently `1.0.0`)
- `rulesApplied` = `CASTELLANISMES.length + COLLOQUIALISMES.length`

Note: `rulesApplied` counts dictionary entries (not regex rules and not metric rules).

---

## 10) Logging and privacy characteristics

The handler logs to BigQuery asynchronously via `StyleToneLogger`.
File: [functions/src/kit/StyleToneLogger.ts](functions/src/kit/StyleToneLogger.ts)

### 10.1 What is logged

A `StyleToneLog` includes:

- Identifiers: `logId`, `sessionId`, optional `userId`
- Input: **text hash** (`sha256`), text length, document type, audience
- Outputs: scores, tone analysis outputs, metrics
- Alerts: counts by severity + `alertsJson`
- Operational: processing time, model/pipeline version, timestamps

Important privacy note:

- The raw full text is **not** logged.
- However, `alertsJson` contains per-alert `context.text` (the matched fragment) and `context.sentence` (the full sentence containing it). That means **snippets of the original text** can still end up in BigQuery.

### 10.2 Dataset and tables

- Dataset: `process.env.BQ_DATASET` or default `aina_mvp_metrics`
- Tables:
  - `style_tone_logs`
  - `style_tone_feedback`

On first use, the logger auto-creates:

- the dataset (location EU), and
- both tables (partitioned by day).

### 10.3 Logging failure behavior

- BigQuery insert errors are caught and logged.
- Logging does **not** fail the validation request.

---

## 11) Error handling

`validateStyleToneHandler` throws `HttpsError`:

- `invalid-argument`

  - When `text` is missing / not a string / empty after trimming.

- `internal`
  - Any other unexpected failure in metrics, detection, scoring, tone analysis, recommendations, or logging setup.

The HTTP wrapper also rejects non-POST methods with `405`.

---

## 12) Minimal example

### Callable request (conceptual)

```json
{
	"text": "En base a la instància aproximativa presentada, cal influenciar en la decisió...",
	"documentType": "notificacio_ciutada",
	"targetAudience": "ciutadania",
	"sessionId": "sess_123"
}
```

### Response (shape)

```json
{
  "scores": { "overall": 82.5, "styleCoherence": 80.0, "toneAdequacy": 85.0, "clarity": 75.0, "formality": 78.0, "terminologyConsistency": 90.0 },
  "toneAnalysis": { "detectedTone": "semiformal", "emotionalTone": "assertiu", "objectivity": 90, "confidence": 0.7 },
  "styleMetrics": { "averageSentenceLength": 28.4, "passiveVoicePercentage": 10.0, "lexicalDiversity": 0.42, "syntacticComplexity": "mitjana", "readabilityScore": 63, "sentenceCount": 5, "wordCount": 142 },
  "alerts": [ /* list of StyleAlert */ ],
  "recommendations": [ /* list of StyleRecommendation */ ],
  "metadata": { "processedAt": "2025-12-23T...Z", "processingTimeMs": 123, "modelVersion": "rules-only-v1", "pipelineVersion": "1.0.0", "rulesApplied":  /* number */ }
}
```

(Values above are illustrative; actual values depend on text content.)

---

## 13) Key takeaways

- The system is **rules-first**: dictionaries + regex patterns + metric thresholds.
- Scores start at 100 and are adjusted by:
  - alert penalties (severity-weighted), then
  - metric-based penalties/bonuses.
- “Tone” is currently **heuristic**, not an ML model.
- It logs operational + analytic results to BigQuery, including alert context snippets.
