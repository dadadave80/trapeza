import { GoogleGenAI } from "@google/genai";

let _gemini: GoogleGenAI | null = null;

export function gemini() {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

// Model identifiers are env-overridable. Defaults pair the latest stable
// Flash with the best preview Pro available in the Gemini 3 family —
// produces visibly better reasoning for the dashboard pull quote. Hit
// /api/healthz to see what your API key has access to, then override
// via env if needed.
//
//   GEMINI_FAST_MODEL   — regime classifier (Zod-validated JSON, ~200 tok)
//   GEMINI_HEAVY_MODEL  — decision + reasoning (~800 tok)
export const MODELS = {
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-3.5-flash",
  heavy: process.env.GEMINI_HEAVY_MODEL ?? "gemini-3.1-pro-preview",
} as const;
