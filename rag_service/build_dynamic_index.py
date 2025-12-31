"""
Build FAISS index from glossary data.
This module is called by the FastAPI service to rebuild the vector index
when the glossary is updated through the admin interface.
The glossary data is passed from the Firebase Function.
"""
import os
from sentence_transformers import SentenceTransformer
import faiss
import pickle
from typing import List, Dict, Any
from datetime import datetime

# Configuration
INDEX_FILE = "data/glossari_index.faiss"
METADATA_FILE = "data/glossari_metadata.pkl"
MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"


def prepare_glossary_for_vectorization(glossary_data: List[Dict[str, Any]]):
    """
    Prepare glossary data for vectorization.
    Converts the input format to the internal metadata format and builds texts for embedding.
    """
    glossari = []
    texts_to_embed = []
    
    for entry in glossary_data:
        terme_recomanat = str(entry.get('terme_recomanat', '')).strip()
        
        if not terme_recomanat:
            continue
        
        # Handle variants - can be array or string
        variants = entry.get('variants_no_normatives', [])
        if isinstance(variants, str):
            variants = [v.strip() for v in variants.split(',') if v.strip()]
        
        context = str(entry.get('context_d_us', '')).strip()
        
        # Build metadata object
        metadata = {
            "id": entry.get('id', ''),
            "terme_recomanat": terme_recomanat,
            "variants_no_normatives": variants,
            "context_d_us": context,
            "categoria": str(entry.get('categoria', '')).strip(),
            "ambit": str(entry.get('ambit', '')).strip(),
            "comentari": str(entry.get('notes_linguistiques', '')).strip(),
            "font": str(entry.get('font', '')).strip(),
            "exemple_1": "",
            "exemple_2": "",
            "exemple_3": "",
            "exemple_incorrecte_1": "",
            "exemple_incorrecte_2": "",
        }
        
        # Handle examples - stored as arrays
        exemples_correctes = entry.get('exemples_correctes', [])
        if isinstance(exemples_correctes, list):
            for i, ex in enumerate(exemples_correctes[:3]):
                metadata[f"exemple_{i+1}"] = str(ex).strip()
        
        exemples_incorrectes = entry.get('exemples_incorrectes', [])
        if isinstance(exemples_incorrectes, list):
            for i, ex in enumerate(exemples_incorrectes[:2]):
                metadata[f"exemple_incorrecte_{i+1}"] = str(ex).strip()
        
        glossari.append(metadata)
        
        # Build text for vectorization
        # Strategy: Recommended term + Variants + Incorrect Examples + Context
        # We include variants and incorrect examples so the vector representation 
        # matches the "problem" (user text) we are searching for.
        text_parts = [terme_recomanat]
        
        # Add variants (crucial for matching incorrect terms)
        if variants:
            text_parts.extend(variants)
            
        # Add incorrect examples (crucial for matching context)
        if isinstance(exemples_incorrectes, list):
            text_parts.extend([str(ex).strip() for ex in exemples_incorrectes if ex])

        # Add context
        if context and context != 'nan':
            text_parts.append(context)
            
        text_combinat = " ".join(text_parts)
        
        texts_to_embed.append(text_combinat)
    
    return glossari, texts_to_embed


def build_index_from_data(glossary_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build FAISS index from provided glossary data.
    Returns a dict with status info. On failure, returns dict with success=False and error message.
    """
    start_time = datetime.now()
    
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    
    try:
        # Prepare data for vectorization
        print(f"Preparing {len(glossary_data)} glossary entries for vectorization...")
        glossari, texts_to_embed = prepare_glossary_for_vectorization(glossary_data)
        
        if len(glossari) == 0:
            return {
                "success": False,
                "error": "No valid glossary entries to vectorize"
            }
            
        print(f"Loading model {MODEL_NAME}...")
        model = SentenceTransformer(MODEL_NAME)
        
        print(f"Generating embeddings for {len(texts_to_embed)} entries...")
        embeddings = model.encode(texts_to_embed, batch_size=32, show_progress_bar=True)
        
        # Normalize vectors for cosine similarity
        faiss.normalize_L2(embeddings)
        
        print("Creating FAISS index...")
        dimension = embeddings.shape[1]
        # IndexFlatIP uses Inner Product (equivalent to Cosine if vectors are normalized)
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
        
        print(f"Saving index to {INDEX_FILE}...")
        faiss.write_index(index, INDEX_FILE)
        
        print(f"Saving metadata to {METADATA_FILE}...")
        with open(METADATA_FILE, "wb") as f:
            pickle.dump(glossari, f)
        
        # Calculate processing time and index size
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        index_size = os.path.getsize(INDEX_FILE)
            
        # Format size
        if index_size > 1024 * 1024:
            size_str = f"{index_size / (1024 * 1024):.1f} MB"
        else:
            size_str = f"{index_size / 1024:.1f} KB"
        
        print(f"Process completed successfully in {processing_time:.1f}s")
        print(f"Index size: {size_str}")
        print(f"Vectorized {len(glossari)} entries with {dimension} dimensions")
        
        # Return success status data
        return {
            "success": True,
            "glossaryEntries": len(glossary_data),
            "vectorizedEntries": len(glossari),
            "embeddingModel": MODEL_NAME,
            "vectorDimensions": dimension,
            "indexType": "FAISS FlatIP",
            "processingTime": f"{processing_time:.1f}s",
            "indexSize": size_str,
            "error": None
        }
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"ERROR during vectorization: {error_msg}")
        traceback.print_exc()
        return {
            "success": False,
            "error": error_msg
        }
