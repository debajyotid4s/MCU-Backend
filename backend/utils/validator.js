/**
 * Request Validation Utilities
 * 
 * Input validation functions for API endpoints.
 * Ensures all incoming data meets expected format and constraints.
 */

import { LIMITS, ERRORS } from './constants.js';

/**
 * Validate a request_id string
 * - Must be non-empty string
 * - Only alphanumeric, hyphens, and underscores
 * - Max 64 characters
 * 
 * @param {string} requestId - The request ID to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateRequestId(requestId) {
  if (!requestId || typeof requestId !== 'string') {
    return { valid: false, error: ERRORS.REQUEST_ID_REQUIRED };
  }

  const trimmed = requestId.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: ERRORS.REQUEST_ID_REQUIRED };
  }

  if (trimmed.length > LIMITS.MAX_REQUEST_ID_LENGTH) {
    return { valid: false, error: `request_id must be ${LIMITS.MAX_REQUEST_ID_LENGTH} characters or less` };
  }

  // Only allow safe characters (alphanumeric, hyphen, underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: ERRORS.REQUEST_ID_INVALID };
  }

  return { valid: true };
}

/**
 * Validate query text
 * - Must be non-empty string
 * - Max 1000 characters
 * 
 * @param {string} text - The query text to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateQueryText(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: ERRORS.TEXT_REQUIRED };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: ERRORS.TEXT_REQUIRED };
  }

  if (trimmed.length > LIMITS.MAX_QUERY_LENGTH) {
    return { valid: false, error: ERRORS.TEXT_TOO_LONG };
  }

  return { valid: true };
}

/**
 * Validate the complete query request body
 * 
 * @param {Object} body - Request body { request_id, text }
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateQueryRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: ERRORS.INVALID_REQUEST };
  }

  // Validate request_id
  const requestIdValidation = validateRequestId(body.request_id);
  if (!requestIdValidation.valid) {
    return requestIdValidation;
  }

  // Validate text
  const textValidation = validateQueryText(body.text);
  if (!textValidation.valid) {
    return textValidation;
  }

  return { valid: true };
}

/**
 * Sanitize input string
 * Removes potentially dangerous characters while preserving meaning
 * 
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, LIMITS.MAX_QUERY_LENGTH);
}

// Default export
export default {
  validateRequestId,
  validateQueryText,
  validateQueryRequest,
  sanitizeInput
};
