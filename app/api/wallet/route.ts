import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/db/client";
import { createUserWallet } from "@/lib/circle/wallets";
import { goalBands } from "@/lib/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  goal: z.enum(["conservative", "balanced", "aggressive"]),
});

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("users")
    .select("id, email, goal, circle_wallet_id, arc_address, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ user: row });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { goal } = parsed.data;
  if (!(goal in goalBands)) {
    return NextResponse.json({ error: "unknown goal" }, { status: 400 });
  }

  // Upsert the user row first.
  await supabase.from("users").upsert({
    id: user.id,
    email: user.email ?? null,
    goal,
  });

  // If a wallet already exists, return it.
  const { data: existing } = await supabase
    .from("users")
    .select("circle_wallet_id, arc_address")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.arc_address) {
    return NextResponse.json({
      goal,
      address: existing.arc_address,
      walletId: existing.circle_wallet_id,
      created: false,
    });
  }

  // Otherwise, mint a new Circle wallet and persist.
  let wallet;
  try {
    wallet = await createUserWallet(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "circle wallet creation failed", details: message }, { status: 502 });
  }

  await supabase
    .from("users")
    .update({ circle_wallet_id: wallet.id, arc_address: wallet.address })
    .eq("id", user.id);

  // Seed an empty portfolio row so realtime subscribers have something to watch.
  await supabase.from("portfolios").upsert({ user_id: user.id });

  return NextResponse.json({
    goal,
    address: wallet.address,
    walletId: wallet.id,
    created: true,
  });
}
