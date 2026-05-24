import { NextResponse } from "next/server";
import { supabaseServer, supabaseService } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  // Pagination: 1-indexed page + bounded pageSize. Fetch one extra row to
  // determine hasMore without an extra count query.
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize; // fetch pageSize + 1

  const { data: rows } = await svc
    .from("decisions")
    .select(
      "id, created_at, regime, target_weights, prev_weights, reasoning, alerts, trace_hash, arc_tx_hash, arc_tx_hashes, circle_tx_id, executed, partial",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const all = rows ?? [];
  const hasMore = all.length > pageSize;
  const decisions = hasMore ? all.slice(0, pageSize) : all;

  return NextResponse.json({
    decisions,
    page,
    pageSize,
    hasMore,
  });
}
