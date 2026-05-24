import { GoogleGenAI } from "@google/genai";

let _gemini: GoogleGenAI | null = null;

export function gemini() {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

// Model identifiers are env-overridable. Defaults track what's been stable
// on the Gemini API. Hit /api/healthz to see which models your API key
// actually has access to, then override via env if you want a different
// pair (e.g. gemini-3.0-pro / gemini-3.0-flash once GA).
export const MODELS = {
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash",
  heavy: process.env.GEMINI_HEAVY_MODEL ?? "gemini-2.5-pro",
} as const;
