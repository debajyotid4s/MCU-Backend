/**
 * Gemini AI Service
 * 
 * Handles all interactions with Google Gemini AI.
 * Provides text generation with error handling and response formatting.
 * Uses HTTP API calls (serverless-compatible, no WebSockets).
 */

import { getModel } from '../config/gemini.js';

/**
 * Maximum response length suitable for ESP32 memory constraints
 * ESP32 typically has limited RAM, so we cap responses
 */
const MAX_RESPONSE_LENGTH = 1000;

/**
 * Request timeout in milliseconds
 * Vercel has a 10s limit on hobby plan, 60s on pro
 */
const REQUEST_TIMEOUT_MS = 25000;

/**
 * Send text to Gemini and get a plain text response
 * This is the main function called by the API endpoint
 * 
 * @param {string} text - The user's query text
 * @returns {Promise<string>} Plain text response from Gemini
 * @throws {Error} If Gemini API fails or times out
 */
export async function generateResponse(text) {
  console.log('[GeminiService] Processing query:', text.substring(0, 50) + '...');

  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Invalid input: text is required');
  }

  try {
    // Get the Gemini model instance
    const model = getModel();

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Gemini request timed out'));
      }, REQUEST_TIMEOUT_MS);
    });

    // Generate content with timeout protection
    const generatePromise = model.generateContent(text.trim());

    // Race between generation and timeout
    const result = await Promise.race([generatePromise, timeoutPromise]);

    // Extract the response text
    const response = await result.response;
    const responseText = response.text();

    // Validate we got a response
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Gemini returned empty response');
    }

    // Clean and truncate the response for ESP32
    const cleanedResponse = cleanResponse(responseText);
    
    console.log('[GeminiService] Successfully generated response');
    return cleanedResponse;

  } catch (error) {
    // Log detailed error for debugging
    console.error('[GeminiService] Error:', error.message);

    // Re-throw with user-friendly message
    if (error.message.includes('timed out')) {
      throw new Error('AI service is taking too long. Please try again.');
    }
    if (error.message.includes('SAFETY')) {
      throw new Error('Request was blocked for safety reasons.');
    }
    if (error.message.includes('quota') || error.message.includes('429')) {
      throw new Error('AI service rate limit reached. Please wait a moment.');
    }

    // Generic error
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

/**
 * Clean and format the response for ESP32 consumption
 * Removes markdown formatting and truncates if necessary
 * 
 * @param {string} text - Raw response from Gemini
 * @returns {string} Cleaned and truncated response
 */
function cleanResponse(text) {
  let cleaned = text
    // Remove markdown bold/italic
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, ' ')
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if too long, trying to end at a sentence
  if (cleaned.length > MAX_RESPONSE_LENGTH) {
    cleaned = cleaned.substring(0, MAX_RESPONSE_LENGTH);
    
    // Try to end at the last complete sentence
    const lastPeriod = cleaned.lastIndexOf('.');
    const lastQuestion = cleaned.lastIndexOf('?');
    const lastExclaim = cleaned.lastIndexOf('!');
    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclaim);
    
    if (lastSentenceEnd > MAX_RESPONSE_LENGTH * 0.5) {
      cleaned = cleaned.substring(0, lastSentenceEnd + 1);
    } else {
      cleaned += '...';
    }
  }

  return cleaned;
}

// Export for testing
export default {
  generateResponse
};
