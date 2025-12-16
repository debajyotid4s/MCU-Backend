/**
 * Whisper Configuration
 * 
 * Initializes OpenAI client for Whisper speech-to-text.
 * Uses OpenAI's Whisper API for audio transcription.
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key
 */

import OpenAI from 'openai';

// Singleton instance
let openaiClient = null;

/**
 * Initialize OpenAI client for Whisper
 * @returns {OpenAI} OpenAI client instance
 */
function initializeWhisper() {
  if (openaiClient) {
    console.log('[Whisper] Using existing OpenAI instance');
    return openaiClient;
  }

  console.log('[Whisper] Initializing OpenAI client...');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  openaiClient = new OpenAI({
    apiKey: apiKey
  });

  console.log('[Whisper] Successfully initialized');
  return openaiClient;
}

/**
 * Get OpenAI client instance
 * @returns {OpenAI} OpenAI client
 */
export function getOpenAIClient() {
  if (!openaiClient) {
    return initializeWhisper();
  }
  return openaiClient;
}

export default {
  getOpenAIClient
};
