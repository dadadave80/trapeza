import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { createUserWallet } from "@/lib/circle/wallets";
import { goalBands } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // SCA wallet creation can take 30-60s

const bodySchema = z.object({
  goal: z.enum(["conservative", "balanced", "aggressive"]),
});

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const svc = supabaseService();
  const { data: row, error } = await svc
    .from("users")
    .select("id, email, goal, circle_wallet_id, arc_address, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "db read failed", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ user: row });
}

export async function POST(req: Request) {
  // 1. Auth: must use the session-authed client (anon key + cookies) to
  //    identify the user. We then switch to service-role for writes so RLS
  //    on the public.users table can't silently block us.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { goal } = parsed.data;
  if (!(goal in goalBands)) {
    return NextResponse.json({ error: "unknown goal" }, { status: 400 });
  }

  const svc = supabaseService();

  // 2. Upsert the user row (service role bypasses RLS).
  const upsertRes = await svc.from("users").upsert({
    id: user.id,
    email: user.email ?? null,
    goal,
  });
  if (upsertRes.error) {
    return NextResponse.json(
      {
        error: "db upsert failed",
        details: upsertRes.error.message,
        hint: upsertRes.error.message.includes("relation")
          ? "Apply lib/db/schema.sql in the Supabase SQL editor"
          : undefined,
      },
      { status: 500 },
    );
  }

  // 3. If a wallet already exists, return it without re-minting.
  const { data: existing, error: readErr } = await svc
    .from("users")
    .select("circle_wallet_id, arc_address")
    .eq("id", user.id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json(
      { error: "db read failed", details: readErr.message },
      { status: 500 },
    );
  }
  if (existing?.arc_address) {
    return NextResponse.json({
      goal,
      address: existing.arc_address,
      walletId: existing.circle_wallet_id,
      created: false,
    });
  }

  // 4. Mint via Circle.
  let wallet;
  try {
    wallet = await createUserWallet(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "circle wallet creation failed", details: message },
      { status: 502 },
    );
  }

  // 5. Persist wallet info on the user row, seed an empty portfolio row.
  const { error: writeErr } = await svc
    .from("users")
    .update({ circle_wallet_id: wallet.id, arc_address: wallet.address })
    .eq("id", user.id);
  if (writeErr) {
    return NextResponse.json(
      {
        error: "db write failed (wallet created but not persisted)",
        details: writeErr.message,
        walletId: wallet.id,
        address: wallet.address,
      },
      { status: 500 },
    );
  }

  await svc.from("portfolios").upsert({ user_id: user.id });

  return NextResponse.json({
    goal,
    address: wallet.address,
    walletId: wallet.id,
    created: true,
  });
}
