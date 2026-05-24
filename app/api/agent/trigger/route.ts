import { NextResponse } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { runForUser, type UserCtx } from "@/lib/agent/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Session-authed manual trigger. Runs the agent loop for the current user
// only, bypassing the rate limit. Used by the "Run agent now" dashboard
// button. The lookup of the user's wallet row uses service role — the
// anon client with the session cookie is blocked by RLS on public.users.
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
      {
        error: "user not fully onboarded",
        details: `arc_address=${!!row?.arc_address} goal=${!!row?.goal} circle_wallet_id=${!!row?.circle_wallet_id}`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await runForUser(row as UserCtx, { bypassRateLimit: true });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "agent run failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
