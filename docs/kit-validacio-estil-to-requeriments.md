# Requeriments: Validació d'Estil i To

> **Funcionalitat 3 – Kit Lingüístic (AINA Kit)**  
> Última actualització: 2024-12-23

---

## 1. Visió General

La **Validació d'Estil i To** és la tercera fase del pipeline de postprocés del Kit Lingüístic. Rep el text ja corregit ortogràficament (LanguageTool/Softcatalà) i amb la terminologia normalitzada (RAG terminològic), i avalua si compleix els estàndards de **to administratiu formal** i **coherència estilística** requerits per la institució.

### 1.1 Objectius

| Objectiu                                   | Descripció                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Detectar desviacions de registre**       | Identificar castellanismes, col·loquialismes, girs informals o ambigüitats que trenquin el to administratiu |
| **Quantificar la qualitat estilística**    | Retornar mètriques numèriques (0-100) per coherència, formalitat, claredat i adequació                      |
| **Proporcionar recomanacions accionables** | Llistar suggeriments concrets de millora amb context i alternativa                                          |
| **Habilitar feedback humà**                | Permetre valoracions (👍/👎) i suggeriments per millorar contínuament el sistema                            |

### 1.2 Posició al Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TEXT GENERAT (Funcionalitat 1 o 2)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 1: Correcció Ortogràfica i Sintàctica                                 │
│  (LanguageTool / Softcatalà)                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 2: RAG Terminològic                                                   │
│  (Detecció NLP + Cerca vectorial + Substitució de termes)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 3: Validació d'Estil i To  ◄── AQUEST DOCUMENT                        │
│  (RoBERTa-ca classificador + Regles)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TEXT FINAL + INFORME DE QUALITAT                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Requeriments Funcionals

### 2.1 Entrada del Sistema

| Camp             | Tipus    | Obligatori | Descripció                                                                                                |
| ---------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `text`           | `string` | ✅         | Text a validar (ja corregit per fases 1 i 2)                                                              |
| `documentType`   | `enum`   | ❌         | Tipus de document: `decret`, `informe_valoracio`, `comunicacio_interna`, `notificacio_ciutada`, `generic` |
| `targetAudience` | `enum`   | ❌         | Públic: `intern`, `ciutadania`, `empreses`, `altres_administracions`                                      |
| `originalText`   | `string` | ❌         | Text original (abans de correccions) per comparativa                                                      |
| `sessionId`      | `string` | ❌         | ID de sessió per traçabilitat end-to-end                                                                  |
| `userId`         | `string` | ❌         | ID d'usuari per feedback i mètriques                                                                      |

### 2.2 Sortida del Sistema

#### 2.2.1 Estructura de Resposta

```typescript
interface StyleToneValidationResult {
	// Puntuacions globals (0-100)
	scores: {
		overall: number // Puntuació global ponderada
		styleCoherence: number // Coherència estilística (objectiu: ≥90)
		toneAdequacy: number // Adequació del to (objectiu: ≥85)
		clarity: number // Claredat del missatge
		formality: number // Nivell de formalitat
		terminologyConsistency: number // Consistència terminològica
	}

	// Classificació del to detectat
	toneAnalysis: {
		detectedTone: "formal_administratiu" | "semiformal" | "informal" | "mixt"
		emotionalTone: "neutre" | "positiu" | "negatiu" | "assertiu"
		objectivity: number // 0-100
		confidence: number // Confiança del model (0-1)
	}

	// Mètriques estilístiques
	styleMetrics: {
		averageSentenceLength: number // Paraules per frase
		passiveVoicePercentage: number // % ús de veu passiva
		lexicalDiversity: number // Ràtio type-token
		syntacticComplexity: "baixa" | "mitjana" | "alta"
		readabilityScore: number // Índex de llegibilitat (adaptat al català)
	}

	// Alertes i problemes detectats
	alerts: StyleAlert[]

	// Recomanacions de millora
	recommendations: StyleRecommendation[]

	// Metadades
	metadata: {
		processedAt: string // ISO timestamp
		processingTimeMs: number
		modelVersion: string
		pipelineVersion: string
	}
}

interface StyleAlert {
	id: string
	type: "castellanisme" | "colloquialisme" | "ambiguitat" | "registre_inadequat" | "frase_llarga" | "passiva_excessiva" | "repeticio"
	severity: "error" | "warning" | "info"
	message: string
	context: {
		text: string // Fragment problemàtic
		startOffset: number
		endOffset: number
		sentence: string // Frase completa per context
	}
	suggestion?: string // Alternativa recomanada
	rule?: string // ID de la regla aplicada
}

interface StyleRecommendation {
	id: string
	category: "estil" | "to" | "estructura" | "claredat"
	priority: "alta" | "mitjana" | "baixa"
	title: string
	description: string
	examples?: {
		original: string
		improved: string
	}[]
}
```

