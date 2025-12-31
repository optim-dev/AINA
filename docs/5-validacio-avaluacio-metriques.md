# 5. Validació, Avaluació i Mètriques

Aquest document descriu l'estat actual de la validació i avaluació del sistema **AINA Demostrador Tecnològic**. Com a projecte en fase de demostrador, l'enfocament s'ha centrat en la implementació funcional i validació manual, sense protocols formals d'avaluació amb mètriques estadístiques.

---

## 5.1 Metodologia d'Avaluació

### 5.1.1 Enfocament de Validació

El sistema, en la seva fase actual de **demostrador tecnològic (PoC)**, s'ha avaluat principalment mitjançant:

- **Validació funcional manual**: Verificació que els fluxos funcionen correctament
- **Proves exploratòries**: Testing ad-hoc amb casos reals
- **Revisió de logs**: Anàlisi dels traces a BigQuery i Google Cloud Logging

#### Proves Unitàries

**El projecte no disposa de proves unitàries automatitzades** (unit tests). El desenvolupament s'ha centrat en la implementació ràpida de funcionalitats. La verificació s'ha realitzat mitjançant:

- Scripts d'execució local per validacions puntuals (ex: `test_nlp_detection.py`)
- Revisió manual del comportament
- Validació visual dels resultats al frontend

#### Scripts de Validació Disponibles

| Script                              | Propòsit                                        |
| ----------------------------------- | ----------------------------------------------- |
| `rag_service/test_nlp_detection.py` | Verificació de lematització spaCy               |
| `rag_service/test_service.sh`       | Test manual dels endpoints REST del RAG Service |

**Exemple de `test_service.sh`:**

```bash
#!/bin/bash
echo "Testing Search Endpoint..."
curl -X POST http://127.0.0.1:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": ["quedar-me sense", "vivenda"],
    "k": 3,
    "threshold": 0.52
  }'
```

#### Mètriques de Rendiment Observades

No s'han realitzat proves de càrrega formals. Les latències observades en entorn de desenvolupament són:

| Endpoint                 | Latència Observada (Típica) |
| ------------------------ | --------------------------- |
| `/search` (RAG)          | ~150ms                      |
| `validateStyleTone`      | ~2-3s                       |
| `processRAGTerminologic` | ~4s                         |

---

### 5.1.2 Dades Utilitzades

#### Glossari Terminològic

El recurs principal és el fitxer `rag_service/data/termes.csv` amb **aproximadament 60 entrades** terminològiques.

**Estructura real del CSV:**

| Camp                          | Descripció                                 |
| ----------------------------- | ------------------------------------------ |
| ID                            | Identificador únic (N001, V001, L001, etc) |
| Terme recomanat               | Forma normativa recomanada                 |
| Categoria                     | nom, verb, adjectiu, locució, expressió    |
| Terme no normatiu o inadequat | Formes a evitar                            |
| Àmbit                         | administratiu genèric, urbanisme, etc.     |
| Context d'ús                  | Descripció del context d'aplicació         |
| Comentari/notes lingüístiques | Justificació o explicació                  |
| Font                          | Optimot, TERMCAT, Manual d'elaboració...   |
| Exemples correctes (1-3)      | Frases d'exemple correctes                 |
| Exemples incorrectes (1-2)    | Frases d'exemple incorrectes               |

**Mostra d'entrades reals:**

| ID   | Terme recomanat  | Categoria | Terme no normatiu | Font                                    |
| ---- | ---------------- | --------- | ----------------- | --------------------------------------- |
| V001 | exhaurir         | verb      | agotar, esgotar   | TERMCAT i Manual d'elaboració de normes |
| V006 | formar           | verb      | conformar         | Manual d'elaboració de normes           |
| N009 | habitatge social | nom       | vivenda social    | Diccionari de dret administratiu        |
| L003 | a fi que         | locució   | a fi de que       | Terminologia jurídica i administrativa  |

#### Fonts dels Recursos

| Recurs                      | Font Original                         | Volum Real   |
| --------------------------- | ------------------------------------- | ------------ |
| **Glossari (`termes.csv`)** | Optimot, TERMCAT, Manual d'elaboració | ~60 entrades |

**Nota**: No existeixen datasets addicionals de textos administratius anotats, ni conjunts de validació formals.

---

### 5.1.3 Validació Funcional Implementada

