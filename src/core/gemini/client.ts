import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "@/core/config/env";

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Add it to your .env file to enable AI triage.",
      );
    }
    _client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return _client;
}

export function getGeminiModel(modelName = "gemini-3.6-flash") {
  return getGeminiClient().getGenerativeModel({ model: modelName });
}
