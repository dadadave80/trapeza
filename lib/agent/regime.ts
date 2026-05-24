import { generateText, Output } from "ai";
import { llm, MODELS } from "./llm";
import { REGIME_SYSTEM, buildRegimePrompt } from "./prompts";
import { regimeOutputSchema, type RegimeOutput, type Signals } from "@/lib/types";

export async function classifyRegime(
  signals: Signals,
  prev: { regime: string | null },
): Promise<RegimeOutput> {
  const { output } = await generateText({
    model: llm()(MODELS.fast),
    system: REGIME_SYSTEM,
    prompt: buildRegimePrompt(signals, prev),
    output: Output.object({ schema: regimeOutputSchema }),
    temperature: 0.2,
  });
  return output;
}