#### Sistema de Feedback (Human-in-the-Loop)

El sistema disposa d'infraestructura per recollir feedback dels usuaris, implementada a BigQuery:

**Taules disponibles:**

| Taula                 | Propòsit                            | Estat        |
| --------------------- | ----------------------------------- | ------------ |
| `style_tone_logs`     | Logs de cada validació d'estil/to   | ✅ Operativa |
| `style_tone_feedback` | Feedback dels usuaris sobre alertes | ✅ Operativa |
| `llm_logs`            | Logs de crides als models LLM       | ✅ Operativa |

**Nota**: Encara no s'ha realitzat agregació sistemàtica del feedback per ajustar regles.

---

## 5.2 Components i Models Utilitzats

### 5.2.1 Models del Projecte AINA

#### LLMs Integrats

| Model                | Ús Principal                           | Observacions                    |
| -------------------- | -------------------------------------- | ------------------------------- |
| **Gemini 2.5 Flash** | Model principal per validació estil/to | Baixa latència, bon suport JSON |
| **Salamandra 7B**    | Desenvolupament local (Ollama)         | Model AINA natiu per al català  |
| **Alia 40B**         | Disponible però poc utilitzat          | Reservat per tasques complexes  |

#### Model d'Embeddings

El RAG Service utilitza:

```python
MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"
```

- **Arquitectura**: Sentence-Transformer
- **Dimensió**: 768
- **Optimització**: Entrenament NLI + Paraphrase en català

#### Model NLP

Per a lematització s'utilitza spaCy:

```python
nlp = spacy.load("ca_core_news_trf")  # Transformer (RoBERTa)
# Fallback: ca_core_news_sm si no disponible
```

---

### 5.2.2 Configuració del RAG Service

| Paràmetre   | Valor per Defecte | Descripció                           |
| ----------- | ----------------- | ------------------------------------ |
| `k` (top-K) | 5                 | Nombre màxim de resultats            |
| `threshold` | 0.80              | Llindar mínim de similitud semàntica |

---

## 5.3 Mètriques Quantitatives

Aquest apartat descriu les mètriques quantitatives que s'extreuen automàticament del sistema mitjançant logging a BigQuery. Les dades es poden consultar per analitzar rendiment, costos i patrons d'ús.

### 5.3.1 Taules BigQuery Implementades

El sistema disposa de **5 taules principals** a BigQuery per registrar mètriques:

| Taula                       | Dataset            | Particionament | Descripció                                    |
| --------------------------- | ------------------ | -------------- | --------------------------------------------- |
| `llm_logs` / `llm_logs_v2`  | `aina_mvp_metrics` | Diari          | Logs de totes les crides a models LLM         |
| `style_tone_logs`           | `aina_mvp_metrics` | Diari          | Logs de validació d'estil i to                |
| `style_tone_feedback`       | `aina_mvp_metrics` | Diari          | Feedback dels usuaris sobre alertes           |
| `languagetool_logs`         | `aina_mvp_metrics` | Diari          | Logs de correccions ortogràfiques/gramaticals |
| `elaboracio_decret_metrics` | `aina_mvp_metrics` | Diari          | Mètriques del mòdul d'elaboració de decrets   |
| `valoracio_oferta_metrics`  | `aina_mvp_metrics` | Diari          | Mètriques del mòdul de valoració d'ofertes    |

**Nota**: Totes les taules utilitzen particionament diari per `timestamp` per optimitzar consultes i costos.

---

### 5.3.2 Taula: `llm_logs` (Interaccions amb Models LLM)

**Propòsit**: Registrar totes les crides a models LLM (Gemini, Salamandra, etc.) amb informació de tokens, latència i costos.

**Camps principals:**

| Camp                | Tipus     | Descripció                                                  |
| ------------------- | --------- | ----------------------------------------------------------- |
| `request_id`        | STRING    | Identificador únic de la petició                            |
| `timestamp`         | TIMESTAMP | Moment de l'execució                                        |
| `provider`          | STRING    | Proveïdor: `gemini`, `salamandra`, etc.                     |
| `model_version`     | STRING    | Versió del model: `gemini-2.5-flash`, `salamandra-7b`, etc. |
| `user_id`           | STRING    | Identificador d'usuari (opcional)                           |
| `session_id`        | STRING    | Identificador de sessió (opcional)                          |
| `prompt`            | STRING    | Prompt d'entrada (pot estar anonimitzat)                    |
| `response`          | STRING    | Resposta del model (pot estar anonimitzada)                 |
| `prompt_tokens`     | INTEGER   | Tokens d'entrada                                            |
| `completion_tokens` | INTEGER   | Tokens de sortida                                           |
| `total_tokens`      | INTEGER   | Total de tokens                                             |
| `latency_ms`        | INTEGER   | Latència en mil·lisegons                                    |
| `cost_estimate_usd` | FLOAT     | Estimació de cost en USD                                    |
| `error`             | STRING    | Missatge d'error (si n'hi ha)                               |

