1. Crear el Entorno Virtual
   Abre tu terminal (o línea de comandos) en la carpeta donde tienes guardado tu archivo .py y ejecuta:

En Windows:

Bash

python -m venv venv
En Mac / Linux:

Bash

python3 -m venv venv 2. Activar el Entorno
Una vez creado, debes activarlo para que las librerías se instalen ahí y no en tu sistema global.

En Windows:

Bash

.\venv\Scripts\activate
En Mac / Linux:

Bash

source venv/bin/activate
(Sabrás que está activo porque verás (venv) al principio de la línea de comandos).

3. Instalar las Dependencias
   El código que has compartido utiliza dos librerías principales: aiplatform (Vertex AI) y storage (Google Cloud Storage). Instálalas con pip:

Bash

pip install google-cloud-aiplatform google-cloud-storage 4. Autenticación con Google Cloud (¡Importante!)
Para que el script tenga permiso de crear Buckets y Endpoints en tu proyecto, necesitas autenticarte localmente. Asegúrate de tener instalado el Google Cloud CLI y ejecuta:

Bash

gcloud auth application-default login
(Esto abrirá una ventana en tu navegador para que inicies sesión con tu cuenta de Google Cloud).

5. Antes de ejecutar el script
   Recuerda editar las variables de configuración al inicio de tu archivo Python, ya que ahora tienen valores de ejemplo:

PROJECT_ID: Cambia "teu-project-id" por el ID real de tu proyecto en Google Cloud.

STAGING_BUCKET: Cambia "gs://teu-nom-unic-staging-bucket" por un nombre único (ej. gs://mi-proyecto-vertex-staging).

Resumen de comandos (Copy & Paste)
Si estás en Mac/Linux, puedes copiar y pegar esto directamente:

Bash

# 1. Crear y activar entorno

python3 -m venv venv
source venv/bin/activate

# 2. Instalar librerías

pip install google-cloud-aiplatform google-cloud-storage

# 3. Autenticar (si ya tienes gcloud instalado)

gcloud auth application-default login

# per saber quins recursos estan corrent ( i apagarlos si cal)

gcloud ai endpoints list --region=europe-west4 =>
=> gcloud ai endpoints delete 4985443006057283584<ENDPOINT_ID> --region=europe-west4 --quiet
gcloud ai models list --region=europe-west4
=> gcloud ai models delete 7524549606126911488 --region=europe-west4 --quiet

gcloud ai endpoints delete 6597837225772187648 --region=europe-west4 --quiet && gcloud ai models delete 7524549606126911488 --region=europe-west4 --quiet

## 6. Gestión del Ciclo de Vida (Lifecycle & Shutdown)

Este proyecto incluye scripts para gestionar el ciclo de vida completo del modelo Salamandra en Vertex AI.

### `lifecycle.py` (Despliegue)

Este script se encarga de:

1. Verificar/Crear el bucket de staging.
2. Importar el modelo Salamandra 7B Instruct desde Hugging Face si no existe.
3. Desplegar el modelo en un Endpoint de Vertex AI utilizando una GPU NVIDIA L4.

**Uso:**

```bash
python lifecycle.py
```

### `shutdown.py` (Apagado)

Este script es CRÍTICO para evitar costes innecesarios. Se encarga de:

1. Buscar el endpoint activo.
2. Retirar todos los modelos desplegados (Undeploy).
3. Eliminar el endpoint.

**Uso:**

```bash
python shutdown.py
```

### ⚠️ AVISO DE COSTES

Mantener un endpoint con GPU (NVIDIA L4) activo tiene un coste elevado por hora. **Es imperativo apagar el endpoint cuando no se esté utilizando.**

### 🕒 Automatización (Cron Job)

Se recomienda encarecidamente configurar una tarea programada (cron job) para asegurar que el entorno se apague automáticamente cada noche, evitando sorpresas en la facturación si se olvida apagar manualmente.

**Ejemplo de crontab (ejecutar cada noche a las 23:00):**

```bash
0 23 * * * cd /ruta/absoluta/a/scripts_infra && /ruta/absoluta/a/scripts_infra/venv/bin/python shutdown.py >> /tmp/shutdown.log 2>&1
```
