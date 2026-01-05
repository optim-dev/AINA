# Incidències i Solucions

Document per recollir incidències trobades durant el desenvolupament i les seves solucions.

---

## Índex

1. [JSON Malformat de Models Locals (Salamandra)](#1-json-malformat-de-models-locals-salamandra)
2. [Vertex AI Quota Exceeded (L4 GPUs)](#2-vertex-ai-quota-exceeded-l4-gpus)
3. [Salamandra 7B Repeteix Text d'Entrada (Echo Problem)](#3-salamandra-7b-repeteix-text-dentrada-echo-problem)

---

## 1. JSON Malformat de Models Locals (Salamandra)

**Data:** xx/12/2024  
**Mòdul afectat:** `LLMService.ts` - funció `extractJSON`  
**Model:** Salamandra 7B Local (Ollama)

### Descripció del problema

Quan s'utilitza Salamandra en mode local via Ollama, el model de vegades retorna JSON amb errors de format:

```json
{"issues": [], "toneAnalysis": {}}}
```

Nota la `}` extra al final, que causa un error de parsing:

```
SyntaxError: Unexpected non-whitespace character after JSON at position 34
```

### Causa

Els models locals (especialment els més petits com Salamandra 7B) són menys precisos seguint instruccions de format estricte. Errors comuns:

- Claus o claudàtors extra al final (`}}}`, `]]]`)
- Comes finals abans de tancar (`{"a": 1,}`)
- Text addicional després del JSON vàlid
- Artefactes ChatML no netejats

### Solució implementada

S'ha millorat la funció `extractJSON` amb una nova funció auxiliar `cleanMalformedJSON`:

```typescript
function cleanMalformedJSON(jsonStr: string): string {
	// 1. Comptatge de claus/claudàtors per detectar desbalancejos
	// 2. Truncament quan hi ha més tancaments que obertures
	// 3. Eliminació de comes finals invàlides
	// 4. Truncament progressiu des del final per trobar JSON vàlid
}
```

**Fitxer:** `functions/src/shared/LLMService.ts`

### Comportament anterior vs nou

| Escenari              | Abans            | Ara                   |
| --------------------- | ---------------- | --------------------- |
| `{"a": 1}}`           | ❌ Error parsing | ✅ Retorna `{"a": 1}` |
| `{"a": 1,}`           | ❌ Error parsing | ✅ Retorna `{"a": 1}` |
| `{"a": 1} extra text` | ❌ Error parsing | ✅ Retorna `{"a": 1}` |

### Logs relacionats

```
{"model":"cas/salamandra-7b-instruct","message":"Salamandra Local (Ollama) response"}
{"message":"Fixed malformed JSON - removed extra braces/brackets"}
```

---

## 2. Vertex AI Quota Exceeded (L4 GPUs)

**Data:** xx de desembre de 2025  
**Servei Afectat:** Google Cloud Vertex AI (Online Prediction)  
**Regió:** europe-west4 (Netherlands)  
**Recurs:** GPUs NVIDIA L4  
**Model:** Alia-40B

### 1. Descripció de l'Error

Durant el desplegament automàtic de l'endpoint per al model Alia-40B, el procés s'ha interromput retornant un error de Quota Exceeded (429).

Missatge d'error del sistema:

```
❌ S'ha produït un error: 429 The following quotas are exceeded:
CustomModelServingL4GPUsPerProjectPerRegion 8
```

### 2. Diagnòstic Tècnic

L'error es produeix per una discrepància entre els recursos de maquinari sol·licitats per la instància de desplegament i els límits actuals (quota) del projecte a la regió específica.

**Màquina Sol·licitada:** `g2-standard-96`

Aquesta màquina requereix 8 GPUs NVIDIA L4 dedicades.

**Quota Afectada:** `aiplatform.googleapis.com/custom_model_serving_nvidia_l4_gpus`

**Situació Actual:** El límit actual del projecte a europe-west4 és inferior a 4 (habitualment 0 o 1 per defecte), impedint la creació de la instància.

> **Nota:** És important distingir entre la quota de Serving (desplegament) i la de Training (entrenament). Aquest error afecta exclusivament a la quota de Serving.

### 3. Procediment de Solució

Per resoldre el bloqueig, cal sol·licitar un augment de quota a través de la consola de Google Cloud.

#### Pas 1: Localitzar la Quota

1. Accedir a Google Cloud Console.
2. Navegar a **IAM & Admin > Quotas**.
3. Al filtre de cerca (Filter), introduir els següents paràmetres exactes:
   - **Service:** Vertex AI API
   - **Dimension:** `region: europe-west4`
   - **Metric:** `aiplatform.googleapis.com/custom_model_serving_nvidia_l4_gpus`

#### Pas 2: Sol·licitar l'Augment

1. Seleccionar la línia resultant que coincideix amb la mètrica.
2. Fer clic al botó **EDIT QUOTA** (part superior dreta).
3. Introduir el nou límit:
   - **Valor Recomanat:** 8 (Això permet desplegar la màquina actual de 4 GPUs i deixa marge per a estratègies de Blue-Green Deployment o un segon model sense nous bloquejos).
   - **Valor Mínim Absolut:** 4.

#### Pas 3: Justificació (Request Description)

Copiar i enganxar el següent text en el camp de descripció per agilitzar l'aprovació per part de Google:

> "We are deploying a Large Language Model (Alia-40B) using Vertex AI Online Prediction in the europe-west4 region. This deployment requires 'g2-standard-96' machine types, which utilize 8 NVIDIA L4 GPUs per instance. The current quota limit is insufficient to start the endpoint. We request an increase to allow for successful deployment and future scaling."

### 4. Validació

Un cop rebuda la confirmació per correu electrònic de l'augment de quota (el temps de resolució sol variar entre minuts i poques hores):

1. Reiniciar l'script de desplegament.
2. Verificar que l'Endpoint a Vertex AI passa a estat **Active**.
3. Confirmar que no hi ha endpoints "zombies" antics consumint recursos innecessaris.

---

## Plantilla per noves incidències

```markdown
## N. Títol de la incidència

**Data:** DD/MM/AAAA  
**Mòdul afectat:** `fitxer.ts`  
**Gravetat:** Alta / Mitjana / Baixa

### Descripció del problema

[Descripció detallada del problema]

### Causa

[Anàlisi de la causa arrel]

### Solució implementada

[Descripció de la solució]

### Logs relacionats

[Exemples de logs o errors]
```

---

## Historial de canvis

| Data       | Incidència        | Acció                               |
| ---------- | ----------------- | ----------------------------------- |
| xx/12/2024 | #1 JSON Malformat | Afegida funció `cleanMalformedJSON` |
| xx/12/2025 | #2 Quota Exceeded | Sol·licitud augment quota L4 GPUs   |
| xx/12/2026 | #3 Echo Problem   | Afegides instruccions anti-eco      |

---

## 3. Salamandra 7B Repeteix Text d'Entrada (Echo Problem)

**Data:** xx/12/2026  
**Mòdul afectat:** `LLMService.ts` - funcions `callSalamandra` i `callSalamandraLocal`  
**Model:** Salamandra 7B (Vertex AI i Ollama Local)  
**Gravetat:** Mitjana (afecta tasques de generació, no extracció)

### Descripció del problema

Quan s'utilitza Salamandra 7B per a tasques de generació de contingut (mòdul `elaboracio`), el model tendeix a copiar literalment el text d'entrada en lloc de generar contingut nou i original.

**Exemple de prompt:**

```
Genera una descripció detallada de les actuacions per a un informe tècnic de subvenció.

Dades del projecte:
Títol: WSE CONTINENTAL CUP
Descripció original: El 30 de setembre i 1 d'octubre s'ha dut a terme al Pavelló...
```

**Resposta incorrecta del model (còpia literal):**

```
WSE CONTINENTAL CUP - Les Masies de Voltregà

Descripció original: El 30 de setembre i 1 d'octubre s'ha dut a terme al Pavelló...
[Text idèntic a l'entrada]
```

**Resposta esperada:**

```
L'actuació consisteix en l'organització de la WSE Continental Cup, una competició
europea d'hoquei patins de gran relleu esportiu que es va celebrar els dies 30 de
setembre i 1 d'octubre de 2023 al Pavelló de Sant Hipòlit de Voltregà...
[Text elaborat i transformat]
```

### Causa

Els models de llenguatge petits (7B paràmetres) tenen limitacions inherents per a tasques complexes de transformació de text:

1. **Camí de mínima resistència:** El model troba text vàlid al prompt i el repeteix perquè és "correcte" gramaticalment
2. **Capacitat limitada de raonament:** 7B paràmetres no són suficients per entendre que "generar" implica crear contingut nou
3. **Format ChatML correcte però insuficient:** Tot i usar el format correcte `<|im_start|>`, el model no segueix instruccions complexes
4. **Absència d'instruccions explícites anti-còpia:** El prompt no prohibia explícitament copiar el text d'entrada

### Matriu d'adequació de models per tasca

| Tipus de Tasca              | Salamandra 7B | ALIA 40B      | Gemini Flash  |
| --------------------------- | ------------- | ------------- | ------------- |
| Extracció JSON              | ✅ Excel·lent | ✅ Excel·lent | ✅ Excel·lent |
| Classificació               | ✅ Bona       | ✅ Excel·lent | ✅ Excel·lent |
| Q&A Simple                  | ✅ Acceptable | ✅ Bona       | ✅ Excel·lent |
| **Elaboració de contingut** | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |
| **Generació creativa**      | ❌ Pobra      | ✅ Bona       | ✅ Excel·lent |
| **Transformació de text**   | ❌ Pobra      | ✅ Acceptable | ✅ Excel·lent |

### Solució implementada

S'han afegit instruccions anti-eco explícites en català al system prompt per a les funcions `callSalamandra` i `callSalamandraLocal`:

```typescript
const antiEchoInstructions = `

INSTRUCCIONS IMPORTANTS:
- NO copiïs ni repeteixis el text d'entrada.
- GENERA contingut NOU i ORIGINAL basat en les dades proporcionades.
- EXPANDEIX i ELABORA la informació, no la repeteixis textualment.
- La teva resposta ha de ser DIFERENT del text que t'he proporcionat.`
```

**Canvis específics:**

1. **Per a peticions amb system prompt:** S'afegeixen les instruccions anti-eco al final del system prompt
2. **Per a peticions sense system prompt:** S'injecta un system prompt mínim amb instruccions anti-còpia
3. **Per a peticions JSON:** No s'afegeixen (el model segueix bé instruccions de format JSON)

**Fitxer:** `functions/src/shared/LLMService.ts`

### Codi modificat

```typescript
// callSalamandraLocal (línies ~1298-1350)
private async callSalamandraLocal(request: LLMRequest, options: LLMRequestOptions) {
    // Enhance system prompt for Salamandra to prevent echoing/copying input
    let effectiveSystemPrompt = request.systemPrompt || ""
    const antiEchoInstructions = `

INSTRUCCIONS IMPORTANTS:
- NO copiïs ni repeteixis el text d'entrada.
- GENERA contingut NOU i ORIGINAL basat en les dades proporcionades.
- EXPANDEIX i ELABORA la informació, no la repeteixis textualment.
- La teva resposta ha de ser DIFERENT del text que t'he proporcionat.`

    // Format prompt in ChatML format
    let formattedPrompt: string

    if (request.jsonResponse) {
        // JSON mode - no anti-echo needed
        // ...existing code...
    } else if (effectiveSystemPrompt) {
        // Add anti-echo instructions for non-JSON generative tasks
        const enhancedSystem = `${effectiveSystemPrompt}${antiEchoInstructions}`
        formattedPrompt = `<|im_start|>system\n${enhancedSystem}<|im_end|>\n...`
    } else {
        // Even without system prompt, add basic anti-echo instruction
        formattedPrompt = `<|im_start|>system\nEts un assistent útil que genera contingut original. NO copiïs el text d'entrada, genera una resposta nova.<|im_end|>\n...`
    }
}
```

### Limitacions de la solució

⚠️ **Aquesta solució és un pal·liatiu, no una cura definitiva.**

Les instruccions anti-eco milloren el comportament però no garanteixen que Salamandra 7B generi contingut de qualitat. Per a tasques d'elaboració es recomana:

1. **Opció preferent:** Utilitzar **Gemini 2.5 Flash** per al mòdul `elaboracio`
2. **Alternativa:** Utilitzar **ALIA-40B** (si està desplegat) per a contingut en català
3. **Última opció:** Mantenir Salamandra 7B amb les instruccions anti-eco

### Recomanacions per al frontend

Considerar afegir un avís a la interfície quan l'usuari seleccioni Salamandra per a tasques d'elaboració:

```jsx
{
	selectedModel?.includes("salamandra") && module === "elaboracio" && (
		<Alert variant='warning'>⚠️ Salamandra 7B pot tenir dificultats amb tasques d'elaboració de contingut. Per a millors resultats, considera utilitzar Gemini o ALIA-40B.</Alert>
	)
}
```

### Logs relacionats

**Abans de la solució (còpia literal):**

```json
{"model":"cas/salamandra-7b-instruct","promptTokens":409,"completionTokens":185}
SALAMANDRA LOCAL RESPONSE TEXT: Títol: WSE CONTINENTAL CUP a Les Masies de Voltregà
Descripció original: El 30 de setembre i 1 d'octubre s'ha dut a terme...
```

**Després de la solució (amb instruccions anti-eco):**

```json
{"model":"cas/salamandra-7b-instruct","promptTokens":580,"completionTokens":348}
SALAMANDRA LOCAL RESPONSE TEXT: L'atorgament de subvenció extraordinària per a la
WSE Continental Cup es justifica en els següents termes...
```

> **Nota:** L'augment de `promptTokens` (de 409 a 580) reflecteix les instruccions anti-eco afegides al system prompt.

### Resultats comparatius amb ALIA-40B

Després d'aplicar la solució amb instruccions anti-eco, es va provar el mateix prompt amb ALIA-40B per comparar el comportament:

**Model:** ALIA-40B (Vertex AI, context 16k)  
**Latència:** 26.038 ms  
**Tokens:** 517 input → 875 output

**Resposta generada (fragment):**

```
Denominació: WSE CONTINENTAL CUP - Les Masies de Voltregà

Descripció: El 30 de setembre i 1 d'octubre de 2023 es va celebrar al Pavelló de
Sant Hipòlit de Voltregà la WSE Continental Cup, un esdeveniment d'hoquei patins
d'abast europeu. Hi van participar els equips CP Voltregà (Catalunya), FC Porto
Fidelidade (Portugal), AD Valongo Colquimica (Portugal) i HC Braga (Portugal)...

Repercussió econòmica, turística i social:
L'esdeveniment va generar una repercussió econòmica important per al municipi...

Persones assistents:
Es van registrar un total de 1.200 persones assistents a l'esdeveniment.
```

### Anàlisi: Al·lucinacions detectades

⚠️ **ALIA-40B genera contingut de qualitat però amb al·lucinacions (dades inventades):**

| Dada generada                                                 | Origen                                 | Risc  |
| ------------------------------------------------------------- | -------------------------------------- | ----- |
| "1.200 persones assistents"                                   | ❌ **Inventat** - No apareix al prompt | Alt   |
| "(Catalunya)", "(Portugal)" per cada equip                    | ⚠️ Inferit correctament                | Baix  |
| "Es va promocionar l'esdeveniment a través de xarxes socials" | ❌ **Inventat**                        | Mitjà |
| "Es va contactar amb hotels i allotjaments"                   | ❌ **Inventat**                        | Mitjà |
| "Celebrat per primera vegada l'any 2023"                      | ⚠️ Possible però no confirmat          | Mitjà |

### Comparativa final de models

| Aspecte                      | Salamandra 7B           | ALIA-40B                           |
| ---------------------------- | ----------------------- | ---------------------------------- |
| **Comportament**             | ❌ Copia text d'entrada | ✅ Genera contingut nou            |
| **Estructura**               | ❌ Idèntica a l'entrada | ✅ Ben organitzada amb seccions    |
| **Detalls afegits**          | ❌ Cap                  | ✅ Molts (amb risc d'al·lucinació) |
| **Tokens output**            | 186                     | 875                                |
| **Qualitat text**            | Pobra                   | Excel·lent                         |
| **Fiabilitat dades**         | Alta (no inventa)       | ⚠️ Mitjana (pot inventar)          |
| **Recomanat per elaboració** | ❌ No                   | ✅ Sí (amb revisió humana)         |

### Recomanacions finals

1. **Per a tasques d'elaboració:** Utilitzar **ALIA-40B** o **Gemini 2.5 Flash**
2. **Per a tasques d'extracció:** Utilitzar **Salamandra 7B** (no inventa dades)
3. **Sempre:** Revisar manualment les dades numèriques i específiques generades per ALIA/Gemini
4. **Frontend:** Afegir avís que les dades generades requereixen verificació

> **Conclusió:** ALIA-40B resol el problema de l'eco però introdueix el risc d'al·lucinacions.
> Per a documents oficials de subvencions, cal revisió humana obligatòria de les dades generades.

### Test de validació

Per verificar que la solució funciona:

1. Reconstruir les funcions: `cd functions && npm run build`
2. Reiniciar l'emulador de Firebase
3. Provar una petició d'elaboració amb Salamandra
4. Verificar que la resposta no és una còpia literal del text d'entrada

### Referències

- [ChatML Format Specification](https://github.com/openai/openai-python/blob/main/chatml.md)
- [Salamandra Model Card (BSC)](https://huggingface.co/BSC-LT/salamandra-7b-instruct)
- Fitxer modificat: `functions/src/shared/LLMService.ts`
