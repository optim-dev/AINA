Documentació Tècnica: Selecció del Model d'Embeddings (AINA) per a RAG

1. Context del Projecte

L'objectiu és implementar un motor de RAG (Retrieval-Augmented Generation) utilitzant tecnologies del Projecte AINA per garantir la sobirania de les dades i una alta qualitat en el processament del llenguatge català.

L'arquitectura es basa en:

API: FastAPI

Motor Vectorial: FAISS (Facebook AI Similarity Search)

Model d'Embeddings: Models basats en Transformers (Hugging Face)

2. Problemàtica Detectada

Durant la fase inicial de desenvolupament, es va intentar utilitzar el model fundacional (base) d'AINA per a la generació d'embeddings: projecte-aina/roberta-base-ca-v2.

En executar l'script d'indexació (build_index.py), el sistema va retornar els següents advertiments crítics:

No sentence-transformers model found with name projecte-aina/roberta-base-ca-v2. Creating a new one with MEAN pooling.
Some weights of RobertaModel were not initialized from the model checkpoint [...] and are newly initialized: ['pooler.dense.bias', 'pooler.dense.weight']
You should probably TRAIN this model on a down-stream task...

2.1 Anàlisi de la Causa

Aquests missatges indiquen una incompatibilitat conceptual entre el model triat i la tasca a realitzar:

Manca d'especialització: roberta-base-ca-v2 és un model Masked Language Model (MLM). Està entrenat per predir paraules ocultes dins d'una frase, però no està entrenat per entendre la similitud semàntica entre dues frases completes.

Pooling improvisat: La llibreria sentence-transformers es veu obligada a improvisar una estratègia de Mean Pooling (mitjana matemàtica dels vectors), la qual cosa no garanteix que el vector resultant representi fidelment el significat de la frase.

Pesos no entrenats: L'advertència sobre pooler.dense indica que la capa encarregada de la classificació final no té informació apresa, fet que invalida la qualitat dels embeddings per a tasques de cerca precisa.

Impacte en el RAG: Si s'utilitzés aquest model, el sistema de cerca prioritzaria la coincidència de paraules clau (lèxica) per sobre del significat real (semàntica), reduint dràsticament la precisió de les respostes.

3. Solució Implementada

Per resoldre aquesta limitació, s'ha substituït el model base per un model Sentence Transformer natiu del Projecte AINA:

Model Seleccionat: projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base

3.1 Justificació Tècnica

Aquest model és la millor opció disponible actualment per les següents raons:

Arquitectura Sentence-Transformer (ST): Dissenyat específicament per treballar amb la llibreria sentence-transformers, eliminant la necessitat de configuracions manuals de pooling.

Entrenament NLI & Paraphrase: El model ha estat ajustat (fine-tuned) amb datasets d'Inferència de Llenguatge Natural (NLI) i paràfrasi en català. Això significa que el model "entén" que frases com "Com sol·licitar un ajut" i "Tramitació de subvencions" són semànticament equivalents.

Base Robusta (mpnet): Es basa en mpnet-base, reconegut com un dels millors models multilingües per a la generació d'embeddings densos.

4. Canvis al Codi

A continuació es detalla el canvi necessari en el fitxer de configuració o codi font (main.py / build_index.py):

Codi Anterior (Obsolet)

# Aquest model genera warnings i baixa qualitat semàntica

MODEL_NAME = "projecte-aina/roberta-base-ca-v2"
embedder = SentenceTransformer(MODEL_NAME)

Codi Actualitzat (Solució)

from sentence_transformers import SentenceTransformer

# Model optimitzat per a RAG i cerca semàntica en català

MODEL_NAME = "projecte-aina/ST-NLI-ca_paraphrase-multilingual-mpnet-base"

print(f"Carregant model d'embeddings AINA: {MODEL_NAME}...")
try:
embedder = SentenceTransformer(MODEL_NAME)
print("Model carregat correctament. Preparat per a indexació FAISS.")
except Exception as e:
print(f"Error carregant el model: {e}")

5. Resultats Esperats

Amb aquest canvi, s'aconsegueixen els següents beneficis:

Eliminació d'errors: Desaparició dels warnings d'inicialització de pesos (pooler.dense).

Millora de la Cerca: El motor FAISS recuperarà documents basant-se en el significat i el context, no només en la coincidència exacta de paraules.

Facilitat d'Ús: Integració directa ("Plug & Play") amb l'ecosistema actual de Python.
