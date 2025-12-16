/**
 * Google Gemini AI Configuration
 * 
 * This module initializes the Gemini generative AI client.
 * Uses HTTP-based API calls (no WebSockets) for serverless compatibility.
 * 
 * Environment Variables Required:
 * - GEMINI_API_KEY: Your Google AI Studio API key
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Singleton instances for serverless optimization
let genAI = null;
let model = null;

/**
 * Generation configuration for Gemini responses
 * Optimized for concise, ESP32-friendly responses
 */
export const generationConfig = {
  temperature: 0.7,        // Balance between creativity and consistency
  topP: 0.9,               // Nucleus sampling parameter
  topK: 40,                // Top-k sampling parameter
  maxOutputTokens: 512,    // Keep responses short for ESP32 memory
};

/**
 * System instruction to guide Gemini's responses
 * Tailored for voice assistant on embedded device
 */
export const systemInstruction = `You are a helpful voice assistant running on an ESP32 microcontroller.
Your responses will be read aloud, so:
- Keep responses brief and conversational (2-3 sentences max)
- Use simple, clear language
- Avoid markdown, special characters, or formatting
- Avoid lists unless specifically asked
- Be friendly but concise
- If you don't know something, say so briefly`;

/**
 * Initialize Gemini AI client
 * Uses singleton pattern for serverless cold start optimization
 * @returns {GenerativeModel} Gemini Pro model instance
 */
function initializeGemini() {
  // Return existing instance if available (singleton)
  if (model) {
    console.log('[Gemini] Using existing Gemini instance');
    return model;
  }

  console.log('[Gemini] Initializing new Gemini instance...');

  // Validate API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Initialize the Google Generative AI client
  genAI = new GoogleGenerativeAI(apiKey);

  // Get the Gemini model
  // Using gemini-pro (stable, widely available)
  model = genAI.getGenerativeModel({
    model: 'gemini-pro',
    generationConfig,
  });

  console.log('[Gemini] Successfully initialized');
  return model;
}

/**
 * Get Gemini model instance (lazy initialization)
 * @returns {GenerativeModel} Gemini model instance
 */
export function getModel() {
  if (!model) {
    return initializeGemini();
  }
  return model;
}

// Export for direct access if needed
export default {
  getModel,
  generationConfig,
  systemInstruction
};
