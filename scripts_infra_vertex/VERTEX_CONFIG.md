Aquí explico por qué estos cambios son necesarios para Salamandra en Vertex AI:

A. --gpu-memory-utilization=0.90 (Vital en Vertex)
El problema: vLLM intenta, por defecto, ocupar el 90-95% de la VRAM para la caché de atención (KV Cache). Sin embargo, en Vertex AI, hay agentes de monitorización de Google corriendo en la misma GPU.

La solución: Si dejas el valor por defecto, vLLM y Vertex pelearán por la memoria y el contenedor "morirá" al arrancar. Bajarlo a 0.90 (o 0.85 si falla) deja espacio para el sistema.

B. --max-model-len=8192
El problema: Salamandra (basado en Mistral) técnicamente soporta ventanas de contexto enormes (32k). Sin embargo, una tarjeta L4 tiene 24GB de VRAM. Cargar el modelo (14GB aprox) + una ventana de 32k tokens no cabe en la memoria.

La solución: Limitamos la entrada a 8192 tokens. Esto es más que suficiente para la mayoría de casos de uso (RAG, chat) y garantiza que el modelo arranque rápido y estable.

C. --dtype=bfloat16
Confirmación: Lo tenías puesto y es la opción correcta. Las GPUs L4 (arquitectura Ada Lovelace) están optimizadas para bfloat16. No uses float16 estándar si puedes evitarlo, ya que bfloat16 es numéricamente más estable durante la inferencia.

3. Nota sobre el Prompt (Formato ChatML)
   En tu código de prueba (**main**), veo que usas:

Python

prompt = """<|im_start|>user
...
<|im_start|>assistant"""
Esto es correcto. Salamandra ha sido entrenado ("fine-tuned") usando el formato ChatML. Si no usas estos tokens especiales, el modelo tenderá a alucinar o no sabrá cuándo parar de escribir.
