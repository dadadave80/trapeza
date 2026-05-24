import { z } from "zod";

export type Goal = "conservative" | "balanced" | "aggressive";

export const goalBands: Record<
  Goal,
  { cirbtc: [number, number]; eurcMin: number; label: string; blurb: string }
> = {
  conservative: {
    cirbtc: [0.0, 0.2],
    eurcMin: 0.3,
    label: "Conservative",
    blurb: "Mostly USDC, with EURC for diversification and minimal cirBTC.",
  },
  balanced: {
    cirbtc: [0.2, 0.5],
    eurcMin: 0.2,
    label: "Balanced",
    blurb: "A mix of cash, safe-FX, and risk tuned to the regime.",
  },
  aggressive: {
    cirbtc: [0.3, 0.7],
    eurcMin: 0.1,
    label: "Aggressive",
    blurb: "Leans into cirBTC in risk-on regimes, retreats when vol spikes.",
  },
};

export const targetWeightsSchema = z
  .object({
    usdc: z.number().min(0).max(1),
    eurc: z.number().min(0).max(1),
    cirbtc: z.number().min(0).max(1),
  })
  .refine((w) => Math.abs(w.usdc + w.eurc + w.cirbtc - 1) < 0.01, {
    message: "weights must sum to 1.0",
  });
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
