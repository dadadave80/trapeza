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

// Four-asset clamp. cirbtc is clamped to its [min,max] range; eurc/usyc/usdc
// have minimum floors. After enforcing floors we let the four weights sum to
// 1 by scaling the "free" portion of eurc + usyc + usdc proportionally (the
// part above each floor). cirbtc never gets scaled — the band cap is hard.
function clampToBand(
  w: DecisionOutput["target_weights"],
  band: (typeof goalBands)[keyof typeof goalBands],
): DecisionOutput["target_weights"] {
  const cirbtc = Math.min(Math.max(w.cirbtc, band.cirbtc[0]), band.cirbtc[1]);

  let eurc = Math.max(w.eurc, band.eurcMin);
  let usyc = Math.max(w.usyc, band.usycMin);
  let usdc = Math.max(w.usdc, band.usdcMin);

  let sum = cirbtc + eurc + usyc + usdc;

  if (sum > 1) {
    // Shave from the above-floor "excess" of eurc/usyc/usdc, proportional to
    // each one's excess. cirbtc is already at its range so we don't touch it.
    const excess = sum - 1;
    const eurcExcess = eurc - band.eurcMin;
    const usycExcess = usyc - band.usycMin;
    const usdcExcess = usdc - band.usdcMin;
    const totalExcess = eurcExcess + usycExcess + usdcExcess;
    if (totalExcess > 0) {
      eurc -= (excess * eurcExcess) / totalExcess;
      usyc -= (excess * usycExcess) / totalExcess;
      usdc -= (excess * usdcExcess) / totalExcess;
    }
    sum = cirbtc + eurc + usyc + usdc;
  }

  if (sum < 1) {
    // Underflow: park the slack in USDC — the agent's job is to deploy cash
    // into yield/FX/risk, but leftover always means "more cash".
    usdc += 1 - sum;
  }

  return { usdc, eurc, cirbtc, usyc };
}
