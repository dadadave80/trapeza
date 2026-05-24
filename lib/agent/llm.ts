import { createGroq } from "@ai-sdk/groq";

// Groq client — uses GROQ_API_KEY from env by default. We instantiate
// explicitly so a missing key fails fast with a useful error instead of
// hitting the API with `undefined` and getting a confusing 401.
let _groq: ReturnType<typeof createGroq> | null = null;

export function llm() {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  _groq = createGroq({ apiKey });
  return _groq;
}

// Model identifiers are env-overridable. Defaults sit at the top of Groq's
// free-tier-friendly menu in 2026:
//   - Fast: Llama 4 Scout (17B / 16-expert MoE), generous quota, JSON-mode OK
//   - Heavy: openai/gpt-oss-120b (120B OSS model), best free-tier reasoning
// Hit /api/healthz for the live list of models your key can call.
//
//   LLM_FAST_MODEL    — regime classifier (~200 tok structured JSON)
//   LLM_HEAVY_MODEL   — decision + reasoning (~800 tok structured JSON)
export const MODELS = {
  fast: process.env.LLM_FAST_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  heavy: process.env.LLM_HEAVY_MODEL ?? "openai/gpt-oss-120b",
} as const;
