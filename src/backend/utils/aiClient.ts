import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../server/utils/logger';

let genAI: GoogleGenerativeAI | null = null;

export const getAIClient = () => {
  if (genAI) return genAI;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('[AI] GEMINI_API_KEY is missing from environment variables.');
    return null;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

export const AI_MODELS = {
  FLASH: 'gemini-1.5-flash',
  PRO: 'gemini-1.5-pro',
};
