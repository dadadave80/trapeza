import { NextResponse } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { readBalances } from "@/lib/arc/balances";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const svc = supabaseService();
  const [{ data: userRow, error: readErr }, { data: portfolioRow }] = await Promise.all([
    svc
      .from("users")
      .select("arc_address, goal, circle_wallet_id")
      .eq("id", user.id)
      .maybeSingle(),
    svc
      .from("portfolios")
      .select("last_checked_at, last_rebalance_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (readErr) {
    return NextResponse.json(
      { error: "db read failed", details: readErr.message },
      { status: 500 },
    );
  }
  if (!userRow?.arc_address) {
    return NextResponse.json({ error: "no wallet" }, { status: 404 });
  }

  try {
    const balances = await readBalances(userRow.arc_address as `0x${string}`);
    return NextResponse.json({
      address: userRow.arc_address,
      walletId: userRow.circle_wallet_id,
      goal: userRow.goal,
      balances,
      lastCheckedAt: portfolioRow?.last_checked_at ?? null,
      lastRebalanceAt: portfolioRow?.last_rebalance_at ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "rpc read failed", details: message }, { status: 502 });
  }
}
