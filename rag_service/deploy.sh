#!/bin/bash

# Exit on error
set -e

# Always run relative to this script's directory (so Dockerfile is found)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
REGION="europe-west4"
REPO_NAME="rag-service-repo"
IMAGE_NAME="aina-rag-service"
SERVICE_NAME="aina-rag-service"
BUCKET_NAME="aina-rag-data"  # S'afegirà el project ID com a sufix

MAX_RETRIES=30
SLEEP_SECONDS=8

# Check if Project ID is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <PROJECT_ID>"
    echo "Please provide your Google Cloud Project ID."
    exit 1
fi

PROJECT_ID=$1
BUCKET_FULL_NAME="${BUCKET_NAME}-${PROJECT_ID}"

echo "🚀 Starting RAG Service deployment for project: $PROJECT_ID"
echo "📍 Region: $REGION"
echo "🪣 Storage Bucket: $BUCKET_FULL_NAME"

# 1. Enable APIs
echo "🔌 Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    storage.googleapis.com \
    --project $PROJECT_ID

# 2. Create Artifact Registry Repository (if not exists)
echo "📦 Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe $REPO_NAME --project $PROJECT_ID --location $REGION >/dev/null 2>&1; then
    echo "Creating repository $REPO_NAME..."
    gcloud artifacts repositories create $REPO_NAME \
        --project $PROJECT_ID \
        --repository-format=docker \
        --location=$REGION \
        --description="Aina RAG Service Docker images"
else
    echo "Repository $REPO_NAME already exists."
fi

# 3. Create GCS Bucket for persistent storage (if not exists)
echo "🪣 Checking GCS bucket for FAISS index and metadata..."
if ! gcloud storage buckets describe "gs://$BUCKET_FULL_NAME" --project $PROJECT_ID >/dev/null 2>&1; then
    echo "Creating bucket $BUCKET_FULL_NAME..."
    gcloud storage buckets create "gs://$BUCKET_FULL_NAME" \
        --project $PROJECT_ID \
        --location=$REGION \
        --uniform-bucket-level-access
    echo "✅ Bucket created: gs://$BUCKET_FULL_NAME"
else
    echo "Bucket $BUCKET_FULL_NAME already exists."
fi

# 4. Upload initial data files if they exist locally (optional)
echo "📤 Checking for local data files to upload..."
if [ -f "$SCRIPT_DIR/data/glossari_index.faiss" ] && [ -f "$SCRIPT_DIR/data/glossari_metadata.pkl" ]; then
    echo "Uploading local index and metadata to bucket..."
    gcloud storage cp "$SCRIPT_DIR/data/glossari_index.faiss" "gs://$BUCKET_FULL_NAME/glossari_index.faiss"
    gcloud storage cp "$SCRIPT_DIR/data/glossari_metadata.pkl" "gs://$BUCKET_FULL_NAME/glossari_metadata.pkl"
    echo "✅ Data files uploaded."
else
    echo "⚠️  No local data files found. The service will start without index."
    echo "   Use /vectorize endpoint to generate the index after deployment."
fi

# 5. Configure Docker Auth
echo "🔑 Configuring Docker authentication..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# 6. Build and Push Image
FULL_IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"
echo "🔨 Building Docker image..."
# Ensure Dockerfile exists in the rag_service folder
if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
    echo "❌ Dockerfile not found at: $SCRIPT_DIR/Dockerfile"
    echo "   Expected to run from the 'rag_service' folder in this repo."
    exit 1
fi
# Build for amd64 (Cloud Run requirement)
docker build --platform linux/amd64 -t "$FULL_IMAGE_PATH" "$SCRIPT_DIR"

echo "⬆️ Pushing image to Artifact Registry..."
docker push "$FULL_IMAGE_PATH"

# 7. Deploy to Cloud Run with GCS Volume Mount
# Nota: 8Gi memòria necessària per carregar spaCy transformer + SentenceTransformer
echo "☁️ Deploying to Cloud Run with persistent storage..."
gcloud run deploy $SERVICE_NAME \
    --project $PROJECT_ID \
    --image $FULL_IMAGE_PATH \
    --platform managed \
    --region $REGION \
    --execution-environment gen2 \
    --memory 8Gi \
    --cpu 4 \
    --port 8080 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 600 \
    --add-volume name=rag-data,type=cloud-storage,bucket=$BUCKET_FULL_NAME \
    --add-volume-mount volume=rag-data,mount-path=/app/data

# 8. Get Service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --project $PROJECT_ID --platform managed --region $REGION --format 'value(status.url)')

# Resource helpers
SERVICE_RESOURCE="projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME"
CONSOLE_URL="https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
BUCKET_URL="https://console.cloud.google.com/storage/browser/$BUCKET_FULL_NAME?project=$PROJECT_ID"

# 9. Smoke test (spaCy + model loading may need warm-up time)
echo ""
echo "🧪 Smoke test: waiting for service to respond..."

attempt=1
until curl -sS -f --max-time 30 "$SERVICE_URL/health" >/dev/null; do
    if [ $attempt -ge $MAX_RETRIES ]; then
        echo "❌ Smoke test failed after $MAX_RETRIES attempts."
        echo "   Try opening logs in Cloud Run and/or increasing memory/timeout."
        echo "   Console: $CONSOLE_URL"
        exit 1
    fi

    echo "   Attempt $attempt/$MAX_RETRIES failed. Retrying in ${SLEEP_SECONDS}s..."
    attempt=$((attempt + 1))
    sleep $SLEEP_SECONDS
done

echo "✅ Smoke test OK: $SERVICE_URL/health"

echo "🧪 Quick health check..."
curl -sS --max-time 30 "$SERVICE_URL/health" | head -c 500 || true

echo ""
echo "✅ Deployment successful!"
echo "--------------------------------------------------"
echo "🌍 Service URL: $SERVICE_URL"
echo "🔗 Cloud Run Console: $CONSOLE_URL"
echo "🪣 GCS Bucket Console: $BUCKET_URL"
echo "📌 Cloud Run Resource: $SERVICE_RESOURCE"
echo "--------------------------------------------------"
echo "📝 PERSISTENCE INFO:"
echo "   The FAISS index and metadata are stored in:"
echo "   gs://$BUCKET_FULL_NAME/"
echo "   Files:"
echo "   - glossari_index.faiss"
echo "   - glossari_metadata.pkl"
echo "--------------------------------------------------"
echo "📝 NEXT STEPS:"
echo "1. Copy the URL above."
echo "2. Update your functions/.env.prod file:"
echo "   RAG_SERVICE_URL=$SERVICE_URL"
echo "3. If index doesn't exist, call POST /vectorize with glossary data."
echo "4. Test detection: POST $SERVICE_URL/detect-candidates"
echo "--------------------------------------------------"
