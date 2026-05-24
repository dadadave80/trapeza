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
// Flash with the best Pro that's free-tier-eligible. Preview models like
// gemini-3.1-pro-preview have limit:0 quota on the AI Studio free tier
// (they need a billing-enabled GCP project) — so we don't default to them.
// Hit /api/healthz to see what's reachable; override either env var to swap.
//
//   GEMINI_FAST_MODEL   — regime classifier (Zod-validated JSON, ~200 tok)
//   GEMINI_HEAVY_MODEL  — decision + reasoning (~800 tok)
//
// To run the agent on Gemini 3.1 Pro Preview reasoning instead, add
// billing to your AI Studio project then set:
//   GEMINI_HEAVY_MODEL=gemini-3.1-pro-preview
export const MODELS = {
  fast: process.env.GEMINI_FAST_MODEL ?? "gemini-3.5-flash",
  heavy: process.env.GEMINI_HEAVY_MODEL ?? "gemini-2.5-pro",
} as const;
