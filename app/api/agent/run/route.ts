import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/db/client";
import { runForUser, type UserCtx } from "@/lib/agent/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseService();
  const { data: users, error } = await supabase
    .from("users")
    .select("id, goal, circle_wallet_id, arc_address")
    .not("arc_address", "is", null)
    .not("goal", "is", null)
    .not("circle_wallet_id", "is", null);

  if (error) {
    return NextResponse.json({ error: "db", details: error.message }, { status: 500 });
  }

  const startedAt = new Date().toISOString();
  const results: Array<Record<string, unknown>> = [];

  for (const u of (users ?? []) as UserCtx[]) {
    try {
      const r = await runForUser(u);
      results.push({ userId: u.id, ...r });
    } catch (err) {
      results.push({
        userId: u.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    startedAt,
    completedAt: new Date().toISOString(),
    count: results.length,
    results,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
