import { z } from "zod";

export type Goal = "conservative" | "balanced" | "aggressive";

// Four-asset basket. usdc = cash + gas reserve; usyc = yield-bearing wrapped
// USDC (~10% APY via the MockUSYC vault); eurc = safe-FX diversification;
// cirbtc = the risk leg. Bands constrain cirbtc to a range, with floors on
// eurc, usyc, and usdc; whatever's left after the floors + cirbtc lands in
// USDC (the "free" cash that the agent leaves for gas + tactical slack).
export const goalBands: Record<
  Goal,
  {
    cirbtc: [number, number];
    eurcMin: number;
    usycMin: number;
    usdcMin: number;
    label: string;
    blurb: string;
  }
> = {
  conservative: {
    cirbtc: [0.0, 0.15],
    eurcMin: 0.2,
    usycMin: 0.3,
    usdcMin: 0.05,
    label: "Conservative",
    blurb: "Heavy on USYC yield + EURC diversification. Minimal risk leg.",
  },
  balanced: {
    cirbtc: [0.2, 0.45],
    eurcMin: 0.15,
    usycMin: 0.15,
    usdcMin: 0.05,
    label: "Balanced",
    blurb: "Cash, yield, FX, and risk in balance, tuned to the regime.",
  },
  aggressive: {
    cirbtc: [0.3, 0.65],
    eurcMin: 0.05,
    usycMin: 0.05,
    usdcMin: 0.05,
    label: "Aggressive",
    blurb: "Leans into cirBTC. Thin yield + FX sleeves for ballast.",
  },
};

export const targetWeightsSchema = z
  .object({
    usdc: z.number().min(0).max(1),
    eurc: z.number().min(0).max(1),
    cirbtc: z.number().min(0).max(1),
    usyc: z.number().min(0).max(1),
  })
  .refine(
    (w) => Math.abs(w.usdc + w.eurc + w.cirbtc + w.usyc - 1) < 0.01,
    { message: "weights must sum to 1.0" },
  );
export type TargetWeights = z.infer<typeof targetWeightsSchema>;

export const signalsSchema = z.object({
  btc_24h_change: z.number(),
  eth_24h_change: z.number(),
  btc_realized_vol: z.number(),
  usdc_price: z.number(),
  usdt_price: z.number(),
  fetched_at: z.string(),
});
export type Signals = z.infer<typeof signalsSchema>;

export const regimeOutputSchema = z.object({
  regime: z.enum(["risk_on", "risk_off", "neutral"]),
  confidence: z.number().min(0).max(1),
  regime_shift_candidate: z.boolean(),
  brief: z.string().max(160),
});
export type RegimeOutput = z.infer<typeof regimeOutputSchema>;

// All fields required (no .optional / .default). Groq's strict JSON-schema
// mode rejects any property in `properties` that isn't also listed in
// `required`, so we ask the model for an explicit (possibly empty) alerts
// array rather than letting it omit the field.
export const decisionOutputSchema = z.object({
  target_weights: targetWeightsSchema,
  rebalance_now: z.boolean(),
  reasoning: z.string().min(20),
  alerts: z.array(z.string()),
});
export type DecisionOutput = z.infer<typeof decisionOutputSchema>;

export type DecisionContext = {
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
};

export type UserRow = {
  id: string;
  email: string | null;
  goal: Goal | null;
  circle_wallet_id: string | null;
  arc_address: string | null;
  created_at: string;
};

export type PortfolioRow = {
  user_id: string;
  usdc_balance: number;
  eurc_balance: number;
  cirbtc_balance: number;
  usyc_balance: number;
  last_rebalance_at: string | null;
  updated_at: string;
};

export type DecisionRow = {
  id: string;
  user_id: string;
  regime: string;
  signals: Signals;
  target_weights: TargetWeights;
  prev_weights: TargetWeights | null;
  reasoning: string;
  alerts: string[];
  trace_hash: string | null;
  arc_tx_hash: string | null;
  circle_tx_id: string | null;
  executed: boolean;
  created_at: string;
};