### 2.3 Detecció i Regles

#### 2.3.1 Castellanismes (REQ-EST-001)

| ID            | Requeriment                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| REQ-EST-001.1 | El sistema ha de detectar castellanismes lèxics habituals en textos administratius catalans                |
| REQ-EST-001.2 | Mantenir una llista configurable de parells castellanisme → equivalent català                              |
| REQ-EST-001.3 | Classificar la severitat: `error` si és clarament incorrecte, `warning` si és acceptable però no preferent |

**Exemples de detecció:**

| Castellanisme     | Equivalent català               | Severitat |
| ----------------- | ------------------------------- | --------- |
| _bueno_           | _bé_, _d'acord_                 | error     |
| _entonces_        | _aleshores_, _llavors_          | error     |
| _desde luego_     | _és clar_, _certament_          | error     |
| _en plan_         | _(eliminar o reformular)_       | error     |
| _alcalde_         | _alcalde/essa_ (ja és normatiu) | info      |
| _marco_ (context) | _marc_                          | warning   |
| _desarrollo_      | _desenvolupament_               | warning   |

#### 2.3.2 Col·loquialismes (REQ-EST-002)

| ID            | Requeriment                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| REQ-EST-002.1 | Detectar expressions col·loquials inadequades per a registre administratiu                           |
| REQ-EST-002.2 | Suggerir alternatives formals per cada col·loquialisme detectat                                      |
| REQ-EST-002.3 | Considerar el context: algunes expressions són acceptables en comunicació interna però no en decrets |

**Exemples:**

| Col·loquialisme    | Alternativa formal                              | Context |
| ------------------ | ----------------------------------------------- | ------- |
| _un munt de_       | _una quantitat considerable de_, _nombrosos/es_ | sempre  |
| _passar de_        | _no atendre_, _desestimar_                      | sempre  |
| _al loro_          | _atent/a_, _vigilant_                           | sempre  |
| _bé_ (inici frase) | _(eliminar o reformular)_                       | decrets |
| _vale_             | _d'acord_, _entesos_                            | extern  |

#### 2.3.3 Registre Administratiu (REQ-EST-003)

| ID            | Requeriment                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| REQ-EST-003.1 | Validar que el text segueix les convencions del registre administratiu català                              |
| REQ-EST-003.2 | Detectar ús inadequat de formes de tractament (tu/vostè/vós)                                               |
| REQ-EST-003.3 | Verificar coherència en l'ús de temps verbals (present d'indicatiu per obligacions, futur per compromisos) |
| REQ-EST-003.4 | Identificar fórmules de cortesia absents o inadequades segons tipus de document                            |

**Criteris de registre administratiu:**

| Aspecte            | Correcte                           | Incorrecte                         |
| ------------------ | ---------------------------------- | ---------------------------------- |
| Tractament         | _Vostè_, _la persona sol·licitant_ | _Tu_, _l'usuari_ (genèric)         |
| Impersonalitat     | _Es comunica_, _S'informa_         | _Et comuniquem_, _T'informem_      |
| Fórmules inici     | _Us comuniquem_, _En relació amb_  | _Hola_, _Bon dia_ (en decrets)     |
| Fórmules tancament | _Atentament_, _Ben cordialment_    | _(sense fórmula)_ en notificacions |

#### 2.3.4 Ambigüitats (REQ-EST-004)

