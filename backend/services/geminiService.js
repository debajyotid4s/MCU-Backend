/**
 * Gemini AI Service
 */

import { getModel } from '../config/gemini.js';

export async function generateResponse(text) {
  console.log('[Gemini] Processing:', text.substring(0, 50));

  const model = getModel();
  
  // Create prompt with English-only constraint
  const prompt = `User said: "${text}"

IMPORTANT INSTRUCTIONS:
- Respond ONLY in English language
- Be helpful and conversational
- Answer naturally without artificial brevity

Your response:`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let responseText = response.text();

  return responseText.trim();
}
