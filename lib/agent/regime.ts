import { gemini, MODELS } from "./gemini";
import { REGIME_SYSTEM, buildRegimePrompt } from "./prompts";
import { regimeOutputSchema, type RegimeOutput, type Signals } from "@/lib/types";

export async function classifyRegime(
  signals: Signals,
  prev: { regime: string | null },
): Promise<RegimeOutput> {
  const response = await gemini().models.generateContent({
    model: MODELS.fast,
    contents: buildRegimePrompt(signals, prev),
    config: {
      systemInstruction: REGIME_SYSTEM,
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini regime: empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini regime: invalid JSON: ${(err as Error).message}\n${text.slice(0, 400)}`);
  }
  return regimeOutputSchema.parse(parsed);
}
