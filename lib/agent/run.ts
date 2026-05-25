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
  // When set, overrides the model-decided target weights. Used by the
  // "Initialize bands" action that seeds a fresh wallet at goal mid-bands.
  forceTargetWeights?: TargetWeights;
  // When set, skips the regime classifier entirely and decision step —
  // used by manual seed flows that don't need a regime read.
  skipRegime?: boolean;
};

// Run the regime → decide → execute → anchor loop for a single user.
// Used by the cron orchestrator (loops all users), the "Run agent now"
// manual trigger, and the "Initialize bands" seed flow.
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
        // Still record that the agent checked in — cron visibility.
        await touchLastChecked(u.id);
        return { skipped: "rate-limited", elapsed_s: Math.round(elapsed) };
      }
    }
  }

  const balances = await readBalances(u.arc_address);
  if (balances.total <= 0) {
    await touchLastChecked(u.id);
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
  const regime = opts.skipRegime
    ? {
        regime: prevRegime ?? "neutral",
        confidence: 0.5,
        regime_shift_candidate: true,
        brief: "manual seed — regime classifier skipped",
      }
    : await classifyRegime(signals, { regime: prevRegime });

  // Early-exit if no regime shift AND a prior decision exists (unless
  // bypassed or forced).
  if (
    !opts.bypassRateLimit &&
    !opts.forceTargetWeights &&
    !regime.regime_shift_candidate &&
    recent.length > 0
  ) {
    await touchLastChecked(u.id);
    return { skipped: "no regime shift", regime, signals };
  }

  const cw = currentWeights(balances);
  const decision = opts.forceTargetWeights
    ? {
        target_weights: opts.forceTargetWeights,
        rebalance_now: true,
        reasoning:
          "Manual seed: initialising weights to the mid-point of your goal bands. The agent will tilt from here on its next regime read.",
        alerts: [],
      }
    : await decide({
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
      balances,
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

  // Collect all swap hashes (partial-success accounting). arc_tx_hash
  // stays as the first one for backwards-compat consumers.
  const allHashes = swaps.map((s) => s.txHash).filter((h): h is string => !!h);
  const arcTxHash = allHashes[0] ?? null;
  const partial = swaps.length > 0 && allHashes.length > 0 && allHashes.length < swaps.length;

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
      arc_tx_hashes: allHashes,
      partial,
      circle_tx_id: anchor.ok ? anchor.circleTxId : null,
      executed,
    })
    .select("id")
    .single();

  const now = new Date().toISOString();
  await supabase.from("portfolios").upsert({
    user_id: u.id,
    last_checked_at: now,
    // last_rebalance_at only bumps when we actually executed at least one swap.
    last_rebalance_at: allHashes.length > 0 ? now : undefined,
    usdc_balance: balances.usdc,
    eurc_balance: balances.eurc,
    cirbtc_balance: balances.cirbtc,
    usyc_balance: balances.usyc,
  });

  return {
    decisionId: insertRes.data?.id,
    regime,
    decision,
    plan: { willRebalance: plan.willRebalance, legs: plan.legs },
    swaps,
    executed,
    partial,
    anchor,
  };
}

// Bumps just the heartbeat — used on rate-limit / empty-wallet / no-shift
// paths so the dashboard can show "agent woke up N min ago" even when
// nothing changed.
async function touchLastChecked(userId: string) {
  const supabase = supabaseService();
  await supabase
    .from("portfolios")
    .upsert({
      user_id: userId,
      last_checked_at: new Date().toISOString(),
    });
}
