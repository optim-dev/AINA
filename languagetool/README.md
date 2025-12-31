# LanguageTool per a Correcció Ortogràfica en Català

Configuració de LanguageTool com a servei Docker per a la correcció ortogràfica i gramatical de textos en català.

## Requisits

- Docker Desktop per macOS
- Compte de Google Cloud (per al desplegament a Cloud Run)
- gcloud CLI instal·lat (per al desplegament)

---

## 🖥️ Execució Local (macOS amb Docker Desktop)

### 1. Iniciar Docker Desktop

Assegura't que Docker Desktop està en execució:

```bash
# Verifica que Docker està funcionant
docker --version
docker compose version
```

### 2. Construir i Iniciar el Contenidor

Des de la carpeta `languagetool`:

```bash
cd languagetool

# Construir la imatge
docker compose build

# Iniciar el servei
docker compose up -d
```

### 3. Verificar que Funciona

```bash
# Comprovar l'estat del contenidor
docker compose ps

# Comprovar els logs
docker compose logs -f

# Provar l'API
curl -X POST "http://localhost:8010/v2/check" \
  -d "language=ca" \
  -d "text=Això es una prova de correccio ortografica."
```

### 4. Aturar el Servei

```bash
docker compose down
```

### URLs Locals

- **API Check**: `http://localhost:8010/v2/check`
- **Llenguatges disponibles**: `http://localhost:8010/v2/languages`

---

## ☁️ Desplegament a Google Cloud Run

### Opció recomanada: script de desplegament (retorna `LANGUAGETOOL_URL`)

S'ha inclòs un script per automatitzar el desplegament a Cloud Run (crea/valida Artifact Registry, fa build+push i desplega el servei) i **imprimeix la URL** que has de configurar com a `LANGUAGETOOL_URL`.

També fa un **smoke test** del servei desplegat i mostra l'enllaç directe al recurs de **Cloud Run** a Google Cloud Console.

Des de la carpeta arrel del repositori:

```bash
./languagetool/deploy.sh EL_TEU_PROJECT_ID
```

Al final del procés veuràs una línia com:

```bash
Service URL: https://...
```

La variable que has d'usar és:

```bash
LANGUAGETOOL_URL=https://...
```

### 1. Configuració Inicial de Google Cloud

```bash
# Autenticar-se a Google Cloud
gcloud auth login

# Establir el projecte
gcloud config set project EL_TEU_PROJECT_ID

# Habilitar les APIs necessàries
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 2. Crear un Repositori a Artifact Registry

```bash
# Crear repositori Docker
gcloud artifacts repositories create languagetool-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --description="LanguageTool Docker images"

# Configurar autenticació Docker
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### 3. Construir i Pujar la Imatge

```bash
cd languagetool

# Construir la imatge per a Cloud Run (arquitectura amd64)
docker build --platform linux/amd64 -t europe-west1-docker.pkg.dev/EL_TEU_PROJECT_ID/languagetool-repo/languagetool-catalan:latest .

# Pujar la imatge a Artifact Registry
docker push europe-west1-docker.pkg.dev/EL_TEU_PROJECT_ID/languagetool-repo/languagetool-catalan:latest
```

### 4. Desplegar a Cloud Run

```bash
gcloud run deploy languagetool-catalan \
  --image europe-west1-docker.pkg.dev/EL_TEU_PROJECT_ID/languagetool-repo/languagetool-catalan:latest \
  --platform managed \
  --region europe-west1 \
  --memory 2Gi \
  --cpu 2 \
  --port 8010 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 300
```

### 5. Obtenir la URL del Servei

```bash
gcloud run services describe languagetool-catalan \
  --platform managed \
  --region europe-west1 \
  --format 'value(status.url)'
```

### 6. Provar el Servei Desplegat

```bash
# Substitueix URL_DEL_SERVEI per la URL obtinguda
curl -X POST "URL_DEL_SERVEI/v2/check" \
  -d "language=ca" \
  -d "text=Això es una prova de correccio ortografica."
```

---

