import { GoogleGenAI } from "@google/genai";

// Shared Google GenAI client instance on the server
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "dummy-key-for-initialization",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const PRIMARY_MODEL = "gemini-3.6-flash";
export const PRO_MODEL = "gemini-3.1-pro-preview";
