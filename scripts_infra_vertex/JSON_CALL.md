1. Obtener el ID del Endpoint
   Primero necesitas el ENDPOINT_ID. Ojo, esto no es el nombre que le pusimos ("salamandra-7b-endpoint"), sino un número largo (ej. 1234567890123456789) que Google asigna al crearlo.

Puedes obtenerlo ejecutando este comando en tu terminal una vez el despliegue haya terminado:

Bash

gcloud ai endpoints list \
 --region=us-central1 \
 --filter="display_name=salamandra-7b-endpoint" \
 --format="value(name)"
(Copia el número que sale al final de la ruta, por ejemplo: projects/xxx/locations/us-central1/endpoints/123456789... -> Necesitas solo el número final).

2. La llamada CURL (JSON)
   Sustituye TU_PROJECT_ID y TU_ENDPOINT_ID (el número numérico) en el siguiente bloque.

Este comando envía la petición directamente a la API REST de Vertex AI.

Bash

# Define tus variables (o sustitúyelas directamente abajo)

PROJECT_ID="teu-project-id"
ENDPOINT_ID="1234567890..." # <--- El número numérico que obtuviste antes
REGION="us-central1"

curl -X POST \
 -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/${ENDPOINT_ID}:predict" \
 -d '{
"instances": [
{
"prompt": "<|im_start|>user\nExplica breument què és la física quàntica.<|im_end|>\n<|im_start|>assistant",
"max_tokens": 512,
"temperature": 0.7,
"top_p": 0.9,
"top_k": 40
}
]
}'
Detalles importantes del JSON
Estructura instances: Vertex AI exige que los datos vayan dentro de una lista llamada "instances". Esto es diferente a llamar a vLLM o OpenAI directamente, donde el JSON empieza plano. El contenedor de Google que estás usando (pytorch-vllm-serve) se encarga de "desempaquetar" esto internamente.

Formato del Prompt: He incluido los saltos de línea \n explícitos dentro del string del prompt para respetar el formato ChatML.

Token de autenticación: $(gcloud auth print-access-token) genera un token temporal usando tus credenciales actuales de Google Cloud CLI. Asegúrate de haber hecho gcloud auth login antes.
