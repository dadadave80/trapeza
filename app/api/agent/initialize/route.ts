import { NextResponse } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { runForUser, type UserCtx } from "@/lib/agent/run";
import { goalBands, type Goal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// One-time "initialize bands" action. Most users land on /portfolio holding
// only USDC (from the Circle faucet) and the agent can't really rebalance
// into EURC or cirBTC until they have some of each. This route picks the
// mid-point of the user's goal bands and forces a rebalance there — three
// small App Kit swaps that seed the wallet, after which the cron loop can
// take over with real regime-based decisions.
export async function POST() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const svc = supabaseService();
  const { data: row, error } = await svc
    .from("users")
    .select("id, goal, circle_wallet_id, arc_address")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "db read failed", details: error.message },
      { status: 500 },
    );
  }
  if (!row?.arc_address || !row.goal || !row.circle_wallet_id) {
    return NextResponse.json(
      { error: "user not fully onboarded" },
      { status: 400 },
    );
  }

  const goal = row.goal as Goal;
  const band = goalBands[goal];
  // Mid-band 4-asset seed: cirbtc midpoint, eurc + usyc at their floors,
  // usdc takes whatever's left (with its own floor as a soft minimum). The
  // agent's clamp in decide() would adjust further if needed, but since we
  // forceTargetWeights we apply directly.
  const cirbtc = (band.cirbtc[0] + band.cirbtc[1]) / 2;
  const eurc = band.eurcMin;
  const usyc = band.usycMin;
  const usdc = Math.max(band.usdcMin, 1 - cirbtc - eurc - usyc);
  // Normalise in case the floors over-allocate (shouldn't happen for our
  // current bands, but the math is defensive).
  const sum = cirbtc + eurc + usyc + usdc;
  const target = {
    usdc: usdc / sum,
    eurc: eurc / sum,
    cirbtc: cirbtc / sum,
    usyc: usyc / sum,
  };

  try {
    const result = await runForUser(row as UserCtx, {
      bypassRateLimit: true,
      skipRegime: true,
      forceTargetWeights: target,
    });
    return NextResponse.json({ ok: true, target, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "initialize bands failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
