import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { circleClient } from "@/lib/circle/wallets";
import { ARC } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Server-side whitelist of what the faucet can mint, per the dashboard buttons.
// Amount strings are raw token base units (6 decimals across all three mocks).
// Keeping the table here (not on the client) means a tampered request can't ask
// for a million USDC — the client only sends the token key.
const FAUCET = {
  usdc: { label: "USDC", address: () => ARC.usdc(), amount: "1000000000" }, // 1,000 USDC
  eurc: { label: "EURC", address: () => ARC.eurc(), amount: "1000000000" }, // 1,000 EURC
  cirbtc: { label: "cirBTC", address: () => ARC.cirbtc(), amount: "1300" }, // 0.0013 cirBTC
} as const;

const bodySchema = z.object({
  token: z.enum(["usdc", "eurc", "cirbtc"]),
});

export async function POST(req: Request) {
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

  const svc = supabaseService();
  const { data: row, error } = await svc
    .from("users")
    .select("circle_wallet_id, arc_address")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "db read failed", details: error.message },
      { status: 500 },
    );
  }
  if (!row?.circle_wallet_id || !row?.arc_address) {
    return NextResponse.json(
      { error: "no wallet for user — finish /onboard first" },
      { status: 409 },
    );
  }

  const spec = FAUCET[parsed.data.token];
  const contractAddress = spec.address();

  try {
    const res = await circleClient().createContractExecutionTransaction({
      walletId: row.circle_wallet_id,
      contractAddress,
      abiFunctionSignature: "mint(address,uint256)",
      abiParameters: [row.arc_address, spec.amount],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: crypto.randomUUID(),
    });
    const txId = res.data?.id;
    if (!txId) {
      return NextResponse.json(
        { error: "circle returned no tx id" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      token: parsed.data.token,
      label: spec.label,
      amount: spec.amount,
      circleTxId: txId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "mint failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
