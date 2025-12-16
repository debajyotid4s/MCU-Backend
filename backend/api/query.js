/**
 * Query API Endpoint
 * 
 * POST /api/query
 * 
 * Receives queries from ESP32 (text OR audio), processes with Gemini AI,
 * and stores the response in Firebase for later retrieval.
 * 
 * Request Body (Text mode):
 * {
 *   "request_id": "unique-id-from-esp32",
 *   "text": "User's question or command"
 * }
 * 
 * Request Body (Audio mode):
 * {
 *   "request_id": "unique-id-from-esp32",
 *   "audio": "base64-encoded-wav-audio"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "request_id": "unique-id-from-esp32",
 *   "transcription": "transcribed text (if audio)",
 *   "message": "Query processed successfully"
 * }
 */

import { generateResponse } from '../services/geminiService.js';
import { transcribeAudio, validateAudioData } from '../services/whisperService.js';
import { 
  savePendingResponse, 
  saveResponse, 
  saveErrorResponse 
} from '../services/dbService.js';

/**
 * Validate the incoming request body
 * @param {Object} body - Request body
 * @returns {Object} Validation result with valid flag, error message, and input type
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

  // Check if audio or text is provided (audio takes priority)
  if (body.audio) {
    // Audio mode
    const audioValidation = validateAudioData(body.audio);
    if (!audioValidation.valid) {
      return { valid: false, error: audioValidation.error };
    }
    return { valid: true, inputType: 'audio' };
  }

  // Text mode
  if (!body.text || typeof body.text !== 'string') {
    return { valid: false, error: 'Either text or audio is required' };
  }

  if (body.text.trim().length === 0) {
    return { valid: false, error: 'text cannot be empty' };
  }

  if (body.text.length > 1000) {
    return { valid: false, error: 'text must be 1000 characters or less' };
  }

  return { valid: true, inputType: 'text' };
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

    const { request_id, text, audio } = req.body;
    const inputType = validation.inputType;
    
    console.log('[QueryAPI] Processing request_id:', request_id, 'type:', inputType);

    // Step 1: Save pending status to Firebase (so ESP32 can start polling)
    await savePendingResponse(request_id);

    let queryText = text;
    let transcription = null;

    // Step 2: If audio, transcribe with Whisper first
    if (inputType === 'audio') {
      try {
        console.log('[QueryAPI] Transcribing audio with Whisper...');
        transcription = await transcribeAudio(audio);
        queryText = transcription;
        console.log('[QueryAPI] Transcription:', transcription);
      } catch (whisperError) {
        console.error('[QueryAPI] Whisper error:', whisperError.message);
        await saveErrorResponse(request_id, `Transcription failed: ${whisperError.message}`);
        
        return res.status(200).json({
          success: false,
          request_id: request_id,
          message: 'Audio transcription failed',
          error: whisperError.message
        });
      }
    }

    // Step 3: Process with Gemini AI
    try {
      const aiResponse = await generateResponse(queryText);
      
      // Step 4: Save successful response to Firebase
      await saveResponse(request_id, aiResponse);

      console.log('[QueryAPI] Successfully processed request_id:', request_id);

      // Return success to ESP32
      const response = {
        success: true,
        request_id: request_id,
        message: 'Query processed successfully'
      };

      // Include transcription if audio was used
      if (transcription) {
        response.transcription = transcription;
      }

      return res.status(200).json(response);

    } catch (geminiError) {
      // Gemini failed - save error to Firebase so ESP32 knows
      console.error('[QueryAPI] Gemini error:', geminiError.message);
      
      await saveErrorResponse(request_id, geminiError.message);

      return res.status(200).json({
        success: true,
        request_id: request_id,
        transcription: transcription,
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
