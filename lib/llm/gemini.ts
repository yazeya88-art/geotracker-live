/**
 * Gemini connector for GeoTracker audit engine.
 *
 * Project path: lib/llm/gemini.ts
 *
 * Cost: ~$0.0001–0.0002 per audit prompt on gemini-2.5-flash.
 * A full audit = 5 prompts × 1 LLM = ~$0.001 per audit on this connector.
 * (Google offers a generous free tier — likely free during development.)
 *
 * Setup:
 *   1. npm install @google/generative-ai
 *   2. Add GEMINI_API_KEY to .env.local
 *      (Get one at https://aistudio.google.com/apikey)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Send a prompt to Gemini and return its response.
 * Throws on failure — caller decides whether to mark the LLM as "unavailable" for that prompt.
 */
export async function queryGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in .env.local');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text() ?? '';
}
