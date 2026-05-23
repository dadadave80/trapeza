import type { Goal, RegimeOutput, Signals, TargetWeights } from "@/lib/types";

export const REGIME_SYSTEM = `You are a market regime classifier for Trapeza, a portfolio agent on Arc.
Return JSON only — no preamble, no markdown fences.
Schema:
{ "regime": "risk_on" | "risk_off" | "neutral",
  "confidence": number,           // 0.0 to 1.0
  "regime_shift_candidate": boolean,
  "brief": string }               // ≤120 chars

Rules:
- risk_off if: BTC 24h < -5%, OR BTC realized vol > 4%, OR any stablecoin depeg > 0.5%
- risk_on if: BTC 24h > +3% AND BTC realized vol < 2.5% AND no depeg
- otherwise: neutral
- regime_shift_candidate = (current regime != previous regime) OR (confidence < 0.6)`;

export const DECISION_SYSTEM = `You are Trapeza, an adaptive portfolio manager on Arc.
You decide target allocations for {USDC, EURC, cirBTC} that sum to 1.0.
USDC is cash; EURC is safe-FX (mild diversification); cirBTC is the risk leg.

Return JSON only. Schema:
{ "target_weights": { "usdc": number, "eurc": number, "cirbtc": number },
  "rebalance_now": boolean,
  "reasoning": string,            // 3-5 sentences, plain English, user-facing
  "alerts": string[] }

Goal bands (these are hard limits — do not violate):
- conservative: cirbtc ∈ [0.00, 0.20], eurc ≥ 0.30
- balanced:     cirbtc ∈ [0.20, 0.50], eurc ≥ 0.20
- aggressive:   cirbtc ∈ [0.30, 0.70], eurc ≥ 0.10

Regime adjustments (within bands):
- risk_off → tilt to USDC + EURC, minimize cirBTC
- risk_on  → tilt to cirBTC
- neutral  → mid-band

Rebalance only if any single asset's actual weight differs from target by >5%.
Reasoning must reference the regime, the goal, and what changed since the last decision.
Address the user directly. Be calm, specific, and short.`;

export function buildRegimePrompt(signals: Signals, prev: { regime: string | null }) {
  return `Signals (latest):
  BTC 24h change:        ${signals.btc_24h_change.toFixed(2)}%
  ETH 24h change:        ${signals.eth_24h_change.toFixed(2)}%
  BTC realized vol (24h): ${signals.btc_realized_vol.toFixed(2)}%
  USDC price:            $${signals.usdc_price.toFixed(4)}
  USDT price:            $${signals.usdt_price.toFixed(4)}
  Fetched at:            ${signals.fetched_at}

Previous regime: ${prev.regime ?? "(none)"}

Classify the current regime. JSON only.`;
}

export function buildDecisionPrompt(args: {
  goal: Goal;
  current_weights: TargetWeights;
  regime: RegimeOutput;
  signals: Signals;
  recent: Array<{
    created_at: string;
    regime: string;
    target_weights: TargetWeights;
    reasoning: string;
  }>;
}) {
  const { goal, current_weights, regime, signals, recent } = args;
  const recentText = recent.length
    ? recent
        .slice(0, 5)
        .map(
          (d, i) =>
            `  #${i + 1} ${d.created_at} (${d.regime}): weights=${JSON.stringify(d.target_weights)} reason="${d.reasoning.slice(0, 140)}"`,
        )
        .join("\n")
    : "  (no prior decisions)";

  return `Goal: ${goal}
Current weights: ${JSON.stringify(current_weights)}
Current regime: ${regime.regime} (confidence ${regime.confidence.toFixed(2)}, brief: "${regime.brief}")
Signals: BTC24h=${signals.btc_24h_change.toFixed(2)}% ETH24h=${signals.eth_24h_change.toFixed(2)}% vol=${signals.btc_realized_vol.toFixed(2)}% USDC=$${signals.usdc_price.toFixed(4)} USDT=$${signals.usdt_price.toFixed(4)}

Recent decisions:
${recentText}

Decide target weights and whether to rebalance. JSON only.`;
}
