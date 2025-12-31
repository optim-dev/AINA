from google.cloud import aiplatform
from google.cloud import storage
from google.api_core.exceptions import NotFound, Forbidden
import argparse

# --- CONFIGURACIÓ ---
PROJECT_ID = "aina-demostradors"
REGION = "europe-west4"
STAGING_BUCKET = f"gs://{PROJECT_ID}-vertex-staging" 

# Noms BASE per identificar els recursos (s'afegirà sufix segons context)
BASE_ENDPOINT_NAME = "alia-40b-endpoint"
BASE_MODEL_NAME = "alia-40b-instruct"
HF_MODEL_ID = "BSC-LT/ALIA-40b-instruct"

# Imatge Docker de Google per a vLLM
VLLM_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:20251211_0916_RC01_stable"

def get_config(context_target):
    """
    Defineix la configuració de hardware i paràmetres segons el context desitjat.
    Per a contextos grans (16k, 32k) amb un model de 40B, necessitem més VRAM 
    per a la KV cache, per tant passem de 4 a 8 GPUs L4.
    """
    if context_target == "8k":
        return {
            "max_model_len": 8192,
            "machine_type": "g2-standard-48",  # 4x L4 (96GB VRAM total)
            "accelerator_count": 4,
            "tensor_parallel_size": 4,
            "suffix": "8k"
        }
    elif context_target == "16k":
        return {
            "max_model_len": 16384,
            "machine_type": "g2-standard-96",  # 8x L4 (192GB VRAM total)
            "accelerator_count": 8,
            "tensor_parallel_size": 8,
            "suffix": "16k"
        }
    elif context_target == "32k":
        return {
            "max_model_len": 32768,
            "machine_type": "g2-standard-96",  # 8x L4 (192GB VRAM total)
            "accelerator_count": 8,
            "tensor_parallel_size": 8,
            "suffix": "32k"
        }
    else:
        raise ValueError(f"Context target '{context_target}' no suportat. Opcions: 8k, 16k, 32k")

def garantizar_bucket(bucket_uri, project_id, location):
    """
    Comprova si el bucket existeix. Si no, el crea.
    """
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

def get_or_deploy_alia(context_target="8k"):
    config = get_config(context_target)
    
    endpoint_display_name = f"{BASE_ENDPOINT_NAME}-{config['suffix']}"
    model_display_name = f"{BASE_MODEL_NAME}-{config['suffix']}"
    
    print(f"⚙️  Configurant desplegament per context: {context_target}")
    print(f"   - Max Model Len: {config['max_model_len']}")
    print(f"   - Machine Type: {config['machine_type']} ({config['accelerator_count']} GPUs)")
    
    # 0. GARANTIR BUCKET (Pas previ)
    garantizar_bucket(STAGING_BUCKET, PROJECT_ID, REGION)

    # Ara ja podem inicialitzar Vertex AI amb seguretat
    aiplatform.init(project=PROJECT_ID, location=REGION, staging_bucket=STAGING_BUCKET)

    # 1. COMPROVAR SI L'ENDPOINT JA EXISTEIX (Està corrent?)
    print(f"🔍 Buscant endpoint existent: '{endpoint_display_name}'...")
    existing_endpoints = aiplatform.Endpoint.list(
        filter=f'display_name="{endpoint_display_name}"'
    )

    endpoint = None
    if existing_endpoints:
        endpoint = existing_endpoints[0]
        print(f"✅ Endpoint trobat: {endpoint.resource_name}")
        
        # Check if it has traffic assigned (implies successful deployment)
        if endpoint.traffic_split:
            print("   Connectant directament (sense espera)...")
            return endpoint
        else:
            print("⚠️ L'endpoint existeix però no té tràfic assignat (possible desplegament fallit).")
            print("   Es reutilitzarà l'endpoint per a un nou intent.")
    else:
        print("❌ No s'ha trobat cap endpoint actiu.")

    # 2. COMPROVAR SI EL MODEL JA ESTÀ AL REGISTRE
    print(f"🔍 Buscant model al registre: '{model_display_name}'...")
    existing_models = aiplatform.Model.list(
        filter=f'display_name="{model_display_name}"'
    )

    if existing_models:
        model = existing_models[0]
        print(f"✅ Model trobat al registre: {model.resource_name}")
    else:
        print("❌ El model no està importat. Important des de Hugging Face...")
        # Importar model (triga uns 3-5 min)
        model = aiplatform.Model.upload(
            display_name=model_display_name,
            serving_container_image_uri=VLLM_DOCKER_URI,
            serving_container_command=["python", "-m", "vllm.entrypoints.api_server"],
            serving_container_args=[
                f"--model={HF_MODEL_ID}",
                "--dtype=bfloat16",             
                f"--tensor-parallel-size={config['tensor_parallel_size']}",
                "--gpu-memory-utilization=0.90", 
                f"--max-model-len={config['max_model_len']}",         
                "--trust-remote-code",          
                "--disable-log-stats"           
            ],
            serving_container_ports=[8000],
            serving_container_predict_route="/generate",
            serving_container_health_route="/health",
        )
        print("✅ Model importat correctament.")

    # 3. DESPLEGAR EL MODEL
    if not endpoint:
        print(f"🚀 Creant un nou Endpoint ({endpoint_display_name})...")
        endpoint = aiplatform.Endpoint.create(
            display_name=endpoint_display_name,
            project=PROJECT_ID,
            location=REGION
        )
    else:
        print(f"🚀 Reutilitzant Endpoint existent ({endpoint_display_name})...")

    # PAS B: Desplegar el model dins d'aquest Endpoint
    model.deploy(
        endpoint=endpoint,  
        deployed_model_display_name=model_display_name,
        machine_type=config['machine_type'],
        accelerator_type="NVIDIA_L4",
        accelerator_count=config['accelerator_count'],
        deploy_request_timeout=1800
    )
    
    print(f"✅ Desplegament completat: {endpoint.resource_name}")
    return endpoint

# --- EXECUTAR EL FLUX ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Desplegar ALIA-40b amb diferents finestres de context.")
    parser.add_argument("context", nargs="?", default="16k", choices=["8k", "16k", "32k"], 
                        help="Mida del context (8k, 16k, 32k). Per defecte: 8k")
    
    args = parser.parse_args()

    try:
        endpoint = get_or_deploy_alia(args.context)

        # --- PROVA DE TRADUCCIÓ ---
        print(f"\n🧪 Provant el model ALIA ({args.context}) amb una pregunta en català...")
        
        prompt = """<|im_start|>user
Com li explicaries a un nen de 5 anys què és un ordinador? Respon en català.<|im_end|>
<|im_start|>assistant"""

        response = endpoint.predict(instances=[{
            "prompt": prompt,
            "max_tokens": 300,
            "temperature": 0.7
        }])
        print("\n🤖 Resposta de ALIA:\n")
        print(response.predictions[0])
        
    except Exception as e:
        print(f"\n❌ S'ha produït un error: {e}")