| ID            | Requeriment                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| REQ-EST-004.1 | Detectar pronoms amb referent ambigu                                                                          |
| REQ-EST-004.2 | Identificar frases amb múltiples interpretacions possibles                                                    |
| REQ-EST-004.3 | Alertar sobre ús de termes vagues (_alguns_, _diversos_, _pròximament_) en contextos que requereixen precisió |

#### 2.3.5 Mètriques Estilístiques (REQ-EST-005)

| ID            | Requeriment                                                    |
| ------------- | -------------------------------------------------------------- |
| REQ-EST-005.1 | Calcular longitud mitjana de frases (objectiu: 15-25 paraules) |
| REQ-EST-005.2 | Calcular percentatge de veu passiva (objectiu: <20%)           |
| REQ-EST-005.3 | Calcular diversitat lèxica (ràtio type-token)                  |
| REQ-EST-005.4 | Calcular índex de llegibilitat adaptat al català               |
| REQ-EST-005.5 | Alertar si frases superen 40 paraules                          |

### 2.4 Classificació de To (Model RoBERTa-ca)

#### 2.4.1 Arquitectura (REQ-MOD-001)

| ID            | Requeriment                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------- |
| REQ-MOD-001.1 | Utilitzar model RoBERTa-base-ca (o similar) fine-tuned per classificació de to                     |
| REQ-MOD-001.2 | El model ha de classificar en categories: `formal_administratiu`, `semiformal`, `informal`, `mixt` |
| REQ-MOD-001.3 | Retornar score de confiança (0-1) per cada classificació                                           |
| REQ-MOD-001.4 | Suportar inferència per frase o per document complet                                               |

#### 2.4.2 Entrenament i Manteniment (REQ-MOD-002)

| ID            | Requeriment                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| REQ-MOD-002.1 | Crear dataset d'entrenament amb exemples etiquetats de textos administratius catalans |
| REQ-MOD-002.2 | Incloure exemples negatius (textos informals, col·loquials) per contrast              |
| REQ-MOD-002.3 | Permetre re-entrenament periòdic amb dades de feedback                                |
| REQ-MOD-002.4 | Versionat del model amb registre de mètriques (accuracy, F1, confusion matrix)        |

#### 2.4.3 Desplegament (REQ-MOD-003)

| ID            | Requeriment                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| REQ-MOD-003.1 | Desplegar model com a servei Python (FastAPI) al costat del servei RAG existent |
| REQ-MOD-003.2 | Exposar endpoint `/analyze-tone` amb latència < 500ms per document mitjà        |
| REQ-MOD-003.3 | Suportar batch processing per a múltiples documents                             |
| REQ-MOD-003.4 | Implementar caching de resultats per textos idèntics                            |

---

## 3. Requeriments No Funcionals

### 3.1 Rendiment (REQ-NFR-001)

| ID            | Requeriment                               | Objectiu |
| ------------- | ----------------------------------------- | -------- |
| REQ-NFR-001.1 | Latència p50 de validació completa        | < 1s     |
| REQ-NFR-001.2 | Latència p95 de validació completa        | < 3s     |
| REQ-NFR-001.3 | Throughput mínim                          | 10 req/s |
| REQ-NFR-001.4 | Temps màxim per document de 5000 paraules | < 10s    |

### 3.2 Disponibilitat (REQ-NFR-002)

| ID            | Requeriment                       | Objectiu              |
| ------------- | --------------------------------- | --------------------- |
| REQ-NFR-002.1 | Disponibilitat del servei         | 99.5%                 |
| REQ-NFR-002.2 | Fallback si model no disponible   | Retornar només regles |
| REQ-NFR-002.3 | Circuit breaker per servei Python | Timeout 10s, retry 3x |

### 3.3 Escalabilitat (REQ-NFR-003)

| ID            | Requeriment                                                        |
| ------------- | ------------------------------------------------------------------ |
| REQ-NFR-003.1 | Servei Python ha de suportar múltiples instàncies (stateless)      |
| REQ-NFR-003.2 | Regles i diccionaris carregats en memòria amb refresh configurable |
| REQ-NFR-003.3 | Suportar processament asíncron per documents llargs                |

---

## 4. Requeriments d'Integració

### 4.1 API Backend (Firebase Functions)

#### 4.1.1 Endpoint Principal (REQ-INT-001)

