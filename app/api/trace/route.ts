import { NextResponse } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Service role for the read (RLS may be on public.decisions).
  const svc = supabaseService();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const { data: row } = await svc
      .from("decisions")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ decision: row });
  }

  const { data: rows } = await svc
    .from("decisions")
    .select(
      "id, created_at, regime, target_weights, prev_weights, reasoning, alerts, trace_hash, arc_tx_hash, circle_tx_id, executed",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ decisions: rows ?? [] });
}
