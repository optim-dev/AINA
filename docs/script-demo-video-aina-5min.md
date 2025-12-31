# Guió demo en directe (≤ 5 minuts) — AINA (3 mòduls)

> Objectiu: narració clara mentre navegues per la UI. Inclou què dir i què clicar.

## 0:00–0:20 — Obertura (Dashboard)

**Diu:**

- “Bon dia! Això és **AINA**, un demostrador tecnològic amb tres mòduls en una sola aplicació: **Valoració d’ofertes**, **Elaboració** i **Kit lingüístic**.”
- “L’objectiu és mostrar com integrem IA i serveis lingüístics amb un backend serverless.”

**Fes (pantalla):**

- Mostra el dashboard amb els 3 accessos.

## 0:20–0:45 — Context tècnic (sense sortir del dashboard)

**Diu:**

- “Al davant és **React + Vite + TypeScript**.”
- “Al darrere, **Firebase**: autenticació, base de dades i storage. La lògica pesada va a **Cloud Functions**.”
- “Quan cal, parlem amb dos serveis especialitzats: **LanguageTool** (correcció gramatical) i un **servei RAG en Python** (terminologia i cerca semàntica).”
- “I tot queda monitoritzat amb logs i mètriques a **BigQuery**.”

---

## 0:45–2:10 — DEMO 1: Valoració d’Ofertes

**Diu:**

- “Aquí l’usuari carrega plecs i propostes, i el sistema ajuda a estructurar l’avaluació per lots.”

**Fes (pantalla):**

1. Entra a **Valoració**.
2. Carrega un **plec** (PDF/DOCX/TXT).

**Diu (mentre puja):**

- “El backend extreu i neteja el text del document.”

**Fes (pantalla):** 3. Executa **Extreure lots**.

**Diu:**

- “Ara demanem a la IA detectar automàticament si la licitació està dividida en lots i recuperar títols i descripcions.”

**Fes (pantalla):** 4. Selecciona un lot i carrega 1–2 **propostes**. 5. Executa **Avaluar lot**.

**Diu:**

- “Primer s’extreu el context i els criteris del lot; després s’avaluen les propostes criteri per criteri amb una escala tipus ‘insuficient / regular / compleix amb excel·lència’, retornant justificació, punts forts i millores.”

**Fes (pantalla):** 6. Si tens 2 propostes, executa **Comparar propostes**.

**Diu:**

- “Amb més d’una proposta, fem una comparació i un rànquing coherent amb les puntuacions.”

**Nota (si la UI no ho mostra tot):**

- Si el frontend de Valoració no està complet, fes la demo fins a **Extreure lots** i comenta: “L’avaluació i comparació existeixen al backend i s’exposen via API.”

---

## 2:10–3:20 — DEMO 2: Elaboració (extracció de dades d’un PDF de subvenció)

**Diu:**

- “Aquest mòdul automatitza una tasca molt habitual: passar d’un PDF de sol·licitud de subvenció a dades estructurades.”

**Fes (pantalla):**

1. Entra a **Elaboració**.
2. Carrega un PDF de **subvenció**.

**Diu:**

- “El PDF es puja a Storage i una Function el processa amb IA multimodal (Gemini) per extreure un JSON estructurat.”

**Fes (pantalla):** 3. Mostra el progrés (upload → processament). 4. Quan surti el resultat, fes scroll per 2–3 seccions.

**Diu:**

- “Aquí veiem camps agrupats: dades del projecte, ens públic, pressupost, declaracions, documentació adjunta…”
- “Això és la base per omplir tràmits o preparar documents de forma més ràpida.”

---

## 3:20–4:50 — DEMO 3: Kit Lingüístic (LanguageTool + glossari + RAG terminològic)

**Diu:**

- “El Kit combina correcció gramatical i correcció terminològica amb un pipeline tipus RAG.”

### 3:20–4:00 — 3.1 LanguageTool (gramàtica)

**Fes (pantalla):**

1. Entra a la pantalla de correcció.
2. Enganxa un text curt amb algun error.
3. Prem **Analitzar**.

**Diu:**

- “Fem servir LanguageTool, però el client no parla directament amb el contenidor: ho fem via Function, així no exposem infraestructura i podem validar i registrar l’ús.”

### 4:00–4:50 — 3.2 RAG terminològic (detecció + cerca semàntica)

**Fes (pantalla):**

1. Entra a la pantalla de RAG/terminologia.
2. Enganxa un text amb algun terme ‘dubtós’ (idealment amb una conjugació).
3. Prem **Processar**.
4. Assenyala estadístiques (detecció NLP/hash/LLM, correccions, temps).

**Diu:**

- “El pipeline detecta candidats amb **NLP (lematització)** i, si cal, amb hash o LLM.”
- “Després el servei RAG busca al glossari amb **FAISS** per trobar la correcció normativa més adequada segons el context.”
- “Finalment retornem el text millorat i les estadístiques del procés.”

---

## 4:50–5:00 — Tancament

**Diu:**

- “En resum: **Valoració** per licitacions, **Elaboració** per extreure dades de PDFs, i **Kit** per qualitat lingüística amb correcció i RAG.”
- “Tot dins una arquitectura modular amb Firebase i serveis d’IA especialitzats.”

## Checklist de preparació (abans de gravar)

- Tenir 1 plec i 2 propostes llestes (Valoració).
- Tenir 1 PDF de subvenció (Elaboració).
- Tenir 2 textos curts: 1 amb errors gramaticals (LanguageTool) i 1 amb termes/variants (RAG).
