import { gemini, MODELS } from "./gemini";
import { DECISION_SYSTEM, buildDecisionPrompt } from "./prompts";
import {
  decisionOutputSchema,
  goalBands,
  type DecisionContext,
  type DecisionOutput,
} from "@/lib/types";

export async function decide(ctx: DecisionContext): Promise<DecisionOutput> {
  const response = await gemini().models.generateContent({
    model: MODELS.heavy,
    contents: buildDecisionPrompt(ctx),
    config: {
      systemInstruction: DECISION_SYSTEM,
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini decide: empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini decide: invalid JSON: ${(err as Error).message}\n${text.slice(0, 400)}`);
  }

  const decision = decisionOutputSchema.parse(parsed);

  // Hard-clamp to goal bands. Gemini is told the rules but we enforce
  // them deterministically so a hallucination can't violate the user contract.
  const band = goalBands[ctx.goal];
  const clamped = clampToBand(decision.target_weights, band);
  return { ...decision, target_weights: clamped };
}

function clampToBand(
  w: DecisionOutput["target_weights"],
  band: (typeof goalBands)[keyof typeof goalBands],
): DecisionOutput["target_weights"] {
  const cirbtc = Math.min(Math.max(w.cirbtc, band.cirbtc[0]), band.cirbtc[1]);
  let eurc = Math.max(w.eurc, band.eurcMin);
  // If eurc + cirbtc > 1, scale back eurc to make room.
  if (eurc + cirbtc > 1) eurc = Math.max(band.eurcMin, 1 - cirbtc - 0.0);
  const usdc = Math.max(0, 1 - eurc - cirbtc);
  return { usdc, eurc, cirbtc };
}
