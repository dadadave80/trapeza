import { GoogleGenAI } from "@google/genai";

let _gemini: GoogleGenAI | null = null;

export function gemini() {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

export const MODELS = {
  fast: "gemini-3-flash",
  heavy: "gemini-3.1-pro",
} as const;
