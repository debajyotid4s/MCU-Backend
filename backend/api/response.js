/**
 * Response API Endpoint
 * 
 * GET /api/response?request_id=xxx
 * - Poll for response status and retrieve AI response
 * 
 * DELETE /api/response?request_id=xxx  
 * - Delete/acknowledge response after ESP32 has retrieved it
 * 
 * This endpoint allows ESP32 to:
 * 1. Check if its response is ready (polling)
 * 2. Retrieve the AI-generated response
 * 3. Clean up after reading the response
 */

import { getResponse, deleteResponse, ResponseStatus } from '../services/dbService.js';

/**
 * Validate request_id query parameter
 * @param {string} requestId - The request_id from query string
 * @returns {Object} Validation result
 */
function validateRequestId(requestId) {
  if (!requestId || typeof requestId !== 'string') {
    return { valid: false, error: 'request_id query parameter is required' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) {
    return { valid: false, error: 'request_id contains invalid characters' };
  }

  if (requestId.length > 64) {
    return { valid: false, error: 'request_id must be 64 characters or less' };
  }

  return { valid: true };
}

/**
 * Handle GET request - Poll for response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} requestId - The request ID
 */
async function handleGet(req, res, requestId) {
  console.log('[ResponseAPI] GET request for:', requestId);

  try {
    // Fetch response from Firebase
    const response = await getResponse(requestId);

    // Case 1: No response found
    if (!response) {
      return res.status(404).json({
        success: false,
        request_id: requestId,
        status: 'not_found',
        message: 'No response found for this request_id'
      });
    }

    // Case 2: Response is still pending
    if (response.status === ResponseStatus.PENDING) {
      return res.status(202).json({
        success: true,
        request_id: requestId,
        status: 'pending',
        message: 'Response is still being processed'
      });
    }

    // Case 3: Response had an error
    if (response.status === ResponseStatus.ERROR) {
      return res.status(200).json({
        success: true,
        request_id: requestId,
        status: 'error',
        text: response.text,
        message: 'AI processing encountered an error'
      });
    }

    // Case 4: Response is ready (completed)
    return res.status(200).json({
      success: true,
      request_id: requestId,
      status: 'completed',
      text: response.text,
      timestamp: response.timestamp
    });

  } catch (error) {
    console.error('[ResponseAPI] GET error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve response',
      message: error.message
    });
  }
}

/**
 * Handle DELETE request - Remove response after consumption
 * @param {Object} req - Request object  
 * @param {Object} res - Response object
 * @param {string} requestId - The request ID
 */
async function handleDelete(req, res, requestId) {
  console.log('[ResponseAPI] DELETE request for:', requestId);

  try {
    // Attempt to delete the response
    const deleted = await deleteResponse(requestId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        request_id: requestId,
        message: 'No response found to delete'
      });
    }

    return res.status(200).json({
      success: true,
      request_id: requestId,
      message: 'Response deleted successfully'
    });

  } catch (error) {
    console.error('[ResponseAPI] DELETE error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete response',
      message: error.message
    });
  }
}

/**
 * Main API handler for /api/response
 * Vercel serverless function entry point
 */
export default async function handler(req, res) {
  // Set CORS headers for ESP32 compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate HTTP method
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or DELETE.'
    });
  }

  // Get and validate request_id from query string
  const requestId = req.query.request_id;
  const validation = validateRequestId(requestId);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  // Route to appropriate handler
  if (req.method === 'GET') {
    return handleGet(req, res, requestId);
  }

  if (req.method === 'DELETE') {
    return handleDelete(req, res, requestId);
  }
}
