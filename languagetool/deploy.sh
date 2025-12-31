#!/bin/bash

# Exit on error
set -e

# Always run relative to this script's directory (so Dockerfile is found)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
REGION="europe-west4"
REPO_NAME="languagetool-repo"
IMAGE_NAME="languagetool-catalan"
SERVICE_NAME="languagetool-catalan"

MAX_RETRIES=25
SLEEP_SECONDS=5

# Check if Project ID is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <PROJECT_ID>"
    echo "Please provide your Google Cloud Project ID."
    exit 1
fi

PROJECT_ID=$1

echo "🚀 Starting deployment for project: $PROJECT_ID"
echo "📍 Region: $REGION"

# 1. Enable APIs
echo "🔌 Enabling required APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com artifactregistry.googleapis.com --project $PROJECT_ID

# 2. Create Artifact Registry Repository (if not exists)
echo "📦 Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe $REPO_NAME --project $PROJECT_ID --location $REGION >/dev/null 2>&1; then
    echo "Creating repository $REPO_NAME..."
    gcloud artifacts repositories create $REPO_NAME \
        --project $PROJECT_ID \
        --repository-format=docker \
        --location=$REGION \
        --description="LanguageTool Docker images"
else
    echo "Repository $REPO_NAME already exists."
fi

# 3. Configure Docker Auth
echo "🔑 Configuring Docker authentication..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# 4. Build and Push Image
FULL_IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"
echo "🔨 Building Docker image..."
# Ensure Dockerfile exists in the languagetool folder
if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
    echo "❌ Dockerfile not found at: $SCRIPT_DIR/Dockerfile"
    echo "   Expected to run from the 'languagetool' folder in this repo."
    exit 1
fi
# Build for amd64 (Cloud Run requirement)
docker build --platform linux/amd64 -t "$FULL_IMAGE_PATH" "$SCRIPT_DIR"

echo "⬆️ Pushing image to Artifact Registry..."
docker push "$FULL_IMAGE_PATH"

# 5. Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --project $PROJECT_ID \
    --image $FULL_IMAGE_PATH \
    --platform managed \
    --region $REGION \
    --memory 2Gi \
    --cpu 2 \
    --port 8010 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 300

# 6. Get Service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --project $PROJECT_ID --platform managed --region $REGION --format 'value(status.url)')

# Resource helpers
SERVICE_RESOURCE="projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME"
CONSOLE_URL="https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"

# 7. Smoke test (LanguageTool may need warm-up time)
echo ""
echo "🧪 Smoke test: waiting for service to respond..."

attempt=1
until curl -sS -f --max-time 20 "$SERVICE_URL/v2/languages" >/dev/null; do
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

echo "✅ Smoke test OK: $SERVICE_URL/v2/languages"

echo "🧪 Quick check (/v2/check)..."
curl -sS --max-time 30 -X POST "$SERVICE_URL/v2/check" \
    -d "language=ca" \
    -d "text=Això es una prova." \
    | head -c 800 || true

echo ""
echo "✅ Deployment successful!"
echo "--------------------------------------------------"
echo "🌍 Service URL: $SERVICE_URL"
echo "🔗 Cloud Run Console: $CONSOLE_URL"
echo "📌 Cloud Run Resource: $SERVICE_RESOURCE"
echo "--------------------------------------------------"
echo "📝 NEXT STEPS:"
echo "1. Copy the URL above."
echo "2. Update your functions/.env.prod file:"
echo "   LANGUAGETOOL_URL=$SERVICE_URL"
echo "3. Deploy your Firebase Functions:"
echo "   firebase deploy --only functions:checkLanguageTool"
echo "--------------------------------------------------"
