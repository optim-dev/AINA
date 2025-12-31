from google.cloud import aiplatform
from google.cloud import storage # <--- NOVA IMPORTACIÓ
from google.api_core.exceptions import NotFound, Forbidden

# --- CONFIGURACIÓ ---
# PROJECT_ID = "aina-474214"   # <--- POSA EL TEU ID AQUÍ
PROJECT_ID = "aina-demostradors"   # <--- POSA EL TEU ID AQUÍ
REGION = "europe-west4"
# IMPORTANT: Els noms dels buckets són globals i únics a tot Google Cloud.
# Et recomano usar: f"gs://{PROJECT_ID}-vertex-staging" per evitar conflictes.
STAGING_BUCKET = f"gs://{PROJECT_ID}-vertex-staging" 

# Noms per identificar els recursos
ENDPOINT_DISPLAY_NAME = "salamandra-7b-endpoint"
MODEL_DISPLAY_NAME = "salamandra-7b-instruct"
HF_MODEL_ID = "BSC-LT/salamandra-7b-instruct"

# Imatge Docker de Google per a vLLM
# Utilitzem una versió més recent i estable (Desembre 2025) per corregir errors de versions anteriors
VLLM_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:20251211_0916_RC01_stable"

def garantizar_bucket(bucket_uri, project_id, location):
    """
    Comprova si el bucket existeix. Si no, el crea.
    """
    # Netejar el prefix 'gs://' si hi és, la llibreria storage vol només el nom
    bucket_name = bucket_uri.replace("gs://", "")
    
    storage_client = storage.Client(project=project_id)
    
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"✅ Bucket existent trobat: {bucket_uri}")
    except NotFound:
        print(f"⚠️ El bucket {bucket_uri} no existeix. Creant-lo a {location}...")
        try:
            bucket = storage_client.create_bucket(bucket_name, location=location)
            print(f"✅ Bucket creat correctament: {bucket_uri}")
        except Exception as e:
            print(f"❌ Error crític creant el bucket: {e}")
            print("NOTA: Els noms de bucket han de ser únics a tot el món.")
            raise e
    except Forbidden:
        print(f"❌ Error: El bucket existeix però no tens permisos per accedir-hi.")
        raise
    
    return bucket_uri

def get_or_deploy_salamandra():
    # 0. GARANTIR BUCKET (Pas previ)
    garantizar_bucket(STAGING_BUCKET, PROJECT_ID, REGION)

    # Ara ja podem inicialitzar Vertex AI amb seguretat
    aiplatform.init(project=PROJECT_ID, location=REGION, staging_bucket=STAGING_BUCKET)

    # 1. COMPROVAR SI L'ENDPOINT JA EXISTEIX (Està corrent?)
    print(f"🔍 Buscant endpoint existent: '{ENDPOINT_DISPLAY_NAME}'...")
    existing_endpoints = aiplatform.Endpoint.list(
        filter=f'display_name="{ENDPOINT_DISPLAY_NAME}"'
    )

    if existing_endpoints:
        endpoint = existing_endpoints[0]
        print(f"✅ Endpoint trobat: {endpoint.resource_name}")
        print("   Connectant directament (sense espera)...")
        return endpoint

    print("❌ No s'ha trobat cap endpoint actiu.")

    # 2. COMPROVAR SI EL MODEL JA ESTÀ AL REGISTRE
    print(f"🔍 Buscant model al registre: '{MODEL_DISPLAY_NAME}'...")
    existing_models = aiplatform.Model.list(
        filter=f'display_name="{MODEL_DISPLAY_NAME}"'
    )

    if existing_models:
        model = existing_models[0]
        print(f"✅ Model trobat al registre: {model.resource_name}")
    else:
        print("❌ El model no està importat. Important des de Hugging Face...")
        # Importar model (triga uns 3-5 min)
        model = aiplatform.Model.upload(
            display_name=MODEL_DISPLAY_NAME,
            serving_container_image_uri=VLLM_DOCKER_URI,
            serving_container_command=["python", "-m", "vllm.entrypoints.api_server"],
            # serving_container_args=[
            #     f"--model={HF_MODEL_ID}",
            #     "--tensor-parallel-size=1",
            #     "--dtype=bfloat16",
            #     "--trust-remote-code"
            # ],
            serving_container_args=[
                f"--model={HF_MODEL_ID}",
                "--dtype=bfloat16",             # L4 soporta bfloat16 nativo (mejor precisión/velocidad)
                "--tensor-parallel-size=1",     # Correcto para 1 GPU
                "--gpu-memory-utilization=0.90", # CRÍTICO: Vertex necesita un margen de VRAM
                "--max-model-len=8192",         # RECOMENDADO: Limita el contexto para no saturar la L4
                "--trust-remote-code",          # Necesario para algunos modelos del BSC
                "--disable-log-stats"           # Opcional: Reduce el ruido en los logs de Google Cloud
            ],
            serving_container_ports=[8000],
            serving_container_predict_route="/generate",
            serving_container_health_route="/health",
        )
        print("✅ Model importat correctament.")

    # 3. DESPLEGAR EL MODEL
    print(f"🚀 Desplegant model a un nou Endpoint (això trigarà ~15-20 mins)...")
    # endpoint = model.deploy(
    #     endpoint_display_name=ENDPOINT_DISPLAY_NAME,
    #     machine_type="g2-standard-8",  # NVIDIA L4
    #     accelerator_type="NVIDIA_L4",
    #     accelerator_count=1,
    #     deploy_request_timeout=1800
    # )
    # PAS A: Crear l'Endpoint explícitament amb el nom que volem
    endpoint = aiplatform.Endpoint.create(
        display_name=ENDPOINT_DISPLAY_NAME,
        project=PROJECT_ID,
        location=REGION
    )

    # PAS B: Desplegar el model dins d'aquest Endpoint
    model.deploy(
        endpoint=endpoint,  # Utilitzem l'endpoint que acabem de crear
        deployed_model_display_name=MODEL_DISPLAY_NAME,
        machine_type="g2-standard-8",  # NVIDIA L4
        accelerator_type="NVIDIA_L4",
        accelerator_count=1,
        deploy_request_timeout=1800
    )
    
    print(f"✅ Desplegament completat: {endpoint.resource_name}")
    return endpoint

# --- EXECUTAR EL FLUX ---
if __name__ == "__main__":
    try:
        endpoint = get_or_deploy_salamandra()

        # --- PROVA DE TRADUCCIÓ ---
        print("\n🧪 Provant el model amb una pregunta en català...")
        
        prompt = """<|im_start|>user
Com li explicaries a un nen de 5 anys què és un ordinador? Respon en català.<|im_end|>
<|im_start|>assistant"""

        response = endpoint.predict(instances=[{
            "prompt": prompt,
            "max_tokens": 300,
            "temperature": 0.7
        }])
        print("\n🤖 Resposta de Salamandra:\n")
        print(response.predictions[0])
        
    except Exception as e:
        print(f"\n❌ S'ha produït un error: {e}")