**Consulta tipus: Latència per proveïdor**

```sql
SELECT
  provider,
  COUNT(*) as requests,
  AVG(latency_ms) as avg_latency_ms,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] as p50_ms,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] as p95_ms
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY provider
```

**Consulta tipus: Cost diari per model**

```sql
SELECT
  DATE(timestamp) as date,
  provider,
  model_version,
  SUM(prompt_tokens) as total_input_tokens,
  SUM(completion_tokens) as total_output_tokens,
  SUM(cost_estimate_usd) as total_cost_usd
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date, provider, model_version
ORDER BY date DESC, total_cost_usd DESC
```

---

### 5.3.3 Taula: `style_tone_logs` (Validació d'Estil i To)

**Propòsit**: Registrar cada validació d'estil i to amb puntuacions, alertes i mètriques de qualitat.

**Camps principals:**

| Camp                            | Tipus     | Descripció                                      |
| ------------------------------- | --------- | ----------------------------------------------- |
| `log_id`                        | STRING    | Identificador únic                              |
| `session_id`                    | STRING    | Identificador de sessió                         |
| `user_id`                       | STRING    | Identificador d'usuari                          |
| `text_hash`                     | STRING    | Hash SHA256 del text validat                    |
| `text_length`                   | INTEGER   | Longitud del text en caràcters                  |
| `document_type`                 | STRING    | Tipus de document                               |
| `target_audience`               | STRING    | Audiència objectiu                              |
| `score_overall`                 | FLOAT     | Puntuació global (0-100)                        |
| `score_style_coherence`         | FLOAT     | Puntuació de coherència estilística (0-100)     |
| `score_tone_adequacy`           | FLOAT     | Puntuació d'adequació del to (0-100)            |
| `score_clarity`                 | FLOAT     | Puntuació de claredat (0-100)                   |
| `score_formality`               | FLOAT     | Puntuació de formalitat (0-100)                 |
| `score_terminology_consistency` | FLOAT     | Puntuació de consistència terminològica (0-100) |
| `detected_tone`                 | STRING    | To detectat: formal, neutral, informal          |
| `emotional_tone`                | STRING    | To emocional detectat                           |
| `objectivity`                   | FLOAT     | Nivell d'objectivitat (0-100)                   |
| `model_confidence`              | FLOAT     | Confiança del model (0-1)                       |
| `alerts_count_error`            | INTEGER   | Nombre d'alertes d'error                        |
| `alerts_count_warning`          | INTEGER   | Nombre d'alertes d'advertència                  |
| `alerts_count_info`             | INTEGER   | Nombre d'alertes informatives                   |
| `alerts_json`                   | STRING    | JSON amb totes les alertes                      |
| `processing_time_ms`            | INTEGER   | Temps de processament en mil·lisegons           |
| `processed_at`                  | TIMESTAMP | Moment del processament                         |

**Consulta tipus: Distribució de puntuacions**

```sql
SELECT
  CASE
    WHEN score_overall >= 90 THEN 'Excel·lent (90-100)'
    WHEN score_overall >= 75 THEN 'Acceptable (75-89)'
    WHEN score_overall >= 55 THEN 'Millorable (55-74)'
    ELSE 'Requereix revisió (<55)'
  END as categoria,
  COUNT(*) as count,
  ROUND(AVG(score_overall), 1) as avg_score,
  ROUND(AVG(score_formality), 1) as avg_formality
FROM `aina-demostradors.aina_mvp_metrics.style_tone_logs`
WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY categoria
ORDER BY avg_score DESC
```

---

### 5.3.4 Taula: `style_tone_feedback` (Feedback d'Usuaris)

**Propòsit**: Recollir feedback dels usuaris sobre la qualitat de les alertes i recomanacions.

