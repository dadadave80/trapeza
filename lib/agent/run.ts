import { readBalances } from "@/lib/arc/balances";
import { fetchSignals } from "@/lib/agent/signals";
import { classifyRegime } from "@/lib/agent/regime";
import { decide } from "@/lib/agent/decide";
import {
  currentWeights,
  executeRebalance,
  planRebalance,
  type SwapAttempt,
} from "@/lib/agent/execute";
import { anchorTrace } from "@/lib/arc/trace-anchor";
import { MIN_INTERVAL_SECONDS } from "@/lib/constants";
import { supabaseService } from "@/lib/db/client";
import type { Goal, TargetWeights } from "@/lib/types";

export type UserCtx = {
  id: string;
  goal: Goal;
  circle_wallet_id: string;
  arc_address: `0x${string}`;
};

export type RunOptions = {
  bypassRateLimit?: boolean;
};

// Run the regime → decide → execute → anchor loop for a single user.
// Used both by the cron orchestrator (loops all users) and by the
// "Run agent now" manual trigger.
export async function runForUser(u: UserCtx, opts: RunOptions = {}) {
  const supabase = supabaseService();

  // Rate-limit per user (unless manually overridden).
  if (!opts.bypassRateLimit) {
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("last_rebalance_at")
      .eq("user_id", u.id)
      .maybeSingle();

    if (portfolio?.last_rebalance_at) {
      const elapsed =
        (Date.now() - new Date(portfolio.last_rebalance_at).getTime()) / 1000;
      if (elapsed < MIN_INTERVAL_SECONDS) {
        return { skipped: "rate-limited", elapsed_s: Math.round(elapsed) };
      }
    }
  }

  const balances = await readBalances(u.arc_address);
  if (balances.total <= 0) {
    return { skipped: "empty wallet", balances };
  }

  const [signals, recent] = await Promise.all([
    fetchSignals(),
    supabase
      .from("decisions")
      .select("created_at, regime, target_weights, reasoning")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then((res) => res.data ?? []),
  ]);

  const prevRegime = recent[0]?.regime ?? null;
  const regime = await classifyRegime(signals, { regime: prevRegime });

  // Early-exit if no regime shift AND a prior decision exists (unless bypassed).
  if (!regime.regime_shift_candidate && recent.length > 0 && !opts.bypassRateLimit) {
    return { skipped: "no regime shift", regime, signals };
  }

  const cw = currentWeights(balances);
  const decision = await decide({
    goal: u.goal,
    current_weights: cw,
    regime,
    signals,
    recent: recent.map((r) => ({
      created_at: r.created_at,
      regime: r.regime,
      target_weights: r.target_weights as TargetWeights,
      reasoning: r.reasoning,
    })),
  });

  const plan = planRebalance(balances, decision.target_weights);

  let swaps: SwapAttempt[] = [];
  let executed = false;
  if (decision.rebalance_now && plan.willRebalance) {
    const res = await executeRebalance({
      walletId: u.circle_wallet_id,
      walletAddress: u.arc_address,
      legs: plan.legs,
    });
    swaps = res.swaps;
    executed = res.executed;
  }

  const tracePayload = {
    goal: u.goal,
    signals,
    regime,
    decision,
    swaps,
    at: new Date().toISOString(),
  };
  const anchor = await anchorTrace({
    walletId: u.circle_wallet_id,
    payload: tracePayload,
  });

  const arcTxHash = swaps.find((s) => s.txHash)?.txHash ?? null;
  const insertRes = await supabase
    .from("decisions")
    .insert({
      user_id: u.id,
      regime: regime.regime,
      signals,
      target_weights: decision.target_weights,
      prev_weights: cw,
      reasoning: decision.reasoning,
      alerts: decision.alerts ?? [],
      trace_hash: anchor.traceHash,
      arc_tx_hash: arcTxHash,
      circle_tx_id: anchor.ok ? anchor.circleTxId : null,
      executed,
    })
    .select("id")
    .single();

  await supabase.from("portfolios").upsert({
    user_id: u.id,
    last_rebalance_at: new Date().toISOString(),
    usdc_balance: balances.usdc,
    eurc_balance: balances.eurc,
    cirbtc_balance: balances.cirbtc,
  });

  return {
    decisionId: insertRes.data?.id,
    regime,
    decision,
    plan: { willRebalance: plan.willRebalance, legs: plan.legs },
    swaps,
    executed,
    anchor,
  };
}