| ID            | Requeriment                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| REQ-INT-001.1 | Crear callable function `validateStyleTone` a `functions/src/kit/styleTone.ts`         |
| REQ-INT-001.2 | Crear HTTP endpoint `/kit/validate-style-tone` per accés extern (MCP, altres sistemes) |
| REQ-INT-001.3 | Autenticació: callable requereix usuari autenticat; HTTP suporta API key               |
| REQ-INT-001.4 | Rate limiting: 100 req/min per usuari                                                  |

**Signatura de la funció:**

```typescript
// functions/src/kit/styleTone.ts

export const validateStyleTone = onCall<ValidateStyleToneRequest, ValidateStyleToneResponse>({ region: "europe-west4", memory: "512MiB", timeoutSeconds: 60 }, async (request) => {
	// 1. Validar input
	// 2. Aplicar regles locals (castellanismes, col·loquialismes)
	// 3. Cridar servei Python per classificació de to (RoBERTa)
	// 4. Calcular mètriques estilístiques
	// 5. Agregar resultats
	// 6. Logar a BigQuery
	// 7. Retornar resposta
})
```

#### 4.1.2 Integració amb Servei Python (REQ-INT-002)

| ID            | Requeriment                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| REQ-INT-002.1 | El servei Python exposarà endpoint `POST /analyze-tone`                      |
| REQ-INT-002.2 | Comunicació via HTTP intern (Cloud Run to Cloud Run o localhost en emulador) |
| REQ-INT-002.3 | Format de request/response JSON                                              |
| REQ-INT-002.4 | Timeout configurable (default 10s)                                           |

**Endpoint Python:**

```python
# rag_service/main.py (afegir endpoint)

@app.post("/analyze-tone")
async def analyze_tone(request: ToneAnalysisRequest) -> ToneAnalysisResponse:
    """
    Analitza el to d'un text utilitzant RoBERTa-ca.

    Input:
      - text: str
      - sentences: list[str] (opcional, per anàlisi per frase)

    Output:
      - detectedTone: str
      - emotionalTone: str
      - objectivity: float
      - confidence: float
      - sentenceAnalysis: list (si sentences proporcionat)
    """
    pass
```

### 4.2 Frontend (React)

#### 4.2.1 Servei (REQ-FE-001)

| ID           | Requeriment                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| REQ-FE-001.1 | Crear `aina/src/services/kitService.ts` amb wrapper per `validateStyleTone` |
| REQ-FE-001.2 | Implementar caching local per evitar crides repetides                       |
| REQ-FE-001.3 | Gestió d'errors amb missatges traduïts al català                            |

**Implementació:**

```typescript
// aina/src/services/kitService.ts

import { httpsCallable } from "firebase/functions"
import { functions } from "./firebase"

export interface ValidateStyleToneParams {
	text: string
	documentType?: DocumentType
	targetAudience?: TargetAudience
	sessionId?: string
}

export const validateStyleTone = async (params: ValidateStyleToneParams): Promise<StyleToneValidationResult> => {
	const callable = httpsCallable(functions, "validateStyleTone")
	const result = await callable(params)
	return result.data as StyleToneValidationResult
}
```

#### 4.2.2 Components UI (REQ-FE-002)

| ID           | Requeriment                                                                      |
| ------------ | -------------------------------------------------------------------------------- |
| REQ-FE-002.1 | Actualitzar `ValidacioEstil.jsx` per mostrar dades reals en lloc de placeholders |
| REQ-FE-002.2 | Implementar pestanya "Visió General" amb scores i indicadors                     |
| REQ-FE-002.3 | Implementar pestanya "Anàlisi d'Estil" amb mètriques i alertes                   |
| REQ-FE-002.4 | Implementar pestanya "Anàlisi de To" amb classificació i context                 |
| REQ-FE-002.5 | Implementar pestanya "Recomanacions" amb llista priorizada                       |
| REQ-FE-002.6 | Afegir àrea d'entrada de text o integrar amb flux de document                    |

#### 4.2.3 Visualització de Scores (REQ-FE-003)