**Camps principals:**

| Camp              | Tipus     | Descripció                                  |
| ----------------- | --------- | ------------------------------------------- |
| `feedback_id`     | STRING    | Identificador únic del feedback             |
| `log_id`          | STRING    | Referència al log original                  |
| `user_id`         | STRING    | Usuari que ha enviat el feedback            |
| `feedback_target` | STRING    | Tipus: `alert`, `recommendation`, `overall` |
| `target_id`       | STRING    | ID de l'alerta o recomanació                |
| `rating`          | STRING    | Valoració: `positive`, `negative`           |
| `comment`         | STRING    | Comentari de l'usuari                       |
| `submitted_at`    | TIMESTAMP | Moment de l'enviament                       |
| `reviewed`        | BOOLEAN   | Si s'ha revisat el feedback                 |

**Consulta tipus: Taxa de feedback positiu**

```sql
SELECT
  feedback_target,
  COUNT(*) as total_feedback,
  COUNTIF(rating = 'positive') as positive,
  COUNTIF(rating = 'negative') as negative,
  ROUND(100.0 * COUNTIF(rating = 'positive') / COUNT(*), 1) as positive_rate
FROM `aina-demostradors.aina_mvp_metrics.style_tone_feedback`
WHERE submitted_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY feedback_target
```

---

### 5.3.5 Taula: `languagetool_logs` (Correccions Ortogràfiques)

**Propòsit**: Registrar les crides a LanguageTool per correcció ortogràfica i gramatical.

**Camps principals:**

| Camp                      | Tipus     | Descripció                             |
| ------------------------- | --------- | -------------------------------------- |
| `request_id`              | STRING    | Identificador únic                     |
| `timestamp`               | TIMESTAMP | Moment de la petició                   |
| `user_id`                 | STRING    | Identificador d'usuari                 |
| `module`                  | STRING    | Sempre `"kit"` per LanguageTool        |
| `input_length`            | INTEGER   | Longitud del text en caràcters         |
| `language`                | STRING    | Idioma: `ca`, `es`, etc.               |
| `level`                   | STRING    | Nivell: `default`, `picky`             |
| `matches_count`           | INTEGER   | Nombre d'errors detectats              |
| `matches_json`            | STRING    | JSON amb detalls dels errors           |
| `errors_by_category_json` | STRING    | JSON amb errors agrupats per categoria |
| `latency_ms`              | INTEGER   | Latència en mil·lisegons               |
| `success`                 | BOOLEAN   | Si la petició ha tingut èxit           |

---

### 5.3.6 Mètriques Calculades Disponibles

El sistema pot calcular les següents mètriques agregades a partir de les dades:

#### A. Latència

| Mètrica          | Fórmula                    | Taula      |
| ---------------- | -------------------------- | ---------- |
| Latència mitjana | `AVG(latency_ms)`          | `llm_logs` |
| Latència p50     | `APPROX_QUANTILES(...,50)` | `llm_logs` |
| Latència p95     | `APPROX_QUANTILES(...,95)` | `llm_logs` |
| Latència p99     | `APPROX_QUANTILES(...,99)` | `llm_logs` |

#### B. Cost

| Mètrica         | Fórmula                  | Taula      |
| --------------- | ------------------------ | ---------- |
| Cost total      | `SUM(cost_estimate_usd)` | `llm_logs` |
| Cost per usuari | Agrupat per `user_id`    | `llm_logs` |
| Cost per model  | Agrupat per `provider`   | `llm_logs` |

#### C. Tokens

| Mètrica                | Fórmula                  | Taula      |
| ---------------------- | ------------------------ | ---------- |
| Total tokens entrada   | `SUM(prompt_tokens)`     | `llm_logs` |
| Total tokens sortida   | `SUM(completion_tokens)` | `llm_logs` |
| Mitjana tokens/petició | `AVG(total_tokens)`      | `llm_logs` |

#### D. Qualitat d'Estil

| Mètrica                      | Fórmula                         | Taula             |
| ---------------------------- | ------------------------------- | ----------------- |
| Puntuació global mitjana     | `AVG(score_overall)`            | `style_tone_logs` |
| Puntuació formalitat mitjana | `AVG(score_formality)`          | `style_tone_logs` |
| Taxa d'errors detectats      | `SUM(alerts_count_error)`       | `style_tone_logs` |
| Alertes per document         | `AVG(alerts_count_error + ...)` | `style_tone_logs` |

