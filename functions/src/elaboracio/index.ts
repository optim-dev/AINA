// Export Elaboracio module functions
export { extractSubvencio } from "./lib/routes/extractSubvencio"

// Export Elaboracio metrics API
export { elaboracioLogMetric, elaboracioGetMetrics, elaboracioSetupTable } from "./lib/routes/elaboracioMetricsApi"

// import * as functions from "firebase-functions"
// import * as admin from "firebase-admin"

// const db = admin.firestore()

// // Create item in Module 2
// export const createModule2Item = functions.https.onCall(async (data, context) => {
// 	if (!context.auth) {
// 		throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
// 	}

// 	const { title, content, status = "draft" } = data
// 	const userId = context.auth.uid

// 	if (!title || !content) {
// 		throw new functions.https.HttpsError("invalid-argument", "Title and content are required")
// 	}

// 	// Validate status
// 	const validStatuses = ["draft", "published", "archived"]
// 	if (!validStatuses.includes(status)) {
// 		throw new functions.https.HttpsError("invalid-argument", "Invalid status value")
// 	}

// 	try {
// 		const docRef = await db.collection("module2").add({
// 			title,
// 			content,
// 			status,
// 			userId,
// 			createdAt: admin.firestore.FieldValue.serverTimestamp(),
// 			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
// 		})

// 		return { id: docRef.id, success: true }
// 	} catch (error) {
// 		console.error("Error creating module2 item:", error)
// 		throw new functions.https.HttpsError("internal", "Error creating item")
// 	}
// })

// // Update item in Module 2
// export const updateModule2Item = functions.https.onCall(async (data, context) => {
// 	if (!context.auth) {
// 		throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
// 	}

// 	const { id, title, content, status } = data
// 	const userId = context.auth.uid

// 	if (!id) {
// 		throw new functions.https.HttpsError("invalid-argument", "Item ID is required")
// 	}

// 	try {
// 		const docRef = db.collection("module2").doc(id)
// 		const doc = await docRef.get()

// 		if (!doc.exists) {
// 			throw new functions.https.HttpsError("not-found", "Item not found")
// 		}

// 		if (doc.data()?.userId !== userId) {
// 			throw new functions.https.HttpsError("permission-denied", "Not authorized to update this item")
// 		}

// 		const updateData: any = {
// 			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
// 		}

// 		if (title) updateData.title = title
// 		if (content) updateData.content = content
// 		if (status) {
// 			const validStatuses = ["draft", "published", "archived"]
// 			if (!validStatuses.includes(status)) {
// 				throw new functions.https.HttpsError("invalid-argument", "Invalid status value")
// 			}
// 			updateData.status = status
// 		}

// 		await docRef.update(updateData)
// 		return { success: true }
// 	} catch (error) {
// 		console.error("Error updating module2 item:", error)
// 		throw new functions.https.HttpsError("internal", "Error updating item")
// 	}
// })

// // Delete item in Module 2
// export const deleteModule2Item = functions.https.onCall(async (data, context) => {
// 	if (!context.auth) {
// 		throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
// 	}

// 	const { id } = data
// 	const userId = context.auth.uid

// 	if (!id) {
// 		throw new functions.https.HttpsError("invalid-argument", "Item ID is required")
// 	}

// 	try {
// 		const docRef = db.collection("module2").doc(id)
// 		const doc = await docRef.get()

// 		if (!doc.exists) {
// 			throw new functions.https.HttpsError("not-found", "Item not found")
// 		}

// 		if (doc.data()?.userId !== userId) {
// 			throw new functions.https.HttpsError("permission-denied", "Not authorized to delete this item")
// 		}

// 		await docRef.delete()
// 		return { success: true }
// 	} catch (error) {
// 		console.error("Error deleting module2 item:", error)
// 		throw new functions.https.HttpsError("internal", "Error deleting item")
// 	}
// })

// // Publish item - change status from draft to published
// export const publishModule2Item = functions.https.onCall(async (data, context) => {
// 	if (!context.auth) {
// 		throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
// 	}

// 	const { id } = data
// 	const userId = context.auth.uid

// 	if (!id) {
// 		throw new functions.https.HttpsError("invalid-argument", "Item ID is required")
// 	}

// 	try {
// 		const docRef = db.collection("module2").doc(id)
// 		const doc = await docRef.get()

// 		if (!doc.exists) {
// 			throw new functions.https.HttpsError("not-found", "Item not found")
// 		}

// 		if (doc.data()?.userId !== userId) {
// 			throw new functions.https.HttpsError("permission-denied", "Not authorized to publish this item")
// 		}

// 		await docRef.update({
// 			status: "published",
// 			publishedAt: admin.firestore.FieldValue.serverTimestamp(),
// 			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
// 		})

// 		return { success: true }
// 	} catch (error) {
// 		console.error("Error publishing module2 item:", error)
// 		throw new functions.https.HttpsError("internal", "Error publishing item")
// 	}
// })

// // Firestore trigger: Update search index when item is created or updated
// export const onModule2ItemWritten = functions.firestore.document("module2/{itemId}").onWrite(async (change, context) => {
// 	const itemId = context.params.itemId

// 	if (!change.after.exists) {
// 		console.log(`Module2 item deleted: ${itemId}`)
// 		return null
// 	}

// 	const data = change.after.data()
// 	console.log(`Module2 item written: ${itemId}`, data)

// 	// Example: Update search index, send notifications, etc.
// 	return null
// })

// // Scheduled function: Archive old published items (runs daily at midnight)
// export const archiveOldModule2Items = functions.pubsub
// 	.schedule("0 0 * * *")
// 	.timeZone("Europe/Madrid")
// 	.onRun(async (context) => {
// 		const thirtyDaysAgo = new Date()
// 		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

// 		const snapshot = await db.collection("module2").where("status", "==", "published").where("publishedAt", "<", thirtyDaysAgo).get()

// 		const batch = db.batch()
// 		snapshot.docs.forEach((doc) => {
// 			batch.update(doc.ref, {
// 				status: "archived",
// 				archivedAt: admin.firestore.FieldValue.serverTimestamp(),
// 			})
// 		})

// 		await batch.commit()
// 		console.log(`Archived ${snapshot.size} old Module2 items`)
// 		return null
// 	})