| ID           | Requeriment                                              |
| ------------ | -------------------------------------------------------- |
| REQ-FE-003.1 | Mostrar scores amb barres de progrés i colors semafòrics |
| REQ-FE-003.2 | Verd: ≥90, Groc: 70-89, Vermell: <70                     |
| REQ-FE-003.3 | Mostrar objectius al costat de cada mètrica              |
| REQ-FE-003.4 | Permetre expandir detall de cada score                   |

---

## 5. Requeriments de Dades i Logging

### 5.1 BigQuery (Logs i Mètriques)

#### 5.1.1 Esquema de Logs (REQ-DATA-001)

| ID             | Requeriment                                        |
| -------------- | -------------------------------------------------- |
| REQ-DATA-001.1 | Crear taula `aina_mvp_metrics.style_tone_logs`     |
| REQ-DATA-001.2 | Logar cada validació amb estructura definida       |
| REQ-DATA-001.3 | Particionar per data de processament               |
| REQ-DATA-001.4 | Retenció de logs: 90 dies detallat, 2 anys agregat |

**Esquema BigQuery:**

```sql
CREATE TABLE aina_mvp_metrics.style_tone_logs (
  -- Identificadors
  log_id STRING NOT NULL,
  session_id STRING,
  user_id STRING,

  -- Input
  text_hash STRING NOT NULL,           -- SHA256 del text (per deduplicació)
  text_length INT64,
  document_type STRING,
  target_audience STRING,

  -- Scores
  score_overall FLOAT64,
  score_style_coherence FLOAT64,
  score_tone_adequacy FLOAT64,
  score_clarity FLOAT64,
  score_formality FLOAT64,
  score_terminology_consistency FLOAT64,

  -- Classificació de to
  detected_tone STRING,
  emotional_tone STRING,
  objectivity FLOAT64,
  model_confidence FLOAT64,

  -- Mètriques estilístiques
  avg_sentence_length FLOAT64,
  passive_voice_pct FLOAT64,
  lexical_diversity FLOAT64,

  -- Alertes (agregat)
  alerts_count_error INT64,
  alerts_count_warning INT64,
  alerts_count_info INT64,
  alerts_json STRING,                  -- JSON array de les alertes

  -- Recomanacions (agregat)
  recommendations_count INT64,

  -- Metadades
  processed_at TIMESTAMP NOT NULL,
  processing_time_ms INT64,
  model_version STRING,
  pipeline_version STRING,

  -- Partició
  _PARTITIONTIME TIMESTAMP
)
PARTITION BY DATE(processed_at)
CLUSTER BY user_id, document_type;
```

### 5.2 Firestore (Historial i Configuració)

#### 5.2.1 Historial de Validacions (REQ-DATA-002)

| ID             | Requeriment                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| REQ-DATA-002.1 | Crear col·lecció `style_tone_history` per consultes ràpides des del frontend |
| REQ-DATA-002.2 | Limitar a últimes 100 validacions per usuari                                 |
| REQ-DATA-002.3 | Incloure resum de scores i alertes (no text complet)                         |

**Estructura Firestore:**

```typescript
// Collection: style_tone_history/{docId}
interface StyleToneHistoryDoc {
	userId: string
	sessionId?: string
	documentType: string

	scores: {
		overall: number
		styleCoherence: number
		toneAdequacy: number
	}

	alertsSummary: {
		errors: number
		warnings: number
	}

	processedAt: Timestamp

	// Per ordenació i cleanup
	createdAt: Timestamp
}
```

#### 5.2.2 Configuració de Regles (REQ-DATA-003)

| ID             | Requeriment                                                          |
| -------------- | -------------------------------------------------------------------- |
| REQ-DATA-003.1 | Crear col·lecció `style_rules` per emmagatzemar regles configurables |
| REQ-DATA-003.2 | Suportar activació/desactivació de regles individuals                |
| REQ-DATA-003.3 | Permetre ajustar severitat de regles                                 |
| REQ-DATA-003.4 | Versionar canvis de configuració                                     |

**Estructura Firestore:**

