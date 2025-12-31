# Incidències i Solucions

Document per recollir incidències trobades durant el desenvolupament i les seves solucions.

---

## Índex

1. [JSON Malformat de Models Locals (Salamandra)](#1-json-malformat-de-models-locals-salamandra)
2. [Vertex AI Quota Exceeded (L4 GPUs)](#2-vertex-ai-quota-exceeded-l4-gpus)

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
