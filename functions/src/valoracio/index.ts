import { onRequest } from "firebase-functions/v2/https"
import { setGlobalOptions } from "firebase-functions/v2/options"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import * as logger from "firebase-functions/logger"

import processStorageRoutes from "./lib/routes/processStorage"
import extractLotsRoutes from "./lib/routes/extractLots"
import evaluateLotRoutes from "./lib/routes/evaluateLot"
import compareProposalsRoutes from "./lib/routes/compareProposals"
import { errorHandler, notFound } from "./lib/middleware/errorHandler"

// Export valoracio metrics API functions
export { valoracioLogMetric, valoracioGetMetrics, valoracioSetupTable } from "./lib/routes/valoracioMetricsApi"

// Set global options for all functions
setGlobalOptions({
	region: "europe-west4",
	maxInstances: 100,
	memory: "512MiB",
})

const app = express()

// CORS configuration - allow localhost and 127.0.0.1 during development
const corsOptions = {
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) return callback(null, true)

		// Allow all origins in development/emulator
		callback(null, true)
	},
	credentials: true,
}

// CORS and middleware
app.use(cors(corsOptions))
app.use(helmet({ crossOriginEmbedderPolicy: false }))
app.use(compression())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Logging middleware
app.use((req, res, next) => {
	logger.info(`${req.method} ${req.path}`)
	next()
})

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		service: "valoracio",
	})
})

// API routes
app.use("/api/upload/process-storage", processStorageRoutes)
app.use("/api/:lang(ca|es|en)/extract-lots", extractLotsRoutes)
app.use("/api/:lang(ca|es|en)/evaluate-lot", evaluateLotRoutes)
app.use("/api/:lang(ca|es|en)/compare-proposals", compareProposalsRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Export as Firebase HTTP Function v2
export const valoracioApi = onRequest(
	{
		timeoutSeconds: 540,
		memory: "2GiB",
		cors: true,
	},
	app
)

// Individual endpoint exports (for direct invocation if needed)
export const extractLots = onRequest(
	{
		timeoutSeconds: 300,
		memory: "1GiB",
		cors: true,
	},
	(req, res) => {
		const expressApp = express()
		expressApp.use(cors({ origin: true }))
		expressApp.use(express.json({ limit: "50mb" }))
		expressApp.use("/api/:lang(ca|es|en)/extract-lots", extractLotsRoutes)
		expressApp.use(errorHandler)
		return expressApp(req, res)
	}
)

export const evaluateLot = onRequest(
	{
		timeoutSeconds: 540,
		memory: "2GiB",
		cors: true,
	},
	(req, res) => {
		const expressApp = express()
		expressApp.use(cors({ origin: true }))
		expressApp.use(express.json({ limit: "50mb" }))
		expressApp.use("/api/:lang(ca|es|en)/evaluate-lot", evaluateLotRoutes)
		expressApp.use(errorHandler)
		return expressApp(req, res)
	}
)

export const compareProposals = onRequest(
	{
		timeoutSeconds: 300,
		memory: "1GiB",
		cors: true,
	},
	(req, res) => {
		const expressApp = express()
		expressApp.use(cors({ origin: true }))
		expressApp.use(express.json({ limit: "50mb" }))
		expressApp.use("/api/:lang(ca|es|en)/compare-proposals", compareProposalsRoutes)
		expressApp.use(errorHandler)
		return expressApp(req, res)
	}
)