```typescript
// Collection: style_rules/{ruleId}
interface StyleRuleDoc {
	id: string
	type: "castellanisme" | "colloquialisme" | "registre" | "ambiguitat" | "metric"

	// Patró de detecció
	pattern?: string // Regex o text exacte
	patternType: "exact" | "regex" | "semantic"

	// Configuració
	enabled: boolean
	severity: "error" | "warning" | "info"

	// Missatge i suggeriment
	message: string
	suggestion?: string

	// Context d'aplicació
	applicableDocTypes: string[] // [] = tots
	applicableAudiences: string[] // [] = tots

	// Metadades
	createdAt: Timestamp
	updatedAt: Timestamp
	createdBy: string
	version: number
}
```

---

## 6. Requeriments de Feedback (Human-in-the-Loop)

### 6.1 Captura de Feedback (REQ-FB-001)

| ID           | Requeriment                                                  |
| ------------ | ------------------------------------------------------------ |
| REQ-FB-001.1 | Afegir botons 👍/👎 a cada alerta i recomanació              |
| REQ-FB-001.2 | Permetre afegir comentari opcional al feedback               |
| REQ-FB-001.3 | Permetre suggerir correcció alternativa                      |
| REQ-FB-001.4 | Capturar context complet: text, alerta, resposta de l'usuari |

### 6.2 Emmagatzematge de Feedback (REQ-FB-002)

| ID           | Requeriment                                                      |
| ------------ | ---------------------------------------------------------------- |
| REQ-FB-002.1 | Crear taula BigQuery `aina_mvp_metrics.style_tone_feedback`      |
| REQ-FB-002.2 | Crear col·lecció Firestore `style_tone_feedback` per accés ràpid |
| REQ-FB-002.3 | Vincular feedback amb log original via `log_id`                  |

**Esquema BigQuery:**

```sql
CREATE TABLE aina_mvp_metrics.style_tone_feedback (
  feedback_id STRING NOT NULL,
  log_id STRING NOT NULL,              -- Referència al log original
  user_id STRING,

  -- Tipus de feedback
  feedback_target STRING,              -- 'alert' | 'recommendation' | 'overall'
  target_id STRING,                    -- ID de l'alerta o recomanació

  -- Valoració
  rating STRING,                       -- 'positive' | 'negative'
  comment STRING,
  suggested_correction STRING,

  -- Context
  original_text STRING,
  alert_or_recommendation_json STRING,

  -- Metadades
  submitted_at TIMESTAMP NOT NULL,

  -- Estat de revisió
  reviewed BOOL DEFAULT FALSE,
  reviewed_at TIMESTAMP,
  reviewed_by STRING,
  action_taken STRING
)
PARTITION BY DATE(submitted_at);
```

### 6.3 Flux de Revisió (REQ-FB-003)

| ID           | Requeriment                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| REQ-FB-003.1 | Dashboard de revisió per equip lingüístic (fora scope MVP, però preparar model de dades) |
| REQ-FB-003.2 | Marcar feedback com "revisat" i registrar acció presa                                    |
| REQ-FB-003.3 | Si feedback negatiu recurrent → alertar per actualitzar regla o diccionari               |

### 6.4 Actualització de Regles (REQ-FB-004)

| ID           | Requeriment                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| REQ-FB-004.1 | Quan es modifica una regla a `style_rules`, registrar versió anterior          |
| REQ-FB-004.2 | Permetre afegir nous castellanismes/col·loquialismes via feedback              |
| REQ-FB-004.3 | Trigger automàtic: si feedback negatiu > 5 per mateixa regla → notificar admin |

---

## 7. Diccionaris i Recursos

### 7.1 Diccionari de Castellanismes (REQ-DIC-001)

| ID            | Requeriment                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| REQ-DIC-001.1 | Format CSV amb columnes: `castellanisme`, `equivalent_catala`, `severitat`, `context`, `notes` |
| REQ-DIC-001.2 | Mínim 200 entrades inicials basades en errors freqüents                                        |
| REQ-DIC-001.3 | Importable via UI existent de gestió de glossari                                               |
| REQ-DIC-001.4 | Actualitzable sense redesplegament                                                             |

### 7.2 Diccionari de Col·loquialismes (REQ-DIC-002)

| ID            | Requeriment                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| REQ-DIC-002.1 | Format CSV amb columnes: `colloquialisme`, `alternativa_formal`, `severitat`, `contextos_aplicables` |
| REQ-DIC-002.2 | Diferenciar per tipus de document i audiència                                                        |
| REQ-DIC-002.3 | Mínim 100 entrades inicials                                                                          |