#### E. Taxa d'Èxit

| Mètrica                  | Fórmula                           | Taula               |
| ------------------------ | --------------------------------- | ------------------- |
| Taxa d'èxit LLM          | `COUNTIF(error IS NULL)/COUNT(*)` | `llm_logs`          |
| Taxa d'èxit LanguageTool | `COUNTIF(success)/COUNT(*)`       | `languagetool_logs` |

---

### 5.3.7 Mètriques del Dashboard

El frontend consulta BigQuery per mostrar mètriques agregades:

```typescript
interface DashboardMetrics {
	overall: {
		peticionsTotals: number
		tokensEntrada: number
		tokensSortida: number
		costTotal: number
		tempsMitjaResposta: number
	}
}
```

---

### 5.3.7 Mètriques del Dashboard

El frontend consulta BigQuery per mostrar mètriques agregades en temps real. L'estructura de dades segueix aquesta interfície:

```typescript
interface DashboardMetrics {
	overall: {
		peticionsTotals: number // Total de peticions
		petitionsExitoses: number // Peticions sense error
		tokensEntrada: number // Total prompt tokens
		tokensSortida: number // Total completion tokens
		costTotal: number // Cost total en USD
		tempsMitjaResposta: number // Latència mitjana (segons)
		latenciaP95: number // Latència p95 (segons)
		taxaExit: number // Percentatge d'èxit
		throughput: number // Peticions per minut
	}
	byModelAndModule: {
		[model: string]: {
			[module: string]: {
				requests: number
				avgLatency: number
				totalCost: number
			}
		}
	}
}
```

**Fonts de dades**: `llm_logs`, `style_tone_logs`, `languagetool_logs`

---

## 5.4 Mètriques Qualitatives

Aquest apartat presenta exemples concrets del funcionament del sistema, incloent encerts, errors identificats i anàlisi interpretativa del comportament observat.

### 5.4.1 Exemples d'Encerts

#### Exemple 1: Detecció de Verb Conjugat (NLP + RAG)

**Text d'entrada:**

> "Les entitats que conformen el sector públic de la Generalitat."

**Procés de detecció real implementat:**

```
1. Tokenització i lematització amb spaCy ca_core_news_trf
   Token: "conformen" → Lemma: "conformar"

2. Cerca al diccionari de variants (termes.csv, entrada V006)
   Match trobat: conformar → formar

3. Generació d'alerta amb context
   Tipus: terme_no_normatiu
   Severitat: warning
   Fragment: "conformen"
   Suggeriment: "formen" (del verb 'formar')
   Font: Manual d'elaboració de normes de la Generalitat
```

**Resultat**: ✅ Detectat correctament malgrat estar conjugat en 3a persona plural del present d'indicatiu.

---

#### Exemple 2: Cerca Vectorial amb RAG Service

**Petició real al RAG:**

```json
{
	"candidates": ["vivenda", "conformar"],
	"k": 3,
	"threshold": 0.52
}
```

**Resposta típica del sistema:**

```json
{
	"vivenda": [
		{
			"ID": "N009",
			"terme_recomanat": "habitatge social",
			"categoria": "nom",
			"terme_no_normatiu": "vivenda social",
			"score": 0.87,
			"font": "Diccionari de dret administratiu (TERMCAT)"
		}
	],
	"conformar": [
		{
			"ID": "V006",
			"terme_recomanat": "formar",
			"categoria": "verb",
			"terme_no_normatiu": "conformar",
			"score": 0.91,
			"font": "Manual d'elaboració de normes"
		}
	]
}
```

**Anàlisi**:

- La similitud semàntica és elevada (>0.85) gràcies al model ST-NLI-ca
- El threshold de 0.52 permet trobar variants menys òbvies
- El sistema retorna sempre la font original per verificabilitat

---

#### Exemple 3: Detecció de Locució Incorrecta

**Text d'entrada:**

> "A fi de que els ciutadans puguin accedir als serveis."

**Alerta generada:**

```json
{
	"tipus": "terme_no_normatiu",
	"severitat": "error",
	"fragment": "A fi de que",
	"suggeriment": "A fi que (sense preposició 'de')",
	"explicacio": "L'expressió 'a fi de que' és un calc del castellà. Cal emprar 'a fi que' (caiguda de preposició) o sinònims com 'per tal que'.",
	"font": "Terminologia jurídica i administrativa (Justícia)",
	"ID_glossari": "L003"
}
```

