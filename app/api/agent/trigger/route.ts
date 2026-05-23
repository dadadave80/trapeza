import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/client";
import { runForUser, type UserCtx } from "@/lib/agent/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Session-authed manual trigger. Runs the agent loop for the current user only,
// bypassing the rate limit. Used by the "Run agent now" dashboard button.
export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("users")
    .select("id, goal, circle_wallet_id, arc_address")
    .eq("id", user.id)
    .maybeSingle();

  if (!row?.arc_address || !row.goal || !row.circle_wallet_id) {
    return NextResponse.json({ error: "user not fully onboarded" }, { status: 400 });
  }

  try {
    const result = await runForUser(row as UserCtx, { bypassRateLimit: true });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: "agent run failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
