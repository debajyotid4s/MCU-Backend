/**
 * Whisper Configuration (using Groq - FREE!)
 * 
 * Uses Groq's Whisper API for speech-to-text.
 * Groq offers free tier with fast inference.
 * 
 * Environment Variables Required:
 * - GROQ_API_KEY: Your Groq API key (free at console.groq.com)
 */

import Groq from 'groq-sdk';

// Singleton instance
let groqClient = null;

/**
 * Initialize Groq client for Whisper
 * @returns {Groq} Groq client instance
 */
function initializeWhisper() {
  if (groqClient) {
    console.log('[Whisper] Using existing Groq instance');
    return groqClient;
  }

  console.log('[Whisper] Initializing Groq client...');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  groqClient = new Groq({
    apiKey: apiKey
  });

  console.log('[Whisper] Successfully initialized');
  return groqClient;
}

/**
 * Get Groq client instance
 * @returns {Groq} Groq client
 */
export function getGroqClient() {
  if (!groqClient) {
    return initializeWhisper();
  }
  return groqClient;
}

export default {
  getGroqClient
};