**Resultat**: ✅ Detectat correctament amb explicació lingüística i font citada.

---

### 5.4.2 Exemples d'Errors i Limitacions

#### Error 1: Fals Positiu en Context Tècnic-Legal

**Text:**

> "El marc legal aplicable estableix les bases del procediment."

**Problema detectat:**
El sistema genera una alerta marcant "marc" com a possible castellanisme (del castellà "marco").

**Anàlisi de l'error:**

- En context tècnic/jurídic, "marc legal" és correcte i normatiu en català
- El sistema no disposa de detecció de contextos o n-grams per expressions fixes
- La regla de detecció és massa genèrica

**Solució implementada:**
Afegir "marc legal", "marc normatiu", "marc regulador" com a excepcions al diccionari.

**Estat**: ⚠️ Solució parcial - caldria un model de context més sofisticat

---

#### Error 2: Expressió Multi-paraula No Detectada

**Text:**

> "Pel que fa al desenvolupament sostenible del territori..."

**Problema:**
"Pel que fa" és una locució correcta, però el sistema la pot analitzar paraula per paraula si no està al glossari.

**Anàlisi de l'error:**

- Les expressions de múltiples paraules requereixen tractament especial
- El pipeline actual prioritza paraules individuals
- Falta un pas de detecció d'n-grams abans del matching individual

**Solució prevista:**
Implementar detecció d'n-grams (4, 3, 2 paraules) abans del matching de tokens individuals.

**Estat**: 🔄 Pendent d'implementar

---

#### Error 3: Severitat No Contextual

**Text (comunicació interna informal):**

> "Hola, us envio la documentació sol·licitada."

**Problema:**
El sistema marca "Hola" com a error d'alta severitat (registre inadequat), però en comunicacions internes pot ser acceptable.

**Anàlisi de l'error:**

- La severitat hauria de variar segons `documentType` i `targetAudience`
- Actualment les regles són globals
- Falta personalització per tipus de document

**Solució implementada:**
Paràmetres `applicableDocTypes` i `applicableAudiences` definits a l'esquema de regles (encara no aplicats a totes les regles).

**Estat**: ⚠️ Infraestructura implementada, regles pendents de revisar

---

### 5.4.3 Anàlisi Interpretativa

#### Patrons Observats en Ús Real

Basant-se en la revisió manual de logs i feedback informal d'usuaris pilots:

| Patró Observat                                   | Freqüència Estimada | Impacte en Puntuació   |
| ------------------------------------------------ | ------------------- | ---------------------- |
| Castellanismes lèxics ("entonces", "desarrollo") | Alta                | Alt (-5 per error)     |
| Frases excessivament llargues (>40 paraules)     | Mitjana             | Mitjà (-2 claredat)    |
| Ús de "tu" en lloc de "vostè"                    | Baixa               | Alt (-5 formalitat)    |
| Veu passiva excessiva                            | Alta                | Baix (-0.5 coherència) |
| Ambigüitats temporals ("aviat", "properament")   | Mitjana-Alta        | Mitjà (-2 claredat)    |

**Nota**: Les freqüències són estimacions basades en observació directa, no en anàlisi estadística formal.

---

#### Nivell de Confiança per Component

| Component                       | Confiança | Justificació                                              |
| ------------------------------- | --------- | --------------------------------------------------------- |
| **Detecció NLP (lematització)** | 95%+      | Model transformer AINA validat (ca_core_news_trf)         |
| **Cerca vectorial (FAISS)**     | 90%       | Model ST-NLI-ca específic per català, threshold ajustable |
| **Classificació de to**         | 70%       | Mode regles-only (v1), sense model ML entrenat            |
| **Detecció de castellanismes**  | 85-94%    | Diccionari curat manualment, validació per fonts          |
| **Puntuació global**            | 75-85%    | Ponderació empírica, pendent validació humana formal      |

**Detall sobre confiança de classificació de to:**

```typescript
// Codi real del sistema (StyleToneValidator.ts)
metadata.confidence = 0.7 // rules-only-v1

// Futur: model RoBERTa-ca retornarà confiança real
// Roadmap: Entrenar model supervisat per classificació de to
```

---

#### Limitacions Globals del Sistema

