// API Service per a Valoració d'Ofertes
import type { FileContent, LotInfo, LotEvaluation, EvaluationResult, SingleLotEvaluationResult, ComparisonResult, UploadResponse } from "../types"
import { ref, uploadBytesResumable } from "firebase/storage"
import { storage } from "../../../services/firebase"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

class ApiService {
	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${API_BASE_URL}${endpoint}`

		const config: RequestInit = {
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
			...options,
		}

		try {
			const response = await fetch(url, config)

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
			}

			return await response.json()
		} catch (error) {
			console.error(`API Error en ${endpoint}:`, error)
			throw error
		}
	}

	// New method: Upload to Firebase Storage, then process via Cloud Function
	async uploadFilesViaStorage(files: File[], type: "specification" | "proposal", onProgress?: (progress: number) => void): Promise<UploadResponse> {
		const uploadedPaths: string[] = []

		try {
			// Upload each file to Firebase Storage
			for (let i = 0; i < files.length; i++) {
				const file = files[i]
				const timestamp = Date.now()
				const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
				const storagePath = `uploads/${type}/${timestamp}_${sanitizedName}`

				const storageRef = ref(storage, storagePath)
				const uploadTask = uploadBytesResumable(storageRef, file)

				// Track upload progress
				await new Promise<void>((resolve, reject) => {
					uploadTask.on(
						"state_changed",
						(snapshot) => {
							const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
							const overallProgress = ((i + progress / 100) / files.length) * 50 // First 50% is upload
							onProgress?.(overallProgress)
						},
						(error) => reject(error),
						() => resolve()
					)
				})

				uploadedPaths.push(storagePath)
			}

			onProgress?.(50) // Upload complete, now processing

			// Call Cloud Function to process the uploaded files
			const response = await this.makeRequest<UploadResponse>("/upload/process-storage", {
				method: "POST",
				body: JSON.stringify({
					filePaths: uploadedPaths,
					type,
				}),
			})

			onProgress?.(100)
			return response
		} catch (error) {
			console.error("Upload via storage error:", error)
			throw error
		}
	}

	async extractLots(specifications: FileContent[], model?: string): Promise<LotInfo[]> {
		return this.makeRequest<LotInfo[]>("/ca/extract-lots", {
			method: "POST",
			body: JSON.stringify({ specifications, model }),
		})
	}

	async evaluateSingleLot(specifications: FileContent[], proposals: FileContent[], lotInfo: LotInfo, model?: string): Promise<SingleLotEvaluationResult> {
		console.log(`Starting evaluation for lot ${lotInfo.lotNumber}: ${lotInfo.title}`)

		return this.makeRequest<SingleLotEvaluationResult>("/ca/evaluate-lot", {
			method: "POST",
			body: JSON.stringify({
				specifications,
				proposals,
				lotInfo,
				model,
			}),
		})
	}

	async evaluateAllLots(
		specifications: FileContent[],
		proposals: FileContent[],
		lots: LotInfo[],
		onProgress?: (progress: { currentLot: number; totalLots: number; currentLotTitle: string }) => void,
		model?: string
	): Promise<EvaluationResult> {
		console.log("Starting evaluation for all lots...")

		const allEvaluations: LotEvaluation[] = []
		const totalLots = lots.length

		for (let i = 0; i < lots.length; i++) {
			const lot = lots[i]

			if (onProgress) {
				onProgress({
					currentLot: i + 1,
					totalLots,
					currentLotTitle: lot.title,
				})
			}

			const lotProposals = proposals.filter((p) => p.lotNumber === lot.lotNumber)
			const lotResult = await this.evaluateSingleLot(specifications, lotProposals, lot, model)
			allEvaluations.push(...lotResult.evaluations)
		}

		const result: EvaluationResult = {
			lots: allEvaluations,
			extractedLots: lots,
			overallSummary: this.generateOverallSummary(allEvaluations, lots),
			overallRecommendation: this.generateOverallRecommendation(allEvaluations, lots),
			completedLots: lots.length,
			totalLots: lots.length,
			isComplete: true,
		}

		return result
	}

	private generateOverallSummary(evaluations: LotEvaluation[], lots: LotInfo[]): string {
		const totalProposals = evaluations.filter((e) => e.hasProposal).length
		const companiesIdentified = evaluations.filter((e) => e.companyName !== null).length

		return (
			`S'han avaluat ${totalProposals} propostes distribuïdes en ${lots.length} lots. ` +
			`S'han identificat automàticament ${companiesIdentified} empreses de ${totalProposals} propostes presentades. ` +
			`L'avaluació ha estat completada amb èxit utilitzant criteris específics per cada lot.`
		)
	}

	private generateOverallRecommendation(_evaluations: LotEvaluation[], lots: LotInfo[]): string {
		const hasMultipleLots = lots.length > 1

		if (hasMultipleLots) {
			return (
				`Es recomana revisar individualment cada lot i les seves respectives avaluacions. ` +
				`Cada lot ha estat avaluat segons els seus criteris específics i requereix una anàlisi detallada ` +
				`per prendre decisions informades sobre l'adjudicació.`
			)
		} else {
			return `Es recomana revisar detingudament l'avaluació realitzada per prendre una decisió ` + `informada sobre l'adjudicació d'aquest lot únic.`
		}
	}

	async compareProposals(specifications: FileContent[], lotInfo: LotInfo, evaluatedProposals: LotEvaluation[], model?: string): Promise<ComparisonResult> {
		console.log("API Service - compareProposals called with:", {
			specificationsCount: specifications.length,
			lotInfo,
			evaluatedProposalsCount: evaluatedProposals.length,
		})

		const requestBody = {
			specifications,
			lotInfo,
			evaluatedProposals,
			model,
		}

		return this.makeRequest<ComparisonResult>("/ca/compare-proposals", {
			method: "POST",
			body: JSON.stringify(requestBody),
		})
	}

	async healthCheck(): Promise<{
		status: string
		timestamp: string
		version: string
	}> {
		const response = await fetch(`${API_BASE_URL.replace("/api", "")}/health`)
		return await response.json()
	}
}

export const apiService = new ApiService()
