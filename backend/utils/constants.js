/**
 * Application Constants
 * 
 * Centralized configuration values for the ESP32 Voice Assistant backend.
 * All magic numbers and strings should be defined here.
 */

/**
 * Response status values
 * Used to track the state of each request in Firebase
 */
export const STATUS = {
  PENDING: 'pending',       // Request received, processing started
  COMPLETED: 'completed',   // AI response ready
  ERROR: 'error'           // Processing failed
};

/**
 * Application limits
 * Designed for ESP32 memory constraints and serverless timeouts
 */
export const LIMITS = {
  MAX_QUERY_LENGTH: 1000,      // Max characters in user query
  MAX_RESPONSE_LENGTH: 1000,   // Max characters in AI response
  MAX_REQUEST_ID_LENGTH: 64,   // Max length of request_id
  GEMINI_TIMEOUT_MS: 25000,    // Timeout for Gemini API calls
  POLL_RETRY_DELAY_MS: 1000    // Suggested delay between ESP32 polls
};

/**
 * Firebase database paths
 */
export const DB_PATHS = {
  RESPONSES: 'responses'       // Root path for response storage
};

/**
 * Error messages
 * User-friendly error messages for API responses
 */
export const ERRORS = {
  // Validation errors
  INVALID_REQUEST: 'Invalid request format',
  REQUEST_ID_REQUIRED: 'request_id is required',
  REQUEST_ID_INVALID: 'request_id contains invalid characters',
  TEXT_REQUIRED: 'text is required',
  TEXT_TOO_LONG: 'text exceeds maximum length',
  
  // Processing errors
  GEMINI_ERROR: 'AI processing failed',
  GEMINI_TIMEOUT: 'AI service timed out',
  DATABASE_ERROR: 'Database operation failed',
  
  // HTTP errors
  METHOD_NOT_ALLOWED: 'Method not allowed',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error'
};

/**
 * HTTP Status codes (for reference)
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500
};

// Default export for convenience
export default {
  STATUS,
  LIMITS,
  DB_PATHS,
  ERRORS,
  HTTP_STATUS
};
