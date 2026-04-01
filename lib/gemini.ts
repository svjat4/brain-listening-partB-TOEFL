import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diisi.");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}
