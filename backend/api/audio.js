/**
 * Audio API Endpoint (Binary Upload)
 * 
 * POST /api/audio
 * 
 * Receives raw WAV audio from ESP32, transcribes with Whisper, processes with Gemini AI,
 * and stores the response in Firebase for later retrieval.
 * 
 * Headers:
 * - Content-Type: audio/wav
 * - X-Request-ID: unique-id-from-esp32
 * 
 * Body: Raw WAV binary data
 * 
 * Response:
 * {
 *   "success": true,
 *   "request_id": "unique-id-from-esp32",
 *   "message": "Audio processed successfully"
 * }
 */

import { generateResponse } from '../services/geminiService.js';
import { transcribeAudio } from '../services/whisperService.js';
import { savePendingResponse, saveResponse, saveErrorResponse } from '../services/dbService.js';

// Max audio size: 2MB
const MAX_AUDIO_SIZE = 2 * 1024 * 1024;

/**
 * Main API handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Use POST method' });
  }

  try {
    // Get request ID from header
    const request_id = req.headers['x-request-id'];
    
    // Validate request_id
    if (!request_id || typeof request_id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(request_id)) {
      return res.status(400).json({ success: false, error: 'Valid X-Request-ID header required' });
    }

    // Get binary audio data
    const audioBuffer = req.body;
    
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Audio data required' });
    }

    // Check audio size
    if (audioBuffer.length > MAX_AUDIO_SIZE) {
      return res.status(400).json({ success: false, error: 'Audio too large (max 2MB)' });
    }

    console.log('[Audio] Processing:', request_id, 'Size:', audioBuffer.length, 'bytes');

    // Convert binary to base64 for Whisper API
    const base64Audio = audioBuffer.toString('base64');

    // Save pending status
    await savePendingResponse(request_id);

    // Transcribe audio
    let transcription;
    try {
      transcription = await transcribeAudio(base64Audio);
      console.log('[Audio] Transcribed:', transcription);
    } catch (err) {
      console.error('[Audio] Transcription error:', err.message);
      await saveErrorResponse(request_id, 'Transcription failed');
      return res.status(200).json({ success: false, request_id, error: 'Transcription failed' });
    }

    // Get AI response
    try {
      const aiResponse = await generateResponse(transcription);
      await saveResponse(request_id, aiResponse);
      
      return res.status(200).json({
        success: true,
        request_id,
        message: 'Audio processed successfully'
      });
    } catch (err) {
      console.error('[Audio] AI error:', err.message);
      await saveErrorResponse(request_id, 'AI processing failed');
      return res.status(200).json({ success: false, request_id, error: 'AI failed' });
    }

  } catch (error) {
    console.error('[Audio] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
