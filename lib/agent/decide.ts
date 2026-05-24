import { generateText, Output } from "ai";
import { llm, MODELS } from "./llm";
import { DECISION_SYSTEM, buildDecisionPrompt } from "./prompts";
import {
  decisionOutputSchema,
  goalBands,
  type DecisionContext,
  type DecisionOutput,
} from "@/lib/types";

export async function decide(ctx: DecisionContext): Promise<DecisionOutput> {
  const { output } = await generateText({
    model: llm()(MODELS.heavy),
    system: DECISION_SYSTEM,
    prompt: buildDecisionPrompt(ctx),
    output: Output.object({ schema: decisionOutputSchema }),
    temperature: 0.4,
  });

  // Hard-clamp to goal bands. The model is told the rules but we enforce
  // them deterministically so a hallucination can't violate the user
  // contract.
  const band = goalBands[ctx.goal];
  const clamped = clampToBand(output.target_weights, band);
  return { ...output, target_weights: clamped };
}

function clampToBand(
  w: DecisionOutput["target_weights"],
  band: (typeof goalBands)[keyof typeof goalBands],
): DecisionOutput["target_weights"] {
  const cirbtc = Math.min(Math.max(w.cirbtc, band.cirbtc[0]), band.cirbtc[1]);
  let eurc = Math.max(w.eurc, band.eurcMin);
  if (eurc + cirbtc > 1) eurc = Math.max(band.eurcMin, 1 - cirbtc);
  const usdc = Math.max(0, 1 - eurc - cirbtc);
  return { usdc, eurc, cirbtc };
}