### 7.3 Fórmules de Registre Administratiu (REQ-DIC-003)

| ID            | Requeriment                                                  |
| ------------- | ------------------------------------------------------------ |
| REQ-DIC-003.1 | Llista de fórmules d'inici recomanades per tipus de document |
| REQ-DIC-003.2 | Llista de fórmules de tancament recomanades                  |
| REQ-DIC-003.3 | Patrons de tractament correctes vs incorrectes               |

---

## 8. Puntuacions i Llindars

### 8.1 Escala de Puntuació

| Mètrica                    | Rang  | Objectiu | Llindar Warning | Llindar Error |
| -------------------------- | ----- | -------- | --------------- | ------------- |
| Coherència Estilística     | 0-100 | ≥90      | <80             | <60           |
| Adequació del To           | 0-100 | ≥85      | <75             | <55           |
| Claredat                   | 0-100 | ≥80      | <70             | <50           |
| Formalitat                 | 0-100 | ≥85      | <75             | <55           |
| Consistència Terminològica | 0-100 | ≥90      | <80             | <60           |
| **Overall**                | 0-100 | ≥85      | <75             | <55           |

### 8.2 Càlcul de Puntuació Overall

```typescript
const calculateOverallScore = (scores: Scores): number => {
	const weights = {
		styleCoherence: 0.25,
		toneAdequacy: 0.25,
		clarity: 0.2,
		formality: 0.15,
		terminologyConsistency: 0.15,
	}

	return Object.entries(weights).reduce((total, [key, weight]) => total + scores[key] * weight, 0)
}
```

### 8.3 Impacte de les Alertes

| Tipus d'Alerta | Impacte per ocurrència           |
| -------------- | -------------------------------- |
| `error`        | -5 punts a mètrica relacionada   |
| `warning`      | -2 punts a mètrica relacionada   |
| `info`         | -0.5 punts a mètrica relacionada |

### 8.4 Condicions de Bloqueig

| Condició                          | Resultat                                    |
| --------------------------------- | ------------------------------------------- |
| Overall < 55                      | Document NO APTE (requereix revisió manual) |
| Qualsevol mètrica individual < 50 | Warning prominent + recomanació revisió     |
| ≥3 alertes `error`                | Warning prominent                           |
| ≥10 alertes totals                | Suggerir revisió estructural                |

---

## 9. Roadmap d'Implementació

### Fase 1: MVP (Setmanes 1-2)

- [ ] Implementar regles bàsiques (castellanismes, col·loquialismes) a Firebase Functions
- [ ] Calcular mètriques estilístiques bàsiques (longitud frases, veu passiva)
- [ ] Crear endpoint `validateStyleTone` amb scoring simplificat
- [ ] Actualitzar UI `ValidacioEstil.jsx` amb dades reals
- [ ] Logging a BigQuery

### Fase 2: Model de To (Setmanes 3-4)

- [ ] Preparar dataset d'entrenament per RoBERTa-ca
- [ ] Fine-tuning del model
- [ ] Desplegar endpoint `/analyze-tone` al servei Python
- [ ] Integrar classificació de to al pipeline

### Fase 3: Feedback (Setmanes 5-6)

- [ ] Implementar UI de feedback (👍/👎)
- [ ] Crear esquemes BigQuery i Firestore per feedback
- [ ] Implementar endpoint de recollida de feedback
- [ ] Dashboard bàsic de revisió (admin)

### Fase 4: Optimització (Setmana 7+)

- [ ] Analitzar feedback i ajustar regles
- [ ] Millorar model amb dades de producció
- [ ] Implementar caching i optimitzacions de rendiment
- [ ] Documentació i guia d'ús

---

## 10. Annexos

### Annex A: Exemples de Validació

**Entrada:**

```json
{
	"text": "Bueno, us comuniquem que el desarrollament del projecte va bé. Hi ha un munt de papers pendents i necessitem la vostra ajuda.",
	"documentType": "comunicacio_interna",
	"targetAudience": "intern"
}
```

**Sortida esperada:**

