/**
 * Example: Using Context Window Management
 *
 * This file demonstrates how to handle large documents with the new context window
 * management features in LLMService.
 */

import { createAliaService, createGeminiService, getLLMServiceForModel, ContextWindowExceededError } from "../LLMService"
import { mapReduce } from "../PromptChunking"

// ============================================================================
// EXAMPLE 1: Auto-Fallback (Default Behavior)
// ============================================================================

export async function example1_AutoFallback() {
	console.log("=== Example 1: Auto-Fallback ===\n")

	// Create ALIA service with 16k context window
	// Auto-fallback is enabled by default
	const service = createAliaService(
		"aina-demostradors",
		"europe-west4",
		"16k",
		true // autoFallback = true (default)
	)

	// Simulate a large prompt (46k tokens)
	const largeTenderDocument = generateLargeTenderDocument(46_000)

	console.log("Sending large prompt (46k tokens) to ALIA-16k...")
	console.log("Expected: Auto-fallback to Gemini Flash (1M context)\n")

	try {
		const response = await service.callModel({
			prompt: `Extract all 'lots' from this tender specification:\n\n${largeTenderDocument}`,
			jsonResponse: true,
		})

		console.log("✅ Success!")
		console.log(`Provider used: ${response.provider}`)
		console.log(`Fallback used: ${response.metadata?.fallbackUsed}`)
		console.log(`Original provider: ${response.metadata?.originalProvider}`)
		console.log(`Tokens used: ${response.usage.totalTokens}`)
		console.log(`Latency: ${response.latencyMs}ms`)

		return response
	} catch (error) {
		console.error("❌ Error:", error)
		throw error
	}
}

// ============================================================================
// EXAMPLE 2: Explicit Fallback Disabled
// ============================================================================

export async function example2_NoFallback() {
	console.log("\n=== Example 2: No Fallback (Error Handling) ===\n")

	// Create ALIA service with fallback disabled
	const service = createAliaService(
		"aina-demostradors",
		"europe-west4",
		"16k",
		false // autoFallback = false
	)

	const largeTenderDocument = generateLargeTenderDocument(46_000)

	console.log("Sending large prompt (46k tokens) to ALIA-16k with fallback disabled...")
	console.log("Expected: ContextWindowExceededError\n")

	try {
		await service.callModel({
			prompt: `Extract all 'lots' from this tender specification:\n\n${largeTenderDocument}`,
			jsonResponse: true,
		})

		console.error("❌ Should have thrown ContextWindowExceededError")
	} catch (error: unknown) {
		if (error instanceof ContextWindowExceededError) {
			console.log("✅ Caught expected error:")
			console.log(`Prompt tokens: ${error.promptTokens}`)
			console.log(`Max tokens: ${error.maxTokens}`)
			console.log(`Provider: ${error.provider}`)
			console.log(`Message: ${error.message}`)
		} else {
			console.error("❌ Unexpected error:", error)
			throw error
		}
	}
}

// ============================================================================
// EXAMPLE 3: Manual Model Selection
// ============================================================================

export async function example3_ManualSelection() {
	console.log("\n=== Example 3: Manual Model Selection ===\n")

	const largeTenderDocument = generateLargeTenderDocument(46_000)

	// Manually choose Gemini for large documents
	console.log("Manually selecting Gemini Flash for large document...")
	const geminiService = createGeminiService("aina-demostradors", "europe-west4", "gemini-2.5-flash")

	const response = await geminiService.callModel({
		prompt: `Extract all 'lots' from this tender specification:\n\n${largeTenderDocument}`,
		jsonResponse: true,
	})

	console.log("✅ Success!")
	console.log(`Provider: ${response.provider}`)
	console.log(`Tokens used: ${response.usage.totalTokens}`)
	console.log(`Latency: ${response.latencyMs}ms`)

	return response
}

// ============================================================================
// EXAMPLE 4: Map-Reduce for Very Large Documents
// ============================================================================

export async function example4_MapReduce() {
	console.log("\n=== Example 4: Map-Reduce Chunking ===\n")

	// Simulate a VERY large document (100k tokens)
	const massiveTenderDocument = generateLargeTenderDocument(100_000)

	console.log("Processing massive document (100k tokens) with map-reduce...")
	console.log("Chunking into ~12k token pieces, processing with ALIA-16k\n")

	// Use ALIA for cost efficiency
	const service = createAliaService("aina-demostradors", "europe-west4", "16k")

	const result = await mapReduce(
		service,
		massiveTenderDocument,
		{
			// MAP: Process each chunk
			mapInstruction: `Extract all 'lots' from this tender specification section. 
Return a JSON array of lots with their properties (name, description, budget).
Example: [{"name": "Lot 1", "description": "...", "budget": "100000"}]`,

			// REDUCE: Combine results
			reduceInstruction: `You have received lot extractions from multiple document sections.
Merge all lots into a single JSON array, removing duplicates based on lot name.
Return the final consolidated JSON array of lots.`,

			includeMetadata: true, // Include chunk metadata in prompts
		},
		{
			maxTokensPerChunk: 12_000, // Safe for ALIA-16k (16k - 4k output = 12k input)
			overlapTokens: 500, // Overlap for context preservation
			strategy: "paragraph", // Chunk by paragraphs to preserve structure
		}
	)

	console.log("✅ Map-Reduce completed!")
	console.log(`Total chunks processed: ${result.metadata?.totalChunks}`)
	console.log(`Map tokens: ${result.metadata?.mapTokens}`)
	console.log(`Reduce tokens: ${result.metadata?.reduceTokens}`)
	console.log(`Total tokens: ${result.usage.totalTokens}`)
	console.log(`Total latency: ${result.latencyMs}ms`)
	console.log(`Lots extracted: ${result.json?.length || 0}`)

	return result
}