## 🔧 Configuració de l'Aplicació

### Variables d'Entorn Backend (Firebase Functions)

**Desenvolupament Local** (`functions/.env.dev`):

```bash
# LanguageTool Container (local Docker)
# Usem host.docker.internal per connectar des del contenidor Firebase Functions
LANGUAGETOOL_URL=http://host.docker.internal:8010
```

**Producció** (`functions/.env.prod`):

```bash
# LanguageTool Container (Cloud Run)
LANGUAGETOOL_URL=https://languagetool-catalan-xxxxx-ew.a.run.app
```

### Arquitectura

L'aplicació ara utilitza una arquitectura backend-frontend segura:

1. **Frontend** → Crida a la funció Firebase `checkLanguageTool`
2. **Firebase Function** → Fa la petició al contenidor LanguageTool
3. **LanguageTool** → Processa el text i retorna els resultats

**Avantatges:**

- ✅ El frontend no coneix la ubicació del contenidor LanguageTool
- ✅ Millor seguretat i control d'accés
- ✅ Més fàcil gestionar en diferents entorns (dev/prod)
- ✅ Logging i monitorització centralitzats al backend

---

## 📋 API de LanguageTool

### Firebase Callable Function: `checkLanguageTool`

**Endpoint:** Funció Firebase callable

**Ús des del Frontend:**

```javascript
import { functions } from "@/services/firebase"
import { httpsCallable } from "firebase/functions"

const checkLanguageTool = httpsCallable(functions, "checkLanguageTool")
const result = await checkLanguageTool({
	text: "Això es una prova de correccio ortografica.",
	language: "ca",
	level: "default", // o "picky"
})

console.log(result.data) // Resposta de LanguageTool
```

**Paràmetres d'Entrada:**

| Paràmetre  | Tipus  | Descripció                        | Requerit                    |
| ---------- | ------ | --------------------------------- | --------------------------- |
| `text`     | string | Text a analitzar                  | ✅                          |
| `language` | string | Codi d'idioma (`ca` per català)   | ❌ (per defecte: `ca`)      |
| `level`    | string | `default` o `picky` (més exigent) | ❌ (per defecte: `default`) |

**Exemple de Resposta:**

```json
{
	"software": { "name": "LanguageTool", "version": "6.x" },
	"language": { "code": "ca", "name": "Catalan" },
	"matches": [
		{
			"message": "Error detectat",
			"offset": 5,
			"length": 2,
			"replacements": [{ "value": "és" }],
			"rule": {
				"id": "RULE_ID",
				"category": { "name": "Gramàtica" }
			}
		}
	]
}
```

---

## 🔒 Consideracions de Seguretat per a Producció

### Autenticació a Cloud Run

Per restringir l'accés:

```bash
# Desplegar amb autenticació requerida
gcloud run deploy languagetool-catalan \
  --image europe-west1-docker.pkg.dev/EL_TEU_PROJECT_ID/languagetool-repo/languagetool-catalan:latest \
  --platform managed \
  --region europe-west1 \
  --no-allow-unauthenticated
```

### Configurar IAM

```bash
# Afegir permisos a un compte de servei
gcloud run services add-iam-policy-binding languagetool-catalan \
  --member="serviceAccount:compte-servei@projecte.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

## 📊 Monitorització

### Veure Logs a Cloud Run

```bash
gcloud logs read --service=languagetool-catalan --limit=50
```

### Mètriques

Accedeix a la consola de Google Cloud:

- **Cloud Run** → **languagetool-catalan** → **Metrics**

---

## 🛠️ Resolució de Problemes

### El contenidor triga a iniciar

LanguageTool requereix temps per carregar els models. Espera fins a 60 segons.

### Error de memòria

Augmenta la memòria al docker-compose.yml o a Cloud Run:

```bash
gcloud run services update languagetool-catalan --memory 4Gi
```

### CORS en desenvolupament

Si tens problemes de CORS des del navegador, afegeix un proxy al Vite config o utilitza l'extensió CORS del navegador per a desenvolupament.
