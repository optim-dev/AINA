# 📊 Registre i Monitoratge amb BigQuery

Aquest document descriu l'arquitectura de registre i monitoratge del projecte AINA, que utilitza **Google BigQuery** com a magatzem centralitzat de dades per a l'anàlisi de rendiment, costos i millora contínua dels models d'IA.

## 🏗️ Arquitectura Centralitzada

Totes les operacions amb BigQuery es gestionen a través d'un **gestor centralitzat (`BigQueryClientManager`)** que garanteix:

- **Eficiència**: Reutilització de connexions (patró Singleton).
- **Consistència**: Configuració unificada de projecte i dataset (`aina_mvp_metrics`).
- **Compliment**: Ubicació de les dades a la regió **EU** per defecte (GDPR).
- **Robustesa**: Gestió d'errors i creació automàtica de taules i datasets.

El codi font principal es troba a `functions/src/shared/BigQueryLogger.ts`.

## 🗂️ Models de Dades (Schemas)

El sistema utilitza diferents taules especialitzades per a cada tipus de tasca o mòdul. A continuació es detallen els models de dades:

### 1. Interaccions amb LLMs (`llm_logs`)

Aquesta taula registra totes les crides als models de llenguatge (Gemini, Salamandra, etc.) des de qualsevol mòdul de l'aplicació.

**Objectiu**: Monitorar costos, latència, consum de tokens i qualitat de les respostes.

| Camp                | Tipus     | Descripció                                                      |
| ------------------- | --------- | --------------------------------------------------------------- |
| `request_id`        | STRING    | Identificador únic de la petició.                               |
| `timestamp`         | TIMESTAMP | Data i hora de la petició.                                      |
| `provider`          | STRING    | Proveïdor del model (ex: `gemini`, `salamandra`).               |
| `model_version`     | STRING    | Versió específica del model utilitzat.                          |
| `module`            | STRING    | Mòdul que ha fet la petició (`valoracio`, `elaboracio`, `kit`). |
| `prompt_tokens`     | INTEGER   | Tokens d'entrada.                                               |
| `completion_tokens` | INTEGER   | Tokens generats.                                                |
| `total_tokens`      | INTEGER   | Total de tokens consumits.                                      |
| `latency_ms`        | INTEGER   | Temps de resposta en mil·lisegons.                              |
| `cost_estimate_usd` | FLOAT     | Cost estimat de la petició en USD.                              |
| `error`             | STRING    | Missatge d'error si la petició ha fallat.                       |

### 2. Correcció Ortogràfica i Gramatical (`languagetool_logs`)

Registra les anàlisis realitzades pel servei LanguageTool dins del mòdul "Kit Lingüístic".

**Objectiu**: Identificar els errors més comuns, millorar les regles lingüístiques i analitzar l'ús del servei.

| Camp                      | Tipus         | Descripció                                                      |
| ------------------------- | ------------- | --------------------------------------------------------------- |
| `input_length`            | INTEGER       | Longitud del text analitzat.                                    |
| `language`                | STRING        | Idioma del text (ex: `ca`).                                     |
| `matches_count`           | INTEGER       | Nombre d'errors detectats.                                      |
| `matches_json`            | STRING (JSON) | Detall complet dels errors i suggeriments.                      |
| `errors_by_category_json` | STRING (JSON) | Recompte d'errors per categoria (ortografia, gramàtica, estil). |
| `latency_ms`              | INTEGER       | Temps de processament.                                          |

### 3. Procés RAG i Terminologia (`rag_process_logs`)

Emmagatzema l'execució del procés de **Retrieval-Augmented Generation (RAG)** per a la detecció i correcció de terminologia específica.

**Objectiu**: Avaluar l'eficàcia de la cerca vectorial, la precisió de les correccions terminològiques i comparar mètodes de detecció (NLP vs Hash vs LLM).

| Camp                 | Tipus             | Descripció                                         |
| -------------------- | ----------------- | -------------------------------------------------- |
| `candidates_count`   | INTEGER           | Nombre de termes candidats detectats.              |
| `corrections_count`  | INTEGER           | Nombre de correccions aplicades finalment.         |
| `vector_results`     | RECORD (Repeated) | Resultats de la cerca vectorial al glossari.       |
| `corrections`        | RECORD (Repeated) | Detall de les correccions (original vs recomanat). |
| `processing_time_ms` | INTEGER           | Temps total del procés.                            |

### 4. Anàlisi d'Estil i To (`style_tone_logs`)

Registra les validacions d'estil i to dels documents administratius.

**Objectiu**: Analitzar la qualitat dels textos, detectar biaixos o tons inadequats i millorar els models de classificació.

| Camp                | Tipus         | Descripció                                             |
| ------------------- | ------------- | ------------------------------------------------------ |
| `score_overall`     | FLOAT         | Puntuació global del document (0-100).                 |
| `detected_tone`     | STRING        | To detectat (ex: `formal`, `informal`).                |
| `passive_voice_pct` | FLOAT         | Percentatge d'ús de veu passiva.                       |
| `lexical_diversity` | FLOAT         | Riquesa lèxica del text.                               |
| `alerts_count_*`    | INTEGER       | Nombre d'alertes per severitat (error, warning, info). |
| `alerts_json`       | STRING (JSON) | Detall de les alertes d'estil generades.               |

### 5. Feedback d'Estil i To (`style_tone_feedback`)

Recull el feedback explícit dels usuaris sobre les recomanacions d'estil i to.

**Objectiu**: **RLHF (Reinforcement Learning from Human Feedback)**. Utilitzar les valoracions dels usuaris per reentrenar i ajustar els models.

| Camp                   | Tipus  | Descripció                                               |
| ---------------------- | ------ | -------------------------------------------------------- |
| `feedback_target`      | STRING | Sobre què és el feedback (alerta, recomanació, general). |
| `rating`               | STRING | Valoració (positiva/negativa).                           |
| `comment`              | STRING | Comentari explicatiu de l'usuari.                        |
| `suggested_correction` | STRING | Correcció alternativa proposada per l'usuari.            |

## 📈 Ús de les Dades

Les dades emmagatzemades a BigQuery s'utilitzen principalment per a:

1.  **Dashboard de Mètriques**: Visualització en temps real de l'ús de l'aplicació (veure `MetricsEngine.ts`).
2.  **Control de Costos**: Monitoratge del consum de l'API dels LLMs.
3.  **Millora de Models**: Anàlisi de fallades i casos límit per millorar els prompts i el context.
4.  **Auditoria**: Registre immutable de les operacions realitzades.

## 🔒 Privacitat i GDPR

- Totes les dades s'emmagatzemen a la regió **EU (Unió Europea)**.
- Els identificadors d'usuari (`user_id`) són opacs i gestionats per Firebase Auth.
- Es recomana no registrar dades personals sensibles (PII) en els camps de text lliure (`prompt`, `input_text`), tot i que el sistema està dissenyat per a entorns corporatius/administratius.
