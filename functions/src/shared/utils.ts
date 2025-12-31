import {HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Validation middleware for Cloud Functions
 */
export function validateFields(data: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    throw new HttpsError("invalid-argument", `Missing required fields: ${missingFields.join(", ")}`);
  }
}

/**
 * Check if user is authenticated (for callable functions)
 */
export function requireAuth(auth: any): string {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return auth.uid;
}

/**
 * Error handler wrapper for Cloud Functions
 */
export function withErrorHandler<T>(fn: () => Promise<T>, errorMessage = "An error occurred"): Promise<T> {
  return fn().catch((error) => {
    logger.error(errorMessage, error);
    throw new HttpsError("internal", errorMessage);
  });
}

/**
 * Rate limiting check (simple implementation)
 * In production, use Redis or Firestore for distributed rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, maxRequests = 100, windowMs = 60000): void {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return;
  }

  if (userLimit.count >= maxRequests) {
    throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
  }

  userLimit.count++;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Format error response
 */
export function formatErrorResponse(error: any): { success: false; error: string } {
  return {
    success: false,
    error: error.message || "An unexpected error occurred",
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse<T>(data: T): { success: true; data: T } {
  return {
    success: true,
    data,
  };
}
