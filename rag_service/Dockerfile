FROM python:3.11-slim

WORKDIR /app

# Instal·lar dependències del sistema
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copiar requirements i instal·lar dependències Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Descarregar el model spaCy per a català (transformer-based per màxima precisió)
# Fallback a model més petit si el transformer falla
RUN python -m spacy download ca_core_news_trf || python -m spacy download ca_core_news_sm

# Copiar codi i dades
COPY data/ ./data/
COPY *.py .

# Construir l'índex durant el build de la imatge
# Això requereix que 'data/termes.csv' existeixi al context de build
RUN python build_index.py

# Exposar el port
EXPOSE 8080

# Comanda d'execució
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
