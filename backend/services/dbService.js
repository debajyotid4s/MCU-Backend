/**
 * Firebase Database Service
 * 
 * Handles all Firebase Realtime Database operations.
 * Provides CRUD operations for storing and retrieving Gemini responses.
 * 
 * Database Structure:
 * /responses/{request_id}
 *   - text: string (AI response)
 *   - status: 'pending' | 'completed' | 'error'
 *   - timestamp: number (Unix timestamp)
 *   - consumed: boolean
 */

import { getRef } from '../config/firebase.js';

/**
 * Response status constants
 */
export const ResponseStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * Save a pending response placeholder
 * Called when a query is received but before Gemini processes it
 * 
 * @param {string} requestId - Unique request identifier from ESP32
 * @returns {Promise<void>}
 */
export async function savePendingResponse(requestId) {
  console.log('[DBService] Saving pending response for:', requestId);

  const ref = getRef(`responses/${requestId}`);
  await ref.set({
    text: null,
    status: ResponseStatus.PENDING,
    timestamp: Date.now(),
    consumed: false
  });

  console.log('[DBService] Pending response saved');
}

/**
 * Save a completed AI response to Firebase
 * Called after Gemini successfully generates a response
 * 
 * @param {string} requestId - Unique request identifier from ESP32
 * @param {string} text - The AI-generated response text
 * @returns {Promise<void>}
 */
export async function saveResponse(requestId, text) {
  console.log('[DBService] Saving completed response for:', requestId);

  const ref = getRef(`responses/${requestId}`);
  await ref.set({
    text: text,
    status: ResponseStatus.COMPLETED,
    timestamp: Date.now(),
    consumed: false
  });

  console.log('[DBService] Response saved successfully');
}

/**
 * Save an error response when Gemini processing fails
 * 
 * @param {string} requestId - Unique request identifier from ESP32
 * @param {string} errorMessage - Error description
 * @returns {Promise<void>}
 */
export async function saveErrorResponse(requestId, errorMessage) {
  console.log('[DBService] Saving error response for:', requestId);

  const ref = getRef(`responses/${requestId}`);
  await ref.set({
    text: errorMessage,
    status: ResponseStatus.ERROR,
    timestamp: Date.now(),
    consumed: false
  });

  console.log('[DBService] Error response saved');
}

/**
 * Get response by request ID
 * ESP32 polls this to check if response is ready
 * 
 * @param {string} requestId - Unique request identifier
 * @returns {Promise<Object|null>} Response object or null if not found
 */
export async function getResponse(requestId) {
  console.log('[DBService] Fetching response for:', requestId);

  const ref = getRef(`responses/${requestId}`);
  const snapshot = await ref.once('value');

  if (!snapshot.exists()) {
    console.log('[DBService] Response not found');
    return null;
  }

  const data = snapshot.val();
  console.log('[DBService] Response found with status:', data.status);

  return {
    requestId,
    text: data.text,
    status: data.status,
    timestamp: data.timestamp,
    consumed: data.consumed
  };
}

/**
 * Mark response as consumed (read by ESP32)
 * Optional: Can be used instead of delete for audit trail
 * 
 * @param {string} requestId - Unique request identifier
 * @returns {Promise<void>}
 */
export async function markAsConsumed(requestId) {
  console.log('[DBService] Marking as consumed:', requestId);

  const ref = getRef(`responses/${requestId}`);
  await ref.update({
    consumed: true,
    consumedAt: Date.now()
  });

  console.log('[DBService] Marked as consumed');
}

/**
 * Delete response after ESP32 has retrieved it
 * Keeps database clean and prevents stale data buildup
 * 
 * @param {string} requestId - Unique request identifier
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteResponse(requestId) {
  console.log('[DBService] Deleting response:', requestId);

  const ref = getRef(`responses/${requestId}`);
  const snapshot = await ref.once('value');

  if (!snapshot.exists()) {
    console.log('[DBService] Response not found, nothing to delete');
    return false;
  }

  await ref.remove();
  console.log('[DBService] Response deleted successfully');
  return true;
}

/**
 * Check if a response exists for a request ID
 * 
 * @param {string} requestId - Unique request identifier
 * @returns {Promise<boolean>}
 */
export async function responseExists(requestId) {
  const ref = getRef(`responses/${requestId}`);
  const snapshot = await ref.once('value');
  return snapshot.exists();
}

// Export all functions as default object
export default {
  ResponseStatus,
  savePendingResponse,
  saveResponse,
  saveErrorResponse,
  getResponse,
  markAsConsumed,
  deleteResponse,
  responseExists
};