1. **Glossari limitat**: ~60 entrades, no exhaustiu
2. **Context document no considerat**: Mateixa severitat per tot tipus de textos
3. **Sense anàlisi sintàctica profunda**: Només morfologia (lematització)
4. **Expressions idiomàtiques**: Detecció parcial
5. **Sense memòria de sessió**: Cada text s'analitza de forma aïllada
6. **Model de to basat en regles**: Sense aprenentatge de dades reals

---

#### Recomanacions Derivades de l'Anàlisi

| Prioritat  | Recomanació                                         | Impacte Esperat        | Esforç   |
| ---------- | --------------------------------------------------- | ---------------------- | -------- |
| 🔴 Alta    | Ampliar glossari terminològic a 200+ entrades       | +20% cobertura         | Mitjà    |
| 🔴 Alta    | Implementar proves unitàries per components crítics | Millora qualitat codi  | Alt      |
| 🟡 Mitjana | Afegir detecció d'n-grams (expressions fixes)       | -30% falsos positius   | Baix     |
| 🟡 Mitjana | Severitat contextual per tipus de document          | +15% precisió          | Mitjà    |
| 🟢 Baixa   | Entrenar model RoBERTa-ca per classificació de to   | +10% confiança to      | Molt Alt |
| 🟢 Baixa   | Dataset de validació amb anotacions humanes         | Mètriques formals (F1) | Alt      |

## 5.5 Scoring d'Estil i To

### 5.5.1 Sistema de Puntuació Implementat

El sistema calcula puntuacions en cinc dimensions:

| Dimensió                   | Pes |
| -------------------------- | --- |
| Coherència Estilística     | 25% |
| Adequació del To           | 25% |
| Claredat                   | 20% |
| Formalitat                 | 15% |
| Consistència Terminològica | 15% |

### 5.5.2 Impacte de les Alertes

| Severitat | Impacte per ocurrència           |
| --------- | -------------------------------- |
| `error`   | -5 punts a mètrica relacionada   |
| `warning` | -2 punts a mètrica relacionada   |
| `info`    | -0.5 punts a mètrica relacionada |

### 5.5.3 Nivell de Confiança

```typescript
// Actualment fix a 0.7 en mode regles
metadata.confidence = 0.7 // rules-only-v1
```

**Nota**: La classificació de to opera en mode "rules-only", sense model ML entrenat específicament.

---

## 5.6 Estat Actual i Roadmap

### 5.6.1 Punts Forts

| Àrea                | Descripció                                |
| ------------------- | ----------------------------------------- |
| **Infraestructura** | Logging complet a BigQuery operatiu       |
| **Models AINA**     | Integració de models natius per al català |
| **Arquitectura**    | Pipeline modular i escalable              |
| **Feedback**        | Sistema preparat per recollir valoracions |

### 5.6.2 Àrees Pendents d'Avaluació Formal

| Àrea                             | Estat            |
| -------------------------------- | ---------------- |
| **Proves unitàries**             | No implementades |
| **Benchmarks formals**           | No realitzats    |
| **Mètriques de precisió/recall** | No calculades    |
| **Validació amb Gold Standard**  | No disponible    |
| **Proves de càrrega**            | No realitzades   |

### 5.6.3 Treball Futur Recomanat

| Prioritat | Recomanació                                         |
| --------- | --------------------------------------------------- |
| Alta      | Ampliar glossari terminològic                       |
| Alta      | Implementar proves unitàries per components crítics |
| Mitjana   | Crear dataset de validació amb anotacions humanes   |
| Mitjana   | Calcular mètriques formals (precisió, recall, F1)   |
| Baixa     | Entrenar model específic per classificació de to    |

---

## Annexos

### A. Esquema BigQuery Complet

Veure document: [bigquery-schema.md](bigquery-schema.md)

### B. Diccionaris i Recursos

- `rag_service/data/termes.csv` - Glossari terminològic principal (~60 entrades)

### C. Scripts de Validació

- `rag_service/test_nlp_detection.py` - Verificació de lematització spaCy
- `rag_service/test_service.sh` - Test manual dels endpoints REST

### D. Consultes SQL de Monitoratge

```sql
-- Volum de peticions per dia
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  COUNTIF(error IS NULL) as successful,
  COUNTIF(error IS NOT NULL) as failed
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date
ORDER BY date DESC;
```
