/**
 * REQUISITS:
 * npm install @google-cloud/aiplatform @google-cloud/storage
 */

const { Storage } = require("@google-cloud/storage")
const { EndpointServiceClient, ModelServiceClient, PredictionServiceClient } = require("@google-cloud/aiplatform")
const { helpers } = require("@google-cloud/aiplatform") // Helper to convert JSON to Protobuf Value

// --- CONFIGURACIÓ ---
const PROJECT_ID = "aina-474214" // <--- POSA EL TEU ID AQUÍ
const REGION = "europe-west4"
const STAGING_BUCKET_NAME = `${PROJECT_ID}-vertex-staging`
const STAGING_BUCKET_URI = `gs://${STAGING_BUCKET_NAME}`

const ENDPOINT_DISPLAY_NAME = "salamandra-7b-endpoint"
const MODEL_DISPLAY_NAME = "salamandra-7b-instruct"
const HF_MODEL_ID = "BSC-LT/salamandra-7b-instruct"

// Imatge Docker
const VLLM_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:20251211_0916_RC01_stable"

// Per Node.js, hem de definir l'API endpoint específic per la regió
const API_ENDPOINT = `${REGION}-aiplatform.googleapis.com`
const CLIENT_OPTIONS = { apiEndpoint: API_ENDPOINT }

// --- CLIENTS ---
const storage = new Storage({ projectId: PROJECT_ID })
const modelClient = new ModelServiceClient(CLIENT_OPTIONS)
const endpointClient = new EndpointServiceClient(CLIENT_OPTIONS)
const predictionClient = new PredictionServiceClient(CLIENT_OPTIONS)

/**
 * Comprova si el bucket existeix. Si no, el crea.
 */
async function garantizarBucket() {
	console.log(`🔍 Comprovant bucket: ${STAGING_BUCKET_URI}...`)
	const bucket = storage.bucket(STAGING_BUCKET_NAME)

	try {
		const [exists] = await bucket.exists()
		if (exists) {
			console.log(`✅ Bucket existent trobat.`)
		} else {
			console.log(`⚠️ El bucket no existeix. Creant-lo a ${REGION}...`)
			await bucket.create({ location: REGION })
			console.log(`✅ Bucket creat correctament.`)
		}
	} catch (err) {
		console.error(`❌ Error gestionant el bucket:`, err.message)
		throw err
	}
}

async function getOrDeploySalamandra() {
	const parent = `projects/${PROJECT_ID}/locations/${REGION}`

	// 0. Bucket
	await garantizarBucket()

	// 1. COMPROVAR SI L'ENDPOINT JA EXISTEIX
	console.log(`🔍 Buscant endpoint existent: '${ENDPOINT_DISPLAY_NAME}'...`)
	const [endpoints] = await endpointClient.listEndpoints({
		parent,
		filter: `display_name="${ENDPOINT_DISPLAY_NAME}"`,
	})

	if (endpoints.length > 0) {
		const endpoint = endpoints[0]
		console.log(`✅ Endpoint trobat: ${endpoint.name}`)
		console.log("   Connectant directament...")
		return endpoint
	}

	console.log("❌ No s'ha trobat cap endpoint actiu.")

	// 2. COMPROVAR SI EL MODEL JA ESTÀ AL REGISTRE
	console.log(`🔍 Buscant model al registre: '${MODEL_DISPLAY_NAME}'...`)
	const [models] = await modelClient.listModels({
		parent,
		filter: `display_name="${MODEL_DISPLAY_NAME}"`,
	})

	let modelResourceName

	if (models.length > 0) {
		modelResourceName = models[0].name
		console.log(`✅ Model trobat al registre: ${modelResourceName}`)
	} else {
		console.log("❌ El model no està importat. Important des de Hugging Face...")

		// Configuració del model
		const modelObj = {
			displayName: MODEL_DISPLAY_NAME,
			artifactUri: STAGING_BUCKET_URI, // Vertex necessita un lloc on deixar artifacts
			containerSpec: {
				imageUri: VLLM_DOCKER_URI,
				command: ["python", "-m", "vllm.entrypoints.api_server"],
				args: [`--model=${HF_MODEL_ID}`, "--dtype=bfloat16", "--tensor-parallel-size=1", "--gpu-memory-utilization=0.90", "--max-model-len=8192", "--trust-remote-code", "--disable-log-stats"],
				ports: [{ containerPort: 8000 }],
				predictRoute: "/generate",
				healthRoute: "/health",
			},
		}

		const [operation] = await modelClient.uploadModel({
			parent,
			model: modelObj,
		})

		console.log("⏳ Important model (això trigarà uns minuts)...")
		const [response] = await operation.promise()
		modelResourceName = response.model
		console.log("✅ Model importat correctament:", modelResourceName)
	}

	// 3. CREAR L'ENDPOINT (Si no existia)
	console.log("🚀 Creant un nou Endpoint...")
	const [createEndpointOp] = await endpointClient.createEndpoint({
		parent,
		endpoint: { displayName: ENDPOINT_DISPLAY_NAME },
	})

	const [createEndpointResponse] = await createEndpointOp.promise()
	const endpointName = createEndpointResponse.name
	const endpointId = endpointName.split("/").pop() // Necessitem l'ID per al deploy
	console.log(`✅ Endpoint creat: ${endpointName}`)

	// 4. DESPLEGAR EL MODEL A L'ENDPOINT
	console.log(`🚀 Desplegant model a l'endpoint (això trigarà ~15-20 mins)...`)

	const deployModelReq = {
		endpoint: endpointName,
		deployedModel: {
			model: modelResourceName,
			displayName: MODEL_DISPLAY_NAME,
			dedicatedResources: {
				machineSpec: {
					machineType: "g2-standard-8", // NVIDIA L4
					acceleratorType: "NVIDIA_L4",
					acceleratorCount: 1,
				},
				minReplicaCount: 1,
				maxReplicaCount: 1,
			},
		},
		trafficSplit: { 0: 100 }, // 100% tràfic al nou model (ID "0" és automàtic pel primer deployment)
	}

	const [deployOp] = await endpointClient.deployModel(deployModelReq)
	await deployOp.promise()

	console.log(`✅ Desplegament completat!`)

	// Tornem l'objecte endpoint (que conté el name complet)
	return { name: endpointName }
}

async function main() {
	try {
		const endpoint = await getOrDeploySalamandra()
		const endpointName = endpoint.name

		// --- PROVA DE TRADUCCIÓ ---
		console.log("\n🧪 Provant el model amb una pregunta en català...")

		const prompt = `<|im_start|>user
Com li explicaries a un nen de 5 anys què és un ordinador? Respon en català.<|im_end|>
<|im_start|>assistant`

		const instanceValue = helpers.toValue({
			prompt: prompt,
			max_tokens: 300,
			temperature: 0.7,
		})

		const request = {
			endpoint: endpointName,
			instances: [instanceValue],
		}

		const [response] = await predictionClient.predict(request)

		console.log("\n🤖 Resposta de Salamandra:\n")
		// La resposta ve en format protobuf, cal netejar-la
		if (response.predictions && response.predictions.length > 0) {
			const result = helpers.fromValue(response.predictions[0])
			console.log(result)
		} else {
			console.log("No s'ha rebut predicció.")
		}
	} catch (err) {
		console.error("\n❌ S'ha produït un error:", err)
	}
}

main()
