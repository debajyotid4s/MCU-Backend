/**
 * Query API Endpoint
 * 
 * POST /api/query
 * 
 * Receives queries from ESP32, processes them with Gemini AI,
 * and stores the response in Firebase for later retrieval.
 * 
 * Request Body:
 * {
 *   "request_id": "unique-id-from-esp32",
 *   "text": "User's question or command"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "request_id": "unique-id-from-esp32",
 *   "message": "Query received and processing"
 * }
 */

import { generateResponse } from '../services/geminiService.js';
import { 
  savePendingResponse, 
  saveResponse, 
  saveErrorResponse 
} from '../services/dbService.js';

/**
 * Validate the incoming request body
 * @param {Object} body - Request body
 * @returns {Object} Validation result with valid flag and error message
 */
function validateRequest(body) {
  // Check if body exists
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  // Check request_id
  if (!body.request_id || typeof body.request_id !== 'string') {
    return { valid: false, error: 'request_id is required and must be a string' };
  }

  // Validate request_id format (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(body.request_id)) {
    return { valid: false, error: 'request_id contains invalid characters' };
  }

  // Check request_id length
  if (body.request_id.length > 64) {
    return { valid: false, error: 'request_id must be 64 characters or less' };
  }

  // Check text
  if (!body.text || typeof body.text !== 'string') {
    return { valid: false, error: 'text is required and must be a string' };
  }

  // Check text length
  if (body.text.trim().length === 0) {
    return { valid: false, error: 'text cannot be empty' };
  }

  if (body.text.length > 1000) {
    return { valid: false, error: 'text must be 1000 characters or less' };
  }

  return { valid: true };
}

/**
 * Main API handler for POST /api/query
 * Vercel serverless function entry point
 */
export default async function handler(req, res) {
  // Set CORS headers for ESP32 compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  console.log('[QueryAPI] Received request');

  try {
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      console.log('[QueryAPI] Validation failed:', validation.error);
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { request_id, text } = req.body;
    console.log('[QueryAPI] Processing request_id:', request_id);

    // Step 1: Save pending status to Firebase (so ESP32 can start polling)
    await savePendingResponse(request_id);

    // Step 2: Process with Gemini AI
    // Note: We wait for the response here. In a production system with
    // very high load, you might use a queue (but that adds complexity)
    try {
      const aiResponse = await generateResponse(text);
      
      // Step 3: Save successful response to Firebase
      await saveResponse(request_id, aiResponse);

      console.log('[QueryAPI] Successfully processed request_id:', request_id);

      // Return success to ESP32
      return res.status(200).json({
        success: true,
        request_id: request_id,
        message: 'Query processed successfully'
      });

    } catch (geminiError) {
      // Gemini failed - save error to Firebase so ESP32 knows
      console.error('[QueryAPI] Gemini error:', geminiError.message);
      
      await saveErrorResponse(request_id, geminiError.message);

      return res.status(200).json({
        success: true,
        request_id: request_id,
        message: 'Query received but AI processing failed',
        error: geminiError.message
      });
    }

  } catch (error) {
    // Unexpected error (likely database issue)
    console.error('[QueryAPI] Unexpected error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
