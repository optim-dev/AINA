# Servei RAG per a Aina

Aquest servei implementa la **Fase 2 (Recuperació Vectorial)** del sistema de correcció lingüística amb **detecció NLP avançada**.

## Funcionalitats

### Detecció de Candidats

El servei ofereix múltiples mètodes de detecció:

1. **NLP Lemmatization (Primari)**: Utilitza spaCy amb el model transformer català (`ca_core_news_trf`) per detectar variants morfològiques (ex: "conformen" → "conformar"). Això permet detectar conjugacions verbals i altres formes flexionades que no coincideixen exactament amb el glossari.

2. **Hash Table (Fallback)**: Cerca exacta i per stems per a detecció ràpida.

3. **LLM (Fallback final)**: Utilitza un model de llenguatge per detectar termes problemàtics quan els altres mètodes fallen.

### Cerca Vectorial

- **Model d'embeddings**: `projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base`
- **Índex FAISS**: Cerca ràpida per similitud cosinus
- **Persistència**: Suport per Google Cloud Storage

## Estructura

- `build_index.py`: Script per generar l'índex FAISS a partir del CSV.
- `build_dynamic_index.py`: Funció per reconstruir l'índex des de Firebase.
- `main.py`: API FastAPI que serveix les peticions de cerca i detecció NLP.
- `test_nlp_detection.py`: Test per verificar el funcionament de spaCy.
- `data/`: Directori per al CSV d'entrada i els índexs generats.

## Requisits previs

1. Copiar el fitxer `termes.csv` a la carpeta `data/`.
   ```bash
   cp ../RAG/termes.csv ./data/
   ```

## Execució Local

1. Instal·lar dependències:

   ```bash
   pip install -r requirements.txt
   ```

2. Descarregar el model spaCy per a català:

   ```bash
   # Model transformer (recomanat per màxima precisió)
   python -m spacy download ca_core_news_trf

   # O model petit (si tens problemes d'espai/memòria)
   python -m spacy download ca_core_news_sm
   ```

3. Testejar la detecció NLP:

   ```bash
   python test_nlp_detection.py
   ```

4. Generar l'índex:

   ```bash
   python build_index.py
   ```

5. Executar el servidor:
   ```bash
   python -m uvicorn main:app --reload
   ```

## Desplegament amb Docker (Google Cloud Run)

1. Construir la imatge (assegura't que `data/termes.csv` existeix):

   ```bash
   docker build -t aina-rag-service .
   ```

2. Executar contenidor localment:

   ```bash
   docker run -p 8080:8080 aina-rag-service
   ```

3. Desplegar a Google Cloud Run (Bàsic):
   ```bash
   gcloud run deploy aina-rag-service --source .
   ```

## Desplegament amb Persistència (Recomanat)

Per assegurar que l'índex FAISS i el glossari es mantenen entre reinicis (especialment després de fer servir `/vectorize`), cal utilitzar un volum de Google Cloud Storage.

1. **Crear un bucket** per emmagatzemar les dades:

   ```bash
   # Substitueix 'aina-rag-data-prod' per un nom únic
   gcloud storage buckets create gs://aina-rag-data-prod --location=europe-west4
   ```

2. **Desplegar el servei muntant el bucket**:
   Això muntarà el bucket a la ruta `/app/data`, permetent que l'aplicació llegeixi i escrigui l'índex de forma persistent.

   ```bash
   gcloud run deploy aina-rag-service \
     --source . \
     --region europe-west4 \
     --execution-environment gen2 \
     --add-volume name=rag-data,type=cloud-storage,bucket=aina-rag-data-prod \
     --add-volume-mount volume=rag-data,mount-path=/app/data
   ```

   > **Nota**: En muntar el volum, el contingut original de `/app/data` a la imatge Docker quedarà ocult. El servei arrencarà sense índex fins que es generi via `/vectorize` o es pugin els fitxers manualment al bucket.

## API Endpoints

### POST `/detect-candidates`

Detecta candidats utilitzant NLP lemmatization amb spaCy.

**Request:**

```json
{
	"text": "Les entitats que conformen el sector públic.",
	"context_window": 3
}
```

**Response:**

```json
{
	"success": true,
	"candidates": [
		{
			"term": "conformen",
			"lemma": "conformar",
			"position": 3,
			"context": "entitats que conformen el sector",
			"pos_tag": "VERB",
			"glossary_id": "V006",
			"terme_recomanat": "formar",
			"categoria": "verb",
			"source": "nlp"
		}
	],
	"nlp_model_used": "ca_core_news_trf"
}
```

### POST `/search`

Cerca semàntica amb vectors FAISS.

**Request:**

```json
{
	"candidates": ["conformar el sector públic"],
	"k": 5,
	"threshold": 0.8
}
```

### POST `/vectorize`

Reconstrueix l'índex FAISS amb dades del glossari de Firebase.

**Request:**

```json
{
  "glossary": [
    {
      "id": "V006",
      "terme_recomanat": "formar",
      "variants_no_normatives": ["conformar"],
      "context_d_us": "Text administratiu",
      "categoria": "verb",
      ...
    }
  ]
}
```

### GET `/health`

Verifica l'estat del servei.

**Response:**

```json
{
	"status": "ok",
	"model_loaded": true,
	"index_loaded": true,
	"glossary_entries": 150,
	"ready_for_search": true,
	"nlp_model_loaded": true,
	"nlp_model_name": "ca_core_news_trf",
	"variants_count": 450,
	"ready_for_nlp_detection": true
}
```
