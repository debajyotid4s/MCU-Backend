/**
 * Whisper Speech-to-Text Service (using Groq - FREE!)
 * 
 * Handles audio transcription using Groq's Whisper API.
 * Accepts base64-encoded WAV audio from ESP32.
 * 
 * Groq provides FREE Whisper API with fast inference.
 * Get your free API key at: https://console.groq.com
 * 
 * Supports:
 * - WAV format (recommended for ESP32)
 * - Up to 4 seconds of audio
 * - 16kHz sample rate (common for ESP32)
 */

import { getGroqClient } from '../config/whisper.js';

/**
 * Maximum audio duration in seconds
 */
const MAX_AUDIO_DURATION_SECONDS = 4;

/**
 * Maximum base64 audio size (approximately 4 seconds of 16kHz WAV)
 * 16kHz * 2 bytes * 4 seconds * 1.37 (base64 overhead) ≈ 175KB
 */
const MAX_AUDIO_SIZE_BYTES = 200 * 1024; // 200KB limit

/**
 * Transcribe audio to text using Groq's Whisper
 * 
 * @param {string} audioBase64 - Base64 encoded WAV audio
 * @returns {Promise<string>} Transcribed text
 * @throws {Error} If transcription fails
 */
export async function transcribeAudio(audioBase64) {
  console.log('[WhisperService] Starting transcription with Groq...');

  // Validate input
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new Error('Audio data is required');
  }

  // Check size limit
  if (audioBase64.length > MAX_AUDIO_SIZE_BYTES) {
    throw new Error(`Audio too large. Max size: ${MAX_AUDIO_SIZE_BYTES / 1024}KB`);
  }

  try {
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    console.log('[WhisperService] Audio size:', audioBuffer.length, 'bytes');

    // Create a File-like object for the API
    const audioFile = new File([audioBuffer], 'audio.wav', {
      type: 'audio/wav'
    });

    // Get Groq client
    const groq = getGroqClient();

    // Call Groq's Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',  // Best quality, free on Groq
      language: 'en',             // Set to English, change if needed
      response_format: 'text'
    });

    const text = transcription.trim();
    
    if (!text || text.length === 0) {
      throw new Error('No speech detected in audio');
    }

    console.log('[WhisperService] Transcription successful:', text.substring(0, 50) + '...');
    return text;

  } catch (error) {
    console.error('[WhisperService] Error:', error.message);

    // Handle specific errors
    if (error.message.includes('Invalid file format')) {
      throw new Error('Invalid audio format. Please use WAV format.');
    }
    if (error.message.includes('too short')) {
      throw new Error('Audio too short. Please speak longer.');
    }
    if (error.code === 'ECONNRESET' || error.message.includes('timeout')) {
      throw new Error('Transcription service timed out. Please try again.');
    }
    if (error.message.includes('rate_limit')) {
      throw new Error('Rate limit reached. Please wait a moment.');
    }

    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Validate audio data before processing
 * 
 * @param {string} audioBase64 - Base64 encoded audio
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateAudioData(audioBase64) {
  if (!audioBase64) {
    return { valid: false, error: 'Audio data is required' };
  }

  if (typeof audioBase64 !== 'string') {
    return { valid: false, error: 'Audio must be a base64 string' };
  }

  if (audioBase64.length > MAX_AUDIO_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Audio too large. Max ${MAX_AUDIO_SIZE_BYTES / 1024}KB allowed` 
    };
  }

  // Basic base64 validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(audioBase64)) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
}

export default {
  transcribeAudio,
  validateAudioData,
  MAX_AUDIO_DURATION_SECONDS,
  MAX_AUDIO_SIZE_BYTES
};
