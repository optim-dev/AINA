import * as functions from "firebase-functions/v1"
import * as admin from "firebase-admin"
// import { FieldValue } from "firebase-admin/firestore"

/**
 * Cloud Function that triggers when a new user is created.
 * Creates a corresponding user document in Firestore with:
 * - UUID as document ID
 * - registerDate: timestamp of registration
 * - lastAccess: timestamp of registration (initially same as registerDate)
 * - email: user's email address
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
	const firestore = admin.firestore()
	const now = new Date() //FieldValue.serverTimestamp()

	try {
		await firestore
			.collection("users")
			.doc(user.uid)
			.set({
				registerDate: now,
				lastAccess: now,
				email: user.email || null,
			})

		functions.logger.info(`User document created for ${user.uid}`, {
			email: user.email,
		})
	} catch (error) {
		functions.logger.error(`Error creating user document for ${user.uid}:`, error)
		throw error
	}
})
