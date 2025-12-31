import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import os
import numpy as np

# Configuració
DATA_FILE = "data/termes.csv"
INDEX_FILE = "data/glossari_index.faiss"
METADATA_FILE = "data/glossari_metadata.pkl"
# MODEL_NAME = "projecte-aina/roberta-base-ca-v2" 
# Changed to a multilingual model optimized for sentence similarity that supports Catalan
# MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2" 
# Nota: Si el model de Aina no està disponible públicament a HuggingFace sense token o configuració, 
# es pot usar un multilingüe com 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
# Per aquest exemple assumim que el model és accessible o es canviarà.
MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"

def build_index():
    print(f"Carregant dades de {DATA_FILE}...")
    if not os.path.exists(DATA_FILE):
        print(f"ERROR: No s'ha trobat el fitxer {DATA_FILE}")
        return

    # Llegir CSV amb punt i coma com a separador
    try:
        df = pd.read_csv(DATA_FILE, sep=';', on_bad_lines='skip')
    except Exception as e:
        print(f"Error llegint el CSV: {e}")
        return

    # Preparar dades per al glossari
    glossari = []
    texts_to_embed = []

    print("Processant entrades...")
    for _, row in df.iterrows():
        # Extreure camps (gestió d'errors bàsica per valors nuls)
        terme_recomanat = str(row.get('Terme recomanat', '')).strip()
        terme_incorrecte = str(row.get('Terme no normatiu o inadequat', '')).strip()
        context = str(row.get("context d'ús", '')).strip()
        id_terme = str(row.get('ID', '')).strip()
        
        if not terme_recomanat:
            continue

        # Crear objecte de metadades amb totes les columnes del CSV
        entrada = {
            "id": id_terme,
            "terme_recomanat": terme_recomanat,
            "variants_no_normatives": [v.strip() for v in terme_incorrecte.split(',')] if terme_incorrecte else [],
            "context_d_us": context,
            "categoria": str(row.get('Categoria', '')).strip(),
            "ambit": str(row.get('Àmbit', '')).strip(),
            "comentari": str(row.get('Comentari/notes lingüístiques', '')).strip(),
            "font": str(row.get('Font', '')).strip(),
            "exemple_1": str(row.get('Exemple 1', '')).strip(),
            "exemple_2": str(row.get('Exemple 2', '')).strip(),
            "exemple_3": str(row.get('Exemple 3', '')).strip(),
            "exemple_incorrecte_1": str(row.get('Exemple incorrecte 1', '')).strip(),
            "exemple_incorrecte_2": str(row.get('Exemple incorrecte 2', '')).strip(),
        }
        glossari.append(entrada)

        # Construir text per vectoritzar
        # Estratègia: Terme recomanat + Context + Variants
        text_combinat = f"{terme_recomanat}"
        if context and context != 'nan':
            text_combinat += f" {context}"
        if terme_incorrecte and terme_incorrecte != 'nan':
            text_combinat += f" {terme_incorrecte}"
        
        texts_to_embed.append(text_combinat)

    print(f"Carregant model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Generant embeddings per a {len(texts_to_embed)} entrades...")
    embeddings = model.encode(texts_to_embed, batch_size=32, show_progress_bar=True)

    # Normalitzar vectors per a distància cosinus (opcional però recomanat per a FAISS inner product)
    faiss.normalize_L2(embeddings)

    print("Creant índex FAISS...")
    dimension = embeddings.shape[1]
    # IndexFlatIP fa servir Inner Product (equivalent a Cosinus si els vectors estan normalitzats)
    index = faiss.IndexFlatIP(dimension) 
    index.add(embeddings)

    print(f"Guardant índex a {INDEX_FILE}...")
    faiss.write_index(index, INDEX_FILE)

    print(f"Guardant metadades a {METADATA_FILE}...")
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(glossari, f)

    print("Procés completat correctament.")

if __name__ == "__main__":
    build_index()