// ============================================================================
// EXAMPLE 5: Smart Model Selection Based on Size
// ============================================================================

export async function example5_SmartSelection(documentTokens: number) {
	console.log(`\n=== Example 5: Smart Model Selection (${documentTokens} tokens) ===\n`)

	const document = generateLargeTenderDocument(documentTokens)

	// Choose model based on document size
	let service
	let modelName

	if (documentTokens < 12_000) {
		console.log("Small document → Using ALIA-16k (Catalan-optimized)")
		service = createAliaService("aina-demostradors", "europe-west4", "16k")
		modelName = "ALIA-16k"
	} else if (documentTokens < 30_000) {
		console.log("Medium document → Using ALIA-32k (Catalan-optimized)")
		service = createAliaService("aina-demostradors", "europe-west4", "32k")
		modelName = "ALIA-32k"
	} else if (documentTokens < 100_000) {
		console.log("Large document → Using Gemini Flash (1M context)")
		service = createGeminiService("aina-demostradors", "europe-west4", "gemini-2.5-flash")
		modelName = "Gemini Flash"
	} else {
		console.log("Massive document → Using Map-Reduce with ALIA-16k")
		return example4_MapReduce()
	}

	const response = await service.callModel({
		prompt: `Extract all 'lots' from this tender specification:\n\n${document}`,
		jsonResponse: true,
	})

	console.log(`✅ Success with ${modelName}!`)
	console.log(`Provider: ${response.provider}`)
	console.log(`Tokens used: ${response.usage.totalTokens}`)
	console.log(`Latency: ${response.latencyMs}ms`)

	return response
}

// ============================================================================
// EXAMPLE 6: Using getLLMServiceForModel (Frontend Integration)
// ============================================================================

export async function example6_FrontendIntegration(modelId: string, documentSize: "small" | "large") {
	console.log(`\n=== Example 6: Frontend Integration (model: ${modelId}) ===\n`)

	// This is how the API endpoint receives model selection from frontend
	const service = getLLMServiceForModel(modelId)

	const document = documentSize === "small" ? generateLargeTenderDocument(5_000) : generateLargeTenderDocument(50_000)

	console.log(`Processing ${documentSize} document with ${modelId}...`)

	try {
		const response = await service.callModel({
			prompt: `Extract key information from this tender:\n\n${document}`,
			jsonResponse: true,
		})

		console.log("✅ Success!")
		console.log(`Provider: ${response.provider}`)
		console.log(`Fallback used: ${response.metadata?.fallbackUsed || false}`)
		console.log(`Tokens: ${response.usage.totalTokens}`)

		return response
	} catch (error) {
		console.error("❌ Error:", error)
		throw error
	}
}

// ============================================================================
// HELPER: Generate Test Documents
// ============================================================================

function generateLargeTenderDocument(targetTokens: number): string {
	// Rough estimate: 4.5 characters per token for Catalan
	const targetChars = targetTokens * 4.5

	const sections = [
		"PLEC DE CLÀUSULES ADMINISTRATIVES PARTICULARS",
		"1. OBJECTE DEL CONTRACTE",
		"2. REQUISITS DELS LICITADORS",
		"3. PRESSUPOST BASE DE LICITACIÓ",
		"4. CRITERIS D'ADJUDICACIÓ",
		"5. LOTS I DESCOMPOSICIÓ",
		"6. DOCUMENTACIÓ A PRESENTAR",
		"7. GARANTIES",
		"8. FORMA DE PAGAMENT",
		"9. PENALITATS",
		"10. MODIFICACIONS DEL CONTRACTE",
	]

	let document = "PLEC DE CONDICIONS - LICITACIÓ PÚBLICA\n\n"

	// Add repetitive content to reach target size
	while (document.length < targetChars) {
		for (const section of sections) {
			document += `\n\n${section}\n${"=".repeat(50)}\n\n`
			document += `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. 
Aquest és un document de licitació pública per a l'adquisició de serveis.
El pressupost base és de 1.000.000 EUR (IVA exclòs).
Els lots són els següents:
- Lot 1: Desenvolupament de software (500.000 EUR)
- Lot 2: Manteniment i suport (300.000 EUR)  
- Lot 3: Formació i documentació (200.000 EUR)
Les empreses interessades han de presentar la documentació requerida.\n`

			if (document.length >= targetChars) break
		}
	}

	return document.substring(0, Math.floor(targetChars))
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

export async function runAllExamples() {
	try {
		console.log("\n" + "=".repeat(70))
		console.log("CONTEXT WINDOW MANAGEMENT EXAMPLES")
		console.log("=".repeat(70))

		await example1_AutoFallback()
		await example2_NoFallback()
		await example3_ManualSelection()
		await example4_MapReduce()

		// Test different sizes
		await example5_SmartSelection(8_000) // Small
		await example5_SmartSelection(25_000) // Medium
		await example5_SmartSelection(80_000) // Large

		// Test frontend integration
		await example6_FrontendIntegration("gemini-2.5-flash", "small")
		await example6_FrontendIntegration("alia-40b-vertex", "large")

		console.log("\n" + "=".repeat(70))
		console.log("✅ ALL EXAMPLES COMPLETED SUCCESSFULLY")
		console.log("=".repeat(70) + "\n")
	} catch (error) {
		console.error("\n❌ Example failed:", error)
		throw error
	}
}

// Uncomment to run examples:
// runAllExamples().catch(console.error)
