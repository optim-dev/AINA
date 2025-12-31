# Arquitectura del Servei RAG (Fase 2)

Aquest document detalla el disseny tècnic i les decisions d'arquitectura preses per a la implementació del servei de Recuperació Augmentada per Generació (RAG) del projecte Aina.

## 🎯 Objectiu del Servei

Aquest microservei té una única responsabilitat: **Trobar la millor correcció normativa per a un terme problemàtic detectat prèviament.**

No analitza el text complet. Només rep una llista de "candidats" (termes que la Fase 1 ha marcat com a sospitosos) i utilitza la intel·ligència artificial per entendre el context i proposar l'alternativa correcta del glossari.

## ⚙️ Com funciona?

El servei segueix un flux de 3 passos:

1.  **Recepció**: Rep una llista de termes candidats (i opcionalment el seu context).
2.  **Vectorització**: Transforma aquests termes en vectors numèrics utilitzant un model de llenguatge (RoBERTa-ca-v2). Aquest model entén el significat semàntic de les paraules.
3.  **Cerca de Veïns (KNN)**: Compara aquests vectors amb l'índex pre-calculat del glossari per trobar les entrades més similars semànticament.

## 🏗️ Decisions d'Arquitectura

### Per què un microservei en Python?

L'aplicació principal està en Node.js (Firebase Functions), però l'ecosistema de IA i processament vectorial és natiu de Python.

- **Separació de responsabilitats**: No carreguem el backend principal amb llibreries pesades de IA.
- **Escalabilitat**: Desplegat a Google Cloud Run, aquest servei pot escalar independentment. Si hi ha molta càrrega de correcció, només creix aquest servei, no tota l'app.

### 💡 Per què NO utilitzem una Base de Dades Vectorial externa?

Sovint es recomana utilitzar bases de dades vectorials com Pinecone, Milvus o Weaviate per a RAG. En aquest cas, hem decidit **NO fer-ho** i utilitzar **FAISS en memòria** per les següents raons:

#### 1. Volum de Dades

Les bases de dades vectorials estan dissenyades per gestionar milions o milers de milions de vectors. El nostre glossari té un ordre de magnitud de milers d'entrades.

- **FAISS local**: Pot gestionar fàcilment fins a 1 milió de vectors en la RAM d'un servidor petit amb una latència de mil·lisegons.
- **Sobrecàrrega innecessària**: Utilitzar una DB externa per a un dataset tan petit seria com "matar mosques a canonades".

#### 2. Latència i Rendiment

- **Accés Local (RAM)**: La cerca es fa directament a la memòria del procés. Temps d'accés: < 1ms.
- **Accés Remot (DB)**: Una DB externa implica una crida de xarxa (network hop), serialització i deserialització. Temps d'accés: 20-100ms.
  Per a una correcció en temps real, cada mil·lisegon compta.

#### 3. Costos

- **FAISS**: Cost zero addicional. S'executa dins la mateixa memòria que ja paguem pel contenidor de computació.
- **Vector DB**: Solen tenir costos fixos mensuals o costos per ús que incrementarien la factura del projecte innecessàriament.

#### 4. Simplicitat Operativa (KISS)

- L'índex és només un fitxer (`.faiss`) que es carrega a l'inici.
- No cal mantenir, fer còpies de seguretat, ni gestionar la seguretat d'un servei de base de dades addicional.
- El desplegament és atòmic: el codi i les dades (l'índex) viatgen junts en el contenidor Docker. Això garanteix que el model i les dades sempre estan sincronitzats.

## 🔄 Cicle de Vida de les Dades

1.  **Build Time**: Quan es construeix la imatge Docker, l'script `build_index.py` llegeix el CSV i genera l'índex.
2.  **Run Time**: Quan el servei arrenca, carrega l'índex a la RAM.
3.  **Actualitzacions**: Per actualitzar el glossari, simplement es modifica el CSV i es torna a desplegar el servei. Això és acceptable perquè els canvis normatius no succeeixen minut a minut.
