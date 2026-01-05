from google.cloud import aiplatform
import argparse

# --- CONFIGURACIÓ ---
PROJECT_ID = "aina-demostradors"
REGION = "europe-west4"
BASE_ENDPOINT_NAME = "alia-40b-endpoint"

def shutdown_alia(context_target="8k"):
    """
    Atura i elimina l'endpoint d'ALIA-40b per a un context específic.
    """
    if context_target not in ["8k", "16k", "32k"]:
        print(f"❌ Context target '{context_target}' no vàlid. Opcions: 8k, 16k, 32k")
        return
    
    endpoint_display_name = f"{BASE_ENDPOINT_NAME}-{context_target}"
    
    print(f"🔌 Iniciant protocol d'apagament per a: {endpoint_display_name}...")
    
    aiplatform.init(project=PROJECT_ID, location=REGION)

    # 1. Buscar l'endpoint actiu
    endpoints = aiplatform.Endpoint.list(
        filter=f'display_name="{endpoint_display_name}"'
    )

    if not endpoints:
        print("✅ No s'han trobat endpoints actius. No s'està facturant res.")
        return

    # 2. Undeploy i Borrar
    for endpoint in endpoints:
        print(f"⚠️ Trobat Endpoint actiu: {endpoint.resource_name}")
        
        # Pas A: Undeploy (Això és el que DETÉ la facturació de la GPU)
        print("   ⏳ Retirant models (Undeploying)... això pot trigar uns minuts.")
        endpoint.undeploy_all()
        
        # Pas B: Borrar el recurs buit
        print("   🗑️ Esborrant l'objecte Endpoint...")
        endpoint.delete()
        
        print("✅ Endpoint eliminat correctament. Facturació aturada.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aturar i eliminar endpoint d'ALIA-40b.")
    parser.add_argument("context", nargs="?", default="16k", choices=["8k", "16k", "32k"], 
                        help="Mida del context de l'endpoint a aturar (8k, 16k, 32k). Per defecte: 8k")
    
    args = parser.parse_args()
    
    shutdown_alia(args.context)