```json
{
	"scores": {
		"overall": 62,
		"styleCoherence": 70,
		"toneAdequacy": 55,
		"clarity": 75,
		"formality": 50,
		"terminologyConsistency": 60
	},
	"toneAnalysis": {
		"detectedTone": "informal",
		"emotionalTone": "positiu",
		"objectivity": 60,
		"confidence": 0.85
	},
	"alerts": [
		{
			"id": "alert-1",
			"type": "castellanisme",
			"severity": "error",
			"message": "Castellanisme detectat: 'Bueno'",
			"context": { "text": "Bueno", "startOffset": 0, "endOffset": 5 },
			"suggestion": "Eliminar o substituir per 'Bé'"
		},
		{
			"id": "alert-2",
			"type": "castellanisme",
			"severity": "warning",
			"message": "Castellanisme detectat: 'desarrollament'",
			"context": { "text": "desarrollament", "startOffset": 35, "endOffset": 49 },
			"suggestion": "Substituir per 'desenvolupament'"
		},
		{
			"id": "alert-3",
			"type": "colloquialisme",
			"severity": "warning",
			"message": "Expressió col·loquial: 'un munt de'",
			"context": { "text": "un munt de", "startOffset": 75, "endOffset": 85 },
			"suggestion": "Substituir per 'nombrosos' o 'una quantitat considerable de'"
		},
		{
			"id": "alert-4",
			"type": "registre_inadequat",
			"severity": "warning",
			"message": "Terme imprecís en context administratiu: 'papers'",
			"context": { "text": "papers", "startOffset": 86, "endOffset": 92 },
			"suggestion": "Substituir per 'documents' o 'documentació'"
		},
		{
			"id": "alert-5",
			"type": "registre_inadequat",
			"severity": "info",
			"message": "Terme genèric: 'ajuda'",
			"context": { "text": "ajuda", "startOffset": 115, "endOffset": 120 },
			"suggestion": "Considerar terme més específic segons context"
		}
	],
	"recommendations": [
		{
			"id": "rec-1",
			"category": "to",
			"priority": "alta",
			"title": "Formalitzar el registre",
			"description": "El text presenta un to excessivament informal per a una comunicació administrativa.",
			"examples": [
				{
					"original": "Bueno, us comuniquem que el desarrollament del projecte va bé.",
					"improved": "Us comuniquem que el desenvolupament del projecte avança satisfactòriament."
				}
			]
		}
	]
}
```

### Annex B: Configuració del Servei Python

```python
# rag_service/config.py (afegir)

TONE_MODEL_CONFIG = {
    "model_name": "projecte-aina/roberta-base-ca-v2",  # o similar
    "fine_tuned_path": "./models/tone_classifier",
    "labels": ["formal_administratiu", "semiformal", "informal", "mixt"],
    "max_length": 512,
    "batch_size": 8,
}

STYLE_CONFIG = {
    "max_sentence_length": 40,
    "target_sentence_length": (15, 25),
    "max_passive_voice_pct": 20,
    "min_lexical_diversity": 0.4,
}
```

### Annex C: Variables d'Entorn

```bash
# Firebase Functions
STYLE_TONE_SERVICE_URL=http://localhost:8000  # o URL Cloud Run
STYLE_TONE_TIMEOUT_MS=10000
BIGQUERY_DATASET=aina_mvp_metrics
BIGQUERY_STYLE_TABLE=style_tone_logs
BIGQUERY_FEEDBACK_TABLE=style_tone_feedback

# Servei Python
TONE_MODEL_PATH=./models/tone_classifier
ENABLE_TONE_MODEL=true
TONE_CACHE_TTL=3600
```

---

## 11. Referències

- [Guia d'estil de la Generalitat de Catalunya](https://llengua.gencat.cat/)
- [TERMCAT - Centre de Terminologia](https://www.termcat.cat/)
- [Criteris lingüístics del CPNL](https://www.cpnl.cat/)
- [RoBERTa-base-ca (Projecte AINA)](https://huggingface.co/projecte-aina)
- [LanguageTool API](https://languagetool.org/http-api/)
- [Softcatalà - Recursos lingüístics](https://www.softcatala.org/)
