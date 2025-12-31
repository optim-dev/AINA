from google.cloud import aiplatform

# --- CONFIGURACIÓN ---
PROJECT_ID = "aina-demostradors"  # <--- Asegúrate de que coincida con el de despliegue
REGION = "europe-west4"
ENDPOINT_DISPLAY_NAME = "salamandra-7b-endpoint"

def shutdown_salamandra():
    print(f"🔌 Iniciando protocolo de apagado para: {ENDPOINT_DISPLAY_NAME}...")
    
    aiplatform.init(project=PROJECT_ID, location=REGION)

    # 1. Buscar el endpoint activo
    endpoints = aiplatform.Endpoint.list(
        filter=f'display_name="{ENDPOINT_DISPLAY_NAME}"'
    )

    if not endpoints:
        print("✅ No se han encontrado endpoints activos. No se está facturando nada.")
        return

    # 2. Desplegar y Borrar
    for endpoint in endpoints:
        print(f"⚠️ Encontrado Endpoint activo: {endpoint.resource_name}")
        
        # Paso A: Undeploy (Esto es lo que DETIENE la facturación de la GPU)
        print("   ⏳ Retirando modelos (Undeploying)... esto puede tardar unos minutos.")
        endpoint.undeploy_all()
        
        # Paso B: Borrar el recurso vacío
        print("   🗑️ Borrando el objeto Endpoint...")
        endpoint.delete()
        
        print("✅ Endpoint eliminado correctamente. Facturación detenida.")

if __name__ == "__main__":
    shutdown_salamandra()
