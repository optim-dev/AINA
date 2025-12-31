import { onCall } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import * as logger from "firebase-functions/logger"

/**
 * Health check endpoint for monitoring system status
 * Tests connectivity to Firestore, Storage, and overall system health
 */
export const healthCheck = onCall({ region: "europe-west4", memory: "512MiB" }, async (request) => {
	const startTime = Date.now()

	try {
		logger.info("Health check initiated", {
			uid: request.auth?.uid,
			timestamp: new Date().toISOString(),
		})

		const checks: Record<string, any> = {
			timestamp: new Date().toISOString(),
			status: "healthy",
			services: {},
		}

		console.log("Starting health check...")
		// Check Firestore
		try {
			const db = admin.firestore()
			// Write a health check record
			await db.collection("_health_check").doc("last_check").set({
				timestamp: new Date(),
				status: "healthy",
			})
			checks.services.firestore = {
				status: "healthy",
				message: "Connected and responding",
			}
		} catch (error: any) {
			checks.services.firestore = {
				status: "error",
				message: error.message,
			}
			checks.status = "degraded"
		}

		// Check Storage
		try {
			const bucket = admin.storage().bucket()
			await bucket.exists()
			checks.services.storage = {
				status: "healthy",
				message: "Connected and accessible",
			}
		} catch (error: any) {
			checks.services.storage = {
				status: "error",
				message: error.message,
			}
			checks.status = "degraded"
		}

		// Check Auth
		try {
			// Verify that Auth service is available
			if (request.auth) {
				checks.services.auth = {
					status: "healthy",
					message: `User authenticated: ${request.auth.uid}`,
				}
			} else {
				checks.services.auth = {
					status: "warning",
					message: "No authenticated user",
				}
			}
		} catch (error: any) {
			checks.services.auth = {
				status: "error",
				message: error.message,
			}
			checks.status = "degraded"
		}

		// Add response time
		const responseTime = Date.now() - startTime
		checks.responseTime = `${responseTime}ms`

		logger.info("Health check completed", {
			status: checks.status,
			responseTime,
		})

		return {
			success: true,
			message: "Health check completed",
			data: checks,
		}
	} catch (error: any) {
		logger.error("Health check failed", error)

		return {
			success: false,
			message: "Health check failed",
			error: error.message,
			timestamp: new Date().toISOString(),
		}
	}
})

/**
 * Detailed system status endpoint
 * Provides comprehensive information about all system components
 */
export const systemStatus = onCall(async (request) => {
	try {
		logger.info("System status check initiated", {
			uid: request.auth?.uid,
		})

		const db = admin.firestore()
		const status: Record<string, any> = {
			timestamp: new Date().toISOString(),
			modules: {},
		}

		// Check Valoració module
		try {
			const valoracioSnapshot = await db.collection("valoracions").limit(1).get()
			status.modules.valoracio = {
				status: "healthy",
				collections: {
					valoracions: valoracioSnapshot.size,
				},
			}
		} catch (error: any) {
			status.modules.valoracio = {
				status: "error",
				message: error.message,
			}
		}

		// Check Elaboració module
		try {
			const decretsSnapshot = await db.collection("decrets").limit(1).get()
			status.modules.elaboracio = {
				status: "healthy",
				collections: {
					decrets: decretsSnapshot.size,
				},
			}
		} catch (error: any) {
			status.modules.elaboracio = {
				status: "error",
				message: error.message,
			}
		}

		// Check Kit module
		try {
			const kitSnapshot = await db.collection("linguistic_resources").limit(1).get()
			status.modules.kit = {
				status: "healthy",
				collections: {
					linguistic_resources: kitSnapshot.size,
				},
			}
		} catch (error: any) {
			status.modules.kit = {
				status: "error",
				message: error.message,
			}
		}

		logger.info("System status check completed")

		return {
			success: true,
			data: status,
		}
	} catch (error: any) {
		logger.error("System status check failed", error)

		return {
			success: false,
			message: "System status check failed",
			error: error.message,
		}
	}
})
