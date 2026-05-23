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

  // Service role for the read (RLS may be enabled on public.users).
  const svc = supabaseService();
  const { data: row, error: readErr } = await svc
    .from("users")
    .select("arc_address, goal, circle_wallet_id")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json(
      { error: "db read failed", details: readErr.message },
      { status: 500 },
    );
  }
  if (!row?.arc_address) {
    return NextResponse.json({ error: "no wallet" }, { status: 404 });
  }

  try {
    const balances = await readBalances(row.arc_address as `0x${string}`);
    return NextResponse.json({
      address: row.arc_address,
      walletId: row.circle_wallet_id,
      goal: row.goal,
      balances,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "rpc read failed", details: message }, { status: 502 });
  }
}
