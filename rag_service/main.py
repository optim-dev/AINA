import os
# Fix per a error de conflicte OpenMP en macOS (evita crash/empty reply)
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
# Fix addicional per a error "pthread_mutex_init failed" en macOS
os.environ['OMP_NUM_THREADS'] = '1'

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import numpy as np
from typing import List, Optional, Dict, Any
import spacy

app = FastAPI(title="Aina RAG Service", version="1.0")

# Configuració
INDEX_FILE = "data/glossari_index.faiss"
METADATA_FILE = "data/glossari_metadata.pkl"
# MODEL_NAME = "projecte-aina/roberta-base-ca-v2"
# MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2" 
MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"

# Variables globals per mantenir els models en memòria
model = None
index = None
glossari = None
nlp_model = None  # spaCy model for lemmatization
variants_lookup = None  # Hash table: lemma -> glossary entry


def build_variants_lookup(glossari_data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Build a lookup table mapping lemmatized variants to glossary entries.
    This allows matching conjugated forms (e.g., "conformen") to their infinitive ("conformar").
    """
    lookup = {}
    
    if not glossari_data:
        return lookup
    
    for entry in glossari_data:
        terme_recomanat = entry.get('terme_recomanat', '')
        variants = entry.get('variants_no_normatives', [])
        categoria = entry.get('categoria', '')
        
        # Map each variant to the glossary entry
        for variant in variants:
            if variant and isinstance(variant, str):
                variant_lower = variant.lower().strip()
                lookup[variant_lower] = {
                    'id': entry.get('id', ''),
                    'terme_recomanat': terme_recomanat,
                    'categoria': categoria,
                    'context': entry.get('context_d_us', ''),
                    'variant_original': variant
                }
    
    print(f"Variants lookup built with {len(lookup)} entries")
    return lookup


class DetectCandidatesRequest(BaseModel):
    text: str
    context_window: Optional[int] = 3


class DetectedCandidate(BaseModel):
    term: str
    lemma: str
    position: int
    context: str
    pos_tag: str
    glossary_id: str
    terme_recomanat: str
    categoria: str
    source: str = "nlp"


class DetectCandidatesResult(BaseModel):
    success: bool
    candidates: List[DetectedCandidate]
    nlp_model_used: str
    error: Optional[str] = None

class SearchRequest(BaseModel):
    candidates: List[str]
    k: Optional[int] = 5
    threshold: Optional[float] = 0.80

class MatchResult(BaseModel):
    id: str
    terme_recomanat: str
    similitud: float
    context: str
    variants: List[str]
    categoria: str
    ambit: str
    comentari: str
    font: str
    exemple_1: str
    exemple_2: str
    exemple_3: str
    exemple_incorrecte_1: str
    exemple_incorrecte_2: str

class SearchResult(BaseModel):
    original: str
    matches: List[MatchResult]

@app.on_event("startup")
async def load_models():
    global model, index, glossari, nlp_model, variants_lookup
    
    print("Inicialitzant servei RAG...")
    
    # 1. Carregar Model d'embeddings
    print(f"Carregant model {MODEL_NAME}...")
    try:
        model = SentenceTransformer(MODEL_NAME)
    except Exception as e:
        print(f"Error carregant el model: {e}")
        raise RuntimeError("No s'ha pogut carregar el model d'embeddings")

    # 2. Carregar spaCy Catalan model for lemmatization
    print("Carregant model spaCy per a lematització...")
    try:
        # Try transformer model first (most accurate)
        nlp_model = spacy.load("ca_core_news_trf")
        print("Model spaCy ca_core_news_trf carregat!")
    except OSError:
        try:
            # Fallback to smaller model
            nlp_model = spacy.load("ca_core_news_sm")
            print("Model spaCy ca_core_news_sm carregat (fallback)")
        except OSError:
            print("AVÍS: No s'ha trobat cap model spaCy per a català.")
            print("Executeu: python -m spacy download ca_core_news_trf")
            nlp_model = None

    # 3. Carregar Índex FAISS (opcional al primer inici)
    if os.path.exists(INDEX_FILE):
        print("Carregant índex FAISS...")
        index = faiss.read_index(INDEX_FILE)
    else:
        print(f"AVÍS: No s'ha trobat l'índex a {INDEX_FILE}. El servei s'iniciarà sense índex.")
        print("Utilitzeu l'endpoint /vectorize per crear l'índex.")
        index = None

    # 4. Carregar Metadades (opcional al primer inici)
    if os.path.exists(METADATA_FILE):
        print("Carregant metadades...")
        with open(METADATA_FILE, "rb") as f:
            glossari = pickle.load(f)
        # Build variants lookup table for lemma-based detection
        variants_lookup = build_variants_lookup(glossari)
    else:
        print(f"AVÍS: No s'han trobat les metadades a {METADATA_FILE}.")
        glossari = None
        variants_lookup = None
        
    if index is not None and glossari is not None:
        print("Servei llest amb índex carregat!")
    else:
        print("Servei iniciat sense índex. Esperant vectorització...")

@app.post("/search", response_model=List[SearchResult])
async def search(request: SearchRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model no carregat. El servei no està inicialitzat correctament.")
    
    if not index or not glossari:
        raise HTTPException(
            status_code=503, 
            detail="Índex no disponible. Utilitzeu l'endpoint /vectorize per crear l'índex primer."
        )

    results = []
    print(f"Vectoritzant {len(request.candidates)} candidats...")
    vectors = model.encode(request.candidates, convert_to_numpy=True)
    
    # Assegurar tipus float32 per a FAISS (evita errors de tipus)
    vectors = vectors.astype(np.float32)
    
    print("Normalitzant vectors...")
    faiss.normalize_L2(vectors) # Normalitzar per a cerca cosinus

    # Cerca en batch
    print("Executant cerca FAISS...")
    distances, indices = index.search(vectors, request.k)
    print("Cerca finalitzada.")

    for i, candidate in enumerate(request.candidates):
        matches = []
        for j in range(request.k):
            idx = indices[i][j]
            score = distances[i][j] # Inner product = cosinus similarity (si normalitzat)
            
            if idx < 0: continue # No match found by FAISS
            
            if score >= request.threshold:
                entry = glossari[idx]
                matches.append(MatchResult(
                    id=entry.get('id', ''),
                    terme_recomanat=entry['terme_recomanat'],
                    similitud=float(score),
                    context=entry.get('context_d_us', ''),
                    variants=entry.get('variants_no_normatives', []),
                    categoria=entry.get('categoria', ''),
                    ambit=entry.get('ambit', ''),
                    comentari=entry.get('comentari', ''),
                    font=entry.get('font', ''),
                    exemple_1=entry.get('exemple_1', ''),
                    exemple_2=entry.get('exemple_2', ''),
                    exemple_3=entry.get('exemple_3', ''),
                    exemple_incorrecte_1=entry.get('exemple_incorrecte_1', ''),
                    exemple_incorrecte_2=entry.get('exemple_incorrecte_2', ''),
                ))
        
        results.append(SearchResult(original=candidate, matches=matches))
    # # Print all candidates and their matched terme_recomanat
        for result in results:
            print(f"\nCandidate: {candidate}")
            print(f"\nCandidate: {result.original} - Matches found: {len(result.matches)}")
            for match in result.matches:
                print(f"  - {match.terme_recomanat} (similitud: {match.similitud:.3f})")
    return results


@app.post("/detect-candidates", response_model=DetectCandidatesResult)
async def detect_candidates(request: DetectCandidatesRequest):
    """
    Detect candidate terms in text using NLP lemmatization.
    Uses spaCy's Catalan model to lemmatize words and match against glossary variants.
    This properly handles verb conjugations (e.g., "conformen" -> "conformar").
    """
    global nlp_model, variants_lookup
    
    if not nlp_model:
        raise HTTPException(
            status_code=503,
            detail="Model NLP no carregat. Instal·leu: python -m spacy download ca_core_news_trf"
        )
    
    if not variants_lookup:
        raise HTTPException(
            status_code=503,
            detail="Lookup de variants no disponible. Vectoritzeu el glossari primer."
        )
    
    text = request.text
    context_window = request.context_window
    
    try:
        # Process text with spaCy
        doc = nlp_model(text)
        words = text.split()
        candidates = []
        detected_positions = set()
        
        # First pass: check for multi-word expressions (up to 4 words)
        for ngram_size in range(4, 1, -1):
            for i in range(len(doc) - ngram_size + 1):
                # Skip if any position already detected
                if any(j in detected_positions for j in range(i, i + ngram_size)):
                    continue
                
                # Build ngram from tokens
                tokens = doc[i:i + ngram_size]
                ngram_text = " ".join([t.text for t in tokens])
                ngram_lower = ngram_text.lower()
                
                # Check exact match for multi-word expressions
                if ngram_lower in variants_lookup:
                    entry = variants_lookup[ngram_lower]
                    
                    # Mark positions as detected
                    for j in range(i, i + ngram_size):
                        detected_positions.add(j)
                    
                    # Build context
                    start_ctx = max(0, i - context_window)
                    end_ctx = min(len(doc), i + ngram_size + context_window)
                    context = " ".join([t.text for t in doc[start_ctx:end_ctx]])
                    
                    candidates.append(DetectedCandidate(
                        term=ngram_text,
                        lemma=ngram_lower,
                        position=i,
                        context=context,
                        pos_tag="MWE",  # Multi-word expression
                        glossary_id=entry['id'],
                        terme_recomanat=entry['terme_recomanat'],
                        categoria=entry['categoria'],
                        source="nlp"
                    ))
        
        # Second pass: check individual tokens using lemmatization
        for i, token in enumerate(doc):
            if i in detected_positions:
                continue
            
            # Skip punctuation and spaces
            if token.is_punct or token.is_space:
                continue
            
            lemma = token.lemma_.lower()
            token_lower = token.text.lower()
            
            # Check lemma first, then exact token
            match_entry = None
            matched_form = None
            
            if lemma in variants_lookup:
                match_entry = variants_lookup[lemma]
                matched_form = lemma
            elif token_lower in variants_lookup:
                match_entry = variants_lookup[token_lower]
                matched_form = token_lower
            
            if match_entry:
                # Optional: verify POS tag matches category
                categoria = match_entry['categoria'].lower()
                pos = token.pos_
                
                # Skip if category is 'verb' but word is not used as verb
                # (allows for flexible matching while avoiding false positives)
                if categoria == 'verb' and pos not in ['VERB', 'AUX']:
                    # Still include but mark with lower confidence
                    pass
                
                detected_positions.add(i)
                
                # Build context window
                start_ctx = max(0, i - context_window)
                end_ctx = min(len(doc), i + 1 + context_window)
                context = " ".join([t.text for t in doc[start_ctx:end_ctx]])
                
                candidates.append(DetectedCandidate(
                    term=token.text,
                    lemma=matched_form,
                    position=i,
                    context=context,
                    pos_tag=pos,
                    glossary_id=match_entry['id'],
                    terme_recomanat=match_entry['terme_recomanat'],
                    categoria=match_entry['categoria'],
                    source="nlp"
                ))
        
        # Sort by position
        candidates.sort(key=lambda x: x.position)
        
        model_name = nlp_model.meta.get('name', 'unknown')
        print(f"NLP detection completed: {len(candidates)} candidates found using {model_name}")
        
        return DetectCandidatesResult(
            success=True,
            candidates=candidates,
            nlp_model_used=model_name,
            error=None
        )
        
    except Exception as e:
        print(f"Error in NLP detection: {e}")
        return DetectCandidatesResult(
            success=False,
            candidates=[],
            nlp_model_used="error",
            error=str(e)
        )


@app.post("/reload-variants")
async def reload_variants():
    """
    Reload the variants lookup table from current glossari.
    Call this after vectorization to update the lookup table.
    """
    global variants_lookup, glossari
    
    if not glossari:
        raise HTTPException(
            status_code=503,
            detail="No glossari loaded. Run vectorization first."
        )
    
    variants_lookup = build_variants_lookup(glossari)
    return {
        "success": True,
        "variants_count": len(variants_lookup)
    }


class GlossaryTermInput(BaseModel):
    id: str
    terme_recomanat: str
    variants_no_normatives: List[str] = []
    context_d_us: str = ""
    categoria: str = ""
    ambit: str = ""
    notes_linguistiques: str = ""
    font: str = ""
    exemples_correctes: List[str] = []
    exemples_incorrectes: List[str] = []


class VectorizeRequest(BaseModel):
    glossary: List[GlossaryTermInput]


class VectorizeResult(BaseModel):
    success: bool
    glossaryEntries: int
    vectorizedEntries: int
    embeddingModel: str
    vectorDimensions: int
    indexType: str
    processingTime: str
    indexSize: str
    error: Optional[str] = None


@app.post("/vectorize", response_model=VectorizeResult)
async def vectorize(request: VectorizeRequest):
    """
    Trigger re-vectorization of the glossary.
    Receives glossary data from Firebase Function and rebuilds the FAISS index.
    """
    global index, glossari, variants_lookup
    
    from build_dynamic_index import build_index_from_data
    
    glossary_data = request.glossary
    print(f"Vectorization requested with {len(glossary_data)} glossary entries")
    
    if not glossary_data:
        raise HTTPException(
            status_code=400,
            detail="No glossary data provided"
        )
    
    try:
        # Convert Pydantic models to dicts
        glossary_dicts = [term.model_dump() for term in glossary_data]
        
        # Run the build_index function with the provided data
        # Returns dict with success flag and either result data or error message
        result = build_index_from_data(glossary_dicts)
        
        # Check if vectorization failed
        if not result.get("success", False):
            error_msg = result.get("error", "Unknown error during vectorization")
            raise HTTPException(
                status_code=500,
                detail=f"Vectorization failed: {error_msg}"
            )
        
        # Reload the index and metadata
        print("Reloading index and metadata...")
        index = faiss.read_index(INDEX_FILE)
        with open(METADATA_FILE, "rb") as f:
            glossari = pickle.load(f)
        
        # Rebuild variants lookup for NLP detection
        variants_lookup = build_variants_lookup(glossari)
        
        print(f"Index reloaded with {len(glossari)} entries, {len(variants_lookup)} variants")
        
        return VectorizeResult(
            success=True,
            glossaryEntries=result["glossaryEntries"],
            vectorizedEntries=result["vectorizedEntries"],
            embeddingModel=result["embeddingModel"],
            vectorDimensions=result["vectorDimensions"],
            indexType=result["indexType"],
            processingTime=result["processingTime"],
            indexSize=result["indexSize"],
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Vectorization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    nlp_model_name = nlp_model.meta.get('name', 'unknown') if nlp_model else None
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "index_loaded": index is not None,
        "glossary_entries": len(glossari) if glossari else 0,
        "ready_for_search": model is not None and index is not None and glossari is not None,
        "nlp_model_loaded": nlp_model is not None,
        "nlp_model_name": nlp_model_name,
        "variants_count": len(variants_lookup) if variants_lookup else 0,
        "ready_for_nlp_detection": nlp_model is not None and variants_lookup is not None
    }
